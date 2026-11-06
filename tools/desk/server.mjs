#!/usr/bin/env node

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { agentInfo, agentMode, runAgent } from './lib/agent.mjs';
import { openBookmarkReader } from './lib/bookmark.mjs';
import {
  appendMessage,
  buildBootstrapMessage,
  readMessages,
} from './lib/chat.mjs';
import { assessCoverage } from './lib/coverage.mjs';
import {
  CONTENT_DIR,
  PIECES_DIR,
  SITE_ROOT,
  SOURCES_DIR,
} from './lib/paths.mjs';
import {
  archivePiece,
  createPiece,
  listPieces,
  readPiece,
  setStatus,
  updatePiece,
} from './lib/pieces.mjs';
import { runReviewLoop, runStage, stageStatus } from './lib/pipeline.mjs';
import { ROLES, STAGES } from './lib/roles.mjs';
import { listSourceMetas, snapshotSource } from './lib/sources.mjs';
import { nowIso, slugify } from './lib/store.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const UI_DIR = path.join(HERE, 'ui');
const PORT = Number(process.env.DESK_PORT ?? 4322);
const running = new Set();
const progress = new Map();

const TOOL_LABELS = {
  read: 'lecture fichier',
  write: 'écriture fichier',
  edit: 'édition fichier',
  bash: 'commande',
  web_search: 'recherche web',
  web_fetch: 'lecture web',
  subagent: 'sous-agent',
  skill: 'skill',
  todo_write: 'plan',
  glob: 'recherche fichier',
  grep: 'recherche texte',
};

function beginProgress(slug, label) {
  progress.set(slug, {
    startedAt: Date.now(),
    stage: label,
    current: label,
    role: null,
    tools: [],
    subagent: null,
    subagentCallId: null,
  });
}

function updateProgress(slug, event) {
  const entry = progress.get(slug);
  if (!entry) return;

  const role = event.role ? (ROLES[event.role]?.label ?? event.role) : null;
  if (role) entry.role = role;
  const prefix = role ? `${role} · ` : '';

  if (event.type === 'tool_call') {
    if (event.tool === 'desk_run') {
      const stage = String(event.input?.stage ?? '');
      const config = STAGES[stage];
      const roles = (config?.roles ?? []).map(
        (role) => ROLES[role]?.label ?? role,
      );
      const label =
        roles.length > 1
          ? `${config.label} (${roles.length})`
          : (roles[0] ?? config?.label ?? stage);
      entry.subagent = label;
      entry.subagentCallId = event.callId ?? null;
      entry.current = `${prefix}spécialiste : ${label}`;
    } else if (event.tool === 'desk_loop') {
      entry.subagent = 'Critiques + révision';
      entry.subagentCallId = event.callId ?? null;
      entry.current = `${prefix}boucle critique`;
    } else if (event.tool === 'subagent') {
      const description = String(
        event.input?.description ??
          event.input?.prompt?.slice(0, 80) ??
          'sous-agent',
      ).slice(0, 80);
      entry.subagent = description;
      entry.subagentCallId = event.callId ?? null;
      entry.current = `${prefix}sous-agent : ${description}`;
    } else if (event.tool === 'bash') {
      const command = String(event.input?.command ?? '');
      const loop = command.match(/(?:desk\s+--\s+loop|cli\.mjs\s+loop)\s+\S+/i);
      if (loop) {
        entry.subagent = 'Critiques + révision';
        entry.subagentCallId = event.callId ?? null;
        entry.current = `${prefix}boucle critique`;
      }
      const match = command.match(
        /(?:desk\s+--\s+run|cli\.mjs\s+run)\s+\S+\s+([a-z]+)/i,
      );
      const stage = match?.[1];
      if (!loop && stage && STAGES[stage]) {
        const roles = (STAGES[stage].roles ?? []).map(
          (role) => ROLES[role]?.label ?? role,
        );
        const label =
          roles.length > 1
            ? `${STAGES[stage].label} (${roles.length})`
            : (roles[0] ?? STAGES[stage].label);
        entry.subagent = label;
        entry.subagentCallId = event.callId ?? null;
        entry.current = `${prefix}spécialiste : ${label}`;
      } else if (!loop) {
        entry.subagent = null;
        entry.subagentCallId = null;
        entry.current = `${prefix}${TOOL_LABELS[event.tool] ?? event.tool}`;
      }
    } else {
      entry.subagent = null;
      entry.subagentCallId = null;
      entry.current = `${prefix}${TOOL_LABELS[event.tool] ?? event.tool}`;
    }
    entry.tools.push(event.tool);
    if (entry.tools.length > 4) entry.tools.shift();
  } else if (event.type === 'tool_result') {
    if (entry.subagentCallId && event.callId === entry.subagentCallId) {
      entry.subagent = null;
      entry.subagentCallId = null;
      entry.current = `${prefix}synthèse`;
    }
  } else if (event.type === 'thinking') {
    entry.current = `${prefix}réflexion`;
  } else if (event.type === 'text') {
    entry.current = `${prefix}rédaction`;
  } else if (event.type === 'status') {
    if (event.phase === 'step_start') {
      entry.current = `${prefix}réflexion`;
    } else if (event.phase === 'turn_end') {
      entry.current = `${prefix}finalisation`;
    }
  } else if (event.type === 'error') {
    entry.current = `erreur : ${event.message ?? ''}`;
  }

  entry.updatedAt = Date.now();
}

