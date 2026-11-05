import fs from 'node:fs';

/**
 * Détecteur de tics de style.
 *
 * Le linter typographique vérifie la forme ; ce module vérifie les habitudes
 * rhétoriques qui font qu'un texte sonne comme une machine : le renversement
 * systématique, l'annonce « Deux… Ensemble… », l'aphorisme de fin de paragraphe,
 * le tiret cadratin comme unique liaison.
 *
 * Les budgets sont des plafonds, pas des objectifs. Ils sont calibrés sur le
 * corpus : 4,6 tirets pour 1 000 mots, par exemple.
 */

const PATTERNS = [
  {
    id: 'negation-opposition',
    label: '« ce n’est pas X, c’est Y »',
    pattern:
      /\b(?:ce n['’]est pas|non pas|il ne s['’]agit pas de|la question n['’]est pas)\b[^.!?]{0,140}?\b(?:c['’]est|mais)\b/gi,
    budget: { absolute: 1 },
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

function strip(raw) {
  return String(raw ?? '')
    .replace(/^---\n[\s\S]*?\n---\n/, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`\n]*`/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ');
}

export function budgetLabel(budget) {
  return budget.absolute !== undefined
    ? `≤ ${budget.absolute}`
    : `≤ ${budget.per1000}/1000`;
}

export function checkStyle(raw) {
  const text = strip(raw);
  const words = text.match(/[A-Za-zÀ-ÿ'’\-]+/g)?.length ?? 0;

  const metrics = PATTERNS.map((definition) => {
    const matches = [
      ...text.matchAll(
        new RegExp(definition.pattern.source, definition.pattern.flags),
      ),
    ];
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

  return { words, metrics };
}

export function checkStyleFile(file) {
  return checkStyle(fs.readFileSync(file, 'utf8'));
}
