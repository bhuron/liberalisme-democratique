import fs from 'node:fs';
import nodePath from 'node:path';

import { ARTIFACTS } from './pieces.js';

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const MAX_BODY = 2_000_000;

function send(res, status, value) {
  const body = `${JSON.stringify(value)}\n`;
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

function fail(res, error) {
  const message = error?.message ? String(error.message) : String(error);
  let status = error?.status ?? 500;
  if (!error?.status) {
    if (/n'existe pas|introuvable|inconnue|absent/i.test(message)) status = 404;
  }
  send(res, status, { error: message, status });
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    return parsed.host === req.headers.host;
  } catch {
    return false;
  }
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new HttpError(413, 'Corps trop volumineux.');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  const text = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, 'JSON invalide.');
  }
}

function decode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Same-origin JSON API for the panel. It is a thin transport over the service:
 * the UI and the agent tools execute the same operations.
 */
export function registerRoutes({
  web,
  service,
  basePath = '/api/bureau',
  assetRoot,
}) {
  return web.register({
    kind: 'prefix',
    path: basePath,
    handler: (req, res) => {
      handle(req, res, service, basePath, assetRoot).catch((error) =>
        fail(res, error),
      );
    },
  });
}

async function handle(req, res, service, basePath, assetRoot) {
  if (!sameOrigin(req)) {
    throw new HttpError(403, 'Origine refusée.');
  }

  const url = new URL(req.url ?? '/', 'http://localhost');
  const path = url.pathname.slice(basePath.length) || '/';
  const method = req.method ?? 'GET';

  if (method === 'GET' && path === '/font') {
    if (!assetRoot)
      throw new HttpError(500, 'Ressource de police introuvable.');
    const file = nodePath.join(assetRoot, 'fonts', 'InterVariable.woff2');
    if (!fs.existsSync(file)) {
      throw new HttpError(404, 'Police introuvable.');
    }
    const bytes = fs.readFileSync(file);
    res.writeHead(200, {
      'content-type': 'font/woff2',
      'cache-control': 'public, max-age=31536000, immutable',
      'content-length': bytes.length,
    });
    res.end(bytes);
    return;
  }

  if (method === 'GET' && path === '/health') {
    return send(res, 200, await service.health());
  }

  if (method === 'GET' && path === '/pieces') {
    return send(res, 200, { pieces: await service.listPieces() });
  }

  if (method === 'POST' && path === '/pieces') {
    const body = await readBody(req);
    return send(res, 201, {
      piece: await service.createPiece({
        title: body.title,
        slug: body.slug,
        intent: body.intent,
        sourceIds: Array.isArray(body.sourceIds) ? body.sourceIds : [],
      }),
    });
  }

  if (method === 'GET' && path === '/inbox') {
    return send(
      res,
      200,
      await service.inbox({
        q: url.searchParams.get('q') ?? '',
        limit: Number(url.searchParams.get('limit')) || 30,
      }),
    );
  }

  if (method === 'GET' && path === '/instructions') {
    return send(res, 200, { instructions: await service.instructions() });
  }

  const instructionMatch = /^\/instructions\/([^/]+)$/.exec(path);
  if (method === 'GET' && instructionMatch) {
    return send(
      res,
      200,
      await service.instruction(decode(instructionMatch[1])),
    );
  }

  const runMatch = /^\/runs\/([^/]+)$/.exec(path);
  if (method === 'GET' && runMatch) {
    return send(res, 200, service.runStatus(decode(runMatch[1])));
  }

  const cancelMatch = /^\/runs\/([^/]+)\/cancel$/.exec(path);
  if (method === 'POST' && cancelMatch) {
    return send(res, 200, service.cancelRun(decode(cancelMatch[1])));
  }

  const sourceMatch = /^\/sources\/([^/]+)$/.exec(path);
  if (method === 'GET' && sourceMatch) {
    return send(res, 200, await service.source(decode(sourceMatch[1])));
  }

  const pieceMatch = /^\/pieces\/([^/]+)(?:\/(.+))?$/.exec(path);
  if (!pieceMatch)
    throw new HttpError(404, `Route inconnue : ${method} ${path}`);

  const slug = decode(pieceMatch[1]);
  const action = pieceMatch[2] ?? '';

  if (method === 'GET' && !action) {
    return send(res, 200, await service.getPiece(slug));
  }

  if (method === 'DELETE' && !action) {
    return send(res, 200, await service.archivePiece(slug));
  }

  if (method === 'POST' && action === 'status') {
    const body = await readBody(req);
    return send(res, 200, {
      piece: await service.setStatus(slug, String(body.status ?? '')),
    });
  }

  if (method === 'POST' && action === 'angle') {
    const body = await readBody(req);
    return send(
      res,
      200,
      await service.writeAngle(slug, String(body.text ?? '')),
    );
  }

  if (method === 'GET' && action === 'artifact') {
    const name = url.searchParams.get('name') ?? '';
    if (!Object.hasOwn(ARTIFACTS, name)) {
      throw new HttpError(400, `Artefact inconnu : « ${name} »`);
    }
    return send(res, 200, await service.artifact(slug, name));
  }

  if (method === 'GET' && action === 'checks') {
    return send(res, 200, await service.checks(slug));
  }

  if (method === 'GET' && action === 'related') {
    return send(res, 200, {
      related: await service.related(url.searchParams.get('q') ?? '', {
        exclude: slug,
      }),
    });
  }

  if (method === 'POST' && action === 'session') {
    return send(res, 200, await service.openSession(slug));
  }

  if (method === 'POST' && action === 'stage') {
    const body = await readBody(req);
    return send(
      res,
      202,
      await service.startStage(slug, String(body.stage ?? '')),
    );
  }

  throw new HttpError(404, `Route inconnue : ${method} ${path}`);
}

export { HttpError };
