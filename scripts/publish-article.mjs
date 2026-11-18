#!/usr/bin/env node
/**
 * Publish one finished article.
 *
 *   node scripts/publish-article.mjs <slug> --check    # read-only preflight
 *   node scripts/publish-article.mjs <slug> --publish  # commit + push master
 *
 * The site is deployed by Cloudflare Pages on every push to master. The script
 * stages only the article and the local assets it references; it never uses
 * `git add -A` and never touches the local editorial data.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse as parseYaml } from 'yaml';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://liberalisme-democratique.uk';
const BRANCH = 'master';
const ENV = { ...process.env, GIT_TERMINAL_PROMPT: '0' };
const TIMEOUT = 20 * 60 * 1000;

function run(label, command, args, { allowFailure = false } = {}) {
  console.log(`\n$ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: ROOT,
    env: ENV,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
    timeout: TIMEOUT,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) {
    if (allowFailure) return result;
    throw new Error(`${label} n’a pas pu démarrer : ${result.error.message}`);
  }
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`${label} a échoué (code ${result.status}).`);
  }
  return result;
}

function output(result) {
  return `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
}

export function splitFrontmatter(text) {
  const match = /^(---\r?\n)([\s\S]*?)(\r?\n---\r?\n?)/.exec(text);
  if (!match) return null;
  return {
    prefix: match[1],
    body: match[2],
    suffix: match[3],
    rest: text.slice(match[0].length),
    raw: match[0],
  };
}

export function setDraftFalse(text) {
  const frontmatter = splitFrontmatter(text);
  if (!frontmatter) throw new Error('Frontmatter YAML manquant.');
  let body = frontmatter.body;
  if (/^draft:\s*(true|false)\s*$/m.test(body)) {
    body = body.replace(/^draft:\s*(true|false)\s*$/m, 'draft: false');
  } else {
    body = `${body.replace(/\s+$/, '')}\ndraft: false`;
  }
  return `${frontmatter.prefix}${body}${frontmatter.suffix}${frontmatter.rest}`;
}

export function parseArticle(text) {
  const frontmatter = splitFrontmatter(text);
  if (!frontmatter) throw new Error('Frontmatter YAML manquant.');
  const data = parseYaml(frontmatter.body) ?? {};
  return { frontmatter, data, body: frontmatter.rest };
}

export function collectAssets(root, articleFile, text, data) {
  const refs = new Set();
  for (const match of text.matchAll(
    /from\s+["'](\.\.\/[^"']*assets\/[^"']+)["']/g,
  )) {
    refs.add(match[1]);
  }
  for (const match of text.matchAll(/!\[[^\]]*\]\((\.\.\/[^)\s]+)\)/g)) {
    refs.add(match[1]);
  }
  const image = data.image;
  if (typeof image === 'string') refs.add(image);
  if (image && typeof image === 'object' && image.src) refs.add(image.src);

  const assetsRoot = path.join(root, 'src', 'assets');
  const assets = [];
  for (const ref of refs) {
    if (/^https?:/i.test(ref)) {
      throw new Error(
        `Image distante refusée (${ref}) : les visuels doivent être locaux.`,
      );
    }
    const absolute = path.resolve(path.dirname(articleFile), ref);
    if (!absolute.startsWith(`${assetsRoot}${path.sep}`)) {
      throw new Error(`Visuel hors de src/assets : ${ref}`);
    }
    if (!fs.existsSync(absolute)) {
      throw new Error(`Visuel introuvable : ${ref}`);
    }
    assets.push(path.relative(root, absolute));
  }
  return [...new Set(assets)];
}

function articleFile(slug) {
  const base = path.join(ROOT, 'src', 'content', 'blog', slug);
  for (const extension of ['.mdx', '.md']) {
    if (fs.existsSync(`${base}${extension}`)) {
      return `${base}${extension}`;
    }
  }
  throw new Error(`Article introuvable : src/content/blog/${slug}.mdx`);
}

export function checkRepeatedLinks(text) {
  const urls = [...String(text).matchAll(/https?:\/\/[^\s)\]"'<>]+/g)].map(
    (match) => match[0].replace(/[.,;:]+$/, ''),
  );
  const seen = new Set();
  const repeated = new Set();
  for (const url of urls) {
    if (seen.has(url)) repeated.add(url);
    seen.add(url);
  }
  if (repeated.size) {
    throw new Error(
      `Lien répété : ${[...repeated].join(', ')}. Un seul lien par source et par article.`,
    );
  }
}

function checkPlaceholders(text) {
  const patterns = [
    /\bTODO\b/i,
    /\bFIXME\b/i,
    /\blorem ipsum\b/i,
    /\[à (?:compléter|vérifier)\]/i,
  ];
  const found = patterns.filter((pattern) => pattern.test(text));
  if (found.length) {
    throw new Error(
      'Le brouillon contient encore un marqueur de travail (TODO, FIXME, lorem ipsum, à compléter).',
    );
  }
}

export function checkRemoteImages(text) {
  if (
    /!\[[^\]]*\]\((https?:[^)\s]+)\)/i.test(text) ||
    /(?:src|srcset)=["']https?:/i.test(text)
  ) {
    throw new Error(
      'Le brouillon référence une image distante. Utilisez un fichier local de src/assets.',
    );
  }
}

function checkArticle(article) {
  if (!article.data.title) throw new Error('Frontmatter : « title » manquant.');
  if (!article.data.description) {
    throw new Error('Frontmatter : « description » manquante.');
  }
  if (!article.data.pubDate) {
    throw new Error('Frontmatter : « pubDate » manquante.');
  }
  checkPlaceholders(article.body);
  checkRemoteImages(article.body);
  checkRepeatedLinks(article.body);
}

function checkCommands(label) {
  run(`${label} — secrets`, 'npm', ['run', 'check:secrets']);
  run(`${label} — format`, 'npm', ['run', 'format:check']);
  run(`${label} — types`, 'npm', ['run', 'check']);
  run(`${label} — build`, 'npm', ['run', 'build']);
}

function gitCounts() {
  const result = run('Git — état distant', 'git', [
    'rev-list',
    '--left-right',
    '--count',
    `origin/${BRANCH}...HEAD`,
  ]);
  const [behind, ahead] = output(result).split(/\s+/).map(Number);
  return { behind: behind ?? 0, ahead: ahead ?? 0 };
}

function assertGitReady() {
  const branch = output(
    run('Git — branche', 'git', ['rev-parse', '--abbrev-ref', 'HEAD']),
  );
  if (branch !== BRANCH) {
    throw new Error(
      `La publication se fait depuis ${BRANCH}, pas depuis ${branch}.`,
    );
  }
  const staged = output(
    run('Git — index', 'git', ['diff', '--cached', '--name-only']),
  );
  if (staged) {
    throw new Error(
      'L’index contient déjà des modifications. Videz-le avant de publier.',
    );
  }
  run('Git — récupération', 'git', ['fetch', 'origin', BRANCH]);
  const { behind, ahead } = gitCounts();
  if (behind > 0) {
    throw new Error(
      `La branche est en retard de ${behind} commit(s) sur origin/${BRANCH}. Rebasez avant de publier.`,
    );
  }
  return { ahead };
}

function pushDryRun() {
  run('Git — vérification du push', 'git', [
    'push',
    '--dry-run',
    'origin',
    `HEAD:${BRANCH}`,
  ]);
}

function summary({
  articleFile: file,
  article,
  assets,
  ahead,
  draftWas,
  published,
}) {
  console.log('\n--- Publication ---');
  console.log(`Article : ${path.relative(ROOT, file)}`);
  console.log(`Titre : ${article.data.title}`);
  console.log(`Draft avant : ${draftWas === true ? 'true' : 'false'}`);
  console.log(
    `Visuels : ${assets.length ? assets.join(', ') : 'aucun visuel local'}`,
  );
  console.log(`Commits à pousser : ${ahead}`);
  if (published) {
    console.log(
      `URL : ${SITE}/blog/${path.basename(file, path.extname(file))}/`,
    );
    console.log('Cloudflare Pages va construire master.');
  }
}

async function main() {
  const args = process.argv.slice(2);
  const help = args.includes('--help');
  const publish = args.includes('--publish');
  const slug = args.find((arg) => !arg.startsWith('--'));

  if (help || !slug) {
    console.log(`Usage :
  node scripts/publish-article.mjs <slug> --check
  node scripts/publish-article.mjs <slug> --publish

--check   : préflight en lecture seule (checks, git, aucun commit, aucun push)
--publish : draft:false, checks, commit de l'article et de ses visuels, push master`);
    return;
  }

  const file = articleFile(slug);
  const original = fs.readFileSync(file, 'utf8');
  const article = parseArticle(original);
  checkArticle(article);
  const assets = collectAssets(ROOT, file, original, article.data);
  const draftWas = article.data.draft;

  const git = assertGitReady();
  pushDryRun();

  if (!publish) {
    checkCommands('Préflight');
    console.log('\nLe build de publication sera refait avec draft:false.');
    summary({
      articleFile: file,
      article,
      assets,
      ahead: git.ahead,
      draftWas,
      published: false,
    });
    console.log(
      '\nPRÉFLIGHT OK — aucune modification, aucun commit, aucun push.',
    );
    return;
  }

  const publishedText = setDraftFalse(original);
  if (publishedText !== original) fs.writeFileSync(file, publishedText);
  try {
    checkCommands('Publication');
  } catch (error) {
    fs.writeFileSync(file, original);
    throw error;
  }

  const allowed = new Set([path.relative(ROOT, file), ...assets]);
  run('Git — ajout', 'git', ['add', '--', ...allowed]);
  const staged = output(
    run('Git — fichiers indexés', 'git', ['diff', '--cached', '--name-only']),
  )
    .split('\n')
    .filter(Boolean);
  const unexpected = staged.filter((value) => !allowed.has(value));
  if (unexpected.length) {
    throw new Error(
      `Fichiers inattendus dans l’index : ${unexpected.join(', ')}`,
    );
  }

  const nothingToCommit =
    run('Git — diff indexé', 'git', ['diff', '--cached', '--quiet'], {
      allowFailure: true,
    }).status === 0;
  if (nothingToCommit && git.ahead === 0) {
    console.log('\nDéjà publié : aucun changement à pousser.');
    summary({
      articleFile: file,
      article,
      assets,
      ahead: 0,
      draftWas,
      published: true,
    });
    return;
  }

  if (!nothingToCommit) {
    run('Git — commit', 'git', [
      'commit',
      '-m',
      `Publie : ${String(article.data.title).trim()}`,
    ]);
  }
  run('Git — push', 'git', ['push', 'origin', `HEAD:${BRANCH}`]);

  summary({
    articleFile: file,
    article,
    assets,
    ahead: git.ahead + (nothingToCommit ? 0 : 1),
    draftWas,
    published: true,
  });
  console.log('\nPUBLIÉ.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`\nÉCHEC : ${error.message}`);
    process.exitCode = 1;
  });
}
