// src/server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const newsRoutes = require('./routes/newsRoutes');
const ingestionWorker = require('./workers/ingestionWorker');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        lastRunStats: ingestionWorker.lastRunStats,
        uptimeSeconds: Math.floor(process.uptime())
    });
});

// API Routes
app.use('/api', newsRoutes);

// Global handler for unmatched routes
app.use((req, res, next) => {
    logger.warn(`404 - Not Found: ${req.method} ${req.url}`);
    res.status(404).json({ success: false, message: 'Endpoint not found' });
});

// Error handling
app.use((err, req, res, next) => {
    logger.error(`Unhandled error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
});

// Start listening if not in test environment
let server;
if (process.env.NODE_ENV !== 'test') {
    server = app.listen(PORT, () => {
        console.log(`
  🚀 Bulgarian News Map Backend (v2.0 Performance Edition)
  -------------------------------------------------------
  Server running on port:        ${PORT}
  Health check:                 http://localhost:${PORT}/health
  Cached News API endpoint:     http://localhost:${PORT}/api/news
  -------------------------------------------------------
        `);

        // Start background scheduler (rebuilds cache every few minutes)
        if (!process.env.DISABLE_SCHEDULER) {
            const intervalMin = parseInt(process.env.REFRESH_INTERVAL_MINUTES || '3', 10);
            ingestionWorker.startScheduler(intervalMin);
        }
    });
}

module.exports = app;
