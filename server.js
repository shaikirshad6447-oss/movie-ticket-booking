/**
 * Online Movie Ticket Booking System - Express Server Entry Point
 * Project Owner: Shaik Irshad
 */
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const pool = require('./config/db');

// Route Handlers
const authRoutes = require('./routes/authRoutes');
const movieRoutes = require('./routes/movieRoutes');
const showRoutes = require('./routes/showRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Error Middleware
const { notFoundHandler, errorHandler } = require('./middleware/errorMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Security Headers with Helmet
// Allow images from TMDB, Unsplash, Google Fonts, and YouTube embeds
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
                fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
                imgSrc: ["'self'", "data:", "https://image.tmdb.org", "https://images.unsplash.com", "https://m.media-amazon.com"],
                frameSrc: ["'self'", "https://www.youtube.com"],
                connectSrc: ["'self'"]
            }
        },
        crossOriginEmbedderPolicy: false
    })
);

// Cross-Origin Resource Sharing
app.use(cors());

// Request Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP Request Logger
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
}

// Rate Limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Limit each IP to 500 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again after 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again after 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Serve Static Assets
app.use(express.static(path.join(__dirname, 'public')));

// HTML Views Routing
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views', 'index.html')));
app.get('/movies', (req, res) => res.sendFile(path.join(__dirname, 'views', 'movies.html')));
app.get('/movie-details', (req, res) => res.sendFile(path.join(__dirname, 'views', 'movie-details.html')));
app.get('/shows', (req, res) => res.sendFile(path.join(__dirname, 'views', 'shows.html')));
app.get('/seats', (req, res) => res.sendFile(path.join(__dirname, 'views', 'seats.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'views', 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'views', 'register.html')));
app.get('/bookings', (req, res) => res.sendFile(path.join(__dirname, 'views', 'bookings.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'views', 'admin.html')));

// API Routes
app.use('/api/', apiLimiter);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/shows', showRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);

// Health Check API
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        project: 'Online Movie Ticket Booking System',
        owner: 'Shaik Irshad',
        status: 'Operational',
        timestamp: new Date().toISOString()
    });
});

// Centralized 404 & Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start Server if not imported by test suite
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`================================================================`);
        console.log(`🎬 IRSHAD CINEMAS - Online Movie Ticket Booking System`);
        console.log(`👤 Project Owner: Shaik Irshad`);
        console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode`);
        console.log(`🌐 Local URL: http://localhost:${PORT}`);
        console.log(`🛡️  Security: Helmet, Rate-Limit, Bcrypt, JWT Enabled`);
        console.log(`================================================================`);
    });
}

module.exports = app;
