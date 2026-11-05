#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

import { openBookmarkReader } from './lib/bookmark.mjs';
import { rankRelated } from './lib/corpus.mjs';
import { assessCoverage } from './lib/coverage.mjs';
import { lintFile } from './lib/lint-fr.mjs';
import { CONTENT_DIR } from './lib/paths.mjs';
import {
  addSources,
  createPiece,
  listPieces,
  pieceDir,
  readPiece,
  setStatus,
} from './lib/pieces.mjs';
import { runReviewLoop, runStage, stageStatus } from './lib/pipeline.mjs';
import { listSourceMetas, snapshotSource, sourceDir } from './lib/sources.mjs';
import { budgetLabel, checkStyleFile } from './lib/style-check.mjs';
import { formatDate, parseSince, truncate } from './lib/store.mjs';

function fail(message) {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
  return null;
}

function parseArgs(args) {
  const positional = [];
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }

    const key = arg.slice(2);
    const next = args[index + 1];
    if (!next || next.startsWith('--')) {
      options[key] = true;
    } else {
      options[key] = next;
      index += 1;
    }
  }

  return { positional, options };
}

function renderTable(rows, columns) {
  const widths = columns.map((column) =>
    Math.max(
      column.label.length,
      ...rows.map((row) => String(column.value(row)).length),
    ),
  );

  const header = columns
    .map((column, index) => column.label.padEnd(widths[index]))
    .join('  ');
  const rule = widths.map((width) => '─'.repeat(width)).join('  ');

  console.log(header);
  console.log(rule);
  for (const row of rows) {
    console.log(
      columns
        .map((column, index) => String(column.value(row)).padEnd(widths[index]))
        .join('  '),
    );
  }
}

function normalizeUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(value);
    return `${url.hostname.replace(/^www\./, '')}${url.pathname}`
      .replace(/\/+$/, '')
      .toLowerCase();
  } catch {
    return String(value).toLowerCase().replace(/\/+$/, '');
  }
}

function coverageMark(level) {
  if (level === 'full') return 'ok';
  if (level === 'partial') return '⚠';
  return '✗';
}

async function commandInbox({ options }) {
  const limit = Number(options.limit) || 20;
  const since = parseSince(options.since);
  const reader = await openBookmarkReader();

  try {
    const articles = await reader.list({ limit, since });

    if (options.json) {
      console.log(
        JSON.stringify(
          articles.map((article) => ({
            ...article,
            coverage: assessCoverage(article),
          })),
          null,
          2,
        ),
      );
      return;
    }

    if (!articles.length) {
      console.log('Aucune capture dans la fenêtre demandée.');
      return;
    }

    console.log(
      `bookmark-digest via ${reader.via} — ${articles.length} capture(s)\n`,
    );

    const rows = articles.map((article) => {
      const coverage = assessCoverage(article);
      const snapped = fs.existsSync(
        path.join(sourceDir(article.id), 'meta.json'),
      );
      return {
        id: article.id,
        captured: formatDate(article.created_at),
        site: truncate(article.site_name ?? '—', 18),
        words: article.word_count ?? 0,
        coverage: coverageMark(coverage.level),
        desk: snapped ? '✓' : '',
        title: truncate(article.title, 58),
        reasons: coverage.reasons,
      };
    });

    renderTable(rows, [
      { label: 'ID', value: (row) => row.id },
      { label: 'Capturé', value: (row) => row.captured },
      { label: 'Site', value: (row) => row.site },
      { label: 'Mots', value: (row) => row.words },
      { label: 'Couv.', value: (row) => row.coverage },
      { label: 'Desk', value: (row) => row.desk },
      { label: 'Titre', value: (row) => row.title },
    ]);

    const partial = rows.filter((row) => row.reasons.length);
    if (partial.length) {
      console.log('\nCouvertures incomplètes :');
      for (const row of partial) {
        console.log(`  ${row.id} : ${row.reasons.join(' ; ')}`);
      }
    }
  } finally {
    reader.close();
  }
}

