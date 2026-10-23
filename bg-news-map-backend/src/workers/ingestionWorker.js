// bg-news-map-backend/src/workers/ingestionWorker.js
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const rssParser = require('../utils/rssParser');
const AhoCorasick = require('../utils/ahoCorasick');
const cache = require('../utils/cache');
const logger = require('../utils/logger');

// Google News search feed for one city, last 24h, Bulgarian edition
const gnCity = (city) => `https://news.google.com/rss/search?q=${encodeURIComponent(city + ' when:1d')}&hl=bg&gl=BG&ceid=BG:bg`;

const DEFAULT_SOURCES = [
  { id: 'dnevnik', name: 'Дневник', url: 'https://www.dnevnik.bg/rss/' },
  { id: 'mediapool', name: 'Mediapool', url: 'https://www.mediapool.bg/rss/' },
  { id: '24chasa', name: '24 Часа', url: 'https://www.24chasa.bg/rss' },
  { id: 'capital', name: 'Капитал', url: 'https://www.capital.bg/rss/' },
  { id: 'economic', name: 'Economic.bg', url: 'https://www.economic.bg/bg/rss.xml' },
  { id: 'banker', name: 'Банкеръ', url: 'https://banker.bg/feed/' },
  { id: 'podtepeto', name: 'Под Тепето (Пловдив)', url: 'https://podtepeto.com/feed/' },
  { id: 'varnautre', name: 'Варна Утре', url: 'https://varnautre.bg/feed/' },
  { id: 'burgasnews', name: 'Бургас Новини', url: 'https://burgasnews.com/feed/' },
  { id: 'stzagora', name: 'Стара Загора Нет', url: 'https://stzagora.net/feed/' },
  { id: 'newsbg', name: 'News.bg', url: 'https://news.bg/rss' },
  { id: 'dnesbg', name: 'Dir.bg Dnes', url: 'https://dnes.dir.bg/rss' },
  // Google News (keep LAST so direct publisher feeds win de-duplication)
  { id: 'gn-top', name: 'Google News', url: 'https://news.google.com/rss?hl=bg&gl=BG&ceid=BG:bg' },
  { id: 'gn-sofia', name: 'Google News', url: gnCity('София'), geoHint: 'софия' },
  { id: 'gn-plovdiv', name: 'Google News', url: gnCity('Пловдив'), geoHint: 'пловдив' },
  { id: 'gn-varna', name: 'Google News', url: gnCity('Варна'), geoHint: 'варна' },
  { id: 'gn-burgas', name: 'Google News', url: gnCity('Бургас'), geoHint: 'бургас' },
  { id: 'gn-ruse', name: 'Google News', url: gnCity('Русе'), geoHint: 'русе' }
];

