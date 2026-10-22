// src/services/keywordMatchingService.js
const cities = require('../data/locations/cities');
const normalizationService = require('./locationNormalizationService');
const config = require('../config/mapConfig');
const AhoCorasick = require('../utils/ahoCorasick');

/**
 * Ultra-Fast Keyword Matching Service using Aho-Corasick Automaton.
 * Replaces O(K * N) per-city regex checks with a single O(N) pass across all
 * Bulgarian cities, latin names, alternate names, and regional keywords.
 */
class KeywordMatchingService {
    constructor() {
        this.locations = cities;
        this.ahoCorasick = new AhoCorasick();
        this.initializeIndex();
    }

    /**
     * Builds the Aho-Corasick automaton with all city names and aliases
     */
    initializeIndex() {
        this.locations.forEach(loc => {
            // Add primary name
            this.addPattern(loc.name, loc, 'primary');
            this.addPattern(loc.latinName, loc, 'latin');

            // Add alternate names
            if (Array.isArray(loc.alternateNames)) {
                loc.alternateNames.forEach(alt => this.addPattern(alt, loc, 'alternate'));
            }

            // Add keywords
            if (Array.isArray(loc.keywords)) {
                loc.keywords.forEach(kw => this.addPattern(kw, loc, 'keyword'));
            }
        });

        this.ahoCorasick.build();
    }

    addPattern(key, location, matchType) {
        if (!key) return;
        const normalized = normalizationService.normalize(key);
        if (normalized) {
            this.ahoCorasick.addPattern(normalized, { ...location, matchType });
        }
    }

    /**
     * Extracts locations from text using Aho-Corasick multi-pattern search in O(N)
     */
    extractLocations(text) {
        if (!text) return [];

        const normalizedText = normalizationService.normalize(text);
        const matches = this.ahoCorasick.findBestMatches(normalizedText);

        const results = new Map();
        matches.forEach(m => {
            const loc = m.data;
            if (loc && loc.id && !results.has(loc.id)) {
                results.set(loc.id, loc);
            }
        });

        return Array.from(results.values());
    }

    /**
     * Calculates confidence scores for extracted locations
     */
    scoreLocations(matchedLocations, title, summary) {
        const fullText = (title + ' ' + summary).toLowerCase();
        const normalizedTitle = normalizationService.normalize(title);

        return matchedLocations.map(loc => {
            let score = config.confidence.base;

            // Exact name match in text (Cyrillic or Latin)
            const nameMatch = fullText.includes(loc.name.toLowerCase()) ||
                (loc.latinName && fullText.includes(loc.latinName.toLowerCase()));
            if (nameMatch) {
                score += config.confidence.exactMatch;
            }

            // Location mentioned in article title
            if (normalizedTitle.includes(normalizationService.normalize(loc.name)) ||
                (loc.latinName && normalizedTitle.includes(normalizationService.normalize(loc.latinName)))) {
                score += config.confidence.titleMatch;
            }

            // Is capital city
            if (loc.isCapital) {
                score += config.confidence.isCapital;
            }

            // Ambiguous context (generic mention)
            const genericKeywords = ['в страната', 'населени места', 'градовете', 'областите'];
            if (genericKeywords.some(gk => fullText.includes(gk))) {
                score -= config.confidence.ambiguousContext;
            }

            // Clamp score between 0.0 and 1.0
            score = Math.max(0, Math.min(1.0, score));

            return {
                ...loc,
                confidence: parseFloat(score.toFixed(2))
            };
        }).filter(loc => loc.confidence >= config.confidence.threshold);
    }
}

module.exports = new KeywordMatchingService();
