// src/newsMapService.js

/**
 * KALCHEV CLICK - CORE NEWS ENGINE (v4.5 - HIGH CAPACITY & CLUSTERING)
 * Aggregates Bulgarian news feeds with location geocoding, cluster grouping, and incident detection.
 */

const SOURCES = [
  { id: 'dnevnik', name: 'Дневник', url: 'https://www.dnevnik.bg/rss/' },
  { id: 'mediapool', name: 'Mediapool', url: 'https://www.mediapool.bg/rss/' },
  { id: '24chasa', name: '24 Часа', url: 'https://www.24chasa.bg/rss' },
  { id: 'capital', name: 'Капитал', url: 'https://www.capital.bg/rss/' },
  { id: 'economic', name: 'Economic.bg', url: 'https://www.economic.bg/bg/rss.xml' },
  { id: 'banker', name: 'Банкеръ', url: 'https://banker.bg/feed/' },
  { id: 'podtepeto', name: 'Под Тепето (Пловдив)', url: 'https://podtepeto.com/feed/' },
  { id: 'varnautre', name: 'Варна Утре', url: 'https://varnautre.bg/feed/' },
  { id: 'burgasnews', name: 'Бургас Новини', url: 'https://burgasnews.com/feed/' },
  { id: 'stzagora', name: 'Стара Загора Нет', url: 'https://stzagora.net/feed/' }
];

// Bulgarian cities and coordinates
export const CITY_DB = {
  'софия': { lat: 42.6977, lng: 23.3219, name: 'София' },
  'пловдив': { lat: 42.1354, lng: 24.7453, name: 'Пловдив' },
  'варна': { lat: 43.2141, lng: 27.9147, name: 'Варна' },
  'бургас': { lat: 42.5048, lng: 27.4626, name: 'Бургас' },
  'русе': { lat: 43.8356, lng: 25.9657, name: 'Русе' },
  'стара загора': { lat: 42.4258, lng: 25.6345, name: 'Стара Загора' },
  'плевен': { lat: 43.4170, lng: 24.6067, name: 'Плевен' },
  'сливен': { lat: 42.6817, lng: 26.3229, name: 'Сливен' },
  'добрич': { lat: 43.5726, lng: 27.8273, name: 'Добрич' },
  'шумен': { lat: 43.2712, lng: 26.9361, name: 'Шумен' },
  'перник': { lat: 42.6052, lng: 23.0378, name: 'Перник' },
  'хасково': { lat: 41.9344, lng: 25.5556, name: 'Хасково' },
  'ямбол': { lat: 42.4842, lng: 26.5035, name: 'Ямбол' },
  'пазарджик': { lat: 42.1928, lng: 24.3336, name: 'Пазарджик' },
  'благоевград': { lat: 42.0118, lng: 23.0999, name: 'Благоевград' },
  'велико търново': { lat: 43.0757, lng: 25.6172, name: 'Велико Търново' },
  'търново': { lat: 43.0757, lng: 25.6172, name: 'Велико Търново' },
  'враца': { lat: 43.2102, lng: 23.5529, name: 'Враца' },
  'габрово': { lat: 42.8710, lng: 25.3214, name: 'Габрово' },
  'видин': { lat: 43.9892, lng: 22.8778, name: 'Видин' },
  'асеновград': { lat: 42.0114, lng: 24.8778, name: 'Асеновград' },
  'казанлък': { lat: 42.6194, lng: 25.3931, name: 'Казанлък' },
  'кърджали': { lat: 41.6444, lng: 25.3672, name: 'Кърджали' },
  'кюстендил': { lat: 42.2839, lng: 22.6911, name: 'Кюстендил' },
  'монтана': { lat: 43.4125, lng: 23.2250, name: 'Монтана' },
  'търговище': { lat: 43.2500, lng: 26.5667, name: 'Търговище' },
  'димитровград': { lat: 42.0500, lng: 25.5833, name: 'Димитровград' },
  'разград': { lat: 43.5333, lng: 26.5167, name: 'Разград' },
  'силистра': { lat: 44.1167, lng: 27.2667, name: 'Силистра' },
  'ловеч': { lat: 43.1333, lng: 24.7167, name: 'Ловеч' },
  'дупница': { lat: 42.2667, lng: 23.1167, name: 'Дупница' },
  'петрич': { lat: 41.4000, lng: 23.2167, name: 'Петрич' },
  'смолян': { lat: 41.5833, lng: 24.7000, name: 'Смолян' },
  'сандански': { lat: 41.5667, lng: 23.2833, name: 'Сандански' },
  'самоков': { lat: 42.3333, lng: 23.5500, name: 'Самоков' },
  'лом': { lat: 43.8167, lng: 23.2333, name: 'Лом' },
  'свищов': { lat: 43.6167, lng: 25.3500, name: 'Свищов' },
  'карлово': { lat: 42.6333, lng: 24.8167, name: 'Карлово' },
  'велинград': { lat: 42.0333, lng: 24.0000, name: 'Велинград' },
  'нова загора': { lat: 42.4833, lng: 26.0167, name: 'Нова Загора' },
  'троян': { lat: 42.8833, lng: 24.7167, name: 'Троян' },
  'айтос': { lat: 42.7000, lng: 27.2500, name: 'Айтос' },
  'ботевград': { lat: 42.9000, lng: 23.7833, name: 'Ботевград' },
  'пещера': { lat: 42.0333, lng: 24.3000, name: 'Пещера' },
  'харманли': { lat: 41.9333, lng: 25.9000, name: 'Харманли' },
  'гоце делчев': { lat: 41.5667, lng: 23.7333, name: 'Гоце Делчев' },
  'свиленград': { lat: 41.7667, lng: 26.2000, name: 'Свиленград' },
  'панагюрище': { lat: 42.5000, lng: 24.1833, name: 'Панагюрище' },
  'чирпан': { lat: 42.2000, lng: 25.3333, name: 'Чирпан' },
  'банско': { lat: 41.8383, lng: 23.4885, name: 'Банско' },
  'козлодуй': { lat: 43.7833, lng: 23.7333, name: 'Козлодуй' }
};

