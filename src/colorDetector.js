// src/colorDetector.js

/**
 * Lightweight Car Color Detection using Canvas API
 * No external dependencies - pure browser APIs
 */

export class ColorDetector {
    constructor() {
        this.tempCanvas = document.createElement('canvas');
        this.tempCtx = this.tempCanvas.getContext('2d', { willReadFrequently: true });
    }

    /**
     * Extract average RGB from a bounding box region
     */
    extractRegionColor(video, boundingBox) {
        const { originX, originY, width, height } = boundingBox;

        // Set canvas size to match region
        this.tempCanvas.width = width;
        this.tempCanvas.height = height;

        // Draw the cropped region
        this.tempCtx.drawImage(
            video,
            originX, originY, width, height,
            0, 0, width, height
        );

        // Get pixel data
        const imageData = this.tempCtx.getImageData(0, 0, width, height);
        return this.getAverageColor(imageData);
    }

    /**
     * Calculate average RGB values from ImageData
     */
    getAverageColor(imageData) {
        const data = imageData.data;
        let r = 0, g = 0, b = 0;
        const pixelCount = data.length / 4;

        for (let i = 0; i < data.length; i += 4) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
        }

        return {
            r: Math.round(r / pixelCount),
            g: Math.round(g / pixelCount),
            b: Math.round(b / pixelCount)
        };
    }

    /**
     * Convert RGB to color name
     */
    rgbToColorName(rgb) {
        const { r, g, b } = rgb;

        // Calculate brightness and saturation
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const brightness = (max + min) / 2;
        const saturation = max === 0 ? 0 : (max - min) / max;

        // Achromatic colors (low saturation)
        if (saturation < 0.15) {
            if (brightness > 200) return 'white';
            if (brightness < 50) return 'black';
            if (brightness > 150) return 'silver';
            return 'gray';
        }

        // Chromatic colors (high saturation)
        const dominantChannel = Math.max(r, g, b);

        if (dominantChannel === r) {
            if (g > 100 && b < 100) return 'yellow'; // Red + Green = Yellow
            if (g < 100 && b < 100) return 'red';
            if (g < 150 && b > 100) return 'purple';
        }

        if (dominantChannel === g) {
            if (r < 100 && b < 100) return 'green';
            if (r > 100 && b < 100) return 'yellow';
            if (b > 100) return 'cyan';
        }

        if (dominantChannel === b) {
            if (r < 100 && g < 100) return 'blue';
            if (r > 100) return 'purple';
        }

        return 'unknown';
    }

    /**
     * Main detection method
     */
    detectCarColor(video, boundingBox) {
        try {
            const rgb = this.extractRegionColor(video, boundingBox);
            return this.rgbToColorName(rgb);
        } catch (error) {
            console.warn('[ColorDetector] Error:', error.message);
            return 'unknown';
        }
    }

    /**
     * Get display-friendly color with emoji
     */
    getColorDisplay(colorName) {
        const colorEmojis = {
            white: '⚪',
            black: '⚫',
            gray: '🔘',
            silver: '⚪',
            red: '🔴',
            blue: '🔵',
            green: '🟢',
            yellow: '🟡',
            purple: '🟣',
            cyan: '🔵',
            brown: '🟤',
            unknown: '❓'
        };

        return `${colorEmojis[colorName] || '❓'} ${colorName.toUpperCase()}`;
    }
}
