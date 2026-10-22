// src/services/newsAggregationService.js
const axios = require('axios');
const rssParser = require('../utils/rssParser');
const geolocationService = require('./geolocationService');
const cache = require('../utils/cache');
const SOURCES = require('../config/newsSources');

/**
 * Service for on-demand or worker-based news aggregation with fast-xml-parser,
 * proxy-free direct fetching, conditional GETs, and per-article geocaching.
 */
class NewsAggregationService {
    constructor() {
        this.httpClient = axios.create({
            timeout: 7000,
            headers: {
                'User-Agent': 'BulgarianNewsMap/2.0 (+https://github.com/kalchevclick)',
                'Accept': 'application/rss+xml, application/xml, text/xml, */*'
            },
            validateStatus: (status) => (status >= 200 && status < 300) || status === 304
        });
    }

    async fetchNews() {
        console.log('[NewsAggregation] Starting news fetch from all sources...');
        const enabledSources = SOURCES.filter(s => s.enabled);

        // Fetch all feeds in parallel directly (no CORS proxies)
        const results = await Promise.allSettled(
            enabledSources.map(source => this.fetchFromSource(source))
        );

        let allArticles = [];
        results.forEach((r, idx) => {
            if (r.status === 'fulfilled' && r.value) {
                allArticles.push(...r.value);
            } else if (r.status === 'rejected') {
                console.error(`[NewsAggregation] Source ${enabledSources[idx].name} failed:`, r.reason.message);
            }
        });

        console.log(`[NewsAggregation] Fetched ${allArticles.length} raw articles.`);

        // Deduplicate and enrich (utilizing article-level geolocation cache)
        const processed = await this.processArticles(allArticles);
        console.log(`[NewsAggregation] Completed. ${processed.length} articles with locations identified.`);

        return processed;
    }

    async fetchFromSource(source) {
        try {
            const meta = (await cache.getFeedMeta(source.id)) || {};
            const headers = {};
            if (meta.etag) headers['If-None-Match'] = meta.etag;
            if (meta.lastModified) headers['If-Modified-Since'] = meta.lastModified;

            const resp = await this.httpClient.get(source.url, { headers, responseType: 'text' });

            if (resp.status === 304) {
                // Not modified, return cached items if stored
                return (await cache.get(`source:raw:${source.id}`)) || [];
            }

            const newEtag = resp.headers['etag'];
            const newLastModified = resp.headers['last-modified'];
            if (newEtag || newLastModified) {
                await cache.setFeedMeta(source.id, { etag: newEtag, lastModified: newLastModified });
            }

            const items = rssParser.parse(resp.data, source.name);
            await cache.set(`source:raw:${source.id}`, items, 1800);
            return items;
        } catch (error) {
            console.warn(`[NewsAggregation] Source ${source.name} failed: ${error.message}`);
            return [];
        }
    }

    async processArticles(articles) {
        // Deduplicate by title
        const seenTitles = new Set();
        const unique = articles.filter(a => {
            if (!a || !a.title) return false;
            const key = a.title.toLowerCase().substring(0, 100);
            if (seenTitles.has(key)) return false;
            seenTitles.add(key);
            return true;
        });

        // Take top articles for processing
        const toProcess = unique.sort((a, b) => (b.unixTime || 0) - (a.unixTime || 0)).slice(0, 50);

        // Geocode with article geolocation cache (hits AI at most once per article)
        const processed = [];
        for (const article of toProcess) {
            try {
                const locations = await geolocationService.extractLocationsFromNews(article);
                if (locations && locations.length > 0) {
                    processed.push({
                        ...article,
                        locations,
                        timestamp: article.unixTime || new Date(article.pubDate).getTime()
                    });
                }
            } catch (err) {
                console.error(`[NewsAggregation] Error processing article "${article.title}":`, err.message);
            }
        }

        return processed.sort((a, b) => b.timestamp - a.timestamp);
    }
}

module.exports = new NewsAggregationService();
