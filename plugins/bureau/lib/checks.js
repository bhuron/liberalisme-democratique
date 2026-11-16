import fs from 'node:fs';
import path from 'node:path';

import { parseFrontmatter, readText } from './store.js';

/* ------------------------------------------------------------------ */
/* French typography                                                   */
/* ------------------------------------------------------------------ */

const NBSP = /[\u00a0\u202f]/;
const PLACEHOLDER = '\u0001';

const LINT_LABELS = {
  'nbsp-manquante': 'espace insécable manquante',
  'espace-secable': 'espace sécable au lieu d’une insécable',
  'guillemet-ouverture': 'espace insécable manquante après «',
  'guillemet-fermeture': 'espace insécable manquante avant »',
  tiret: 'tiret cadratin sans espace',
  ai: '« AI » au lieu de « IA »',
  'double-espace': 'double espace',
  'espace-ponctuation': 'espace avant une virgule ou un point',
  apostrophe: 'apostrophe droite au lieu de ’',
  'points-suspension': '« ... » au lieu de « … »',
};

const LINT_SEVERITY = {
  'nbsp-manquante': 'error',
  'espace-secable': 'error',
  'guillemet-ouverture': 'error',
  'guillemet-fermeture': 'error',
  tiret: 'error',
  ai: 'warning',
  'double-espace': 'warning',
  'espace-ponctuation': 'warning',
  apostrophe: 'warning',
  'points-suspension': 'warning',
};

const blank = (match) => match.replace(/[^\n]/g, ' ');

