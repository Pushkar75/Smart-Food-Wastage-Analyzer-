require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const apiRoutes = require('./routes/api');
const { initMealSyncCron } = require('./cron/mealSyncCron');

const app = express();
const PORT = process.env.PORT || 5002;

const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
};

// Explicit HTTP server creation
const server = http.createServer(app);

// Socket.io initialization with permissive CORS for development
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log(`[mess socket] Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[mess socket] Client disconnected: ${socket.id}`);
  });
});

app.use(cors(corsOptions));
app.use(express.json());

app.use('/api', apiRoutes);

// Server listen call (strictly using server.listen, not app.listen)
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Mess Admin Backend + Socket.io running on port ${PORT}`);
  // Initialize automated post-meal ML sync cron jobs
  initMealSyncCron(io);
});
