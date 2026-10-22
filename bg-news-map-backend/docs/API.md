# API Documentation

## News Endpoints

### Get Processed News
`GET /api/news`

Returns recent news with extracted locations.

**Query Parameters:**
- `confidence`: (0.0 - 1.0) Filter by minimum confidence score. Default: `0.6`.
- `limit`: Number of articles to return. Default: `50`.

**Response:**
```json
{
  "success": true,
  "count": 1,
  "cached": false,
  "timestamp": 123456789,
  "data": [
    {
      "title": "Протест пред общината във Варна",
      "summary": "Граждани се събраха пред сградата на община Варна...",
      "url": "https://...",
      "source": "БНР",
      "locations": [
        {
          "id": "varna",
          "name": "Варна",
          "coordinates": { "lat": 43.21, "lng": 27.91 },
          "confidence": 0.9
        }
      ]
    }
  ]
}
```

## System Endpoints

### Health Check
`GET /health`

### Supported Locations
`GET /api/news/locations`
Lists all cities currently in the database.
