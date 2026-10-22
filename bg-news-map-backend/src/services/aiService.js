// src/services/aiService.js
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

class AIService {
    constructor() {
        this.endpoint = process.env.OLLAMA_URL || 'http://localhost:11434/api/generate';
        this.model = process.env.OLLAMA_MODEL || 'llama3';
    }

    async extractData(text) {
        const prompt = `Extract structured data from this Bulgarian news.
Return ONLY valid JSON.
Rules: Extract location names without prefixes like "в района на", "край", "до".
{
  "city": "exact city name",
  "location_text": "street, landmark or district",
  "category": "incident, news, infrastructure or other",
  "summary": "1 sentence bulgarian summary"
}
Article: ${text}`;

        try {
            const resp = await fetch(this.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.model,
                    prompt: prompt,
                    stream: false,
                    format: 'json'
                })
            });

            if (!resp.ok) {
                console.warn(`[AIService] Ollama responded with status: ${resp.status}`);
                return null;
            }

            const result = await resp.json();
            return JSON.parse(result.response);
        } catch (error) {
            console.error('[AIService] Error calling AI:', error.message);
            return null;
        }
    }
}

module.exports = new AIService();