// 50+ Bulgarian Cities & Municipalities with Coordinates
const CITY_DB = {
  'софия': { lat: 42.6977, lng: 23.3219, name: 'София' },
  'пловдив': { lat: 42.1354, lng: 24.7453, name: 'Пловдив' },
  'варна': { lat: 43.2141, lng: 27.9147, name: 'Варна' },
  'бургас': { lat: 42.5048, lng: 27.4626, name: 'Бургас' },
  'русе': { lat: 43.8356, lng: 25.9657, name: 'Русе' },
  'стара загора': { lat: 42.4258, lng: 25.6345, name: 'Стара Загора' },
  'плевен': { lat: 43.4170, lng: 24.6067, name: 'Плевен' },
  'сливен': { lat: 42.6817, lng: 26.3229, name: 'Сливен' },
  'добрич': { lat: 43.5726, lng: 27.8273, name: 'Добрич' },
  'шумен': { lat: 43.2712, lng: 26.9361, name: 'Шумен' },
  'перник': { lat: 42.6052, lng: 23.0378, name: 'Перник' },
  'хасково': { lat: 41.9344, lng: 25.5556, name: 'Хасково' },
  'ямбол': { lat: 42.4842, lng: 26.5035, name: 'Ямбол' },
  'пазарджик': { lat: 42.1928, lng: 24.3336, name: 'Пазарджик' },
  'благоевград': { lat: 42.0118, lng: 23.0999, name: 'Благоевград' },
  'велико търново': { lat: 43.0757, lng: 25.6172, name: 'Велико Търново' },
  'търново': { lat: 43.0757, lng: 25.6172, name: 'Велико Търново' },
  'враца': { lat: 43.2102, lng: 23.5529, name: 'Враца' },
  'габрово': { lat: 42.8710, lng: 25.3214, name: 'Габрово' },
  'видин': { lat: 43.9892, lng: 22.8778, name: 'Видин' },
  'асеновград': { lat: 42.0114, lng: 24.8778, name: 'Асеновград' },
  'казанлък': { lat: 42.6194, lng: 25.3931, name: 'Казанлък' },
  'кърджали': { lat: 41.6444, lng: 25.3672, name: 'Кърджали' },
  'кюстендил': { lat: 42.2839, lng: 22.6911, name: 'Кюстендил' },
  'монтана': { lat: 43.4125, lng: 23.2250, name: 'Монтана' },
  'търговище': { lat: 43.2500, lng: 26.5667, name: 'Търговище' },
  'димитровград': { lat: 42.0500, lng: 25.5833, name: 'Димитровград' },
  'разград': { lat: 43.5333, lng: 26.5167, name: 'Разград' },
  'силистра': { lat: 44.1167, lng: 27.2667, name: 'Силистра' },
  'ловеч': { lat: 43.1333, lng: 24.7167, name: 'Ловеч' },
  'дупница': { lat: 42.2667, lng: 23.1167, name: 'Дупница' },
  'петрич': { lat: 41.4000, lng: 23.2167, name: 'Петрич' },
  'смолян': { lat: 41.5833, lng: 24.7000, name: 'Смолян' },
  'сандански': { lat: 41.5667, lng: 23.2833, name: 'Сандански' },
  'самоков': { lat: 42.3333, lng: 23.5500, name: 'Самоков' },
  'лом': { lat: 43.8167, lng: 23.2333, name: 'Лом' },
  'свищов': { lat: 43.6167, lng: 25.3500, name: 'Свищов' },
  'карлово': { lat: 42.6333, lng: 24.8167, name: 'Карлово' },
  'велинград': { lat: 42.0333, lng: 24.0000, name: 'Велинград' },
  'нова загора': { lat: 42.4833, lng: 26.0167, name: 'Нова Загора' },
  'троян': { lat: 42.8833, lng: 24.7167, name: 'Троян' },
  'айтос': { lat: 42.7000, lng: 27.2500, name: 'Айтос' },
  'ботевград': { lat: 42.9000, lng: 23.7833, name: 'Ботевград' },
  'пещера': { lat: 42.0333, lng: 24.3000, name: 'Пещера' },
  'харманли': { lat: 41.9333, lng: 25.9000, name: 'Харманли' },
  'гоце делчев': { lat: 41.5667, lng: 23.7333, name: 'Гоце Делчев' },
  'свиленград': { lat: 41.7667, lng: 26.2000, name: 'Свиленград' },
  'панагюрище': { lat: 42.5000, lng: 24.1833, name: 'Панагюрище' },
  'чирпан': { lat: 42.2000, lng: 25.3333, name: 'Чирпан' },
  'банско': { lat: 41.8383, lng: 23.4885, name: 'Банско' },
  'козлодуй': { lat: 43.7833, lng: 23.7333, name: 'Козлодуй' }
};

