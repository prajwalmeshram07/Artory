require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const socketHandler = require('./socket/socketHandler');
const errorHandler = require('./middleware/errorHandler');

// Establish database connection
connectDB();

const app = express();
const server = http.createServer(app);
const allowedOrigins = [process.env.CLIENT_URL || 'http://localhost:5173', 'http://localhost:5174'];

const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] }
});
app.set('io', io);

// Security Headers Setup
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' } // Allows static files (/uploads) to load across origins
}));

// API Rate Limiting Setup
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to API routes
app.use('/api', apiLimiter);

// Core Middleware
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Core Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/artwork', require('./routes/artwork'));
app.use('/api/social', require('./routes/social'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/community', require('./routes/community'));
app.use('/api/groups', require('./routes/groupChat'));
app.use('/api/competition', require('./routes/competition'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/reports', require('./routes/report'));
app.use('/api/verification', require('./routes/verification'));
app.use('/api/comics', require('./routes/comics'));
app.use('/api/arthistory', require('./routes/artHistory'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/marketplace', require('./routes/marketplace'));

// New E-commerce Module Routes
app.use('/api/products', require('./routes/product'));
app.use('/api/orders', require('./routes/order'));

// AI Mentor Recommendation Module
app.use('/api/mentors', require('./routes/mentors'));

// Root Endpoint
app.get('/', (req, res) => res.json({ message: '🎨 Artory API Running' }));

// Socket Handler
socketHandler(io);

// Global Error Handler Middleware (MUST be declared after all other routes & middleware)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
