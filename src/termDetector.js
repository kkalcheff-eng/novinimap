export class TermDetector {
  constructor(glossary) {
    this.glossary = glossary;
  }

  detect(text) {
    const found = [];

    const lowerText = text.toLowerCase();

    for (const key of Object.keys(this.glossary)) {
      if (lowerText.includes(key.toLowerCase())) {
        found.push({
          term: key,
          definition: this.glossary[key],
          source: "Local glossary"
        });
      }
    }

    return found;
  }
}