class IngestionWorker {
  constructor() {
    this.sources = DEFAULT_SOURCES;
    this.articlesStore = new Map(); // id -> article
    this.cachedSourceArticles = new Map(); // sourceId -> articles[]
    this.sourcesHealth = {};
    this.lastRunStats = {
      lastRunTime: null,
      durationMs: 0,
      totalArticles: 0,
      locatedArticles: 0,
      clustersCount: 0
    };
    this.isRunning = false;
    this.schedulerTimer = null;

    // Initialize Aho-Corasick City Matcher (single O(N) scan replacing 50+ regex iterations)
    this.cityMatcher = new AhoCorasick();
    for (const [key, cityInfo] of Object.entries(CITY_DB)) {
      this.cityMatcher.addPattern(key, cityInfo);
    }
    this.cityMatcher.build();

    // Axios client configured for direct, proxy-free fetching with conditional GETs
    this.httpClient = axios.create({
      timeout: 7000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      },
      validateStatus: (status) => (status >= 200 && status < 300) || status === 304
    });
  }

  /**
   * Main Background Ingestion Cycle
   * Rebuilds cache in background, serving stale data to clients while refreshing.
   */
  async runIngestionCycle() {
    if (this.isRunning) {
      console.log('[IngestionWorker] Cycle already in progress, serving stale cache.');
      return;
    }

    // Distributed lock: in multi-instance PM2 cluster, only 1 instance refreshes feeds
    const lockAcquired = await cache.acquireLock('kalchev:lock:refresher', 180);
    if (!lockAcquired) {
      console.log('[IngestionWorker] Another PM2 instance is currently refreshing feeds. Syncing from shared Redis cache.');
      await this.syncFromSharedCache();
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    const cycleFetchedAt = new Date().toISOString();
    console.log(`[IngestionWorker] 🚀 Starting direct background ingestion cycle at ${cycleFetchedAt}...`);

    const rawArticles = [];

    try {
      // Direct HTTP fetch (no CORS proxies) with Conditional GETs in parallel
      const results = await Promise.allSettled(
        this.sources.map(source => this.fetchSourceDirect(source, cycleFetchedAt))
      );

      results.forEach((r, idx) => {
        const src = this.sources[idx];
        if (r.status === 'fulfilled' && Array.isArray(r.value)) {
          rawArticles.push(...r.value);
          this.cachedSourceArticles.set(src.id, r.value);
          this.sourcesHealth[src.id] = {
            id: src.id,
            name: src.name,
            status: r.value._notModified ? 'cached_304' : 'healthy',
            lastSuccess: cycleFetchedAt,
            articlesCount: r.value.length,
            latestPubDate: r.value[0]?.publishedAt || null,
            latencyMs: r.value._latencyMs || 0
          };
        } else {
          const errorMsg = r.reason?.message || 'Unknown error';
          console.warn(`[IngestionWorker] ⚠️ Source ${src.name} failed: ${errorMsg}`);
          // Reuse last good articles from memory if available
          const existing = this.cachedSourceArticles.get(src.id) || [];
          if (existing.length > 0) rawArticles.push(...existing);

          this.sourcesHealth[src.id] = {
            id: src.id,
            name: src.name,
            status: 'error',
            lastError: errorMsg,
            lastAttempt: cycleFetchedAt
          };
        }
      });

      console.log(`[IngestionWorker] Aggregated ${rawArticles.length} raw articles.`);

      // 1. Deduplicate by fingerprint
      const unique = this.deduplicate(rawArticles);

      // 2. Geocode & Enrich with Aho-Corasick & Article Geolocation Cache
      const enriched = await Promise.all(unique.map(item => this.enrich(item, cycleFetchedAt)));

      // 3. Sort chronologically (newest first)
      enriched.sort((a, b) => b.unixTime - a.unixTime);

      // 4. Update memory store
      enriched.forEach(art => {
        this.articlesStore.set(art.id, art);
      });

      // 5. Pre-compute city clusters
      const clusters = this.getCityClusters(enriched);

      const durationMs = Date.now() - startTime;
      this.lastRunStats = {
        lastRunTime: cycleFetchedAt,
        durationMs,
        totalArticles: enriched.length,
        locatedArticles: enriched.filter(a => a.location).length,
        clustersCount: Object.keys(clusters).length
      };

      console.log(`[IngestionWorker] ✅ Background cycle finished in ${durationMs}ms: ${this.lastRunStats.totalArticles} articles (${this.lastRunStats.locatedArticles} geocoded into ${this.lastRunStats.clustersCount} clusters).`);

      // 6. Share cache across PM2 instances via Redis
      await this.saveToSharedCache(enriched, clusters);

      // 7. Save static backup snapshot to public/dist
      this.saveStaticCache(enriched, clusters);

    } catch (err) {
      console.error('[IngestionWorker] Unexpected cycle failure:', err.message);
    } finally {
      this.isRunning = false;
      await cache.releaseLock('kalchev:lock:refresher');
    }

    return { articles: this.getLatestArticles(150), stats: this.lastRunStats, health: this.sourcesHealth };
  }

  /**
   * Direct HTTP fetch to RSS source (NO CORS PROXIES) with Conditional GETs (ETag / If-Modified-Since)
   */
  async fetchSourceDirect(source, fetchedAt) {
    const t0 = Date.now();

    // Check stored ETag / Last-Modified
    const meta = (await cache.getFeedMeta(source.id)) || {};
    const reqHeaders = {};
    if (meta.etag) reqHeaders['If-None-Match'] = meta.etag;
    if (meta.lastModified) reqHeaders['If-Modified-Since'] = meta.lastModified;

    try {
      const response = await this.httpClient.get(source.url, {
        headers: reqHeaders,
        responseType: 'text'
      });

      // HTTP 304 Not Modified -> Re-use cached articles instantly with 0 payload download
      if (response.status === 304) {
        const cached = this.cachedSourceArticles.get(source.id) || [];
        cached._latencyMs = Date.now() - t0;
        cached._notModified = true;
        return cached;
      }

      // HTTP 200 OK -> Store new conditional headers and parse body with fast-xml-parser
      const newEtag = response.headers['etag'];
      const newLastModified = response.headers['last-modified'];
      if (newEtag || newLastModified) {
        await cache.setFeedMeta(source.id, {
          etag: newEtag,
          lastModified: newLastModified,
          updatedAt: fetchedAt
        });
      }

      const xmlText = response.data;
      const parsedItems = rssParser.parse(xmlText, source.name);

      const items = parsedItems.map(item => {
        const link = item.link || item.guid || source.url;
        const fingerprint = crypto
          .createHash('md5')
          .update(`${item.title.toLowerCase().slice(0, 40)}_${source.id}`)
          .digest('hex');

        return {
          id: fingerprint,
          title: item.title,
          summary: item.summary,
          link: link,
          guid: item.guid || link,
          source: item.publisher || source.name,
          geoHint: source.geoHint || null,
          sourceId: source.id,
          publishedAt: item.pubDate,
          fetchedAt: fetchedAt,
          unixTime: item.unixTime
        };
      });

      items._latencyMs = Date.now() - t0;
      return items;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Enriches an article with location using Aho-Corasick & Article-level Geolocation Cache
   */
  async enrich(item, fetchedAt) {
    const articleKey = (item.link || item.guid || item.id).toLowerCase();

    // 1. Check article geolocation cache (keyed by link or GUID)
    const cachedGeo = await cache.getArticleGeo(articleKey);
    if (cachedGeo) {
      const pubDate = new Date(item.publishedAt);
      const existing = this.articlesStore.get(item.id);
      return {
        ...item,
        firstSeenAt: existing?.firstSeenAt || fetchedAt,
        location: cachedGeo.location,
        isLethal: cachedGeo.isLethal,
        timestamp: pubDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        dateStr: pubDate.toLocaleDateString('bg-BG', { day: 'numeric', month: 'short' })
      };
    }

    const fullText = `${item.title} ${item.summary}`.toLowerCase();

    // Critical / Lethal Incident Detection
    const deathKeywords = /(загинал|починал|жертви|убит|смърт|труп|убийство|ранен)/i;
    const isLethal = deathKeywords.test(fullText);

    // 2. Aho-Corasick Multi-Pattern Search (Single Pass O(N) over text)
    let loc = null;
    const matches = this.cityMatcher.findBestMatches(fullText);
    if (matches.length > 0) {
      const best = matches[0].data;
      loc = {
        name: best.name,
        coords: { lat: best.lat, lng: best.lng }
      };
    }

    // 2b. Google News city feed: if the text had no city, fall back to the feed's city
    if (!loc && item.geoHint && CITY_DB[item.geoHint]) {
      const c = CITY_DB[item.geoHint];
      loc = { name: c.name, coords: { lat: c.lat, lng: c.lng } };
    }

    // 3. Cache geolocation result for this article (persisted for 14 days)
    await cache.setArticleGeo(articleKey, { location: loc, isLethal });

    const pubDate = new Date(item.publishedAt);
    const existing = this.articlesStore.get(item.id);

    return {
      ...item,
      firstSeenAt: existing?.firstSeenAt || fetchedAt,
      location: loc,
      isLethal: isLethal,
      timestamp: pubDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      dateStr: pubDate.toLocaleDateString('bg-BG', { day: 'numeric', month: 'short' })
    };
  }

  deduplicate(items) {
    const seen = new Set();
    return items.filter(item => {
      if (!item.title || item.title.length < 5) return false;
      const key = item.title.toLowerCase().replace(/[^a-zа-я0-9]/gi, '').substring(0, 45);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  getCityClusters(items) {
    const clusters = {};
    items.forEach(item => {
      if (item.location && item.location.name) {
        const city = item.location.name;
        if (!clusters[city]) {
          clusters[city] = {
            name: city,
            coords: item.location.coords,
            count: 0,
            articles: [],
            hasLethal: false
          };
        }
        clusters[city].count++;
        clusters[city].articles.push(item);
        if (item.isLethal) clusters[city].hasLethal = true;
      }
    });
    return clusters;
  }

  getLatestArticles(limit = 100) {
    const all = Array.from(this.articlesStore.values());
    all.sort((a, b) => b.unixTime - a.unixTime);
    return all.slice(0, limit);
  }

  async syncFromSharedCache() {
    try {
      const articles = await cache.get('kalchev:news:articles');
      if (Array.isArray(articles) && articles.length > 0) {
        articles.forEach(a => this.articlesStore.set(a.id, a));
      }
      const health = await cache.get('kalchev:news:health');
      if (health) this.sourcesHealth = health;
    } catch (e) {}
  }

  async saveToSharedCache(articles, clusters) {
    try {
      await cache.set('kalchev:news:articles', articles, 1800);
      await cache.set('kalchev:news:clusters', clusters, 1800);
      await cache.set('kalchev:news:health', this.sourcesHealth, 1800);
    } catch (e) {}
  }

  saveStaticCache(articles, clusters) {
    const payload = JSON.stringify({
      status: 'ok',
      timestamp: Date.now(),
      fetchedAt: new Date().toISOString(),
      count: articles.length,
      articles: articles.slice(0, 150),
      clusters: clusters,
      health: this.sourcesHealth
    }, null, 2);

    const targetPaths = [
      path.resolve(__dirname, '../../../public/news_cache.json'),
      path.resolve(__dirname, '../../../dist/news_cache.json')
    ];

    targetPaths.forEach(target => {
      try {
        const dir = path.dirname(target);
        if (fs.existsSync(dir)) {
          fs.writeFileSync(target, payload, 'utf8');
        }
      } catch (e) {}
    });
  }

  /**
   * Background Scheduler
   * Rebuilds cache every few minutes, serving stale data to clients while it refreshes.
   */
  startScheduler(intervalMinutes = 3) {
    const intervalMs = Math.max(1, intervalMinutes) * 60 * 1000;
    console.log(`[IngestionWorker] Initializing background scheduler (every ${intervalMinutes} min)...`);
    
    // Immediate initial background run
    this.runIngestionCycle().catch(err => {
      console.warn('[IngestionWorker] Initial background run error:', err.message);
    });

    if (this.schedulerTimer) clearInterval(this.schedulerTimer);
    this.schedulerTimer = setInterval(() => {
      this.runIngestionCycle().catch(err => {
        console.warn('[IngestionWorker] Scheduled cycle error:', err.message);
      });
    }, intervalMs);
  }

  stopScheduler() {
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }
}

module.exports = new IngestionWorker();
