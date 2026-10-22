// src/config/mapConfig.js

module.exports = {
    // Confidence scoring thresholds
    confidence: {
        base: 0.5,
        exactMatch: 0.2,
        titleMatch: 0.2,
        isCapital: 0.1,
        ambiguousContext: -0.1,
        threshold: 0.6
    },

    // Geographic settings
    geo: {
        // Bulgaria's geographic boundaries
        bounds: {
            north: 44.2167,
            south: 41.2349,
            east: 28.5589,
            west: 22.3571
        },
        // Distance in km for deduplicating nearby locations
        deduplicationDistanceKm: 15,
        maxLocationsPerArticle: 5
    },

    // Cache settings
    cache: {
        newsTtl: 300, // 5 minutes in seconds
        checkPeriod: 60
    }
};
