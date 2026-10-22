// src/services/nominatimService.js
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

class NominatimService {
    async geocode(query) {
        try {
            // Respect Nominatim Usage Policy (1 request per second)
            await new Promise(r => setTimeout(r, 1000));

            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=bg`;
            const resp = await fetch(url, {
                headers: {
                    'Accept-Language': 'bg',
                    'User-Agent': 'KalchevClick-NewsMap/1.0'
                }
            });

            if (!resp.ok) return null;

            const data = await resp.json();
            if (data && data.length > 0) {
                return {
                    name: data[0].display_name.split(',')[0],
                    coordinates: {
                        lat: parseFloat(data[0].lat),
                        lng: parseFloat(data[0].lon)
                    }
                };
            }
        } catch (error) {
            console.error('[NominatimService] Geocoding error:', error.message);
            return null;
        }
        return null;
    }
}

module.exports = new NominatimService();
