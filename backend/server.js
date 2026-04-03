require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const crypto = require('crypto');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const TEAM_CREDENTIALS = (() => {
  try {
    return JSON.parse(process.env.TEAM_CREDENTIALS_JSON || '{}');
  } catch {
    return {};
  }
})();
const SESSION_SECRET = process.env.SESSION_SECRET || '';
const COOKIE_NAME = 'sae_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_LIMIT = 6;
const MAX_ADMIN_SESSIONS = 4;
const MAX_TEAM_SESSIONS = 1;

if (!SESSION_SECRET) {
  throw new Error('SESSION_SECRET must be set for backend auth.');
}

const loginAttempts = new Map();
const activeSessions = new Map();

const parseCookies = (cookieHeader = '') =>
  cookieHeader.split(';').reduce((acc, item) => {
    const [rawKey, ...rest] = item.trim().split('=');
    if (!rawKey) return acc;
    acc[rawKey] = rest.join('=');
    return acc;
  }, {});

const purgeExpiredSessions = () => {
  const now = Date.now();

  for (const [token, session] of activeSessions.entries()) {
    if (!session || !session.exp || session.exp <= now) {
      activeSessions.delete(token);
    }
  }
};

const countActiveSessions = (predicate) => {
  purgeExpiredSessions();
  let count = 0;

  for (const session of activeSessions.values()) {
    if (predicate(session)) {
      count += 1;
    }
  }

  return count;
};

const registerSession = (token, session) => {
  activeSessions.set(token, session);
};

const unregisterSession = (token) => {
  activeSessions.delete(token);
};

const base64Url = (value) => Buffer.from(value).toString('base64url');

const createSignedToken = (payload) => {
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(encodedPayload).digest('base64url');
  return `${encodedPayload}.${signature}`;
};

const verifySignedToken = (token) => {
  if (!token || typeof token !== 'string') return null;

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return null;

  const expectedSignature = crypto.createHmac('sha256', SESSION_SECRET).update(encodedPayload).digest('base64url');
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (!payload || typeof payload !== 'object' || !payload.exp || payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
};

const setAuthCookie = (res, token) => {
  const cookieParts = [
    `${COOKIE_NAME}=${token}`,
    'HttpOnly',
    'Path=/',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
    process.env.NODE_ENV === 'production' ? 'SameSite=None' : 'SameSite=Lax',
  ];

  if (process.env.NODE_ENV === 'production') {
    cookieParts.push('Secure');
  }

  res.setHeader('Set-Cookie', cookieParts.join('; '));
};

const clearAuthCookie = (res) => {
  const cookieParts = [
    `${COOKIE_NAME}=`,
    'HttpOnly',
    'Path=/',
    'Max-Age=0',
    process.env.NODE_ENV === 'production' ? 'SameSite=None' : 'SameSite=Lax',
  ];

  if (process.env.NODE_ENV === 'production') {
    cookieParts.push('Secure');
  }

  res.setHeader('Set-Cookie', cookieParts.join('; '));
};

const getSessionUser = (req) => {
  const cookies = parseCookies(req.headers.cookie || '');
  const token = cookies[COOKIE_NAME];
  const payload = verifySignedToken(token);
  if (!payload) return null;

  const activeSession = activeSessions.get(token);
  if (!activeSession || activeSession.exp <= Date.now()) {
    if (token) unregisterSession(token);
    return null;
  }

  const { exp, ...user } = payload;
  return user;
};

const requireSession = (req, res, next) => {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.user = user;
  return next();
};

const getLoginKey = (req) => req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';

const isLocked = (key) => {
  const record = loginAttempts.get(key);
  if (!record) return false;
  if (record.lockedUntil && record.lockedUntil > Date.now()) return true;
  if (record.lockedUntil && record.lockedUntil <= Date.now()) {
    loginAttempts.delete(key);
  }
  return false;
};

const recordFailedLogin = (key) => {
  const now = Date.now();
  const existing = loginAttempts.get(key) || { count: 0, windowStart: now, lockedUntil: 0 };

  if (now - existing.windowStart > LOGIN_WINDOW_MS) {
    existing.count = 0;
    existing.windowStart = now;
  }

  existing.count += 1;
  if (existing.count >= LOGIN_LIMIT) {
    existing.lockedUntil = now + LOGIN_WINDOW_MS;
    existing.count = 0;
    existing.windowStart = now;
  }

  loginAttempts.set(key, existing);
  return existing.lockedUntil > now ? existing.lockedUntil : 0;
};

const clearLoginAttempts = (key) => {
  loginAttempts.delete(key);
};

const sanitizeUser = (user) => ({
  username: user.username,
  role: user.role,
  team: user.team,
  teamLabel: user.teamLabel,
});

const resolveUserCredentials = (username) => {
  if (username === ADMIN_USERNAME) {
    return ADMIN_PASSWORD ? { username: ADMIN_USERNAME, role: 'admin', team: 'admin', teamLabel: 'Admin', password: ADMIN_PASSWORD } : null;
  }

  const password = TEAM_CREDENTIALS[username];
  if (!password) return null;

  return { username, role: 'team', team: username, teamLabel: username.toUpperCase(), password };
};

const canCreateSession = (user) => {
  purgeExpiredSessions();

  if (user.role === 'admin') {
    return countActiveSessions((session) => session.role === 'admin') < MAX_ADMIN_SESSIONS;
  }

  if (user.role === 'team') {
    return countActiveSessions((session) => session.role === 'team' && session.team === user.team) < MAX_TEAM_SESSIONS;
  }

  return true;
};

app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: false, limit: '64kb' }));