// Fallback seed dataset, used only if the backend and cache are unavailable
const FALLBACK_SEED = [
  {
    title: 'Дневник: Столичният общински съвет прие мащабен план за рехабилитация на булеварди в София',
    summary: 'Новите трасета ще обхванат ключови артерии в столицата и ще осигурят обособени ленти за градския транспорт.',
    link: 'https://www.dnevnik.bg',
    source: 'Дневник',
    pubDate: new Date().toISOString()
  },
  {
    title: 'Под Тепето: Мащабна реставрация на археологическия комплекс и Стария град в Пловдив',
    summary: 'Проектът осигурява нови туристически маршрути и експозиционни зали на открито.',
    link: 'https://podtepeto.com',
    source: 'Под Тепето',
    pubDate: new Date(Date.now() - 1800000).toISOString()
  },
  {
    title: 'Варна Утре: Рекорден брой кораби и круизни пътници очакват на морска гара във Варна',
    summary: 'Морската столица посреща новия сезон с обновена крайбрежна алея и инфраструктура.',
    link: 'https://varnautre.bg',
    source: 'https://varnautre.bg',
    pubDate: new Date(Date.now() - 3600000).toISOString()
  },
  {
    title: 'Бургас Новини: Нов индустриален и логистичен парк отваря стотици работни места в Бургас',
    summary: 'Инвеститорите влагат над 50 млн. лева във високотехнологични складови площи до пристанището.',
    link: 'https://burgasnews.com',
    source: 'Бургас Новини',
    pubDate: new Date(Date.now() - 5400000).toISOString()
  },
  {
    title: '24 Часа: Тежка катастрофа между два товарни автомобила затруднява движението край Русе',
    summary: 'Екипи на Пътна полиция и пожарната са на място край Дунав мост за обезопасяване на пътното платно.',
    link: 'https://www.24chasa.bg',
    source: '24 Часа',
    pubDate: new Date(Date.now() - 7200000).toISOString()
  },
  {
    title: 'Стара Загора Нет: Модернизация на водоснабдителната мрежа стартира в Стара Загора',
    summary: 'Ремонтните дейности ще подобрят налягането и качеството на питейната вода в три квартала.',
    link: 'https://stzagora.net',
    source: 'Стара Загора',
    pubDate: new Date(Date.now() - 9000000).toISOString()
  },
  {
    title: 'Капитал: Големи технологични инвестиции в индустриалната зона на Велико Търново',
    summary: 'Производствени компании разширяват базите си в района на старопрестолния град.',
    link: 'https://www.capital.bg',
    source: 'Капитал',
    pubDate: new Date(Date.now() - 10800000).toISOString()
  },
  {
    title: 'Mediapool: Нова апаратура за ранна диагностика получи университетската болница в Плевен',
    summary: 'Здравното заведение вече разполага с най-съвременния скенер в Северна България.',
    link: 'https://www.mediapool.bg',
    source: 'Mediapool',
    pubDate: new Date(Date.now() - 12600000).toISOString()
  },
  {
    title: 'Economic.bg: Туристически бум в Банско и Смолян за предстоящите почивни дни',
    summary: 'Хотелиерите в курортите отчитат над 90% заетост на базата за планински и уикенд туризъм.',
    link: 'https://www.economic.bg',
    source: 'https://www.economic.bg',
    pubDate: new Date(Date.now() - 14400000).toISOString()
  },
  {
    title: 'Банкеръ: Изграждат нов модерен транспортен възел и околовръстно трасе около Благоевград',
    summary: 'Проектът ще изведе транзитния трафик от центъра към главен път Е-79.',
    link: 'https://banker.bg',
    source: 'Банкеръ',
    pubDate: new Date(Date.now() - 16200000).toISOString()
  },
  {
    title: 'Дневник: В София откриват международен фестивал за дигитално изкуство и иновации',
    summary: 'Събитието събира водещи артисти и програмисти от цяла Европа в центъра на града.',
    link: 'https://www.dnevnik.bg',
    source: 'https://www.dnevnik.bg',
    pubDate: new Date(Date.now() - 18000000).toISOString()
  },
  {
    title: 'Под Тепето: Пловдив домакин на национален форум за зелени градски политики',
    summary: 'Експерти обсъждат намаляването на вредните емисии и изграждането на нови паркове.',
    link: 'https://podtepeto.com',
    source: 'Под Тепето',
    pubDate: new Date(Date.now() - 19800000).toISOString()
  },
  {
    title: 'Варна Утре: Ремонт на Аспарухов мост във Варна ще подобри безопасността на съоръжението',
    summary: 'Инженерните екипи работят по подмяна на фуги и ново асфалтово покритие.',
    link: 'https://varnautre.bg',
    source: 'varnautre',
    pubDate: new Date(Date.now() - 21600000).toISOString()
  },
  {
    title: '24 Часа: Пожар в сухи треви край Хасково беше локализиран бързо от огнеборците',
    summary: 'Няма пострадали хора и материални щети по близките сгради благодарение на бързата реакция.',
    link: 'https://www.24chasa.bg',
    source: 'https://www.24chasa.bg',
    pubDate: new Date(Date.now() - 23400000).toISOString()
  },
  {
    title: 'Капитал: Модернизация на жп възела в Карлово и Казанлък по европейска програма',
    summary: 'Скоростната линия ще съкрати времето за пътуване между Подбалкана и София.',
    link: 'https://www.capital.bg',
    source: 'Капитал',
    pubDate: new Date(Date.now() - 25200000).toISOString()
  }
];