function endProgress(slug) {
  progress.delete(slug);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

function json(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(body);
}

function text(res, status, value) {
  res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' });
  res.end(value);
}

function sendCachedText(req, res, value) {
  const etag = `"${createHash('sha256').update(value).digest('hex')}"`;
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, { etag, 'cache-control': 'no-cache' });
    return res.end();
  }
  res.writeHead(200, {
    'content-type': 'text/plain; charset=utf-8',
    'cache-control': 'no-cache',
    etag,
  });
  res.end(value);
}

async function readBody(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 2_000_000) throw new Error('Requête trop volumineuse.');
  }
  if (!body) return {};
  return JSON.parse(body);
}

function stripFrontmatter(raw) {
  return raw.replace(/^---\n[\s\S]*?\n---\n/, '');
}

function critiqueFiles(slug) {
  const directory = path.join(PIECES_DIR, slug, 'critiques');
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory)
    .filter((file) => file.endsWith('.md'))
    .sort();
}

function artifacts(slug) {
  return {
    brief: fs.existsSync(path.join(PIECES_DIR, slug, 'brief.md')),
    research: fs.existsSync(path.join(PIECES_DIR, slug, 'research.md')),
    critiques: critiqueFiles(slug).length > 0,
    draft: ['mdx', 'md'].some((extension) =>
      fs.existsSync(path.join(CONTENT_DIR, `${slug}.${extension}`)),
    ),
  };
}

function pieceResponse(slug) {
  const piece = readPiece(slug);
  if (!piece) return null;

  const sources = listSourceMetas().filter((meta) =>
    piece.sources.includes(meta.bd_id),
  );

  return {
    piece,
    sources,
    messages: readMessages(slug),
    artifacts: artifacts(slug),
    pipeline: stageStatus(slug),
  };
}

async function inbox(url) {
  const reader = await openBookmarkReader();
  try {
    const articles = await reader.list({
      limit: 60,
      search: url.searchParams.get('q') || null,
    });

    const used = new Map();
    for (const piece of listPieces()) {
      for (const id of piece.sources) {
        if (!used.has(id)) used.set(id, []);
        used.get(id).push({ slug: piece.slug, title: piece.title });
      }
    }

    return articles.map((article) => ({
      id: article.id,
      title: article.title,
      site: article.site_name,
      author: article.author,
      language: article.language,
      word_count: article.word_count,
      created_at: article.created_at,
      url: article.url,
      coverage: assessCoverage(article),
      snapshotted: fs.existsSync(
        path.join(SOURCES_DIR, String(article.id), 'meta.json'),
      ),
      usedIn: used.get(Number(article.id)) ?? [],
    }));
  } finally {
    reader.close();
  }
}

