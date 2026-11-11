#!/usr/bin/env node
/**
 * Corpus de registre — SCMP et Financial Times.
 *
 * `collect` fige dans `editorial/style/corpus/` (non versionné) les articles
 * SCMP/FT capturés par bookmark-digest. `analyze` en tire un profil mesuré :
 * longueur des phrases, des paragraphes, attaques, citations, attributions.
 *
 * Le corpus n'est jamais committé (textes sous droits) ; le profil, oui, car
 * il ne contient que des mesures.
 */
import fs from 'node:fs';
import path from 'node:path';

import { openBookmarkReader } from '../tools/desk/lib/bookmark.mjs';
import { SITE_ROOT } from '../tools/desk/lib/paths.mjs';

const CORPUS_DIR = path.join(SITE_ROOT, 'editorial/style/corpus');
const PROFILE_FILE = path.join(SITE_ROOT, 'editorial/style/newsroom-profile.md');
const METRICS_FILE = path.join(SITE_ROOT, 'editorial/style/newsroom-corpus.json');
const EXEMPLARS_FILE = path.join(CORPUS_DIR, 'newsroom-exemplars.md');
const SITE_PATTERN =
	/(south china morning post|scmp|financial times|ft\.com|le monde diplomatique|monde-diplomatique)/i;
const MIN_CORPUS = 12;

function siteSlug(name) {
	const value = String(name ?? '');
	if (/financial times|ft\.com/i.test(value)) return 'financial-times';
	if (/south china morning post|scmp/i.test(value)) {
		return 'south-china-morning-post';
	}
	if (/le monde diplomatique|monde-diplomatique/i.test(value)) {
		return 'le-monde-diplomatique';
	}
	return value
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

function walk(dir) {
	if (!fs.existsSync(dir)) return [];
	const out = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) out.push(...walk(full));
		else if (entry.name.endsWith('.txt')) out.push(full);
	}
	return out;
}

function median(values) {
	if (!values.length) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0
		? (sorted[middle - 1] + sorted[middle]) / 2
		: sorted[middle];
}

function mean(values) {
	if (!values.length) return 0;
	return values.reduce((total, value) => total + value, 0) / values.length;
}

function percentile(values, ratio) {
	if (!values.length) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const index = Math.min(sorted.length - 1, Math.round(ratio * (sorted.length - 1)));
	return sorted[index];
}

function round(value, digits = 1) {
	return Number.isFinite(value) ? Number(value.toFixed(digits)) : 0;
}

function sentencesOf(text) {
	return (text.match(/[^.!?]+[.!?]+/g) ?? [text])
		.map((sentence) => sentence.trim())
		.filter(Boolean);
}