// Word boundaries for Cyrillic text
const START = '(?<![\\p{L}\\p{N}])';
const END = '(?![\\p{L}\\p{N}])';
const rx = (p) => new RegExp(START + '(?:' + p.join('|') + ')\\p{L}*', 'iu');

const DEATH = rx([
  'загин', 'убит', 'убийств', 'убийц', 'убиец',
  'уби(?:ха|л|ла|ли)?' + END,
  'застрел', 'удави', 'удавен', 'мъртъв', 'мъртв',
  'труп(?:ът|ове|овете)?' + END
]);

const NEGATED = rx([
  'няма\\s+(?:загинали|убити|мъртви)',
  'без\\s+загинали',
  'не\\s+(?:са|е)\\s+(?:загинал|загинали|убит|убити|мъртъв|мъртви)',
  'никой\\s+не\\s+(?:е\\s+)?загин'
]);

const NOT_CRITICAL = rx([
  'памет', 'почит', 'почет', 'годишнина', 'възпомен',
  'опит за убийств', 'убийствен', 'мъртва точка', 'мъртъв сезон'
]);

export const isLethalTitle = (title = '') =>
  DEATH.test(title) && !NEGATED.test(title) && !NOT_CRITICAL.test(title);

export class NewsMapService {
  constructor() {
    this.cacheKey = 'kalchev_news_agg_v5';
    this.ttl = 5 * 60 * 1000;
  }

