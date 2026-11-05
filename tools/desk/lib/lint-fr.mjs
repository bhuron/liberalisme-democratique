import fs from 'node:fs';

/**
 * Contrôle typographique du français.
 *
 * Volontairement déterministe : un modèle de langage juge le style, pas la
 * différence entre une espace sécable et une insécable. Les règles ci-dessous
 * suivent celles du corpus, qui utilise l'espace insécable avant ; : ! ? et à
 * l'intérieur des guillemets.
 */

const NBSP = /[\u00a0\u202f]/;

const LABELS = {
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

const SEVERITY = {
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

function blank(match) {
  return match.replace(/[^\n]/g, ' ');
}

// Remplace le code et les URL par un caractère neutre : il ne crée pas de
// double espace artificiel et ne peut pas être confondu avec de la ponctuation.
const PLACEHOLDER = '\u0001';

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

  // On remplace le frontmatter par des blancs pour conserver les numéros de
  // ligne, puis on neutralise le code, les liens et les balises.
  text = text.replace(/^---\n[\s\S]*?\n---\n/, blank);
  text = stripNonProse(text);

  const findings = [];
  const counts = {};

  const add = (rule, index, line, lineNumber) => {
    findings.push({
      rule,
      severity: SEVERITY[rule] ?? 'warning',
      message: LABELS[rule] ?? rule,
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
      // Aux extrémités de ligne, on considère qu'il y a une espace : un tiret
      // peut légitimement se trouver en début de ligne après un retour.
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
    if (spaceBefore)
      add('espace-ponctuation', spaceBefore.index, line, lineNumber);

    const apostrophe = /[A-Za-zÀ-ÿ]'[A-Za-zÀ-ÿ]/.exec(line);
    if (apostrophe) add('apostrophe', apostrophe.index, line, lineNumber);

    const ellipsis = /\.\.\./.exec(line);
    if (ellipsis) add('points-suspension', ellipsis.index, line, lineNumber);
  });

  return { file, findings, counts };
}

export function lintFile(file) {
  return lintText(fs.readFileSync(file, 'utf8'), { file });
}
