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
  'гривица': { lat: 43.4145, lng: 24.7055, name: 'Гривица' },
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
  'величково': { lat: 43.0466, lng: 27.4444, name: 'Величково' },
  'камен дял': { lat: 43.0291, lng: 27.2595, name: 'Камен дял' },
  'комунари': { lat: 43.0100, lng: 27.2938, name: 'Комунари' },
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
  'загин', 'почин', 'жертв', 'убит', 'убийств', 'убийц', 'убиец',
  'уби(?:ха|л|ла|ли)?' + END,
  'застрел', 'удави', 'удавен', 'мъртъв', 'мъртв', 'смърт',
  'труп(?:ът|ове|овете)?' + END,
  'ранен', 'катастроф'
]);

const NEGATED = rx([
  'няма\\s+(?:загинали|убити|мъртви|пострадали|ранени|жертви)',
  'без\\s+(?:загинали|пострадали|ранени|жертви)',
  'не\\s+(?:са|е)\\s+(?:загинал|загинали|убит|убити|мъртъв|мъртви|пострадал|пострадали|ранен|ранени)',
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
    // Use a new key so old, stale v4/v5 data cannot be reused.
    this.cacheKey = 'kalchev_news_agg_v6';
    this.ttl = 5 * 60 * 1000;

    // Remove obsolete cache entries automatically.
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('kalchev_news_agg_v4');
        localStorage.removeItem('kalchev_news_agg_v5');
      }
    } catch (error) {
      console.warn(
        '[NewsMapService] Could not clear old cache:',
        error
      );
    }
  }

  getCache() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(this.cacheKey);

        if (stored) {
          const parsed = JSON.parse(stored);
          const { data, timestamp } = parsed;

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
      console.warn(
        '[NewsMapService] Could not read cache:',
        error
      );
    }

    return null;
  }

  setCache(data) {
    try {
      if (
        typeof window !== 'undefined' &&
        window.localStorage &&
        Array.isArray(data) &&
        data.length > 0
      ) {
        localStorage.setItem(
          this.cacheKey,
          JSON.stringify({
            data,
            timestamp: Date.now()
          })
        );
      }
    } catch (error) {
      console.warn(
        '[NewsMapService] Could not save cache:',
        error
      );
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
    const isLethal = isLethalTitle(cleanTitle) || isLethalTitle(cleanSummary);

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