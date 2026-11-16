import path from 'node:path';

import { exemplarSelection } from './instructions.js';
import { exists, readText } from './store.js';

/**
 * Select writing exemplars from the local style corpus.
 *
 * Two articles are sent inline with the writer prompt: one FT/SCMP news piece
 * and one Le Monde diplomatique analysis, chosen for the domain of the article.
 * The rest of the corpus is a compact "spill" catalogue of paths: the writer
 * can read another example only if it needs one, instead of paying for the
 * whole corpus in every prompt.
 */

const CORPUS = 'editorial/style/newsroom-corpus.json';

const DOMAINS = {
  economie: [
    'commerce',
    'commercial',
    'commerciale',
    'trade',
    'export',
    'exports',
    'import',
    'imports',
    'economie',
    'economique',
    'economy',
    'economic',
    'marche',
    'market',
    'markets',
    'finance',
    'financier',
    'financiere',
    'bank',
    'banque',
    'dette',
    'debt',
    'inflation',
    'croissance',
    'growth',
    'investissement',
    'investment',
    'energie',
    'energy',
    'petrole',
    'oil',
    'gaz',
    'gas',
    'budget',
    'tarif',
    'tariff',
    'douane',
    'douanes',
    'industrie',
    'industriel',
    'usine',
    'pib',
    'gdp',
    'ipo',
    'bourse',
    'action',
    'actions',
    'capital',
    'credit',
    'taux',
    'obligation',
    'co-dependance',
    'autosuffisance',
    'souverainete',
  ],
  geopolitique: [
    'russie',
    'russia',
    'russo',
    'chine',
    'chinois',
    'chinoise',
    'china',
    'ukraine',
    'guerre',
    'war',
    'militaire',
    'military',
    'otan',
    'nato',
    'iran',
    'coree',
    'korea',
    'election',
    'elections',
    'sanction',
    'sanctions',
    'diplomatie',
    'diplomatique',
    'geopolitique',
    'geopolitics',
    'etats-unis',
    'united',
    'america',
    'trump',
    'putin',
    'pekin',
    'beijing',
    'kremlin',
    'brics',
    'europe',
    'europeen',
    'europeenne',
    'union',
    'ue',
    'arabie',
    'saoudien',
    'saoudiens',
    'emirati',
    'emiratis',
    'yemen',
    'syrie',
    'israel',
    'palestine',
    'gaza',
    'irak',
    'afghanistan',
    'inde',
    'japon',
    'proche-orient',
    'moyen-orient',
  ],
  tech: [
    'ia',
    'ai',
    'intelligence',
    'artificielle',
    'artificial',
    'tech',
    'technologie',
    'technology',
    'numerique',
    'digital',
    'data',
    'datacenter',
    'semi-conducteur',
    'semi-conducteurs',
    'chip',
    'chips',
    'puce',
    'puces',
    'logiciel',
    'software',
    'internet',
    'cloud',
    'robot',
    'algorithme',
    'anthropic',
    'openai',
    'deepseek',
  ],
  politique: [
    'politique',
    'politics',
    'gouvernement',
    'government',
    'president',
    'presidente',
    'parlement',
    'parliament',
    'loi',
    'law',
    'reforme',
    'reform',
    'election',
    'elections',
    'parti',
    'party',
    'ministere',
    'minister',
    'senat',
    'senate',
    'congres',
    'congress',
  ],
  societe: [
    'societe',
    'society',
    'sante',
    'health',
    'education',
    'ecole',
    'school',
    'universite',
    'university',
    'climat',
    'climate',
    'environnement',
    'environment',
    'immigration',
    'travail',
    'work',
    'emploi',
    'logement',
    'housing',
    'greve',
    'strike',
    'salaire',
    'wage',
    'famille',
    'family',
    'jeunesse',
    'youth',
  ],
};

const DOMAIN_LABELS = {
  economie: 'économie',
  geopolitique: 'géopolitique',
  tech: 'tech/IA',
  politique: 'politique',
  societe: 'société',
  general: 'général',
};