  getCache() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(this.cacheKey);

        if (stored) {
          const { data, timestamp } = JSON.parse(stored);

          if (
            Date.now() - timestamp < this.ttl &&
            Array.isArray(data) &&
            data.length > 0
          ) {
            return data;
          }
        }
      }
    } catch (error) {
      console.warn('[NewsMapService] Could not read cache:', error);
    }

    return null;
  }

  setCache(data) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(
          this.cacheKey,
          JSON.stringify({
            data,
            timestamp: Date.now()
          })
        );
      }
    } catch (error) {
      console.warn('[NewsMapService] Could not save cache:', error);
    }
  }

  async fetchTrendingNews(force = false, onProgress = null) {
    if (onProgress) onProgress(15);

    console.log('[NewsMapService] Fetching fresh news from live backend...');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      let response;

      try {
        response = await fetch(
          `https://novinimap-1.onrender.com/api/news?check=${Date.now()}`,
          {
            signal: controller.signal,
            cache: 'no-store'
          }
        );
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        throw new Error(`Backend returned HTTP ${response.status}`);
      }

      const json = await response.json();

      const items = Array.isArray(json.data)
        ? json.data
        : Array.isArray(json.articles)
          ? json.articles
          : null;

      if (!items || items.length === 0) {
        throw new Error('Backend returned no news articles');
      }

      console.log(
        `[NewsMapService] Loaded ${items.length} items from live backend`
      );

      this.setCache(items);

      if (onProgress) onProgress(100);
      return items;
    } catch (error) {
      console.warn(
        '[NewsMapService] Live backend unavailable; checking cached news.',
        error
      );

      // Use cached data only if the live backend is unavailable.
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const stored = localStorage.getItem(this.cacheKey);

          if (stored) {
            const parsed = JSON.parse(stored);

            if (Array.isArray(parsed.data) && parsed.data.length > 0) {
              console.warn(
                '[NewsMapService] Showing cached news; it may be outdated.'
              );

              if (onProgress) onProgress(100);
              return parsed.data;
            }
          }
        }
      } catch (cacheError) {
        console.warn(
          '[NewsMapService] Could not read cached news.',
          cacheError
        );
      }

      console.error('[NewsMapService] No live or cached news available.');

      if (onProgress) onProgress(100);
      return [];
    }
  }

  enrich(item) {
    const cleanTitle = (item.title || '')
      .replace(/<[^>]*>?/gm, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
      .trim();

    const cleanSummary = (item.summary || '')
      .replace(/<[^>]*>?/gm, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
      .split(' http')[0]
      .trim();

    const fullText = `${cleanTitle} ${cleanSummary}`.toLowerCase();
    const isLethal = isLethalTitle(cleanTitle);

    let location = null;
    const match = this.matchCity(fullText);

    if (match) {
      location = {
        name: match.name,
        coords: { lat: match.lat, lng: match.lng }
      };
    }

    const validDate = this.parseDate(
      item.pubDate || item.publishedAt || item.unixTime
    );

    return {
      ...item,
      title: cleanTitle,
      summary: cleanSummary,
      link: item.link || '#',
      source: item.source || 'Новини',
      location,
      isLethal,
      unixTime: validDate.getTime(),
      timestamp: validDate.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      }),
      dateStr: validDate.toLocaleDateString('bg-BG', {
        day: 'numeric',
        month: 'short'
      })
    };
  }

  matchCity(text) {
    if (!text) return null;

    if (!this._sortedCities) {
      this._sortedCities = Object.keys(CITY_DB).sort(
        (a, b) => b.length - a.length
      );
    }

    const delimiters = " \t\r\n,.:;!?\"'«»()—–-/\\[]{}<>";

    for (const cityKey of this._sortedCities) {
      let index = text.indexOf(cityKey);

      while (index !== -1) {
        const previousChar = index > 0 ? text[index - 1] : ' ';
        const nextIndex = index + cityKey.length;
        const nextChar = nextIndex < text.length ? text[nextIndex] : ' ';

        if (
          delimiters.includes(previousChar) &&
          delimiters.includes(nextChar)
        ) {
          return CITY_DB[cityKey];
        }

        index = text.indexOf(cityKey, index + 1);
      }
    }

    return null;
  }

  parseDate(dateString) {
    if (!dateString) return new Date();

    let value = String(dateString).trim();

    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
      value = value.replace(' ', 'T') + 'Z';
    }

    // Backend may supply unixTime in seconds or milliseconds.
    if (/^\d{10}$/.test(value)) {
      value = Number(value) * 1000;
    } else if (/^\d{13}$/.test(value)) {
      value = Number(value);
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date() : date;
  }

  parseXML(xml, sourceName) {
    if (!xml || typeof xml !== 'string') return [];

    try {
      const document = new DOMParser().parseFromString(xml, 'text/xml');

      return Array.from(document.querySelectorAll('item')).map((item) => ({
        title: item.querySelector('title')?.textContent || '',
        summary: item.querySelector('description')?.textContent || '',
        pubDate:
          item.querySelector('pubDate')?.textContent ||
          new Date().toISOString(),
        link: item.querySelector('link')?.textContent || '#',
        source: sourceName
      }));
    } catch (error) {
      console.warn('[NewsMapService] Could not parse XML:', error);
      return [];
    }
  }

  deduplicate(items) {
    const seen = new Set();

    return items.filter((item) => {
      const normalized = (item.title || '')
        .toLowerCase()
        .replace(/[^a-zа-я0-9]/gi, '')
        .substring(0, 40);

      if (!normalized || seen.has(normalized)) return false;

      seen.add(normalized);
      return true;
    });
  }

  getCityClusters(items) {
    const clusters = {};

    if (!Array.isArray(items)) return clusters;

    items.forEach((item) => {
      if (item.location && item.location.name) {
        const cityName = item.location.name;

        if (!clusters[cityName]) {
          clusters[cityName] = {
            name: cityName,
            coords: item.location.coords,
            articles: [],
            hasLethal: false,
            count: 0
          };
        }

        clusters[cityName].articles.push(item);
        clusters[cityName].count++;

        if (item.isLethal) {
          clusters[cityName].hasLethal = true;
        }
      }
    });

    return clusters;
  }
}