async function commandAdd({ positional, options }) {
  const ids = positional.map((id) => Number(id));
  if (!ids.length || ids.some((id) => !Number.isInteger(id))) {
    return fail('Indiquez au moins un identifiant de capture.');
  }

  const slug = options.slug;
  if (!slug) return fail('--slug est requis (ex. --slug ma-piece).');

  const reader = await openBookmarkReader();
  const metas = [];

  try {
    for (const id of ids) {
      metas.push(await snapshotSource(reader, id));
    }
  } finally {
    reader.close();
  }

  const intent = options['intent-file']
    ? fs.readFileSync(options['intent-file'], 'utf8')
    : (options.intent ?? '');

  let piece = readPiece(slug);
  if (piece) {
    piece = addSources(slug, ids);
  } else {
    piece = createPiece({
      slug,
      title: options.title ?? metas[0].title,
      sources: ids,
      intent,
    });
  }

  console.log(`Pièce « ${piece.slug} » — ${piece.status}`);
  console.log(`  sources : ${piece.sources.join(', ')}`);
  console.log(`  dossier : ${pieceDir(piece.slug)}`);

  for (const meta of metas) {
    const level = meta.coverage.level;
    if (level !== 'full') {
      console.log(`  ⚠ ${meta.bd_id} : ${meta.coverage.reasons.join(' ; ')}`);
    }
  }

  console.log('\nProchaine étape : écrire brief.md (un angle), puis relire.');
}

function commandPieces() {
  const pieces = listPieces();
  if (!pieces.length) {
    console.log(
      'Aucune pièce. Utiliser : npm run desk -- add <id…> --slug <slug>',
    );
    return;
  }

  renderTable(pieces, [
    { label: 'Slug', value: (piece) => truncate(piece.slug, 42) },
    { label: 'Statut', value: (piece) => piece.status },
    { label: 'Sources', value: (piece) => piece.sources.length },
    { label: 'Modifié', value: (piece) => formatDate(piece.updated_at) },
    { label: 'Titre', value: (piece) => truncate(piece.title, 44) },
  ]);
}

function commandShow({ positional }) {
  const slug = positional[0];
  if (!slug) return fail('Indiquez le slug de la pièce.');

  const piece = readPiece(slug);
  if (!piece) return fail(`La pièce « ${slug} » n'existe pas.`);

  console.log(JSON.stringify(piece, null, 2));

  const files = [
    'intent.md',
    'brief.md',
    'outline.md',
    'claims.json',
    'critiques',
  ];
  console.log('\nArtefacts :');
  for (const name of files) {
    const file = path.join(pieceDir(slug), name);
    console.log(`  ${fs.existsSync(file) ? '✓' : '·'} ${name}`);
  }

  const drafts = [
    path.join(CONTENT_DIR, `${slug}.mdx`),
    path.join(CONTENT_DIR, `${slug}.md`),
  ];
  const draft = drafts.find((file) => fs.existsSync(file));
  console.log(`  ${draft ? '✓' : '·'} article (${draft ?? 'pas encore'})`);
}

function commandLint({ positional, options }) {
  const target = positional[0];
  if (!target) return fail('Indiquez un fichier ou un slug de pièce.');

  let files = [];
  if (target.includes('/') || /\.(md|mdx)$/.test(target)) {
    files = [target];
  } else {
    for (const extension of ['mdx', 'md']) {
      const draft = path.join(CONTENT_DIR, `${target}.${extension}`);
      if (fs.existsSync(draft)) files.push(draft);
    }
    if (!files.length) {
      return fail(
        `Pas encore de brouillon pour « ${target} ». Pour vérifier le brief : lint editorial/pieces/${target}/brief.md`,
      );
    }
  }

  let errors = 0;

  for (const file of files) {
    const result = lintFile(file);
    const fileErrors = result.findings.filter(
      (finding) => finding.severity === 'error',
    ).length;
    errors += fileErrors;

    console.log(
      `\n${file} — ${result.findings.length} remarque(s), ${fileErrors} erreur(s)`,
    );

    const rules = Object.entries(result.counts).sort((a, b) => b[1] - a[1]);
    for (const [rule, count] of rules) {
      console.log(`  ${String(count).padStart(4)} × ${rule}`);
    }

    for (const finding of result.findings.slice(0, 10)) {
      console.log(
        `  L${finding.line}: ${finding.message} — « ${finding.excerpt} »`,
      );
    }
    if (result.findings.length > 10) {
      console.log(`  … et ${result.findings.length - 10} autre(s)`);
    }
  }

  if (options.strict && errors > 0) {
    process.exitCode = 1;
  }
}

function resolveDraft(target) {
  if (target.includes('/') || /\.(md|mdx)$/.test(target)) return target;
  for (const extension of ['mdx', 'md']) {
    const file = path.join(CONTENT_DIR, `${target}.${extension}`);
    if (fs.existsSync(file)) return file;
  }
  return null;
}

