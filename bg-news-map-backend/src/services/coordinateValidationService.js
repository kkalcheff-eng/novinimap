// src/services/coordinateValidationService.js
const config = require('../config/mapConfig');

class CoordinateValidationService {
    constructor() {
        this.bounds = config.geo.bounds;
    }

    /**
     * Checks if coordinates are within Bulgaria's boundaries
     */
    isWithinBulgaria(coords) {
        if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
            return false;
        }
        return (
            coords.lat <= this.bounds.north &&
            coords.lat >= this.bounds.south &&
            coords.lng <= this.bounds.east &&
            coords.lng >= this.bounds.west
        );
    }

    /**
     * Calculates Haversine distance between two points in km
     */
    calculateDistance(coord1, coord2) {
        const R = 6371; // Earth's radius in km
        const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
        const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Checks if two coordinates are within a certain threshold
     */
    areCoordinatesClose(coord1, coord2, thresholdKm = 15) {
        return this.calculateDistance(coord1, coord2) <= thresholdKm;
    }

    /**
     * Normalizes coordinate input to { lat, lng } object
     */
    normalizeCoordinates(input) {
        if (Array.isArray(input)) {
            return { lat: parseFloat(input[0]), lng: parseFloat(input[1]) };
        }
        if (typeof input === 'object' && input !== null) {
            return {
                lat: parseFloat(input.lat || input.latitude),
                lng: parseFloat(input.lng || input.longitude || input.lon)
            };
        }
        return null;
    }
}

module.exports = new CoordinateValidationService();
