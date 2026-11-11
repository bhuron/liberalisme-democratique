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
	return sorted[Math.min(sorted.length - 1, Math.round(ratio * (sorted.length - 1)))];
}

/** Mesures de registre : phrase, paragraphe, attaque, intertitres, citations. */
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
  const text = strip(raw);
  const words = text.match(/[A-Za-zÀ-ÿ'’\-]+/g)?.length ?? 0;

  const structure = structureOf(text, words);

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

  return { words, structure, metrics };
}

export function checkStyleFile(file) {
  return checkStyle(fs.readFileSync(file, 'utf8'));
}
