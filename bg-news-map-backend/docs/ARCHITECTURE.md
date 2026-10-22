# Backend Architecture - Bulgarian News Map (v2.0)

## Overview
The v2.0 high-performance backend is designed for high throughput, sub-15ms response latency, and accurate Bulgarian location extraction. It features background ingestion with stale-while-revalidate, an article-level geolocation cache, direct proxy-free feed fetching with conditional GETs (ETag / If-Modified-Since), shared Redis caching across PM2 instances, `fast-xml-parser`, and a compiled Aho-Corasick multi-pattern automaton.

## Directory Structure
```
src/
├── config/             # Configuration parameters (bounds, thresholds, news sources)
├── data/               # Static location data (50+ cities, regions, keywords)
├── routes/             # API endpoints (/api/news with ETag, 304, & SWR)
├── services/           # Core business logic
│   ├── aiService.js                    # Ollama / OpenAI structured extraction
│   ├── coordinateValidationService.js  # Geographic checks & bounds
│   ├── geolocationService.js          # Two-tier orchestrator with article geocaching
│   ├── keywordMatchingService.js      # Aho-Corasick keyword search
│   ├── locationNormalizationService.js # Cyrillic normalization & transliteration
│   ├── newsAggregationService.js      # Direct fetch with conditional GETs
│   └── nominatimService.js            # OSM Nominatim geocoding fallback
├── utils/              # Helper utilities
│   ├── ahoCorasick.js  # Compiled Aho-Corasick multi-pattern matcher (O(N) pass)
│   ├── cache.js        # Dual-layer shared cache (L1 Memory + L2 Redis)
│   ├── logger.js       # Winston logging
│   └── rssParser.js    # High-speed RSS/Atom parser (fast-xml-parser)
├── workers/
│   └── ingestionWorker.js # Background scheduler, PM2 leader lock, direct fetch
└── server.js           # Entry point & background scheduler boot
```

## Key Architectural Highlights

### 1. Background Refresher & Stale-While-Revalidate
- A background scheduler runs every 3 minutes to rebuild the news cache.
- Incoming HTTP requests are served in < 5ms from the active cache without blocking on network requests or AI calls.

### 2. Article-Level Geolocation Caching
- Geolocation results are cached in Redis keyed by the article's link or GUID (`kalchev:geo:<id>`).
- Each article hits OpenAI or Ollama at most once, ever, completely eliminating the +500ms per article serial penalty.

### 3. Direct Feed Ingestion & Conditional GETs
- CORS proxies (`allorigins`, `corsproxy.io`) are completely dropped. The server connects directly to news publishers.
- Requests pass `If-None-Match` (ETag) and `If-Modified-Since`. Unchanged feeds return `HTTP 304 Not Modified` with 0 byte transfer in < 50ms.

### 4. Shared Cache & Single Refresher Across PM2 Instances
- Only 1 PM2 instance holds the distributed lock (`kalchev:lock:refresher`) to fetch feeds.
- All PM2 instances share the unified Redis cache, cutting redundant upstream requests by 3x.

### 5. `fast-xml-parser` and Aho-Corasick Multi-Pattern Matcher
- Replaced `xml2js` with `fast-xml-parser` (5-10x faster parsing, 2-5ms per feed).
- Replaced per-city regex loops with a single $O(N)$ Aho-Corasick automaton with Cyrillic word boundary checks.