function commandStyle({ positional, options }) {
  const target = positional[0];
  if (!target) return fail('Indiquez un slug ou un fichier.');

  const file = resolveDraft(target);
  if (!file || !fs.existsSync(file)) {
    return fail(`Pas encore de brouillon pour « ${target} ».`);
  }

  const result = checkStyleFile(file);
  console.log(`\n${file} — ${result.words} mot(s)\n`);

  const rows = result.metrics.map((metric) => ({
    ...metric,
    budget: budgetLabel(metric.budget),
    state: metric.over ? 'dépassé' : 'ok',
  }));

  renderTable(rows, [
    { label: 'Règle', value: (row) => row.label },
    { label: 'Occ.', value: (row) => row.count },
    { label: '/1000', value: (row) => row.density },
    { label: 'Budget', value: (row) => row.budget },
    { label: 'État', value: (row) => row.state },
  ]);

  for (const metric of result.metrics.filter((candidate) => candidate.over)) {
    for (const sample of metric.samples) {
      console.log(`  ⚠ ${metric.label} — « ${sample.excerpt} »`);
    }
  }

  if (options.strict && result.metrics.some((candidate) => candidate.over)) {
    process.exitCode = 1;
  }
}

async function commandFind({ positional }) {
  const input = positional.join(' ').trim();
  if (!input) return fail('Indiquez une URL ou un titre.');

  const reader = await openBookmarkReader();
  try {
    const all = await reader.list({ limit: 500 });
    let matches = [];

    if (/^https?:\/\//i.test(input)) {
      const target = normalizeUrl(input);
      matches = all.filter((article) => {
        const url = normalizeUrl(article.url);
        const original = normalizeUrl(article.original_url);
        return url === target || original === target || url.includes(target);
      });
    } else {
      matches = await reader.list({ limit: 20, search: input });
      if (!matches.length) {
        const needle = input.toLowerCase();
        matches = all
          .filter((article) =>
            `${article.title ?? ''} ${article.site_name ?? ''}`
              .toLowerCase()
              .includes(needle),
          )
          .slice(0, 20);
      }
    }

    if (!matches.length) {
      return fail(
        `Aucun article capturé ne correspond à « ${input} ». Capture-le avec l'extension bookmark-digest.`,
      );
    }

    for (const article of matches) {
      const meta = await snapshotSource(reader, article.id);
      console.log(
        `${meta.bd_id} — ${meta.site ?? 'sans site'} — ${meta.title}`,
      );
      console.log(
        `  ${meta.word_count} mots, couverture ${meta.coverage.level}`,
      );
      console.log(`  texte : editorial/sources/${meta.bd_id}/text.txt`);
      console.log(`  url : ${meta.url}`);
    }
  } finally {
    reader.close();
  }
}

async function commandSearch({ positional, options }) {
  const query = positional.join(' ').trim();
  if (!query) return fail('Indiquez une requête.');

  const reader = await openBookmarkReader();
  try {
    const articles = await reader.list({
      limit: Number(options.limit) || 10,
      search: query,
    });

    if (!articles.length) {
      console.log('Aucun résultat dans la bibliothèque capturée.');
      return;
    }

    const rows = articles.map((article) => ({
      id: article.id,
      site: truncate(article.site_name ?? '—', 18),
      words: article.word_count ?? 0,
      coverage: coverageMark(assessCoverage(article).level),
      title: truncate(article.title, 58),
    }));

    renderTable(rows, [
      { label: 'ID', value: (row) => row.id },
      { label: 'Site', value: (row) => row.site },
      { label: 'Mots', value: (row) => row.words },
      { label: 'Couv.', value: (row) => row.coverage },
      { label: 'Titre', value: (row) => row.title },
    ]);
  } finally {
    reader.close();
  }
}

function commandRelated({ positional, options }) {
  const query = options.text ?? positional.join(' ');
  if (!query) return fail('Indiquez un texte ou --text "…".');

  const results = rankRelated(query, { limit: Number(options.limit) || 5 });
  if (!results.length) {
    console.log('Aucun article proche.');
    return;
  }

  for (const result of results) {
    const date = formatDate(result.pubDate);
    console.log(
      `${result.score.toFixed(3)}  ${result.slug}\n         ${truncate(result.title, 70)} (${date})`,
    );
  }
}

function commandPromote({ positional }) {
  const [slug, status] = positional;
  if (!slug || !status) {
    return fail(
      'Usage : promote <slug> <statut> (statuts : new, briefed, approved, drafted, reviewed, published).',
    );
  }
  const piece = setStatus(slug, status);
  console.log(`Pièce « ${slug} » : ${piece.status}`);
}