function keywordsOf(text) {
	const lower = text.toLowerCase();
	return {
		quotes: Math.ceil((text.match(/[“”"«»]/g) ?? []).length / 2),
		attributions: (
			lower.match(/\b(said|says|told|according to|wrote|added|noted|selon|affirme|explique|précise|indique|rapporte|déclare|estime|ajoute|dit|note|souligne|rappelle|prévient|reconnaît|confie|assure|observe|constate|poursuit)\b/g) ?? []
		).length,
	};
}

function decodeEntities(value) {
	return value
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;|&apos;/g, "'")
		.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
		.replace(/&#x([0-9a-f]+);/gi, (_, code) =>
			String.fromCharCode(parseInt(code, 16)),
		);
}

function stripTags(value) {
	return decodeEntities(value.replace(/<[^>]+>/g, ' '))
		.replace(/\s+/g, ' ')
		.trim();
}

/** Paragraphes et intertitres lus dans le HTML capturé. */
function htmlStructure(html) {
	const paragraphs = [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
		.map((match) => stripTags(match[1]))
		.filter((paragraph) => paragraph.split(/\s+/).filter(Boolean).length > 2);
	const headings = [...html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)]
		.map((match) => stripTags(match[2]))
		.filter(Boolean);
	return { paragraphs, headings };
}

function analyzeText(text, meta, structure) {
	const clean = text
		.replace(/\r\n/g, '\n')
		.replace(/[ \t]+/g, ' ')
		.trim();
	const words = clean.split(/\s+/).filter(Boolean);
	const paragraphs =
		structure?.paragraphs?.length
			? structure.paragraphs
			: clean
					.split(/\n+/)
					.map((paragraph) => paragraph.trim())
					.filter(Boolean);
	const headingCount = structure ? structure.headings.length : null;
	const sentences = sentencesOf(clean);
	const sentenceLengths = sentences
		.map((sentence) => sentence.split(/\s+/).filter(Boolean).length)
		.filter((length) => length > 0);
	const paragraphLengths = paragraphs
		.map((paragraph) => paragraph.split(/\s+/).filter(Boolean).length)
		.filter((length) => length > 0);
	const { quotes, attributions } = keywordsOf(clean);
	const per1000 = (count) =>
		words.length ? round((count / words.length) * 1000) : 0;

	return {
		id: meta.id ?? null,
		site: meta.site ?? null,
		title: meta.title ?? null,
		url: meta.url ?? null,
		published_at: meta.published_at ?? null,
		words: words.length,
		sentences: sentenceLengths.length,
		sentenceMedian: round(median(sentenceLengths)),
		sentenceMean: round(mean(sentenceLengths)),
		sentenceP90: percentile(sentenceLengths, 0.9),
		sentenceMax: sentenceLengths.length
			? Math.max(...sentenceLengths)
			: 0,
		paragraphs: paragraphLengths.length,
		headingCount,
		paragraphMedian: paragraphLengths.length > 1 ? round(median(paragraphLengths)) : null,
		paragraphMean: paragraphLengths.length > 1 ? round(mean(paragraphLengths)) : null,
		leadWords: paragraphLengths.length > 1 ? paragraphLengths[0] : null,
		quotesPer1000: per1000(quotes),
		attributionsPer1000: per1000(attributions),
		firstSentence: sentences[0] ?? '',
		lastSentence: sentences[sentences.length - 1] ?? '',
	};
}

async function collect() {
	const reader = await openBookmarkReader();
	try {
		const articles = await reader.list({ limit: 2000 });
		const targets = articles.filter((article) =>
			SITE_PATTERN.test(String(article.site_name ?? '')),
		);
		let added = 0;
		for (const summary of targets) {
			const article = await reader.get(summary.id);
			const text = String(article?.content_text ?? '').trim();
			if (!text) continue;
			const dir = path.join(CORPUS_DIR, siteSlug(article.site_name));
			fs.mkdirSync(dir, { recursive: true });
			const textFile = path.join(dir, `${article.id}.txt`);
			const metaFile = path.join(dir, `${article.id}.json`);
			if (!fs.existsSync(textFile)) {
				fs.writeFileSync(textFile, text, 'utf8');
				added += 1;
			}
			const html = String(article.content_html ?? '').trim();
			if (html) {
				fs.writeFileSync(path.join(dir, `${article.id}.html`), html, 'utf8');
			}
			fs.writeFileSync(
				metaFile,
				JSON.stringify(
					{
						id: article.id,
						site: article.site_name,
						title: article.title,
						url: article.url,
						published_at: article.published_at ?? article.created_at,
						word_count: article.word_count ?? null,
						language: article.language ?? null,
					},
					null,
					2,
				),
				'utf8',
			);
		}
		const total = walk(CORPUS_DIR).length;
		console.log(`Corpus : ${total} article(s), ${added} nouveau(x).`);
		if (total < MIN_CORPUS) {
			console.log(
				`Il en faut au moins ${MIN_CORPUS} pour un profil utile : capture d'autres articles SCMP/FT avec bookmark-digest, puis relance.`,
			);
		}
	} finally {
		reader.close();
	}
}

async function analyze() {
	const files = walk(CORPUS_DIR);
	if (!files.length) {
		console.log(
			'Corpus vide. Lance `node scripts/style-corpus.js collect` après avoir capturé des articles SCMP/FT.',
		);
		return;
	}

	const rows = files.map((file) => {
		const metaFile = file.replace(/\.txt$/, '.json');
		let meta = {};
		try {
			meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
		} catch {
			meta = {};
		}
		const htmlFile = file.replace(/\.txt$/, '.html');
		let structure = null;
		try {
			structure = htmlStructure(fs.readFileSync(htmlFile, 'utf8'));
		} catch {
			structure = null;
		}
		const row = analyzeText(
			fs.readFileSync(file, 'utf8'),
			{ id: path.basename(file, '.txt'), ...meta },
			structure,
		);
		return { ...row, file: path.relative(SITE_ROOT, file) };
	});

	const siteAggregate = (subset) => ({
		articles: subset.length,
		sentenceMedian: round(median(subset.map((row) => row.sentenceMedian))),
		paragraphMedian: (() => {
			const values = subset
				.map((row) => row.paragraphMedian)
				.filter((value) => typeof value === 'number');
			return values.length ? round(median(values)) : null;
		})(),
		leadMedian: (() => {
			const values = subset
				.map((row) => row.leadWords)
				.filter((value) => typeof value === 'number');
			return values.length ? round(median(values)) : null;
		})(),
		headingMedian: (() => {
			const values = subset
				.map((row) => row.headingCount)
				.filter((value) => typeof value === 'number');
			return values.length ? round(median(values)) : null;
		})(),
		quotesPer1000: round(mean(subset.map((row) => row.quotesPer1000))),
		attributionsPer1000: round(
			mean(subset.map((row) => row.attributionsPer1000)),
		),
	});
	const bySite = [...new Set(rows.map((row) => row.site).filter(Boolean))].map(
		(site) => ({ site, ...siteAggregate(rows.filter((row) => row.site === site)) }),
	);

	const aggregate = {
		articles: rows.length,
		sites: [...new Set(rows.map((row) => row.site).filter(Boolean))],
		words: rows.reduce((total, row) => total + row.words, 0),
		sentenceMedian: round(median(rows.map((row) => row.sentenceMedian))),
		sentenceMean: round(mean(rows.map((row) => row.sentenceMean))),
		sentenceP90: round(median(rows.map((row) => row.sentenceP90))),
		paragraphMedian: (() => {
			const values = rows.map((row) => row.paragraphMedian).filter((value) => typeof value === 'number');
			return values.length ? round(median(values)) : null;
		})(),
		leadMedian: (() => {
			const values = rows.map((row) => row.leadWords).filter((value) => typeof value === 'number');
			return values.length ? round(median(values)) : null;
		})(),
		headingMedian: (() => {
			const values = rows.map((row) => row.headingCount).filter((value) => typeof value === 'number');
			return values.length ? round(median(values)) : null;
		})(),
		quotesPer1000: round(mean(rows.map((row) => row.quotesPer1000))),
		attributionsPer1000: round(
			mean(rows.map((row) => row.attributionsPer1000)),
		),
	};

	fs.mkdirSync(path.dirname(METRICS_FILE), { recursive: true });
	// Le JSON ne garde que les mesures : pas d'extraits d'articles versionnés.
	const metricRows = rows.map(
		({ firstSentence, lastSentence, ...row }) => row,
	);
	fs.writeFileSync(
		METRICS_FILE,
		JSON.stringify(
			{ generatedAt: new Date().toISOString(), aggregate, rows: metricRows },
			null,
			2,
		),
		'utf8',
	);

	const table = rows
		.map(
			(row) =>
				`| ${row.site} | ${String(row.title ?? '').replace(/\|/g, '\\|').slice(0, 70)} | ${row.words} | ${row.sentenceMedian} | ${row.paragraphMedian ?? '—'} | ${row.leadWords ?? '—'} | ${row.headingCount ?? '—'} | ${row.quotesPer1000} |`,
		)
		.join('\n');

	const profile = `# Profil de registre — presse (SCMP, Financial Times)

Profil provisoire établi le ${new Date().toISOString().slice(0, 10)} sur
**${aggregate.articles} article(s)** (${aggregate.sites.join(', ') || 'sites non identifiés'}).
Les textes intégraux restent dans \`editorial/style/corpus/\` (non versionné) ;
ce fichier ne contient que des mesures.

${aggregate.articles < MIN_CORPUS ? `> Corpus trop petit (${aggregate.articles} < ${MIN_CORPUS}) : les chiffres sont indicatifs. Capture davantage d'articles, puis relance \`node scripts/style-corpus.js analyze\`.\n` : ''}
## Mesures agrégées

| Mesure | Valeur |
|---|---|
| Phrase médiane | ${aggregate.sentenceMedian} mots |
| Phrase moyenne | ${aggregate.sentenceMean} mots |
| 90e centile des phrases | ${aggregate.sentenceP90} mots |
| Paragraphe médian | ${aggregate.paragraphMedian ?? 'non mesuré'} mots |
| Attaque (premier paragraphe) | ${aggregate.leadMedian ?? 'non mesuré'} mots |
| Citations pour 1 000 mots | ${aggregate.quotesPer1000} |
| Attributions pour 1 000 mots | ${aggregate.attributionsPer1000} |
| Intertitres par article (médiane) | ${aggregate.headingMedian ?? 'non mesuré'} |

## Par site

| Site | Articles | Phrase méd. | § méd. | Attaque | Intertitres | Citations/1000 | Attributions/1000 |
|---|---|---|---|---|---|---|---|
${bySite
	.map(
		(site) =>
			`| ${site.site} | ${site.articles} | ${site.sentenceMedian} | ${site.paragraphMedian ?? '—'} | ${site.leadMedian ?? '—'} | ${site.headingMedian ?? '—'} | ${site.quotesPer1000} | ${site.attributionsPer1000} |`,
	)
	.join('\n')}

## Par article

| Site | Titre | Mots | Phrase méd. | § méd. | Attaque | Intertitres | Citations/1000 |
|---|---|---|---|---|---|---|---|
${table}

## Lecture

- Le registre visé est celui d'une dépêche : phrase médiane courte, attaque
  brève, faits datés, citations attribuées. Ces mesures donnent des cibles au
  rédacteur, pas des règles de style.
- Les intertitres sont lus dans le HTML capturé (balises h1 à h6) ; la règle de
  la charte (sections optionnelles, deux ou trois au plus) reste la référence.
- Les exemplaires courts pour le rédacteur sont dans
  \`editorial/style/corpus/newsroom-exemplars.md\` (local, non versionné).
`;

	fs.writeFileSync(PROFILE_FILE, profile, 'utf8');

	const exemplars = rows
		.map(
			(row) =>
				`## ${row.site} — ${row.title}\n\n- Attaque : ${row.firstSentence}\n- Clôture : ${row.lastSentence}\n- ${row.words} mots, phrase médiane ${row.sentenceMedian}, attaque ${row.leadWords} mots.\n`,
		)
		.join('\n');
	fs.writeFileSync(
		EXEMPLARS_FILE,
		`# Exemplaires de registre (local, non versionné)\n\nExtraits courts pour le rédacteur : structure, pas formulation.\n\n${exemplars}`,
		'utf8',
	);

	console.log(`Profil écrit : ${path.relative(SITE_ROOT, PROFILE_FILE)}`);
	console.log(`Mesures : ${path.relative(SITE_ROOT, METRICS_FILE)}`);
	console.log(`Exemplaires locaux : ${path.relative(SITE_ROOT, EXEMPLARS_FILE)}`);
}

const command = process.argv[2] ?? 'analyze';
if (command === 'collect') {
	await collect();
} else if (command === 'analyze') {
	await analyze();
} else {
	console.log('Usage : node scripts/style-corpus.js [collect|analyze]');
}