function normalize(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function tokens(text) {
  return new Set(normalize(text).match(/[a-z0-9]+/g) ?? []);
}

function scoreDomain(text, domain) {
  const set = tokens(text);
  const words = DOMAINS[domain] ?? [];
  return words.reduce((total, word) => total + (set.has(word) ? 1 : 0), 0);
}

function bestDomainFor(text) {
  let best = 'general';
  let bestScore = 0;
  for (const domain of Object.keys(DOMAINS)) {
    const score = scoreDomain(text, domain);
    if (score > bestScore) {
      best = domain;
      bestScore = score;
    }
  }
  return { domain: best, score: bestScore };
}

export function inferDomain(piece, sources = []) {
  const text = normalize(
    `${piece?.title ?? ''} ${piece?.intent ?? ''} ${sources
      .map((source) => source?.title ?? '')
      .join(' ')}`,
  );
  let best = 'general';
  let bestScore = 0;
  for (const domain of Object.keys(DOMAINS)) {
    const score = scoreDomain(text, domain);
    if (score > bestScore) {
      best = domain;
      bestScore = score;
    }
  }
  return best;
}

function loadRows(root) {
  const raw = readText(path.join(root, CORPUS), '');
  if (!raw) return [];
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  return (parsed.rows ?? []).filter(
    (row) => row?.file && exists(path.join(root, row.file)),
  );
}

function domainLabel(domain) {
  return DOMAIN_LABELS[domain] ?? domain;
}

function readFull(root, row) {
  return readText(path.join(root, row.file), '').trim();
}

/**
 * The full catalogue the preparer uses to choose the inline examples.
 * Paths are relative to the workspace so the preparer can copy one verbatim.
 */
export function styleCatalog(root) {
  const rows = loadRows(root)
    .map((row) => {
      const best = bestDomainFor(row.title);
      return {
        ...row,
        bestDomain: best.domain,
        bestScore: best.score,
      };
    })
    .sort(
      (a, b) =>
        String(a.site).localeCompare(String(b.site)) ||
        String(a.title).localeCompare(String(b.title)),
    );
  const text = rows
    .map(
      (row) =>
        `- ${row.file} — ${row.site} — ${row.title} (${row.words ?? '?'} mots, ${domainLabel(row.bestDomain)})`,
    )
    .join('\n');
  return { rows, text };
}

/** Read the paths the preparer wrote in the brief. */
export function parseChosenReferences(root, brief = '') {
  const section = /##\s+Références de style\s*\n([\s\S]*?)(?=\n##\s|$)/i.exec(
    String(brief ?? ''),
  );
  if (!section) return [];
  const paths = [...section[1].matchAll(/^-\s*path:\s*(\S+)\s*$/gim)]
    .map((match) => match[1].trim())
    .filter(
      (value) =>
        value.startsWith('editorial/style/corpus/') &&
        exists(path.join(root, value)),
    );
  return [...new Set(paths)];
}

/**
 * Return the inline + spill style references for one piece.
 * @param {string} root - workspace root.
 * @param {object} piece - piece record.
 * @param {Array<object>} sources - frozen source metadata.
 */
export function styleReferences(
  root,
  piece,
  sources = [],
  { inline = 3, catalog = 14, chosen = [] } = {},
) {
  const domain = inferDomain(piece, sources);
  const rows = loadRows(root).map((row) => {
    const best = bestDomainFor(row.title);
    return {
      ...row,
      domain,
      domainScore: scoreDomain(row.title, domain),
      bestDomain: best.domain,
      bestScore: best.score,
    };
  });

  if (!rows.length) {
    return {
      domain,
      domainLabel: domainLabel(domain),
      inlineRows: [],
      catalogRows: [],
      inlineText: '',
      catalogText: '',
      fallbackText: exemplarSelection(root),
      fallback: true,
    };
  }

  const relevance = (a, b) =>
    b.domainScore - a.domainScore ||
    b.bestScore - a.bestScore ||
    (b.words ?? 0) - (a.words ?? 0);

  const bySite = (pattern) =>
    rows.filter((row) => pattern.test(String(row.site ?? ''))).sort(relevance);
  const chosenRows = chosen
    .map((value) => rows.find((row) => row.file === value))
    .filter(Boolean);
  const inlineRows = [];
  for (const row of chosenRows) {
    if (!row || inlineRows.includes(row)) continue;
    inlineRows.push(row);
    if (inlineRows.length >= inline) break;
  }
  if (inlineRows.length === 0) {
    const news = bySite(/Financial Times|South China Morning Post/)[0];
    const analysis = bySite(/Le Monde diplomatique/)[0];
    for (const row of [news, analysis, ...rows]) {
      if (!row || inlineRows.includes(row)) continue;
      inlineRows.push(row);
      if (inlineRows.length >= inline) break;
    }
  }

  const catalogRows = rows
    .filter((row) => !inlineRows.includes(row))
    .sort(relevance)
    .slice(0, catalog);

  const inlineText = inlineRows
    .map((row) => {
      const text = readFull(root, row);
      if (!text) return '';
      return `### ${row.site} — ${row.title} (${row.words ?? '?'} mots, ${domainLabel(row.bestDomain)})\n\n${text}`;
    })
    .filter(Boolean)
    .join('\n\n---\n\n');

  const catalogText = catalogRows
    .map(
      (row) =>
        `- ${row.site} — ${row.title} (${row.words ?? '?'} mots, ${domainLabel(row.bestDomain)}) — ${row.file}`,
    )
    .join('\n');

  return {
    domain,
    domainLabel: domainLabel(domain),
    inlineRows,
    catalogRows,
    inlineText,
    catalogText,
    fallbackText: '',
    fallback: false,
  };
}
