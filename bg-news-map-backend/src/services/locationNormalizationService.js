// src/services/locationNormalizationService.js

class LocationNormalizationService {
    constructor() {
        this.cyrillicToLatinMap = {
            'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ж': 'zh',
            'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n',
            'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f',
            'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sht', 'ъ': 'a',
            'ь': 'y', 'ю': 'yu', 'я': 'ya',
            'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ж': 'Zh',
            'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N',
            'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F',
            'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sht', 'Ъ': 'A',
            'Ь': 'Y', 'Ю': 'Yu', 'Я': 'Ya'
        };

        this.commonSpellingVariants = {
            'варне': 'варна',
            'софии': 'софия',
            'пловдиве': 'пловдив',
            'бургасе': 'бургас'
        };
    }

    /**
     * Normalizes text for matching
     */
    normalize(text) {
        if (!text) return '';

        let normalized = text.toLowerCase();

        // Remove diacritics and combining marks
        normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        // Handle common case variants in Bulgarian (locative cases or common typos)
        // This is simple replacement for known endings if we want to be more sophisticated
        // but for now let's just use the map.
        for (const [variant, replacement] of Object.entries(this.commonSpellingVariants)) {
            const regex = new RegExp(`(^|[\\s,.:;!?"'«»()—–\\-\\/])${variant}([\\s,.:;!?"'«»()—–\\-\\/]|$)`, 'gi');
            normalized = normalized.replace(regex, (match, p1, p2) => `${p1}${replacement}${p2}`);
        }

        return normalized.trim();
    }

    /**
     * Transliterates Cyrillic to Latin
     */
    transliterate(text) {
        if (!text) return '';
        return text.split('').map(char => this.cyrillicToLatinMap[char] || char).join('');
    }

    /**
     * Generates multiple variants of a location name for fuzzy matching
     */
    generateVariants(name) {
        const variants = new Set();
        const normal = this.normalize(name);

        variants.add(normal);
        variants.add(this.transliterate(normal));

        // Add common variants if needed
        if (normal.endsWith('a')) variants.add(normal.substring(0, normal.length - 1) + 'е');

        return Array.from(variants);
    }
}

module.exports = new LocationNormalizationService();
