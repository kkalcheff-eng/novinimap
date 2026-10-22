# Bulgarian News Map Backend

## Description
Advanced news aggregation and geolocation system for Bulgarian news. This backend extracts location mentions from news articles with high precision using weighted confidence scores and geographic validation.

## Features
- **Accurate Locating**: Matches Bulgarian cities by name, latin variants, and descriptors (e.g., "морската столица").
- **Confidence Scoring**: Filters out ambiguous results using context-aware scoring.
- **Geographic Validation**: Ensures all pins are within Bulgaria's borders and deduplicates nearby detections.
- **Deduplication**: Automatically handles multiple references to the same area in a single article.
- **Transliteration**: Supports both Cyrillic and Latin search terms.

## Installation
```bash
cd bg-news-map-backend
npm install
```

## Running the Server
```bash
npm start
```
By default, the server runs on `http://localhost:3000`.

## API Endpoints
- `GET /api/news`: Get the latest geolocated news articles.
- `GET /api/news/locations`: Get the list of all supported Bulgarian cities.
- `GET /health`: Server health check.

## Architecture
See `docs/ARCHITECTURE.md` for a detailed breakdown.
