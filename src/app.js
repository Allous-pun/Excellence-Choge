const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');

// Import routes (only the ones that exist)
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
// const sermonRoutes = require('./routes/sermon.routes');
// const prayerRoutes = require('./routes/prayer.routes');
// const bookRoutes = require('./routes/book.routes');
// const materialRoutes = require('./routes/material.routes');
// const assignmentRoutes = require('./routes/assignment.routes');
// const zoomRoutes = require('./routes/zoom.routes');

// Import middleware
const errorMiddleware = require('./middlewares/error.middleware');

const app = express();

// Trust proxy for rate limiting behind reverse proxy (Render, Nginx, etc.)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);

// Logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Static files serving
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Teacher of Excellence Backend is running successfully',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes (only enable existing ones)
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
// app.use('/api/sermons', sermonRoutes);
// app.use('/api/prayers', prayerRoutes);
// app.use('/api/books', bookRoutes);
// app.use('/api/materials', materialRoutes);
// app.use('/api/assignments', assignmentRoutes);
// app.use('/api/zoom', zoomRoutes);

// Handle undefined routes
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found on this server!`
  });
});

// Error handling middleware (should be last)
app.use(errorMiddleware);

module.exports = app;