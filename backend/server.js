const express = require('express');
const cors = require('cors');
require('dotenv').config();

// ==========================================
// SKILLQUEST BACKEND SERVER
// ==========================================
// This is the main entry point for the Node.js backend application.
// It sets up the Express server, middleware, and routes for the SkillQuest API.
// Features:
// - Cross-Origin Resource Sharing (CORS) for frontend communication
// - JSON and Text body parsing
// - Modular routing for different features (Auth, Quiz, Analytics, etc.)

// Import Routes
const authRoutes = require('./routes/auth');
const quizRoutes = require('./routes/quiz');
const gamificationRoutes = require('./routes/gamification');
const studyPlanRoutes = require('./routes/studyPlan');
const analyticsRoutes = require('./routes/analytics');
const rlRoutes = require('./routes/rl');

const app = express();

// ==========================================
// MIDDLEWARE CONFIGURATION
// ==========================================
app.use(cors({
    origin: 'http://localhost:5173', // Allow frontend origin
    credentials: true                // Allow cookies/headers
}));

app.use(express.json()); // Parse JSON bodies
app.use(express.text({ type: 'text/plain' })); // Support text/plain for sendBeacon or simple string payloads
app.use('/uploads', express.static('uploads')); // Serve static files from 'uploads' directory


// ==========================================
// API ROUTES
// ==========================================
// All API endpoints are prefixed with /api
app.use('/api/auth', authRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/study-plan', studyPlanRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/rl', rlRoutes);

// Health Check Endpoint
// Used by monitoring services (or manual checks) to verify server status
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'SkillQuest API is running' });
});

// ==========================================
// ERROR HANDLING
// ==========================================
// Global error handler for uncaught exceptions in routes
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!'
    });
});

// ==========================================
// SERVER START
// ==========================================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