async function createFromRequest(req) {
  const body = await readBody(req);
  const sourceIds = [...new Set((body.sourceIds ?? []).map(Number))].filter(
    Number.isInteger,
  );
  if (!sourceIds.length) throw new Error('Choisissez au moins un article.');

  const reader = await openBookmarkReader();
  const metas = [];

  try {
    for (const id of sourceIds) metas.push(await snapshotSource(reader, id));
  } finally {
    reader.close();
  }

  const base = slugify(body.title || metas[0].title) || `piece-${Date.now()}`;
  let slug = base;
  let index = 2;
  while (fs.existsSync(path.join(PIECES_DIR, slug))) {
    slug = `${base}-${index}`;
    index += 1;
  }

  const piece = createPiece({
    slug,
    title: (body.title || metas[0].title).trim(),
    sources: sourceIds,
    intent: String(body.intent ?? '').trim(),
  });

  return { piece, sources: metas };
}

async function sendMessage(req, res, slug) {
  const body = await readBody(req);
  const piece = readPiece(slug);
  if (!piece) return json(res, 404, { error: 'Pièce inconnue.' });

  if (agentMode() === 'fake' && piece.status !== 'new') {
    return json(res, 409, {
      error:
        'Mode démonstration : cette pièce existante n’est pas modifiée. Relancez le bureau avec DESK_AGENT=dsh pour utiliser le vrai agent.',
    });
  }

  if (running.has(slug)) {
    return json(res, 409, {
      error: 'Une réponse est déjà en cours pour cette pièce.',
    });
  }

  const bootstrap = Boolean(body.bootstrap);
  const userText = String(body.text ?? '').trim();
  if (!bootstrap && !userText) {
    return json(res, 400, { error: 'Message vide.' });
  }

  const history = readMessages(slug);
  const hasAnswer = history.some(
    (message) => message.role === 'assistant' && !message.error,
  );
  if (bootstrap && hasAnswer) {
    return json(res, 409, { error: 'Le contexte a déjà été envoyé.' });
  }

  let prompt = userText;
  if (bootstrap) {
    // Une première tentative peut échouer (credentials, réseau). On réutilise
    // alors le contexte déjà consigné au lieu d'en empiler un second.
    const previousContext = [...history]
      .reverse()
      .find((message) => message.role === 'context');

    if (previousContext) {
      prompt = previousContext.text;
    } else {
      const metas = listSourceMetas().filter((meta) =>
        piece.sources.includes(meta.bd_id),
      );
      prompt = buildBootstrapMessage(piece, metas);
      appendMessage(slug, { role: 'context', at: nowIso(), text: prompt });
    }
  } else {
    appendMessage(slug, { role: 'user', at: nowIso(), text: userText });
  }

  running.add(slug);
  beginProgress(slug, bootstrap ? 'lecture des sources' : 'réponse');
  try {
    const result = await runAgent({
      piece,
      prompt,
      bootstrap,
      onEvent: (event) => updateProgress(slug, event),
    });

    if (result.sessionId && result.sessionId !== piece.session_id) {
      updatePiece(slug, { session_id: result.sessionId });
    }

    appendMessage(slug, {
      role: 'assistant',
      at: nowIso(),
      text: result.text,
      session: result.sessionId ?? null,
      tools: result.tools ?? [],
    });

    return json(res, 200, pieceResponse(slug));
  } catch (error) {
    if (error.timeout) updatePiece(slug, { session_id: null });
    appendMessage(slug, {
      role: 'assistant',
      at: nowIso(),
      text: `⚠ ${error.message}`,
      error: true,
    });
    return json(res, 502, {
      error: error.message,
      ...pieceResponse(slug),
    });
  } finally {
    running.delete(slug);
    endProgress(slug);
  }
}

