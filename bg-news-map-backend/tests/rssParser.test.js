// tests/rssParser.test.js
const rssParser = require('../src/utils/rssParser');

describe('Fast XML RSS Parser', () => {
    test('should parse standard RSS 2.0 feed', () => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
            <channel>
                <title>Bulgarian News</title>
                <link>https://example.com</link>
                <item>
                    <title><![CDATA[Реконструкция на булевард в София]]></title>
                    <description>Ремонтните дейности започват от утре в центъра.</description>
                    <link>https://example.com/news/1</link>
                    <guid>news-1</guid>
                    <pubDate>Mon, 20 Oct 2026 09:00:00 +0300</pubDate>
                </item>
            </channel>
        </rss>`;

        const items = rssParser.parse(xml, 'ТестНовини');
        expect(items.length).toBe(1);
        expect(items[0].title).toBe('Реконструкция на булевард в София');
        expect(items[0].summary).toBe('Ремонтните дейности започват от утре в центъра.');
        expect(items[0].link).toBe('https://example.com/news/1');
        expect(items[0].source).toBe('ТестНовини');
        expect(items[0].unixTime).toBeGreaterThan(0);
    });

    test('should parse Atom feed', () => {
        const atomXml = `<?xml version="1.0" encoding="utf-8"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
            <title>Atom Feed</title>
            <entry>
                <title>Морски новини от Варна</title>
                <summary>Сезонът започва с голям брой круизни кораби.</summary>
                <link href="https://example.com/atom/1"/>
                <id>urn:uuid:12345</id>
                <updated>2026-10-20T08:30:00Z</updated>
            </entry>
        </feed>`;

        const items = rssParser.parse(atomXml, 'ВарнаFeed');
        expect(items.length).toBe(1);
        expect(items[0].title).toBe('Морски новини от Варна');
        expect(items[0].link).toBe('https://example.com/atom/1');
    });
});
