// src/services/geolocationService.js
const crypto = require('crypto');
const aiService = require('./aiService');
const nominatimService = require('./nominatimService');
const coordinateValidationService = require('./coordinateValidationService');
const keywordMatchingService = require('./keywordMatchingService');
const cache = require('../utils/cache');
const config = require('../config/mapConfig');

/**
 * Two-Tier Geolocation Service with Per-Article Caching.
 * 
 * Guarantees:
 * 1. Each article hits OpenAI/Ollama at most ONCE, ever. Results are cached by link/GUID/fingerprint.
 * 2. Tier 1: Fast Aho-Corasick multi-pattern keyword match (<1ms, free).
 * 3. Tier 2: AI extraction called only if Tier 1 misses, with results persisted to Redis.
 */
class GeolocationService {
    async extractLocationsFromNews(article) {
        const { title, summary, link, guid, id } = article;
        const text = `${title} ${summary}`;

        // Generate stable article key for geolocation cache
        const articleKey = (link || guid || id || crypto.createHash('md5').update(`${title}_${article.source || ''}`).digest('hex')).toLowerCase();

        // 1. Check article geolocation cache (L1 Memory / L2 Redis)
        const cachedLocations = await cache.getArticleGeo(articleKey);
        if (cachedLocations && Array.isArray(cachedLocations)) {
            return cachedLocations;
        }

        let matches = [];

        // 2. TIER 1: Fast Aho-Corasick Keyword Match (<1ms, 0 AI cost)
        let kwMatches = keywordMatchingService.extractLocations(text);
        if (kwMatches.length > 0) {
            kwMatches = keywordMatchingService.scoreLocations(kwMatches, title, summary);
            matches = kwMatches.filter(loc => coordinateValidationService.isWithinBulgaria(loc.coordinates));
        }

        // 3. TIER 2: Fallback to AI (Ollama / OpenAI) only if Tier 1 found no matches
        if (matches.length === 0) {
            console.log(`[GeoService] Tier 1 miss. Calling AI for: "${title.substring(0, 45)}..."`);
            try {
                const aiData = await aiService.extractData(text);
                if (aiData && (aiData.city || aiData.location_text)) {
                    let locationText = (aiData.location_text || '').toLowerCase()
                        .replace(/в района на|в близост до|край|до|край града|гр\.|град/g, '')
                        .trim();

                    const query = locationText ? `${locationText}, ${aiData.city || ''}, България` : `${aiData.city || ''}, България`;
                    const geoResult = await nominatimService.geocode(query);

                    if (geoResult && coordinateValidationService.isWithinBulgaria(geoResult.coordinates)) {
                        matches.push({
                            id: aiData.city?.toLowerCase() || 'unknown',
                            name: geoResult.name,
                            coordinates: geoResult.coordinates,
                            confidence: 0.9,
                            category: aiData.category || 'news',
                            summary: aiData.summary,
                            matchType: 'ai'
                        });
                    }
                }
            } catch (err) {
                console.warn(`[GeoService] AI extraction failed for "${title}":`, err.message);
            }
        }

        // 4. Deduplication
        matches = this.deduplicateNearby(matches);

        const finalMatches = matches
            .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
            .slice(0, config.geo.maxLocationsPerArticle);

        // 5. Persist to Geolocation Cache (long TTL so each article hits AI once, ever)
        await cache.setArticleGeo(articleKey, finalMatches);

        return finalMatches;
    }

    deduplicateNearby(locations) {
        if (locations.length <= 1) return locations;
        const sorted = [...locations].sort((a, b) => b.confidence - a.confidence);
        const unique = [];
        for (const current of sorted) {
            const isNearExisting = unique.some(existing =>
                coordinateValidationService.areCoordinatesClose(
                    current.coordinates,
                    existing.coordinates,
                    config.geo.deduplicationDistanceKm
                )
            );
            if (!isNearExisting) unique.push(current);
        }
        return unique;
    }
}

module.exports = new GeolocationService();
