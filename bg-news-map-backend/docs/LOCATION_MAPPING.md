# Location Mapping Logic

## Extraction Process

1. **Text Normalization**: 
   The input text (title + summary) is converted to lowercase, diacritics are removed, and Cyrillic/Latin variants are prepared.
   Example: `София` -> `sofia`

2. **Indexed Lookup**:
   The system searches for prepared keys in a pre-built index of Bulgarian locations. This includes city names, landmark names, and specialized keywords (e.g., "морската столица").

3. **Confidence Scoring**:
   - If a location is found in the **Title**, it gains +20% confidence.
   - If it's an **Exact Name** match (not just a keyword match), it gains +20% confidence.
   - **Capital cities** or major hubs get a small boost.

4. **Geographic Filtering**:
   Points must be within:
   - North: 44.2167
   - South: 41.2349
   - East: 28.5589
   - West: 22.3571

5. **Deduplication**:
   If "Sofia City" and "Sredets" are both detected for the same article, they are recognized as the same general area (within 15km) and merged into the highest confidence match.

## Troubleshooting
- **Missing Location?** Check if the city is in `src/data/locations/cities.js`.
- **False Positive?** Adjust the threshold in `src/config/mapConfig.js` or add the mention to `ambiguous` keywords in `src/data/locations/keywords.js`.
