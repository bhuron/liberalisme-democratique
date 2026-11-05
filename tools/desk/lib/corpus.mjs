import fs from 'node:fs';
import path from 'node:path';

import matter from 'gray-matter';

import { CONTENT_DIR } from './paths.mjs';

/**
 * Index minimal du corpus pour la question « qu'est-ce que j'ai déjà dit ? ».
 * TF-IDF suffit très bien pour 31 articles et ne demande aucune dépendance.
 */

function stripMarkup(body) {
  return body
    .replace(/^import\s.+$/gm, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\{[\s\S]*?\}/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`]/g, ' ');
}

function tokenize(text) {
  return (
    String(text)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .match(/[a-z0-9]{3,}/g) ?? []
  );
}

export function loadCorpus() {
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((file) => /\.mdx?$/.test(file))
    .map((file) => {
      const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8');
      const { data, content } = matter(raw);
      const body = stripMarkup(content);
      return {
        slug: file.replace(/\.mdx?$/, ''),
        file,
        title: data.title,
        description: data.description ?? '',
        tags: data.tags ?? [],
        pubDate: data.pubDate,
        draft: Boolean(data.draft),
        body,
        tokens: tokenize(`${data.title} ${data.description ?? ''} ${body}`),
      };
    });
}

/**
 * Classe les articles du blog par proximité avec une requête.
 * Retourne [{ slug, title, pubDate, tags, score }], meilleur score d'abord.
 */
export function rankRelated(query, { limit = 5, exclude = [] } = {}) {
  const docs = loadCorpus().filter(
    (doc) => !doc.draft && !exclude.includes(doc.slug),
  );
  const queryTokens = tokenize(query);
  if (!docs.length || !queryTokens.length) return [];

  const documentFrequency = new Map();
  for (const doc of docs) {
    for (const token of new Set(doc.tokens)) {
      documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
    }
  }

  const total = docs.length;
  const idf = (token) =>
    Math.log((total + 1) / ((documentFrequency.get(token) ?? 0) + 1)) + 1;

  const vectorize = (tokens) => {
    const counts = new Map();
    for (const token of tokens) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
    const vector = new Map();
    let norm = 0;
    for (const [token, count] of counts) {
      const weight = (1 + Math.log(count)) * idf(token);
      vector.set(token, weight);
      norm += weight * weight;
    }
    norm = Math.sqrt(norm) || 1;
    for (const [token, weight] of vector) vector.set(token, weight / norm);
    return vector;
  };

  const queryVector = vectorize(queryTokens);

  return docs
    .map((doc) => {
      const docVector = vectorize(doc.tokens);
      let score = 0;
      for (const [token, weight] of queryVector) {
        const other = docVector.get(token);
        if (other) score += weight * other;
      }
      return {
        slug: doc.slug,
        title: doc.title,
        pubDate: doc.pubDate,
        tags: doc.tags,
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .filter((result) => result.score > 0);
}
