// bg-news-map-backend/src/workers/ingestionWorker.js
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const rssParser = require('../utils/rssParser');
const AhoCorasick = require('../utils/ahoCorasick');
const cache = require('../utils/cache');
const logger = require('../utils/logger');

// Google News search feed for one city, last 24h, Bulgarian edition
const gnCity = (city) => `https://news.google.com/rss/search?q=${encodeURIComponent(city + ' when:1d')}&hl=bg&gl=BG&ceid=BG:bg`;

const DEFAULT_SOURCES = [
  { id: 'dnevnik', name: 'Дневник', url: 'https://www.dnevnik.bg/rss/' },
  { id: 'mediapool', name: 'Mediapool', url: 'https://www.mediapool.bg/rss/' },
  { id: '24chasa', name: '24 Часа', url: 'https://www.24chasa.bg/rss' },
  { id: 'capital', name: 'Капитал', url: 'https://www.capital.bg/rss/' },
  { id: 'economic', name: 'Economic.bg', url: 'https://www.economic.bg/bg/rss.xml' },
  { id: 'banker', name: 'Банкеръ', url: 'https://banker.bg/feed/' },
  { id: 'podtepeto', name: 'Под Тепето (Пловдив)', url: 'https://podtepeto.com/feed/' },
  { id: 'varnautre', name: 'Варна Утре', url: 'https://varnautre.bg/feed/' },
  { id: 'burgasnews', name: 'Бургас Новини', url: 'https://burgasnews.com/feed/' },
  { id: 'stzagora', name: 'Стара Загора Нет', url: 'https://stzagora.net/feed/' },
  { id: 'newsbg', name: 'News.bg', url: 'https://news.bg/rss' },
  { id: 'dnesbg', name: 'Dir.bg Dnes', url: 'https://dnes.dir.bg/rss' },
  // Google News (keep LAST so direct publisher feeds win de-duplication)
  { id: 'gn-top', name: 'Google News', url: 'https://news.google.com/rss?hl=bg&gl=BG&ceid=BG:bg' },
  { id: 'gn-sofia', name: 'Google News', url: gnCity('София'), geoHint: 'софия' },
  { id: 'gn-plovdiv', name: 'Google News', url: gnCity('Пловдив'), geoHint: 'пловдив' },
  { id: 'gn-varna', name: 'Google News', url: gnCity('Варна'), geoHint: 'варна' },
  { id: 'gn-burgas', name: 'Google News', url: gnCity('Бургас'), geoHint: 'бургас' },
  { id: 'gn-ruse', name: 'Google News', url: gnCity('Русе'), geoHint: 'русе' }
];

