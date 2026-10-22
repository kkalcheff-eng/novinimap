// tests/ahoCorasick.test.js
const AhoCorasick = require('../src/utils/ahoCorasick');

describe('Aho-Corasick Multi-Pattern Matcher', () => {
    test('should match single and multi-word Bulgarian cities in O(N)', () => {
        const ac = new AhoCorasick();
        ac.addPattern('софия', { id: 'sofia', name: 'София' });
        ac.addPattern('пловдив', { id: 'plovdiv', name: 'Пловдив' });
        ac.addPattern('велико търново', { id: 'vt', name: 'Велико Търново' });
        ac.addPattern('търново', { id: 'tarnovo', name: 'Търново' });
        ac.build();

        const text = 'Нови проекти стартират във Велико Търново и София днес.';
        const matches = ac.findBestMatches(text);

        const names = matches.map(m => m.data.name);
        expect(names).toContain('Велико Търново');
        expect(names).toContain('София');
        // Longest match should win: 'Велико Търново' instead of just 'Търново'
        expect(names).not.toContain('Търново');
    });

    test('should enforce word boundaries and not match substrings inside unrelated words', () => {
        const ac = new AhoCorasick();
        ac.addPattern('лом', { id: 'lom', name: 'Лом' });
        ac.build();

        // "дипломат" contains "лом", but should NOT match
        const text1 = 'Българският дипломат пристигна на срещата.';
        const matches1 = ac.findBestMatches(text1);
        expect(matches1.length).toBe(0);

        // Standalone "Лом" should match
        const text2 = 'В пристанище Лом пристигна нов кораб.';
        const matches2 = ac.findBestMatches(text2);
        expect(matches2.length).toBe(1);
        expect(matches2[0].data.name).toBe('Лом');
    });
});