async function handleApi(req, res, url) {
  const parts = url.pathname.split('/').filter(Boolean);

  if (url.pathname === '/api/health') {
    return json(res, 200, { ok: true, agent: agentInfo() });
  }

  if (url.pathname === '/api/inbox' && req.method === 'GET') {
    return json(res, 200, { articles: await inbox(url) });
  }

  if (url.pathname === '/api/pieces' && req.method === 'GET') {
    return json(res, 200, { pieces: listPieces() });
  }

  if (url.pathname === '/api/pieces' && req.method === 'POST') {
    const created = await createFromRequest(req);
    return json(res, 201, created);
  }

  if (parts.length === 3 && parts[1] === 'pieces' && req.method === 'DELETE') {
    const slug = parts[2];
    if (running.has(slug)) {
      return json(res, 409, { error: 'Une exécution est déjà en cours.' });
    }
    if (!readPiece(slug)) {
      return json(res, 404, { error: 'Pièce inconnue.' });
    }
    try {
      const archived = archivePiece(slug);
      return json(res, 200, { archived });
    } catch (error) {
      return json(res, 400, { error: error.message });
    }
  }

  // /api/pieces/:slug
  if (parts.length === 3 && parts[1] === 'pieces' && req.method === 'GET') {
    const payload = pieceResponse(parts[2]);
    if (!payload) return json(res, 404, { error: 'Pièce inconnue.' });
    return json(res, 200, payload);
  }

  if (
    parts.length === 4 &&
    parts[1] === 'pieces' &&
    parts[3] === 'messages' &&
    req.method === 'POST'
  ) {
    return sendMessage(req, res, parts[2]);
  }

  if (
    parts.length === 4 &&
    parts[1] === 'pieces' &&
    parts[3] === 'progress' &&
    req.method === 'GET'
  ) {
    const entry = progress.get(parts[2]);
    if (!entry) return json(res, 200, { active: false });
    return json(res, 200, {
      active: true,
      startedAt: entry.startedAt,
      stage: entry.stage,
      current: entry.current,
      role: entry.role,
      subagent: entry.subagent,
      elapsedMs: Date.now() - entry.startedAt,
    });
  }

  if (
    parts.length === 4 &&
    parts[1] === 'pieces' &&
    parts[3] === 'pipeline' &&
    req.method === 'GET'
  ) {
    return json(res, 200, { stages: stageStatus(parts[2]) });
  }

  if (
    parts.length === 4 &&
    parts[1] === 'pieces' &&
    parts[3] === 'run' &&
    req.method === 'POST'
  ) {
    const body = await readBody(req);
    const slug = parts[2];

    if (!readPiece(slug)) {
      return json(res, 404, { error: 'Pièce inconnue.' });
    }
    if (running.has(slug)) {
      return json(res, 409, { error: 'Une exécution est déjà en cours.' });
    }

    running.add(slug);
    beginProgress(slug, STAGES[body.stage]?.label ?? body.stage);
    try {
      const result = await runStage({
        slug,
        stageId: body.stage,
        onEvent: (event) => updateProgress(slug, event),
      });
      const summary = result.results
        .map(
          (entry) =>
            `**${entry.label}** → \`${entry.output}\`\n\n${entry.text}`,
        )
        .join('\n\n');
      appendMessage(slug, {
        role: 'assistant',
        at: nowIso(),
        stage: result.stage,
        text: `**${result.label}**\n\n${summary}`,
      });
      return json(res, 200, { ...pieceResponse(slug), run: result });
    } catch (error) {
      appendMessage(slug, {
        role: 'assistant',
        at: nowIso(),
        error: true,
        stage: body.stage,
        text: `⚠ ${error.message}`,
      });
      return json(res, 502, { error: error.message, ...pieceResponse(slug) });
    } finally {
      running.delete(slug);
      endProgress(slug);
    }
  }

  if (
    parts.length === 4 &&
    parts[1] === 'pieces' &&
    parts[3] === 'loop' &&
    req.method === 'POST'
  ) {
    const body = await readBody(req);
    const slug = parts[2];
    if (!readPiece(slug)) return json(res, 404, { error: 'Pièce inconnue.' });
    if (running.has(slug)) {
      return json(res, 409, { error: 'Une exécution est déjà en cours.' });
    }

    running.add(slug);
    beginProgress(slug, 'critique et révision');
    try {
      const result = await runReviewLoop({
        slug,
        maxIterations: Math.min(Number(body.maxIterations) || 2, 3),
        onEvent: (event) => updateProgress(slug, event),
      });
      const summary = result.history
        .map(
          (entry) =>
            `Itération ${entry.iteration} : ${entry.mustFix} must-fix (${entry.scores
              .map((score) => `${score.role} ${score.score}`)
              .join(', ')})`,
        )
        .join('\n');
      appendMessage(slug, {
        role: 'assistant',
        at: nowIso(),
        stage: 'loop',
        text: `**Boucle critique → révision**\n\n${summary}`,
      });
      return json(res, 200, { ...pieceResponse(slug), loop: result });
    } catch (error) {
      appendMessage(slug, {
        role: 'assistant',
        at: nowIso(),
        error: true,
        stage: 'loop',
        text: `⚠ ${error.message}`,
      });
      return json(res, 502, { error: error.message, ...pieceResponse(slug) });
    } finally {
      running.delete(slug);
      endProgress(slug);
    }
  }

  if (
    parts.length === 4 &&
    parts[1] === 'pieces' &&
    parts[3] === 'status' &&
    req.method === 'POST'
  ) {
    const body = await readBody(req);
    try {
      const piece = setStatus(parts[2], body.status, 'desk-ui');
      return json(res, 200, { piece });
    } catch (error) {
      return json(res, 400, { error: error.message });
    }
  }

  if (
    parts.length === 5 &&
    parts[1] === 'pieces' &&
    parts[3] === 'artifact' &&
    req.method === 'GET'
  ) {
    const slug = parts[2];
    const name = parts[4];
    if (name === 'brief') {
      const file = path.join(PIECES_DIR, slug, 'brief.md');
      if (!fs.existsSync(file)) return text(res, 404, '');
      return sendCachedText(req, res, fs.readFileSync(file, 'utf8'));
    }
    if (name === 'research') {
      const file = path.join(PIECES_DIR, slug, 'research.md');
      if (!fs.existsSync(file)) return text(res, 404, '');
      return sendCachedText(req, res, fs.readFileSync(file, 'utf8'));
    }
    if (name === 'critiques') {
      const directory = path.join(PIECES_DIR, slug, 'critiques');
      const files = critiqueFiles(slug);
      if (!files.length) return text(res, 404, '');
      return sendCachedText(
        req,
        res,
        files
          .map(
            (file) =>
              `# ${file}\n\n${fs.readFileSync(path.join(directory, file), 'utf8')}`,
          )
          .join('\n\n---\n\n'),
      );
    }
    if (name === 'draft') {
      for (const extension of ['mdx', 'md']) {
        const file = path.join(CONTENT_DIR, `${slug}.${extension}`);
        if (fs.existsSync(file)) {
          return sendCachedText(
            req,
            res,
            stripFrontmatter(fs.readFileSync(file, 'utf8')),
          );
        }
      }
      return text(res, 404, '');
    }
    return text(res, 404, '');
  }

  if (
    parts.length === 5 &&
    parts[1] === 'pieces' &&
    parts[3] === 'source' &&
    req.method === 'GET'
  ) {
    const file = path.join(SOURCES_DIR, parts[4], 'text.txt');
    if (!fs.existsSync(file)) return text(res, 404, '');
    return text(res, 200, fs.readFileSync(file, 'utf8'));
  }

  return json(res, 404, { error: 'Route inconnue.' });
}

