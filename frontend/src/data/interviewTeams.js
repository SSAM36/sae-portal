export const TEAM_DEFINITIONS = [
  { displayName: 'DJS KRONOS', routeId: 'kronos', username: 'kronos', password: 'ember' },
  { displayName: 'DJS PHOENIX', routeId: 'phoenix', username: 'phoenix', password: 'atlas' },
  { displayName: 'DJS MILES', routeId: 'miles', username: 'miles', password: 'orbit' },
  { displayName: 'DJS RACING', routeId: 'racing', username: 'racing', password: 'pulse' },
  { displayName: 'DJS KARTING', routeId: 'karting', username: 'karting', password: 'velvet' },
  { displayName: 'DJS IMPULSE', routeId: 'impulse', username: 'impulse', password: 'cedar' },
  { displayName: 'DJS ASTRA', routeId: 'astra', username: 'astra', password: 'drift' },
  { displayName: 'DJS SKYLARK', routeId: 'skylark', username: 'skylark', password: 'nexus' },
  { displayName: 'DJS SPEEDSTERS', routeId: 'speedsters', username: 'speedsters', password: 'grove' },
  { displayName: 'DJS HELIOS', routeId: 'helios', username: 'helios', password: 'prism' },
  { displayName: 'DJS ROBOCON', routeId: 'robocon', username: 'robocon', password: 'torque' },
];

export const ADMIN_CREDENTIAL = {
  username: 'admin',
  password: 'admin',
};

export const TEAM_LABELS = TEAM_DEFINITIONS.map((team) => team.displayName);

export const getTeamByRouteId = (routeId) =>
  TEAM_DEFINITIONS.find((team) => team.routeId === routeId);

export const getTeamByUsername = (username) =>
  TEAM_DEFINITIONS.find((team) => team.username === username);

export const buildInterviewStatus = (teams = []) =>
  teams.reduce((statusMap, team) => {
    statusMap[team] = 'Not Started';
    return statusMap;
  }, {});

export const normalizeTeamName = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

export const resolveTeamName = (value) => {
  const normalizedValue = normalizeTeamName(value);
  return TEAM_DEFINITIONS.find((team) => {
    const candidates = [team.displayName, team.routeId, team.username];
    return candidates.some((candidate) => normalizeTeamName(candidate) === normalizedValue);
  })?.displayName;
};

export const resolveTeamList = (values = []) => {
  const resolved = values
    .flatMap((value) => String(value || '').split(/[,;\n]/g))
    .map((value) => resolveTeamName(value))
    .filter(Boolean);

  return Array.from(new Set(resolved));
};