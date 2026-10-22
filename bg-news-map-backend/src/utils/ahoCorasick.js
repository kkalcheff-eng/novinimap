// src/utils/ahoCorasick.js

/**
 * High-Performance Aho-Corasick Multi-Pattern String Matcher
 * 
 * Replaces O(K * N) per-city regex iterations with a single O(N) linear scan
 * across all Bulgarian cities, regions, and keywords simultaneously.
 */

const BOUNDARY_CHARS = new Set([
  ' ', '\t', '\n', '\r', ',', '.', ':', ';', '!', '?', '"', "'",
  '«', '»', '(', ')', '[', ']', '{', '}', '—', '–', '-', '/',
  '\\', '<', '>', '*', '#', '~', '@', '_', '|', '`', '+'
]);

function isBoundary(char) {
  return !char || BOUNDARY_CHARS.has(char);
}

class TrieNode {
  constructor(char = '') {
    this.char = char;
    this.children = new Map();
    this.fail = null;
    this.outputs = []; // Array of { pattern, data, length }
  }
}

class AhoCorasick {
  constructor(patterns = []) {
    this.root = new TrieNode();
    this.isBuilt = false;

    if (Array.isArray(patterns) && patterns.length > 0) {
      patterns.forEach(item => {
        if (typeof item === 'string') {
          this.addPattern(item, { name: item });
        } else if (item && item.pattern) {
          this.addPattern(item.pattern, item.data || item);
        }
      });
      this.build();
    }
  }

  /**
   * Adds a pattern to the Trie
   * @param {string} pattern - Search phrase (e.g., 'софия', 'велико търново')
   * @param {any} data - Associated metadata (coordinates, city object, etc.)
   */
  addPattern(pattern, data = null) {
    if (!pattern || typeof pattern !== 'string') return;
    const cleanPattern = pattern.trim().toLowerCase();
    if (!cleanPattern) return;

    let curr = this.root;
    for (let i = 0; i < cleanPattern.length; i++) {
      const char = cleanPattern[i];
      if (!curr.children.has(char)) {
        curr.children.set(char, new TrieNode(char));
      }
      curr = curr.children.get(char);
    }

    curr.outputs.push({
      pattern: cleanPattern,
      data: data || { pattern: cleanPattern },
      length: cleanPattern.length
    });

    this.isBuilt = false;
  }

  /**
   * Builds failure transitions using BFS (Breadth-First Search)
   */
  build() {
    this.root.fail = this.root;
    const queue = [];

    // Level 1: Root's immediate children fail back to root
    for (const child of this.root.children.values()) {
      child.fail = this.root;
      queue.push(child);
    }

    // BFS for subsequent levels
    while (queue.length > 0) {
      const curr = queue.shift();

      for (const [char, child] of curr.children.entries()) {
        let f = curr.fail;
        while (f !== this.root && !f.children.has(char)) {
          f = f.fail;
        }

        if (f.children.has(char) && f.children.get(char) !== child) {
          child.fail = f.children.get(char);
        } else {
          child.fail = this.root;
        }

        // Merge outputs from the failure node (dictionary suffix links)
        if (child.fail.outputs.length > 0) {
          child.outputs = [...child.outputs, ...child.fail.outputs];
        }

        queue.push(child);
      }
    }

    this.isBuilt = true;
  }

  /**
   * Searches text for all patterns in a single linear pass O(N)
   * @param {string} text - Input text to scan
   * @param {object} options - Search options (wordBoundary, etc.)
   * @returns {Array} Array of matches
   */
  search(text, { wordBoundary = true } = {}) {
    if (!text || typeof text !== 'string') return [];
    if (!this.isBuilt) this.build();

    const normalized = text.toLowerCase();
    const matches = [];
    let curr = this.root;

    for (let i = 0; i < normalized.length; i++) {
      const char = normalized[i];

      // Follow failure transitions if child does not exist
      while (curr !== this.root && !curr.children.has(char)) {
        curr = curr.fail;
      }

      curr = curr.children.get(char) || this.root;

      // Check outputs at current state
      if (curr.outputs.length > 0) {
        for (const out of curr.outputs) {
          const start = i - out.length + 1;
          const end = i + 1;

          if (wordBoundary) {
            const prevChar = start > 0 ? normalized[start - 1] : null;
            const nextChar = end < normalized.length ? normalized[end] : null;

            if (!isBoundary(prevChar) || !isBoundary(nextChar)) {
              continue; // Skip substring match inside another word
            }
          }

          matches.push({
            pattern: out.pattern,
            data: out.data,
            start,
            end,
            length: out.length
          });
        }
      }
    }

    return matches;
  }

  /**
   * Returns non-overlapping matches, prioritizing longest patterns
   * (e.g. 'велико търново' over 'търново', 'стара загора' over 'загора')
   * @param {string} text - Text to scan
   * @returns {Array} Filtered best matches
   */
  findBestMatches(text) {
    const rawMatches = this.search(text, { wordBoundary: true });
    if (rawMatches.length === 0) return [];

    // Sort: earlier start first, then longer length first
    rawMatches.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      return b.length - a.length;
    });

    const nonOverlapping = [];
    let lastEnd = -1;

    for (const match of rawMatches) {
      if (match.start >= lastEnd) {
        nonOverlapping.push(match);
        lastEnd = match.end;
      }
    }

    return nonOverlapping;
  }
}

module.exports = AhoCorasick;