function stripNonProse(text) {
  return text
    .replace(/```[\s\S]*?```/g, blank)
    .replace(/`[^`\n]*`/g, PLACEHOLDER)
    .replace(/^import\s.+$/gm, blank)
    .replace(/https?:\/\/\S+/g, PLACEHOLDER)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, PLACEHOLDER)
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, PLACEHOLDER);
}

function surround(text, index, radius = 28) {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + radius);
  return text
    .slice(start, end)
    .replace(/\u0001/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isSpace(char) {
  return char === ' ' || NBSP.test(char ?? '');
}

export function lintText(raw, { file = null } = {}) {
  let text = String(raw ?? '');
  text = text.replace(/^---\n[\s\S]*?\n---\n/, blank);
  text = stripNonProse(text);

  const findings = [];
  const counts = {};

  const add = (rule, index, line, lineNumber) => {
    findings.push({
      rule,
      severity: LINT_SEVERITY[rule] ?? 'warning',
      message: LINT_LABELS[rule] ?? rule,
      file,
      line: lineNumber,
      column: index + 1,
      excerpt: surround(line, index),
    });
    counts[rule] = (counts[rule] ?? 0) + 1;
  };

  const lines = text.split('\n');
  lines.forEach((line, lineIndex) => {
    const lineNumber = lineIndex + 1;
    if (!line.trim()) return;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      const previous = index === 0 ? ' ' : (line[index - 1] ?? ' ');
      const next = line[index + 1] ?? ' ';

      if (';:!?'.includes(char) && index > 0) {
        if (char === ':' && line.slice(index - 2, index + 1) === '://')
          continue;
        if (char === ':' && /\d/.test(previous) && /\d/.test(next)) continue;
        if (char === '!' && (previous === '[' || next === '=')) continue;
        if (char === '?' && next === '>') continue;
        if (NBSP.test(previous)) continue;
        add(
          previous === ' ' ? 'espace-secable' : 'nbsp-manquante',
          index,
          line,
          lineNumber,
        );
      }

      if (char === '«') {
        if (NBSP.test(next)) continue;
        add(
          next === ' ' ? 'espace-secable' : 'guillemet-ouverture',
          index,
          line,
          lineNumber,
        );
      }

      if (char === '»') {
        if (NBSP.test(previous)) continue;
        add(
          previous === ' ' ? 'espace-secable' : 'guillemet-fermeture',
          index,
          line,
          lineNumber,
        );
      }

      if (char === '—' && !(isSpace(previous) && isSpace(next))) {
        add('tiret', index, line, lineNumber);
      }
    }

    const ai = /\bAI\b/.exec(line);
    if (ai) add('ai', ai.index, line, lineNumber);

    const doubleSpace = /[^\s] {2,}[^\s]/.exec(line);
    if (doubleSpace) add('double-espace', doubleSpace.index, line, lineNumber);

    const spaceBefore = /[^\s] [.,](?:\s|$)/.exec(line);
    if (spaceBefore) {
      add('espace-ponctuation', spaceBefore.index, line, lineNumber);
    }

    const apostrophe = /[A-Za-zÀ-ÿ]'[A-Za-zÀ-ÿ]/.exec(line);
    if (apostrophe) add('apostrophe', apostrophe.index, line, lineNumber);

    const ellipsis = /\.\.\./.exec(line);
    if (ellipsis) add('points-suspension', ellipsis.index, line, lineNumber);
  });

  return { file, findings, counts };
}

/* ------------------------------------------------------------------ */
/* Style tics and register                                             */
/* ------------------------------------------------------------------ */

const NEGATION_OPPOSITION = new RegExp(
  [
    String.raw`\b(?:ce n['’]est pas|ce n['’]était pas|non pas|il ne s['’]agit pas de|la question n['’]est pas|il n['’]y a pas)\b[^.!?]{0,140}?\b(?:c['’]est|mais|elle est|il est|elles sont|ils sont)\b`,
    String.raw`\b(?:ne|n['’])\s*[\p{L}'’\-]+(?:\s+[\p{L}'’\-]+){0,2}\s+pas\b[^.!?]{0,120}?[,;:]\s*(?:c['’]est|ce sont|il|elle|ils|elles|on|cela|ça|ce)\b\s+[\p{L}'’\-]+`,
    String.raw`\b[\p{L}][\p{L}'’\-]*(?:\s+[\p{L}'’\-]+){0,4}\s+n['’]est pas\b[^.!?]{0,110}?\s+mais\s`,
  ].join('|'),
  'giu',
);

const STYLE_PATTERNS = [
  {
    id: 'negation-opposition',
    label: '« ce n’est pas X, c’est Y » et variantes',
    pattern: NEGATION_OPPOSITION,
    budget: { absolute: 0 },
    skip: (text, index, match) => {
      const before = text.slice(Math.max(0, index - 48), index);
      if (
        /\b(?:si|s['’]il|s['’]ils?|quand|lorsqu['’]|lorsque)\s+(?:\p{L}+['’]?\s+){0,3}$/iu.test(
          before,
        )
      ) {
        return true;
      }
      if (/\bce\s+(?:qui|que|qu['’]|dont|où)\s*$/u.test(match[0])) return true;
      if (/\bnon pas seulement\b/u.test(match[0])) return true;
      return false;
    },
  },
  {
    id: 'tiret',
    label: 'tiret cadratin',
    pattern: /—/g,
    budget: { per1000: 6 },
  },
  {
    id: 'c-est',
    label: 'phrase commençant par « C’est »',
    pattern: /(?:^|[.!?]\s+)C['’]est\b/gm,
    budget: { per1000: 4 },
  },
  {
    id: 'precisement',
    label: '« précisément » / « exactement »',
    pattern: /\b(?:précisément|exactement)\b/gi,
    budget: { absolute: 2 },
  },
  {
    id: 'ensemble',
    label: '« Deux… Ensemble… »',
    pattern: /\b(?:Ensemble|Toutes deux|Les deux),?\s+(?:elles|ils)\b/gi,
    budget: { absolute: 0 },
  },
  {
    id: 'est-devenu',
    label: 'aphorisme « est devenu »',
    pattern: /\best devenu(?:e)?\b/gi,
    budget: { absolute: 1 },
  },
];

function stripStyle(raw) {
  return String(raw ?? '')
    .replace(/^---\n[\s\S]*?\n---\n/, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`\n]*`/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ');
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function percentile(values, ratio) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[
    Math.min(sorted.length - 1, Math.round(ratio * (sorted.length - 1)))
  ];
}

/** Register measures: sentence, paragraph, lead, headings, quotes. */
function structureOf(text, words) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const sentences = (text.match(/[^.!?]+[.!?]+/g) ?? [text])
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const sentenceLengths = sentences
    .map((sentence) => sentence.split(/\s+/).filter(Boolean).length)
    .filter((length) => length > 0);
  const paragraphLengths = paragraphs
    .map((paragraph) => paragraph.split(/\s+/).filter(Boolean).length)
    .filter((length) => length > 0);
  const quotes = Math.ceil((text.match(/[“”"«»]/g) ?? []).length / 2);
  const attributions = (
    text.match(
      /\b(?:selon|affirme|explique|précise|indique|rapporte|déclare|estime|ajoute|dit|note|souligne|rappelle|prévient|reconnaît|confie|assure|observe|constate|poursuit)\b/gi,
    ) ?? []
  ).length;
  const per1000 = (count) =>
    words ? Number(((count / words) * 1000).toFixed(1)) : 0;

  return {
    sentences: sentenceLengths.length,
    sentenceMedian: Number(median(sentenceLengths).toFixed(1)),
    sentenceMean: sentences.length
      ? Number(
          (
            sentenceLengths.reduce((total, value) => total + value, 0) /
            sentenceLengths.length
          ).toFixed(1),
        )
      : 0,
    sentenceP90: percentile(sentenceLengths, 0.9),
    paragraphs: paragraphLengths.length,
    paragraphMedian: Number(median(paragraphLengths).toFixed(1)),
    leadWords: paragraphLengths[0] ?? 0,
    headings: (text.match(/^##\s+/gm) ?? []).length,
    quotesPer1000: per1000(quotes),
    attributionsPer1000: per1000(attributions),
  };
}

export function budgetLabel(budget) {
  return budget.absolute !== undefined
    ? `≤ ${budget.absolute}`
    : `≤ ${budget.per1000}/1000`;
}

export function checkStyle(raw) {
  const text = stripStyle(raw);
  const words = text.match(/[A-Za-zÀ-ÿ'’\-]+/g)?.length ?? 0;
  const structure = structureOf(text, words);

  const metrics = STYLE_PATTERNS.map((definition) => {
    const matches = [
      ...text.matchAll(
        new RegExp(definition.pattern.source, definition.pattern.flags),
      ),
    ].filter((match) => !definition.skip?.(text, match.index ?? 0, match));
    const count = matches.length;
    const density = words ? (count / words) * 1000 : 0;
    const over =
      definition.budget.absolute !== undefined
        ? count > definition.budget.absolute
        : density > definition.budget.per1000;

    return {
      id: definition.id,
      label: definition.label,
      count,
      density: Number(density.toFixed(1)),
      budget: definition.budget,
      over,
      samples: matches.slice(0, 2).map((match) => ({
        excerpt: text
          .slice(
            Math.max(0, (match.index ?? 0) - 45),
            (match.index ?? 0) + match[0].length + 45,
          )
          .replace(/\s+/g, ' ')
          .trim(),
      })),
    };
  });

  metrics.push({
    id: 'headings',
    label: 'intertitres (##)',
    count: structure.headings,
    density: 0,
    budget: { absolute: 3 },
    over: structure.headings > 3,
    samples: [],
  });

  return { words, structure, metrics };
}

/* ------------------------------------------------------------------ */
/* Blog corpus                                                         */
/* ------------------------------------------------------------------ */

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

export function loadCorpus(root) {
  const directory = path.join(root, 'src', 'content', 'blog');
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory)
    .filter((file) => /\.mdx?$/.test(file))
    .map((file) => {
      const raw = readText(path.join(directory, file), '');
      const { data, content } = parseFrontmatter(raw);
      const body = stripMarkup(content);
      return {
        slug: file.replace(/\.mdx?$/, ''),
        file,
        title: data.title ?? file,
        description: data.description ?? '',
        tags: Array.isArray(data.tags) ? data.tags : [],
        pubDate: data.pubDate ?? null,
        draft: data.draft === true || data.draft === 'true',
        body,
        tokens: tokenize(`${data.title} ${data.description ?? ''} ${body}`),
      };
    });
}

/** Rank earlier posts by proximity to a query. */
export function rankRelated(root, query, { limit = 5, exclude = [] } = {}) {
  const docs = loadCorpus(root).filter(
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
        score: Number(score.toFixed(4)),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .filter((result) => result.score > 0);
}