// 50+ Bulgarian Cities & Municipalities with Coordinates
const CITY_DB = {
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
  'козлодуй': { lat: 43.7833, lng: 23.7333, name: 'Козлодуй' },
  // Черноморски курорти и градове
  'созопол': { lat: 42.4197, lng: 27.6936, name: 'Созопол' },
  'несебър': { lat: 42.6575, lng: 27.7183, name: 'Несебър' },
  'поморие': { lat: 42.5583, lng: 27.6389, name: 'Поморие' },
  'царево': { lat: 42.1708, lng: 27.8481, name: 'Царево' },
  'приморско': { lat: 42.2747, lng: 27.7558, name: 'Приморско' },
  'балчик': { lat: 43.4097, lng: 28.1594, name: 'Балчик' },
  'каварна': { lat: 43.4389, lng: 28.3417, name: 'Каварна' },
  'дългопол': { lat: 43.0500, lng: 27.2667, name: 'Дългопол' },
  'аксаково': { lat: 43.3167, lng: 27.8000, name: 'Аксаково' },
  'суворово': { lat: 43.3833, lng: 27.6000, name: 'Суворово' },
  'белослав': { lat: 43.1833, lng: 27.7000, name: 'Белослав' },
  'провадия': { lat: 43.1833, lng: 27.4333, name: 'Провадия' },

  // Исторически, архитектурни и планински селища
  'копривщица': { lat: 42.6369, lng: 24.3564, name: 'Копривщица' },
  'трявна': { lat: 42.8667, lng: 25.4833, name: 'Трявна' },
  'елена': { lat: 42.9333, lng: 25.8833, name: 'Елена' },
  'котел': { lat: 42.8833, lng: 26.4333, name: 'Котел' },
  'мелник': { lat: 41.5208, lng: 23.3597, name: 'Мелник' },
  'широка лъка': { lat: 41.6833, lng: 24.5833, name: 'Широка лъка' },
  'арбанаси': { lat: 43.1000, lng: 25.6667, name: 'Арбанаси' },
  'боженци': { lat: 42.8833, lng: 25.4167, name: 'Боженци' },
  'жеравна': { lat: 42.8333, lng: 26.4500, name: 'Жеравна' },

  // Спа курорти и областни центрове
  'хисаря': { lat: 42.5028, lng: 24.7083, name: 'Хисаря' },
  'девин': { lat: 41.7439, lng: 24.3986, name: 'Девин' },
  'чепеларе': { lat: 41.7258, lng: 24.6861, name: 'Чепеларе' },
  'златоград': { lat: 41.3792, lng: 25.0875, name: 'Златоград' },
  'мадан': { lat: 41.5167, lng: 24.9333, name: 'Мадан' },
  'рудозем': { lat: 41.4833, lng: 24.8500, name: 'Рудозем' },
  'сапарева баня': { lat: 42.2833, lng: 23.2667, name: 'Сапарева баня' },
  'брезник': { lat: 42.7333, lng: 22.9000, name: 'Брезник' },
  'трън': { lat: 42.8333, lng: 22.6500, name: 'Трън' },
  'радомир': { lat: 42.5500, lng: 22.9500, name: 'Радомир' },

  // Северна и Северозападна България
  'белоградчик': { lat: 43.6281, lng: 22.6881, name: 'Белоградчик' },
  'берковица': { lat: 43.2389, lng: 23.1250, name: 'Берковица' },
  'дряново': { lat: 42.9739, lng: 25.4833, name: 'Дряново' },
  'севлиево': { lat: 43.0281, lng: 25.1158, name: 'Севлиево' },
  'павликени': { lat: 43.2917, lng: 25.3167, name: 'Павликени' },
  'сухиндол': { lat: 43.1500, lng: 25.2000, name: 'Сухиндол' },
  'попово': { lat: 43.3500, lng: 26.2333, name: 'Попово' },
  'кубрат': { lat: 43.7944, lng: 26.5167, name: 'Кубрат' },
  'исперих': { lat: 43.7083, lng: 26.8333, name: 'Исперих' },
  'тутракан': { lat: 43.7500, lng: 26.6167, name: 'Тутракан' },
  'омуртаг': { lat: 43.1000, lng: 26.4167, name: 'Омуртаг' },
  'тервел': { lat: 43.7500, lng: 27.4167, name: 'Тервел' },
  'алфатар': { lat: 43.9667, lng: 27.2833, name: 'Алфатар' },
  'дулово': { lat: 43.8167, lng: 27.1500, name: 'Дулово' },
  'мъглиж': { lat: 42.6000, lng: 25.5500, name: 'Мъглиж' },
  'главиница': { lat: 43.9333, lng: 26.8333, name: 'Главиница' },
  'лозница': { lat: 43.3667, lng: 26.6000, name: 'Лозница' },
  'стражица': { lat: 43.2333, lng: 25.9667, name: 'Стражица' },
  'златарица': { lat: 43.0500, lng: 25.9000, name: 'Златарица' },
  'бяла': { lat: 43.4667, lng: 25.7333, name: 'Бяла' }, // (Русенско)
  'бяла черква': { lat: 43.2500, lng: 25.3333, name: 'Бяла Черква' },
  'дебелец': { lat: 43.0333, lng: 25.6000, name: 'Дебелец' },
  'килифарево': { lat: 43.0000, lng: 25.6333, name: 'Килифарево' },
  // ===== Община Аврен =====
  'аврен': { lat: 43.1127, lng: 27.6672, name: 'Аврен' },
  'бенковски': { lat: 43.1177, lng: 27.7844, name: 'Бенковски' },
  'близнаци': { lat: 43.0609, lng: 27.8681, name: 'Близнаци' },
  'болярци': { lat: 43.0705, lng: 27.7996, name: 'Болярци' },
  'добри дол': { lat: 43.0714, lng: 27.7530, name: 'Добри дол' },
  'дъбравино': { lat: 43.0520, lng: 27.5948, name: 'Дъбравино' },
  'здравец': { lat: 43.1264, lng: 27.7418, name: 'Здравец' },
  'казашка река': { lat: 43.0884, lng: 27.6301, name: 'Казашка река' },
  'камчия': { lat: 43.0254, lng: 27.8842, name: 'Камчия' },
  'китка': { lat: 43.0532, lng: 27.7759, name: 'Китка' },
  'круша': { lat: 43.0277, lng: 27.7603, name: 'Круша' },
  'падина': { lat: 43.1606, lng: 27.5734, name: 'Падина' },
  'приселци': { lat: 43.1097, lng: 27.8289, name: 'Приселци' },
  'равна гора': { lat: 43.0584, lng: 27.8046, name: 'Равна гора' },
  'садово': { lat: 43.0644, lng: 27.7168, name: 'Садово' },
  'синдел': { lat: 43.1097, lng: 27.6052, name: 'Синдел' },
  'тръстиково': { lat: 43.1426, lng: 27.5918, name: 'Тръстиково' },
  'царевци': { lat: 43.0914, lng: 27.5671, name: 'Царевци' },
  'юнак': { lat: 43.0780, lng: 27.6102, name: 'Юнак' },

  // ===== Община Аксаково =====
  'ботево': { lat: 43.4292, lng: 27.7203, name: 'Ботево' },
  'водица': { lat: 43.3688, lng: 27.7355, name: 'Водица' },
  'въглен': { lat: 43.2952, lng: 27.8476, name: 'Въглен' },
  'генерал кантарджиево': { lat: 43.3558, lng: 27.9822, name: 'Генерал Кантарджиево' },
  'доброглед': { lat: 43.2672, lng: 27.7646, name: 'Доброглед' },
  'долище': { lat: 43.3386, lng: 27.8919, name: 'Долище' },
  'засмяно': { lat: 43.3887, lng: 27.6888, name: 'Засмяно' },
  'зорница': { lat: 43.3293, lng: 27.7316, name: 'Зорница' },
  'игнатиево': { lat: 43.2481, lng: 27.7790, name: 'Игнатиево' },
  'изворско': { lat: 43.2940, lng: 27.7703, name: 'Изворско' },
  'кичево': { lat: 43.2743, lng: 27.9607, name: 'Кичево' },
  'климентово': { lat: 43.3429, lng: 27.9490, name: 'Климентово' },
  'крумово': { lat: 43.3903, lng: 27.7835, name: 'Крумово' },
  'куманово': { lat: 43.2753, lng: 27.9316, name: 'Куманово' },
  'любен каравелово': { lat: 43.3478, lng: 27.7680, name: 'Любен Каравелово' },
  'новаково': { lat: 43.3536, lng: 27.8299, name: 'Новаково' },
  'орешак': { lat: 43.3010, lng: 27.9120, name: 'Орешак' },
  'осеново': { lat: 43.3231, lng: 28.0102, name: 'Осеново' },
  'припек': { lat: 43.2542, lng: 27.7364, name: 'Припек' },
  'радево': { lat: 43.4100, lng: 27.7308, name: 'Радево' },
  'слънчево': { lat: 43.2486, lng: 27.7072, name: 'Слънчево' },
  'яребична': { lat: 43.2994, lng: 27.8736, name: 'Яребична' },

  // ===== Община Белослав =====
  'езерово': { lat: 43.2004, lng: 27.7688, name: 'Езерово' },
  'константиново': { lat: 43.1603, lng: 27.7791, name: 'Константиново' },
  'разделна': { lat: 43.1664, lng: 27.6358, name: 'Разделна' },
  'страшимирово': { lat: 43.1969, lng: 27.7358, name: 'Страшимирово' },

  // ===== Община Бяла =====
  'горица': { lat: 42.9101, lng: 27.8401, name: 'Горица' },
  'господиново': { lat: 42.8976, lng: 27.7694, name: 'Господиново' },
  'дюлино': { lat: 42.8600, lng: 27.7255, name: 'Дюлино' },
  'попович': { lat: 42.8340, lng: 27.7943, name: 'Попович' },
  'самотино': { lat: 42.9401, lng: 27.8619, name: 'Самотино' },

  // ===== Община Варна =====
  'звездица': { lat: 43.1563, lng: 27.8428, name: 'Звездица' },
  'казашко': { lat: 43.1982, lng: 27.8190, name: 'Казашко' },
  'каменар': { lat: 43.2486, lng: 27.9086, name: 'Каменар' },
  'свети константин и елена': { lat: 43.2292, lng: 28.0083, name: 'Свети Константин и Елена' },
  'тополи': { lat: 43.2170, lng: 27.8206, name: 'Тополи' },

  // ===== Община Ветрино =====
  'белоградец': { lat: 43.3523, lng: 27.3292, name: 'Белоградец' },
  'ветрино': { lat: 43.3155, lng: 27.4337, name: 'Ветрино' },
  'габърница': { lat: 43.2453, lng: 27.4926, name: 'Габърница' },
  'доброплодно': { lat: 43.3983, lng: 27.3744, name: 'Доброплодно' },
  'млада гвардия': { lat: 43.2905, lng: 27.3632, name: 'Млада гвардия' },
  'момчилово': { lat: 43.3630, lng: 27.4231, name: 'Момчилово' },
  'невша': { lat: 43.2712, lng: 27.2992, name: 'Невша' },
  'неофит рилски': { lat: 43.2740, lng: 27.5171, name: 'Неофит Рилски' },
  'средно село': { lat: 43.3425, lng: 27.4288, name: 'Средно село' },
  'ягнило': { lat: 43.3808, lng: 27.3250, name: 'Ягнило' },

  // ===== Община Вълчи дол =====
  'бояна': { lat: 43.4357, lng: 27.6502, name: 'Бояна' },
  'брестак': { lat: 43.4599, lng: 27.5390, name: 'Брестак' },
  'войводино': { lat: 43.4054, lng: 27.6153, name: 'Войводино' },
  'генерал киселово': { lat: 43.4631, lng: 27.5997, name: 'Генерал Киселово' },
  'генерал колево': { lat: 43.5218, lng: 27.3660, name: 'Генерал Колево' },
  'добротич': { lat: 43.3948, lng: 27.4215, name: 'Добротич' },
  'есеница': { lat: 43.4394, lng: 27.3954, name: 'Есеница' },
  'звънец': { lat: 43.4939, lng: 27.5971, name: 'Звънец' },
  'изворник': { lat: 43.4677, lng: 27.3595, name: 'Изворник' },
  'искър': { lat: 43.3892, lng: 27.4778, name: 'Искър' },
  'калоян': { lat: 43.4312, lng: 27.4084, name: 'Калоян' },
  'караманите': { lat: 43.4889, lng: 27.4772, name: 'Караманите' },
  'кракра': { lat: 43.4169, lng: 27.4782, name: 'Кракра' },
  'метличина': { lat: 43.4739, lng: 27.5027, name: 'Метличина' },
  'михалич': { lat: 43.4047, lng: 27.4600, name: 'Михалич' },
  'оборище': { lat: 43.4488, lng: 27.6596, name: 'Оборище' },
  'радан войвода': { lat: 43.5434, lng: 27.3926, name: 'Радан войвода' },
  'стефан караджа': { lat: 43.4958, lng: 27.4115, name: 'Стефан Караджа' },
  'страхил': { lat: 43.5132, lng: 27.6115, name: 'Страхил' },
  'червенци': { lat: 43.5223, lng: 27.4479, name: 'Червенци' },
  'щипско': { lat: 43.3759, lng: 27.5360, name: 'Щипско' },

  // ===== Община Девня =====
  'кипра': { lat: 43.2607, lng: 27.6219, name: 'Кипра' },

  // ===== Община Долни чифлик =====
  'булаир': { lat: 42.8965, lng: 27.4491, name: 'Булаир' },
  'бърдарево': { lat: 42.9230, lng: 27.5980, name: 'Бърдарево' },
  'венелин': { lat: 43.0431, lng: 27.6715, name: 'Венелин' },
  'голица': { lat: 42.9146, lng: 27.5474, name: 'Голица' },
  'горен чифлик': { lat: 43.0138, lng: 27.6305, name: 'Горен чифлик' },
  'гроздьово': { lat: 43.0292, lng: 27.5404, name: 'Гроздьово' },
  'детелина': { lat: 42.9909, lng: 27.7717, name: 'Детелина' },
  'кривини': { lat: 42.9512, lng: 27.6711, name: 'Кривини' },
  'нова шипка': { lat: 43.0551, lng: 27.5253, name: 'Нова Шипка' },
  'ново оряхово': { lat: 42.9868, lng: 27.8367, name: 'Ново Оряхово' },
  'пчелник': { lat: 43.0127, lng: 27.6695, name: 'Пчелник' },
  'рудник': { lat: 42.9505, lng: 27.7720, name: 'Рудник' },
  'солник': { lat: 42.9218, lng: 27.6522, name: 'Солник' },
  'старо оряхово': { lat: 42.9901, lng: 27.7945, name: 'Старо Оряхово' },
  'шкорпиловци': { lat: 42.9630, lng: 27.8778, name: 'Шкорпиловци' },
  'юнец': { lat: 42.9299, lng: 27.7612, name: 'Юнец' },

  // ===== Община Дългопол =====
  'арковна': { lat: 43.0367, lng: 27.1995, name: 'Арковна' },
  'аспарухово': { lat: 42.9833, lng: 27.3333, name: 'Аспарухово' },
  'боряна': { lat: 43.0526, lng: 27.2781, name: 'Боряна' },
  'величково': { lat: 43.0466, lng: 27.4444, name: 'Величково' },
  'камен дял': { lat: 43.0291, lng: 27.2595, name: 'Камен дял' },
  'комунари': { lat: 43.0100, lng: 27.2938, name: 'Комунари' },
  'красимир': { lat: 43.0348, lng: 27.3076, name: 'Красимир' },
  'лопушна': { lat: 43.0028, lng: 27.1843, name: 'Лопушна' },
  'медовец': { lat: 43.0038, lng: 27.1375, name: 'Медовец' },
  'партизани': { lat: 43.0059, lng: 27.2553, name: 'Партизани' },
  'поляците': { lat: 42.9855, lng: 27.1215, name: 'Поляците' },
  'рояк': { lat: 43.0864, lng: 27.3811, name: 'Рояк' },
  'сава': { lat: 43.0308, lng: 27.3797, name: 'Сава' },
  'сладка вода': { lat: 43.0574, lng: 27.2402, name: 'Сладка вода' },
  'цонево': { lat: 43.0326, lng: 27.4392, name: 'Цонево' },

  // ===== Община Провадия =====
  'блъсково': { lat: 43.1215, lng: 27.3294, name: 'Блъсково' },
  'бозвелийско': { lat: 43.1045, lng: 27.4755, name: 'Бозвелийско' },
  'бързица': { lat: 43.0731, lng: 27.5269, name: 'Бързица' },
  'венчан': { lat: 43.2352, lng: 27.3885, name: 'Венчан' },
  'градинарово': { lat: 43.1424, lng: 27.2797, name: 'Градинарово' },
  'добрина': { lat: 43.1801, lng: 27.4642, name: 'Добрина' },
  'житница': { lat: 43.1262, lng: 27.5247, name: 'Житница' },
  'златина': { lat: 43.2357, lng: 27.4182, name: 'Златина' },
  'китен варна': { lat: 43.0864, lng: 27.3159, name: 'Китен' },
  'комарево': { lat: 43.1148, lng: 27.3947, name: 'Комарево' },
  'кривня': { lat: 43.1946, lng: 27.3975, name: 'Кривня' },
  'манастир': { lat: 43.1772, lng: 27.5210, name: 'Манастир' },
  'неново': { lat: 43.2191, lng: 27.2871, name: 'Неново' },
  'овчага': { lat: 43.1668, lng: 27.3398, name: 'Овчага' },
  'петров дол': { lat: 43.2301, lng: 27.4591, name: 'Петров дол' },
  'равна': { lat: 43.2130, lng: 27.3500, name: 'Равна' },
  'славейково': { lat: 43.1090, lng: 27.2345, name: 'Славейково' },
  'снежина': { lat: 43.1639, lng: 27.2656, name: 'Снежина' },
  'староселец': { lat: 43.2292, lng: 27.4897, name: 'Староселец' },
  'тутраканци': { lat: 43.1183, lng: 27.4443, name: 'Тутраканци' },
  'храброво': { lat: 43.1333, lng: 27.3833, name: 'Храброво' },
  'чайка': { lat: 43.0807, lng: 27.4285, name: 'Чайка' },
  'черковна': { lat: 43.1920, lng: 27.3300, name: 'Черковна' },
  'черноок': { lat: 43.1361, lng: 27.2177, name: 'Черноок' },

  // ===== Община Суворово =====
  'баново': { lat: 43.2645, lng: 27.6776, name: 'Баново' },
  'дръндар': { lat: 43.3620, lng: 27.6296, name: 'Дръндар' },
  'изгрев': { lat: 43.2990, lng: 27.6936, name: 'Изгрев' },
  'калиманци': { lat: 43.2775, lng: 27.7234, name: 'Калиманци' },
  'левски варна': { lat: 43.3144, lng: 27.6650, name: 'Левски' },
  'николаевка': { lat: 43.3564, lng: 27.6677, name: 'Николаевка' },
  'просечен': { lat: 43.2914, lng: 27.6424, name: 'Просечен' },
  'чернево': { lat: 43.2941, lng: 27.6027, name: 'Чернево' }
};

