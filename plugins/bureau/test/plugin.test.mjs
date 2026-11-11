import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { after, before, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../..');
const ROUTE = '/api/bureau';

let root;
let workspace;
let handler;

class MockResponse extends EventEmitter {
  constructor() {
    super();
    this.chunks = [];
    this.status = 0;
    this.headers = {};
    this.headersSent = false;
    this.writableEnded = false;
  }

  writeHead(status, headers) {
    this.status = status;
    this.headers = headers ?? {};
    this.headersSent = true;
  }

  flushHeaders() {}

  write(chunk) {
    if (this.writableEnded) throw new Error('write after end');
    this.chunks.push(String(chunk));
    return true;
  }

  end(chunk) {
    if (chunk) this.write(chunk);
    this.writableEnded = true;
    this.emit('finish');
  }

  get text() {
    return this.chunks.join('');
  }

  get json() {
    return JSON.parse(this.text);
  }

  get lines() {
    return this.text
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }
}

function request(method, pathname, body) {
  const chunks =
    body === undefined ? [] : [Buffer.from(JSON.stringify(body), 'utf8')];
  const req = Readable.from(chunks);
  req.method = method;
  req.url = ROUTE + pathname;
  req.headers = {};
  return req;
}

async function call(method, pathname, body) {
  const res = new MockResponse();
  await handler(request(method, pathname, body), res);
  return res;
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

before(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'bureau-test-'));
  workspace = {
    lib: path.join(root, 'tools/desk/lib'),
    agent: path.join(root, 'editorial/agent'),
    style: path.join(root, 'editorial/style'),
    pieces: path.join(root, 'editorial/pieces'),
    sources: path.join(root, 'editorial/sources'),
    blog: path.join(root, 'src/content/blog'),
  };

  await fs.mkdir(path.dirname(workspace.lib), { recursive: true });
  await fs.cp(path.join(REPO, 'tools/desk/lib'), workspace.lib, {
    recursive: true,
  });
  await fs.mkdir(path.dirname(workspace.agent), { recursive: true });
  await fs.cp(path.join(REPO, 'editorial/agent'), workspace.agent, {
    recursive: true,
  });
  await fs.mkdir(path.dirname(workspace.style), { recursive: true });
  try {
    await fs.cp(path.join(REPO, 'editorial/style'), workspace.style, {
      recursive: true,
    });
  } catch {
    // The charte is not needed by the fake pipeline.
  }
  await fs.mkdir(workspace.pieces, { recursive: true });
  await fs.mkdir(workspace.sources, { recursive: true });
  await fs.mkdir(workspace.blog, { recursive: true });

  const sourceDir = path.join(workspace.sources, '1');
  await fs.mkdir(sourceDir, { recursive: true });
  await fs.writeFile(
    path.join(sourceDir, 'meta.json'),
    JSON.stringify(
      {
        bd_id: 1,
        title: 'Source de test',
        site: 'Exemple',
        url: 'https://example.com/source',
        language: 'fr',
        word_count: 120,
        coverage: { level: 'full', reasons: [] },
        captured_at: '2026-01-01T00:00:00.000Z',
      },
      null,
      2,
    ),
  );
  await fs.writeFile(path.join(sourceDir, 'text.txt'), 'Texte de test.\n');

  const pieces = await import(
    pathToFileURL(path.join(workspace.lib, 'pieces.mjs')).href
  );
  pieces.createPiece({
    slug: 'test-piece',
    title: 'Pièce de test',
    sources: [1],
    intent: 'Vérifier le plugin.',
  });

  const routes = [];
  const ctx = {
    effect(fn) {
      const dispose = fn();
      return typeof dispose === 'function' ? dispose : () => {};
    },
    on() {
      return () => {};
    },
    get() {
      return undefined;
    },
    workingDirectory: {
      get: () => root,
      defaultDirectory: root,
    },
    webServer: {
      register(route) {
        routes.push(route);
        return () => {};
      },
      getOrigin: () => 'http://127.0.0.1:3080',
    },
  };

  const plugin = await import(
    pathToFileURL(path.join(REPO, 'plugins/bureau/index.js')).href
  );
  plugin.apply(ctx, { workspaceDir: root, fake: true });

  const route = routes.find((entry) => entry.path === ROUTE);
  assert.ok(route, 'the bureau route is registered');
  handler = route.handler;
});

after(async () => {
  if (root) await fs.rm(root, { recursive: true, force: true });
});

