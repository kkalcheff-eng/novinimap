// tests/matching.test.js
const keywordMatchingService = require('../src/services/keywordMatchingService');

describe('Keyword Matching Service', () => {
    test('should extract Sofia by name in Bulgarian', () => {
        const results = keywordMatchingService.extractLocations('Новини от София');
        const ids = results.map(r => r.id);
        expect(ids).toContain('sofia');
    });

    test('should extract Varna by keyword', () => {
        const results = keywordMatchingService.extractLocations('Морската столица събира туристи');
        const ids = results.map(r => r.id);
        expect(ids).toContain('varna');
    });

    test('should score locations correctly', () => {
        const matches = [{ id: 'sofia', name: 'София', latinName: 'Sofia', isCapital: true }];
        const scored = keywordMatchingService.scoreLocations(
            matches,
            'Пожар в София',
            'В столицата имаше пожар'
        );
        expect(scored[0].confidence).toBeGreaterThan(0.8);
    });
});
