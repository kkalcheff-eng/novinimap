// src/routes/newsRoutes.js
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const ingestionWorker = require('../workers/ingestionWorker');

/**
 * Helper to compute ETag for caching
 */
function generateETag(payload) {
  return `W/"${crypto.createHash('md5').update(payload).digest('hex')}"`;
}

/**
 * @route GET /api/news
 * @desc Get instantly cached news with pre-computed geocoding and timestamps.
 * Serves stale cache instantly while background worker refreshes.
 */
router.get('/news', (req, res) => {
  const limit = parseInt(req.query.limit || 150);
  const articles = ingestionWorker.getLatestArticles(limit);
  const clusters = ingestionWorker.getCityClusters(articles);
  const lastRunTime = ingestionWorker.lastRunStats?.lastRunTime || 'initial';

  const responseBody = JSON.stringify({
    success: true,
    count: articles.length,
    timestamp: Date.now(),
    lastStats: ingestionWorker.lastRunStats,
    clusters: clusters,
    data: articles
  });

  const etag = generateETag(`${lastRunTime}_${articles.length}`);

  // HTTP Caching & Stale-While-Revalidate headers for Nginx & Browsers
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=180');
  res.setHeader('ETag', etag);
  res.setHeader('X-Cache-Status', ingestionWorker.isRunning ? 'STALE-REFRESHING' : 'HIT');

  // Conditional GET: 304 Not Modified
  if (req.headers['if-none-match'] === etag) {
    return res.status(304).end();
  }

  res.setHeader('Content-Type', 'application/json');
  res.send(responseBody);
});

/**
 * @route GET /api/news/clusters
 * @desc Get pre-computed city clusters
 */
router.get('/news/clusters', (req, res) => {
  const articles = ingestionWorker.getLatestArticles(150);
  const clusters = ingestionWorker.getCityClusters(articles);

  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=180');
  res.json({
    success: true,
    count: Object.keys(clusters).length,
    data: clusters
  });
});

/**
 * @route GET /api/sources/health
 * @desc Real-time health monitoring & freshness dashboard for all news sources
 */
router.get('/sources/health', (req, res) => {
  res.json({
    success: true,
    lastRunStats: ingestionWorker.lastRunStats,
    sources: ingestionWorker.sourcesHealth
  });
});

/**
 * @route POST /api/ingest/trigger
 * @desc Trigger an immediate background ingestion cycle
 */
router.post('/ingest/trigger', async (req, res) => {
  try {
    const result = await ingestionWorker.runIngestionCycle();
    res.json({
      success: true,
      message: 'Ingestion cycle triggered successfully',
      stats: result ? result.stats : ingestionWorker.lastRunStats
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
