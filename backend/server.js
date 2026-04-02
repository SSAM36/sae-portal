require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST']
  }
});

// Setup Express middleware
app.use(cors());
app.use(express.json());

// Basic Health Check Route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'SAE Portal Backend is running.' });
});

// Real-time Socket Connections
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
});
