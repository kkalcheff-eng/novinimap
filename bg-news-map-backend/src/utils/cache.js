// src/utils/cache.js
const Redis = require('ioredis');
const logger = require('./logger');

/**
 * Dual-Layer Shared Cache (L1 In-Memory + L2 Redis)
 * 
 * Benefits:
 * 1. Shared across all PM2 instances: eliminates 3x redundant fetches to sources.
 * 2. Article-level Geolocation Cache: OpenAI called at most ONCE per article.
 * 3. Graceful degradation: Seamlessly falls back to in-memory if Redis is offline.
 */
class CacheManager {
  constructor() {
    this.l1 = new Map(); // In-memory L1 cache: key -> { value, expiry }
    this.isRedisConnected = false;
    this.redis = null;

    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    try {
      this.redis = new Redis(redisUrl, {
        lazyConnect: true,
        connectTimeout: 2000,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        retryStrategy: (times) => {
          if (times > 3) return null; // stop retrying after 3 attempts
          return Math.min(times * 1000, 3000);
        }
      });

      this.redis.on('connect', () => {
        this.isRedisConnected = true;
        logger.info(`[Cache] Connected to Redis at ${redisUrl}`);
      });

      this.redis.on('error', (err) => {
        if (this.isRedisConnected) {
          logger.warn(`[Cache] Redis connection lost (${err.message}). Using in-memory cache.`);
        }
        this.isRedisConnected = false;
      });

      // Attempt async connection without blocking boot
      this.redis.connect().catch(() => {
        logger.info('[Cache] Redis not available, using high-speed in-memory L1 cache.');
      });
    } catch (e) {
      logger.info('[Cache] Redis disabled or failed to init, running pure in-memory.');
    }
  }

  // --- Core Cache Methods ---

  async get(key) {
    // 1. Check L1 in-memory
    const memItem = this.l1.get(key);
    if (memItem) {
      if (Date.now() <= memItem.expiry) {
        return memItem.value;
      }
      this.l1.delete(key);
    }

    // 2. Check L2 Redis
    if (this.isRedisConnected && this.redis) {
      try {
        const val = await this.redis.get(key);
        if (val) {
          const parsed = JSON.parse(val);
          // Populate L1 cache for sub-millisecond future hits
          this.l1.set(key, { value: parsed, expiry: Date.now() + 30000 });
          return parsed;
        }
      } catch (err) {
        // Fall back quietly
      }
    }

    return null;
  }

  async set(key, value, ttlSeconds = 300) {
    const expiry = Date.now() + ttlSeconds * 1000;
    // Set L1
    this.l1.set(key, { value, expiry });

    // Set L2 Redis
    if (this.isRedisConnected && this.redis) {
      try {
        await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      } catch (err) {
        // L1 already has it
      }
    }
  }

  async del(key) {
    this.l1.delete(key);
    if (this.isRedisConnected && this.redis) {
      try {
        await this.redis.del(key);
      } catch (err) {}
    }
  }

  // --- Article-Level Geolocation Cache (Keyed by link or GUID) ---
  // Fixes the +500ms OpenAI penalty: each article hits AI once, ever.

  async getArticleGeo(articleKey) {
    const key = `kalchev:geo:${articleKey}`;
    return await this.get(key);
  }

  async setArticleGeo(articleKey, geoData, ttlSeconds = 86400 * 14) { // 14 days TTL
    const key = `kalchev:geo:${articleKey}`;
    await this.set(key, geoData, ttlSeconds);
  }

  // --- Feed Conditional GET Metadata (ETag / If-Modified-Since) ---

  async getFeedMeta(sourceId) {
    const key = `kalchev:feed:meta:${sourceId}`;
    return await this.get(key);
  }

  async setFeedMeta(sourceId, meta, ttlSeconds = 86400 * 7) {
    const key = `kalchev:feed:meta:${sourceId}`;
    await this.set(key, meta, ttlSeconds);
  }

  // --- Single-Refresher Distributed Lock ---
  // Ensures only 1 PM2 instance refreshes news feeds; others serve from shared cache

  async acquireLock(lockKey, ttlSeconds = 180) {
    if (this.isRedisConnected && this.redis) {
      try {
        const result = await this.redis.set(lockKey, 'locked', 'NX', 'EX', ttlSeconds);
        return result === 'OK';
      } catch (e) {
        return true; // If Redis lock fails, allow instance to proceed
      }
    }
    // In pure in-memory mode, single node acquires lock
    const memLock = this.l1.get(lockKey);
    if (!memLock || Date.now() > memLock.expiry) {
      this.l1.set(lockKey, { value: 'locked', expiry: Date.now() + ttlSeconds * 1000 });
      return true;
    }
    return false;
  }

  async releaseLock(lockKey) {
    await this.del(lockKey);
  }
}

module.exports = new CacheManager();