const allowedOrigins = [
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  ...(process.env.FRONTEND_URLS ? process.env.FRONTEND_URLS.split(',').map((origin) => origin.trim()).filter(Boolean) : []),
];

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.length === 0) return true;
  return allowedOrigins.includes(origin);
};

// Setup Socket.IO
const io = new Server(server, {
  maxHttpBufferSize: 1e6,
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) return callback(null, true);
      return callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST'],
  },
});

// Setup Express middleware
app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
}));

app.post('/auth/login', (req, res) => {
  const { username = '', password = '' } = req.body || {};
  const normalizedUsername = String(username).toLowerCase().trim();
  const loginKey = getLoginKey(req);

  if (isLocked(loginKey)) {
    return res.status(429).json({ error: 'Too many attempts. Try again later.' });
  }

  const credentials = resolveUserCredentials(normalizedUsername);
  if (!credentials || credentials.password !== password) {
    const lockedUntil = recordFailedLogin(loginKey);
    return res.status(401).json({
      error: lockedUntil ? 'Too many attempts. Try again later.' : 'Invalid credentials.',
    });
  }

  clearLoginAttempts(loginKey);

  const sessionUser = sanitizeUser(credentials);
  if (!canCreateSession(sessionUser)) {
    const message = sessionUser.role === 'admin'
      ? 'Admin login limit reached. Try again later.'
      : `Team ${sessionUser.team} is already logged in.`;
    return res.status(429).json({ error: message });
  }

  const token = createSignedToken({ ...sessionUser, exp: Date.now() + SESSION_TTL_MS });
  registerSession(token, { ...sessionUser, exp: Date.now() + SESSION_TTL_MS });
  setAuthCookie(res, token);
  res.json({ user: sessionUser });
});

app.get('/auth/me', requireSession, (req, res) => {
  res.json({ user: req.user });
});

app.post('/auth/logout', (req, res) => {
  const cookies = parseCookies(req.headers.cookie || '');
  if (cookies[COOKIE_NAME]) {
    unregisterSession(cookies[COOKIE_NAME]);
  }
  clearAuthCookie(res);
  res.json({ ok: true });
});

// Basic Health Check Route
app.get('/health', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ status: 'ok', message: 'SAE Portal Backend is running.' });
});

// Real-time Socket Connections
io.use((socket, next) => {
  const cookies = parseCookies(socket.handshake.headers.cookie || '');
  const token = cookies[COOKIE_NAME];
  const user = verifySignedToken(token);

  if (!user || !activeSessions.has(token)) {
    return next(new Error('Unauthorized'));
  }

  socket.user = user;
  return next();
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Legacy generic status channel (optional)
  socket.on('candidate_status_update', (data) => {
    console.log('candidate_status_update received:', data);
    io.emit('broadcast_status_update', data);
  });

  // When admin adds a new applicant (walk-in or imported)
  socket.on('addApplicant', (applicant) => {
    console.log('addApplicant received');
    io.emit('newApplicant', applicant);
  });

  // When any client updates an applicant (arrival, interview status, etc.)
  socket.on('updateApplicant', (applicant) => {
    console.log('updateApplicant received for id:', applicant?.id);
    io.emit('applicantUpdate', applicant);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  if (allowedOrigins.length > 0) {
    console.log(`Allowed frontend origins: ${allowedOrigins.join(', ')}`);
  }
});