class IngestionWorker {
  constructor() {
    this.sources = DEFAULT_SOURCES;
    this.articlesStore = new Map(); // id -> article
    this.cachedSourceArticles = new Map(); // sourceId -> articles[]
    this.sourcesHealth = {};
    this.lastRunStats = {
      lastRunTime: null,
      durationMs: 0,
      totalArticles: 0,
      locatedArticles: 0,
      clustersCount: 0
    };
    this.isRunning = false;
    this.schedulerTimer = null;

    // Initialize Aho-Corasick City Matcher (single O(N) scan replacing 50+ regex iterations)
    this.cityMatcher = new AhoCorasick();
    for (const [key, cityInfo] of Object.entries(CITY_DB)) {
      this.cityMatcher.addPattern(key, cityInfo);
    }
    this.cityMatcher.build();

    // Axios client configured for direct, proxy-free fetching with conditional GETs
    this.httpClient = axios.create({
      timeout: 7000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      },
      validateStatus: (status) => (status >= 200 && status < 300) || status === 304
    });
  }

  /**
   * Main Background Ingestion Cycle
   * Rebuilds cache in background, serving stale data to clients while refreshing.
   */
  async runIngestionCycle() {
    if (this.isRunning) {
      console.log('[IngestionWorker] Cycle already in progress, serving stale cache.');
      return;
    }

    // Distributed lock: in multi-instance PM2 cluster, only 1 instance refreshes feeds
    const lockAcquired = await cache.acquireLock('kalchev:lock:refresher', 180);
    if (!lockAcquired) {
      console.log('[IngestionWorker] Another PM2 instance is currently refreshing feeds. Syncing from shared Redis cache.');
      await this.syncFromSharedCache();
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    const cycleFetchedAt = new Date().toISOString();
    console.log(`[IngestionWorker] 🚀 Starting direct background ingestion cycle at ${cycleFetchedAt}...`);

    const rawArticles = [];

    try {
      // Direct HTTP fetch (no CORS proxies) with Conditional GETs in parallel
      const results = await Promise.allSettled(
        this.sources.map(source => this.fetchSourceDirect(source, cycleFetchedAt))
      );

      results.forEach((r, idx) => {
        const src = this.sources[idx];
        if (r.status === 'fulfilled' && Array.isArray(r.value)) {
          rawArticles.push(...r.value);
          this.cachedSourceArticles.set(src.id, r.value);
          this.sourcesHealth[src.id] = {
            id: src.id,
            name: src.name,
            status: r.value._notModified ? 'cached_304' : 'healthy',
            lastSuccess: cycleFetchedAt,
            articlesCount: r.value.length,
            latestPubDate: r.value[0]?.publishedAt || null,
            latencyMs: r.value._latencyMs || 0
          };
        } else {
          const errorMsg = r.reason?.message || 'Unknown error';
          console.warn(`[IngestionWorker] ⚠️ Source ${src.name} failed: ${errorMsg}`);
          // Reuse last good articles from memory if available
          const existing = this.cachedSourceArticles.get(src.id) || [];
          if (existing.length > 0) rawArticles.push(...existing);

          this.sourcesHealth[src.id] = {
            id: src.id,
            name: src.name,
            status: 'error',
            lastError: errorMsg,
            lastAttempt: cycleFetchedAt
          };
        }
      });

      console.log(`[IngestionWorker] Aggregated ${rawArticles.length} raw articles.`);

      // 1. Deduplicate by fingerprint
      const unique = this.deduplicate(rawArticles);

      // 2. Geocode & Enrich with Aho-Corasick & Article Geolocation Cache
      const enriched = await Promise.all(unique.map(item => this.enrich(item, cycleFetchedAt)));

      // 3. Sort chronologically (newest first)
      enriched.sort((a, b) => b.unixTime - a.unixTime);

      // 4. Update memory store
      enriched.forEach(art => {
        this.articlesStore.set(art.id, art);
      });

      // 5. Pre-compute city clusters
      const clusters = this.getCityClusters(enriched);

      const durationMs = Date.now() - startTime;
      this.lastRunStats = {
        lastRunTime: cycleFetchedAt,
        durationMs,
        totalArticles: enriched.length,
        locatedArticles: enriched.filter(a => a.location).length,
        clustersCount: Object.keys(clusters).length
      };

      console.log(`[IngestionWorker] ✅ Background cycle finished in ${durationMs}ms: ${this.lastRunStats.totalArticles} articles (${this.lastRunStats.locatedArticles} geocoded into ${this.lastRunStats.clustersCount} clusters).`);

      // 6. Share cache across PM2 instances via Redis
      await this.saveToSharedCache(enriched, clusters);

      // 7. Save static backup snapshot to public/dist
      this.saveStaticCache(enriched, clusters);

    } catch (err) {
      console.error('[IngestionWorker] Unexpected cycle failure:', err.message);
    } finally {
      this.isRunning = false;
      await cache.releaseLock('kalchev:lock:refresher');
    }

    return { articles: this.getLatestArticles(150), stats: this.lastRunStats, health: this.sourcesHealth };
  }

  /**
   * Direct HTTP fetch to RSS source (NO CORS PROXIES) with Conditional GETs (ETag / If-Modified-Since)
   */
  async fetchSourceDirect(source, fetchedAt) {
    const t0 = Date.now();

    // Check stored ETag / Last-Modified
    const meta = (await cache.getFeedMeta(source.id)) || {};
    const reqHeaders = {};
    if (meta.etag) reqHeaders['If-None-Match'] = meta.etag;
    if (meta.lastModified) reqHeaders['If-Modified-Since'] = meta.lastModified;

    try {
      const response = await this.httpClient.get(source.url, {
        headers: reqHeaders,
        responseType: 'text'
      });

      // HTTP 304 Not Modified -> Re-use cached articles instantly with 0 payload download
      if (response.status === 304) {
        const cached = this.cachedSourceArticles.get(source.id) || [];
        cached._latencyMs = Date.now() - t0;
        cached._notModified = true;
        return cached;
      }

      // HTTP 200 OK -> Store new conditional headers and parse body with fast-xml-parser
      const newEtag = response.headers['etag'];
      const newLastModified = response.headers['last-modified'];
      if (newEtag || newLastModified) {
        await cache.setFeedMeta(source.id, {
          etag: newEtag,
          lastModified: newLastModified,
          updatedAt: fetchedAt
        });
      }

      const xmlText = response.data;
      const parsedItems = rssParser.parse(xmlText, source.name);

      const items = parsedItems.map(item => {
        const link = item.link || item.guid || source.url;
        const fingerprint = crypto
          .createHash('md5')
          .update(`${item.title.toLowerCase().slice(0, 40)}_${source.id}`)
          .digest('hex');

        return {
          id: fingerprint,
          title: item.title,
          summary: item.summary,
          link: link,
          guid: item.guid || link,
          source: item.publisher || source.name,
          geoHint: source.geoHint || null,
          sourceId: source.id,
          publishedAt: item.pubDate,
          fetchedAt: fetchedAt,
          unixTime: item.unixTime
        };
      });

      items._latencyMs = Date.now() - t0;
      return items;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Enriches an article with location using Aho-Corasick & Article-level Geolocation Cache
   */
  async enrich(item, fetchedAt) {
    const articleKey = (item.link || item.guid || item.id).toLowerCase();

    // 1. Check article geolocation cache (keyed by link or GUID)
    const cachedGeo = await cache.getArticleGeo(articleKey);
    if (cachedGeo) {
      const pubDate = new Date(item.publishedAt);
      const existing = this.articlesStore.get(item.id);
      return {
        ...item,
        firstSeenAt: existing?.firstSeenAt || fetchedAt,
        location: cachedGeo.location,
        isLethal: cachedGeo.isLethal,
        timestamp: pubDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        dateStr: pubDate.toLocaleDateString('bg-BG', { day: 'numeric', month: 'short' })
      };
    }

    const fullText = `${item.title} ${item.summary}`.toLowerCase();

    // Critical / Lethal Incident Detection
    const deathKeywords = /(загинал|починал|жертви|убит|смърт|труп|убийство|ранен)/i;
    const isLethal = deathKeywords.test(fullText);

    // 2. Aho-Corasick Multi-Pattern Search (Single Pass O(N) over text)
    let loc = null;
    const matches = this.cityMatcher.findBestMatches(fullText);
    if (matches.length > 0) {
      const best = matches[0].data;
      loc = {
        name: best.name,
        coords: { lat: best.lat, lng: best.lng }
      };
    }

    // 2b. Google News city feed: if the text had no city, fall back to the feed's city
    if (!loc && item.geoHint && CITY_DB[item.geoHint]) {
      const c = CITY_DB[item.geoHint];
      loc = { name: c.name, coords: { lat: c.lat, lng: c.lng } };
    }

    // 3. Cache geolocation result for this article (persisted for 14 days)
    await cache.setArticleGeo(articleKey, { location: loc, isLethal });

    const pubDate = new Date(item.publishedAt);
    const existing = this.articlesStore.get(item.id);

    return {
      ...item,
      firstSeenAt: existing?.firstSeenAt || fetchedAt,
      location: loc,
      isLethal: isLethal,
      timestamp: pubDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      dateStr: pubDate.toLocaleDateString('bg-BG', { day: 'numeric', month: 'short' })
    };
  }

  deduplicate(items) {
    const seen = new Set();
    return items.filter(item => {
      if (!item.title || item.title.length < 5) return false;
      const key = item.title.toLowerCase().replace(/[^a-zа-я0-9]/gi, '').substring(0, 45);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  getCityClusters(items) {
    const clusters = {};
    items.forEach(item => {
      if (item.location && item.location.name) {
        const city = item.location.name;
        if (!clusters[city]) {
          clusters[city] = {
            name: city,
            coords: item.location.coords,
            count: 0,
            articles: [],
            hasLethal: false
          };
        }
        clusters[city].count++;
        clusters[city].articles.push(item);
        if (item.isLethal) clusters[city].hasLethal = true;
      }
    });
    return clusters;
  }

  getLatestArticles(limit = 100) {
    const all = Array.from(this.articlesStore.values());
    all.sort((a, b) => b.unixTime - a.unixTime);
    return all.slice(0, limit);
  }

  async syncFromSharedCache() {
    try {
      const articles = await cache.get('kalchev:news:articles');
      if (Array.isArray(articles) && articles.length > 0) {
        articles.forEach(a => this.articlesStore.set(a.id, a));
      }
      const health = await cache.get('kalchev:news:health');
      if (health) this.sourcesHealth = health;
    } catch (e) {}
  }

  async saveToSharedCache(articles, clusters) {
    try {
      await cache.set('kalchev:news:articles', articles, 1800);
      await cache.set('kalchev:news:clusters', clusters, 1800);
      await cache.set('kalchev:news:health', this.sourcesHealth, 1800);
    } catch (e) {}
  }

  saveStaticCache(articles, clusters) {
    const payload = JSON.stringify({
      status: 'ok',
      timestamp: Date.now(),
      fetchedAt: new Date().toISOString(),
      count: articles.length,
      articles: articles.slice(0, 150),
      clusters: clusters,
      health: this.sourcesHealth
    }, null, 2);

    const targetPaths = [
      path.resolve(__dirname, '../../../public/news_cache.json'),
      path.resolve(__dirname, '../../../dist/news_cache.json')
    ];

    targetPaths.forEach(target => {
      try {
        const dir = path.dirname(target);
        if (fs.existsSync(dir)) {
          fs.writeFileSync(target, payload, 'utf8');
        }
      } catch (e) {}
    });
  }

  /**
   * Background Scheduler
   * Rebuilds cache every few minutes, serving stale data to clients while it refreshes.
   */
  startScheduler(intervalMinutes = 3) {
    const intervalMs = Math.max(1, intervalMinutes) * 60 * 1000;
    console.log(`[IngestionWorker] Initializing background scheduler (every ${intervalMinutes} min)...`);
    
    // Immediate initial background run
    this.runIngestionCycle().catch(err => {
      console.warn('[IngestionWorker] Initial background run error:', err.message);
    });

    if (this.schedulerTimer) clearInterval(this.schedulerTimer);
    this.schedulerTimer = setInterval(() => {
      this.runIngestionCycle().catch(err => {
        console.warn('[IngestionWorker] Scheduled cycle error:', err.message);
      });
    }, intervalMs);
  }

  stopScheduler() {
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }
}

module.exports = new IngestionWorker();