async function commandRun({ positional }) {
  const [slug, stage] = positional;
  if (!slug || !stage) {
    return fail(
      'Usage : run <slug> <étape> (research, brief, draft, critique, revise, package).',
    );
  }

  try {
    const result = await runStage({ slug, stageId: stage });
    console.log(`${result.label} — ${result.results.length} rôle(s)`);
    for (const entry of result.results) {
      console.log(`  ${entry.label} → ${entry.output}`);
    }
    for (const card of result.scorecards) {
      console.log(
        `  ${card.role} : ${card.score}/100, ${card.must_fix.length} must-fix`,
      );
    }
    for (const entry of result.results) {
      console.log(`\n${entry.label}\n${entry.text}`);
    }
  } catch (error) {
    fail(error.message);
  }
}

async function commandLoop({ positional, options }) {
  const slug = positional[0];
  if (!slug) return fail('Indiquez le slug.');
  const maxIterations = Math.min(Number(options.max) || 2, 3);

  try {
    const result = await runReviewLoop({ slug, maxIterations });
    for (const entry of result.history) {
      console.log(`Itération ${entry.iteration} : ${entry.mustFix} must-fix`);
      for (const score of entry.scores) {
        console.log(
          `  ${score.role} : ${score.score}/100 (${score.mustFix} must-fix)`,
        );
      }
    }
  } catch (error) {
    fail(error.message);
  }
}

function commandPipeline({ positional }) {
  const slug = positional[0];
  if (!slug) return fail('Indiquez le slug.');

  try {
    const stages = stageStatus(slug);
    renderTable(
      stages.map((stage) => ({
        ...stage,
        doneLabel: stage.done ? 'oui' : 'non',
        readyLabel: stage.ready ? 'oui' : 'non',
        missingLabel: stage.missing.join(', ') || '—',
      })),
      [
        { label: 'Étape', value: (row) => row.id },
        { label: 'Rôles', value: (row) => row.roles.join(', ') },
        { label: 'Fait', value: (row) => row.doneLabel },
        { label: 'Prêt', value: (row) => row.readyLabel },
        { label: 'Manque', value: (row) => row.missingLabel },
      ],
    );
  } catch (error) {
    fail(error.message);
  }
}

function commandStatus() {
  const sources = listSourceMetas();
  const pieces = listPieces();
  const full = sources.filter((meta) => meta.coverage.level === 'full').length;

  console.log(`Sources figées : ${sources.length} (full ${full})`);
  console.log(`Pièces : ${pieces.length}`);
  for (const piece of pieces.slice(0, 5)) {
    console.log(`  ${piece.status.padEnd(9)} ${piece.slug}`);
  }
}

function help() {
  console.log(`Le desk éditorial

  npm run desk -- inbox [--limit 20] [--since 7d] [--json]
  npm run desk -- add <id…> --slug <slug> [--title "…"] [--intent "…"]
  npm run desk -- pieces
  npm run desk -- show <slug>
  npm run desk -- lint <slug|fichier> [--strict]
  npm run desk -- style <slug|fichier> [--strict]
  npm run desk -- pipeline <slug>
  npm run desk -- run <slug> <étape>
  npm run desk -- loop <slug> [--max 2]
  npm run desk -- find "une URL ou un titre"
  npm run desk -- search "une requête"
  npm run desk -- related "une requête"
  npm run desk -- promote <slug> <statut>
  npm run desk -- status

Le texte intégral des sources reste dans editorial/sources/<id>/text.txt,
ignoré par git. Le desk ne publie jamais rien : il prépare.`);
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const parsed = parseArgs(rest);

  switch (command) {
    case 'inbox':
      await commandInbox(parsed);
      break;
    case 'add':
      await commandAdd(parsed);
      break;
    case 'pieces':
      commandPieces();
      break;
    case 'show':
      commandShow(parsed);
      break;
    case 'lint':
      commandLint(parsed);
      break;
    case 'related':
      commandRelated(parsed);
      break;
    case 'find':
      await commandFind(parsed);
      break;
    case 'search':
      await commandSearch(parsed);
      break;
    case 'style':
      commandStyle(parsed);
      break;
    case 'run':
      await commandRun(parsed);
      break;
    case 'pipeline':
      commandPipeline(parsed);
      break;
    case 'loop':
      await commandLoop(parsed);
      break;
    case 'promote':
      commandPromote(parsed);
      break;
    case 'status':
      commandStatus();
      break;
    case undefined:
    case 'help':
      help();
      break;
    default:
      fail(`Commande inconnue : « ${command} ». Voir : npm run desk -- help`);
  }
}

main().catch((error) => {
  console.error(`✗ ${error.message}`);
  process.exitCode = 1;
});