test('health reports the fake mode and the configured caps', async () => {
  const res = await call('GET', '/health');
  assert.equal(res.status, 200);
  assert.equal(res.json.ok, true);
  assert.equal(res.json.desk, true);
  assert.equal(res.json.mode, 'fake');
  assert.equal(res.json.timeouts.stageMinutes, 30);
  assert.equal(res.json.timeouts.chatMinutes, 45);
});

test('pieces and creation are visible through the route', async () => {
  const res = await call('GET', '/pieces');
  assert.equal(res.status, 200);
  assert.equal(res.json.pieces.length, 1);
  assert.equal(res.json.pieces[0].slug, 'test-piece');
});

test('chat starts a conversation and stores its session', async () => {
  const res = await call('POST', '/pieces/test-piece/chat', {
    text: 'Bonjour',
  });
  assert.equal(res.status, 200);
  const meta = res.lines.find((line) => line.type === 'meta');
  const done = res.lines.find((line) => line.type === 'done');
  assert.equal(meta.mode, 'start');
  assert.match(done.text, /^\(fake start\)/);

  const piece = await readJson(
    path.join(workspace.pieces, 'test-piece/piece.json'),
  );
  assert.match(piece.bureau_session_id, /^fake-/);
  const messages = (
    await fs.readFile(
      path.join(workspace.pieces, 'test-piece/chat.jsonl'),
      'utf8',
    )
  )
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  assert.equal(messages.length, 2);
  assert.equal(messages[0].role, 'user');
  assert.equal(messages[1].role, 'assistant');
});

test('chat continues the stored conversation', async () => {
  const res = await call('POST', '/pieces/test-piece/chat', {
    text: 'Encore',
  });
  const meta = res.lines.find((line) => line.type === 'meta');
  const done = res.lines.find((line) => line.type === 'done');
  assert.equal(meta.mode, 'continue');
  assert.match(done.text, /^\(fake continue\)/);
});

test('research, brief, draft, critique and package run deterministically', async () => {
  for (const stage of ['research', 'brief', 'draft', 'critique', 'package']) {
    const res = await call('POST', '/pieces/test-piece/run', { stage });
    assert.equal(res.status, 200, `${stage} responded`);
    const done = res.lines.find((line) => line.type === 'done');
    assert.ok(done, `${stage} finished`);
    const step = done.stages.find((entry) => entry.id === stage);
    assert.equal(step.done, true, `${stage} is marked done`);
  }

  const draft = await fs.readFile(
    path.join(workspace.blog, 'test-piece.mdx'),
    'utf8',
  );
  assert.match(draft, /draft:\s*true/);
  assert.match(draft, /démonstration/);
  assert.ok(
    (
      await fs.stat(path.join(workspace.pieces, 'test-piece/research.md'))
    ).isFile(),
  );
  assert.ok(
    (
      await fs.stat(path.join(workspace.pieces, 'test-piece/package.md'))
    ).isFile(),
  );
});

test('the artifact route returns the written file', async () => {
  const res = await call('GET', '/pieces/test-piece/artifact?name=research');
  assert.equal(res.status, 200);
  assert.match(res.json.text, /démonstration/);
});

test('the critique/revision loop writes the revision', async () => {
  const res = await call('POST', '/pieces/test-piece/loop', {
    maxIterations: 1,
  });
  const done = res.lines.find((line) => line.type === 'done');
  assert.ok(done);
  assert.equal(done.stage, 'loop');
  assert.ok(
    (
      await fs.stat(
        path.join(workspace.pieces, 'test-piece/critiques/revision.md'),
      )
    ).isFile(),
  );
});

test('clearing the stored session falls back to a fresh start', async () => {
  const file = path.join(workspace.pieces, 'test-piece/piece.json');
  const piece = await readJson(file);
  delete piece.bureau_session_id;
  delete piece.bureau_parent_id;
  await fs.writeFile(file, JSON.stringify(piece, null, 2));

  const res = await call('POST', '/pieces/test-piece/chat', {
    text: 'Nouveau départ',
  });
  const meta = res.lines.find((line) => line.type === 'meta');
  assert.equal(meta.mode, 'start');
});

test('an unknown piece is rejected', async () => {
  const res = await call('POST', '/pieces/inconnue/chat', { text: 'x' });
  assert.equal(res.status, 400);
  assert.match(res.json.error, /inconnue/i);
});

test('deleting a piece archives its directory', async () => {
  const res = await call('DELETE', '/pieces/test-piece');
  assert.equal(res.status, 200);
  assert.ok(
    (
      await fs.stat(path.join(root, 'editorial/archive/test-piece'))
    ).isDirectory(),
  );
  await assert.rejects(
    fs.stat(path.join(workspace.pieces, 'test-piece')),
    /ENOENT/,
  );
});
