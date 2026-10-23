// src/utils/rssParser.js
const { XMLParser } = require('fast-xml-parser');

/**
 * Ultra-Fast RSS/Atom Feed Parser built on fast-xml-parser.
 * 
 * Replaces slow xml2js / rss-parser with pure JS parser running at C-like speeds
 * (2-5ms per feed vs 50-100ms with xml2js).
 */
class RSSParser {
  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      trimValues: true,
      parseTagValue: false,
      cdataPropName: '__cdata'
    });
  }

  /**
   * Parses XML string into normalized array of news articles
   * @param {string} xmlString - Raw XML content
   * @param {string} sourceName - Source name (e.g. 'Дневник')
   * @returns {Array} Array of normalized raw items
   */
  parse(xmlString, sourceName = '') {
    if (!xmlString || typeof xmlString !== 'string') return [];

    let parsed;
    try {
      parsed = this.parser.parse(xmlString);
    } catch (e) {
      console.warn(`[RSSParser] XML parse error for ${sourceName}:`, e.message);
      return [];
    }

    if (!parsed) return [];

    let rawItems = [];

    // 1. RSS 2.0 / 0.9x format: <rss><channel><item>...</item></channel></rss>
    if (parsed.rss && parsed.rss.channel) {
      const channel = parsed.rss.channel;
      const items = channel.item || [];
      rawItems = Array.isArray(items) ? items : [items];
    }
    // 2. Atom format: <feed><entry>...</entry></feed>
    else if (parsed.feed) {
      const entries = parsed.feed.entry || [];
      rawItems = Array.isArray(entries) ? entries : [entries];
    }
    // 3. RDF format: <rdf:RDF><item>...</item></rdf:RDF>
    else if (parsed['rdf:RDF'] && parsed['rdf:RDF'].item) {
      const items = parsed['rdf:RDF'].item;
      rawItems = Array.isArray(items) ? items : [items];
    }
    // 4. Fallback check for any channel or item structure
    else if (parsed.channel && parsed.channel.item) {
      const items = parsed.channel.item;
      rawItems = Array.isArray(items) ? items : [items];
    }

    return rawItems.map(item => this.normalizeItem(item, sourceName)).filter(Boolean);
  }

  /**
   * Normalizes an item from RSS or Atom into standard format
   */
  normalizeItem(item, sourceName) {
    if (!item || typeof item !== 'object') return null;

    // Title
    const rawTitle = this.extractText(item.title);
    const cleanTitle = this.cleanHtml(rawTitle);
    if (!cleanTitle || cleanTitle.length < 3) return null;

    // Summary / Description / Content
    const rawDesc = this.extractText(
      item.description ||
      item.summary ||
      item['content:encoded'] ||
      item.content ||
      ''
    );
    let cleanSummary = this.cleanHtml(rawDesc).split(' http')[0].trim();

    // Google News: publisher is in <source>; strip the " - Publisher" title suffix
    const publisher = this.cleanHtml(this.extractText(item.source));
    let title = cleanTitle;
    if (publisher && title.endsWith(` - ${publisher}`)) {
      title = title.slice(0, -(publisher.length + 3)).trim();
    }

    // Drop Google's title+publisher description so a name like "Варна Утре" can't fake a city match
    if (publisher) {
      const rest = cleanSummary.split(cleanTitle).join('').split(title).join('').split(publisher).join('').trim();
      if (rest.length < 20) cleanSummary = '';
    }

    // Link
    let link = '';
    if (typeof item.link === 'string') {
      link = item.link;
    } else if (item.link && typeof item.link === 'object') {
      link = item.link['@_href'] || item.link['#text'] || '';
    } else if (item['atom:link'] && item['atom:link']['@_href']) {
      link = item['atom:link']['@_href'];
    }

    // GUID / ID
    let guid = '';
    if (typeof item.guid === 'string') {
      guid = item.guid;
    } else if (item.guid && typeof item.guid === 'object') {
      guid = item.guid['#text'] || item.guid['@_isPermaLink'] || '';
    } else if (item.id) {
      guid = this.extractText(item.id);
    }
    if (!link && guid && guid.startsWith('http')) {
      link = guid;
    }

    // PubDate
    const rawDate = item.pubDate || item.published || item.updated || item['dc:date'] || '';
    const dateObj = this.parseDate(rawDate);

    return {
      title: title,
      summary: cleanSummary,
      link: link || '#',
      guid: guid || link || cleanTitle,
      pubDate: dateObj.toISOString(),
      unixTime: dateObj.getTime(),
      source: sourceName,
      publisher: publisher || ''
    };
  }

  extractText(node) {
    if (!node) return '';
    if (typeof node === 'string') return node;
    if (typeof node === 'number') return String(node);
    if (node.__cdata) return String(node.__cdata);
    if (node['#text']) return String(node['#text']);
    return '';
  }

  cleanHtml(html) {
    if (!html) return '';
    return html
      .replace(/<[^>]*>?/gm, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  parseDate(dateStr) {
    if (!dateStr) return new Date();
    let str = String(dateStr).trim();
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(str)) {
      str = str.replace(' ', 'T') + 'Z';
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? new Date() : d;
  }
}

module.exports = new RSSParser();