async function serveStatic(req, res, pathname) {
  const relative = pathname === '/' ? '/index.html' : pathname;
  const file = path.join(UI_DIR, relative);
  const resolved = path.relative(UI_DIR, file);
  if (resolved.startsWith('..') || !fs.existsSync(file)) {
    return text(res, 404, 'Not found');
  }

  const extension = path.extname(file);
  res.writeHead(200, {
    'content-type': MIME[extension] ?? 'application/octet-stream',
    'cache-control':
      extension === '.woff2'
        ? 'public, max-age=31536000, immutable'
        : 'no-store',
  });
  res.end(fs.readFileSync(file));
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url);
      return;
    }
    await serveStatic(req, res, url.pathname);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) json(res, 500, { error: error.message });
    else res.end();
  }
});

if (fs.existsSync(path.join(SITE_ROOT, '.env'))) {
  console.warn(
    '⚠ .env présent à la racine du dépôt : ne stockez jamais de clé ici.',
  );
}

server.listen(PORT, '127.0.0.1', () => {
  const agent = agentInfo();
  console.log(`Le bureau — http://127.0.0.1:${PORT}`);
  console.log(
    agent.mode === 'fake'
      ? 'Agent : démonstration (aucun modèle appelé)'
      : `Agent : ${agent.mode}${agent.dsh ? ` (${agent.dsh})` : ' — dsh introuvable'}`,
  );
});
