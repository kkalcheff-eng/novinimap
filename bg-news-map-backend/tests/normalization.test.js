// tests/normalization.test.js
const normalizationService = require('../src/services/locationNormalizationService');

describe('Location Normalization Service', () => {
    test('should transliterate Cyrillic to Latin', () => {
        expect(normalizationService.transliterate('София')).toBe('Sofiya');
        expect(normalizationService.transliterate('Варна')).toBe('Varna');
    });

    test('should normalize text for matching', () => {
        expect(normalizationService.normalize('София-ГРАД')).toBe('софия-град');
        expect(normalizationService.normalize('Варне')).toBe('варна');
    });

    test('should generate variants', () => {
        const variants = normalizationService.generateVariants('София');
        expect(variants).toContain('софия');
        expect(variants).toContain('sofiya');
    });
});
