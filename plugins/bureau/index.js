/**
 * Le bureau — Host half.
 *
 * The editorial desk as a Harness plugin. It owns the same files as the desk
 * CLI (`editorial/pieces`, `editorial/sources`, `src/content/blog`), reuses the
 * desk libraries directly, and runs the multi-agent pipeline in-process with
 * `ctx.subagents` instead of spawning `dsh --profile headless` once per action.
 *
 * The panel is the Client half in `client.js`.
 */
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const name = 'bureau';
export const inject = ['webServer', 'workingDirectory', 'subagents'];

const ROUTE = '/api/bureau';
const DESK_LIB = 'tools/desk/lib';
const MAX_BODY_BYTES = 2_000_000;
const MAX_TEXT_BYTES = 2_000_000;

const DEFAULTS = {
  workspaceDir: '',
  historyChars: 60_000,
  stageTimeoutMinutes: 30,
  chatTimeoutMinutes: 45,
  fake: false,
};

const TOOL_LABELS = {
  read: 'lecture fichier',
  write: 'écriture fichier',
  edit: 'édition fichier',
  bash: 'commande',
  web_search: 'recherche web',
  web_fetch: 'lecture web',
  subagent: 'sous-agent',
  skill: 'compétence',
  desk_run: 'spécialiste',
  desk_loop: 'critique et révision',
  todo_write: 'plan',
  glob: 'recherche fichier',
  grep: 'recherche texte',
};

// Resolve helpers from the running dsh installation, not from this repository:
// the plugin is loaded by the dsh process, whose own node_modules owns these
// packages. Missing helpers degrade gracefully.
let requireFromDsh;
try {
  requireFromDsh = createRequire(
    process.argv[1] ?? path.join(process.cwd(), 'index.js'),
  );
} catch {
  requireFromDsh = undefined;
}

let defineTool;
if (requireFromDsh) {
  try {
    ({ defineTool } = await import(
      requireFromDsh.resolve('@deepseek-ai/dsh-tools')
    ));
  } catch {
    defineTool = undefined;
  }
}

let z;
if (requireFromDsh) {
  try {
    z = (await import(requireFromDsh.resolve('@deepseek-ai/schemastery')))
      .default;
  } catch {
    z = undefined;
  }
}

/** Optional tunables; every field has a safe default. */
export const Config = z
  ? z.object({
      workspaceDir: z.string().default(DEFAULTS.workspaceDir),
      historyChars: z.number().default(DEFAULTS.historyChars),
      stageTimeoutMinutes: z.number().default(DEFAULTS.stageTimeoutMinutes),
      chatTimeoutMinutes: z.number().default(DEFAULTS.chatTimeoutMinutes),
      fake: z.boolean().default(DEFAULTS.fake),
    })
  : undefined;

function str(value, max = 20_000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function clampNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function clampInt(value, fallback, min, max) {
  return Math.round(clampNumber(value, fallback, min, max));
}

function normalizeSettings(config) {
  const source = config && typeof config === 'object' ? config : {};
  return {
    workspaceDir: str(source.workspaceDir, 4000),
    historyChars: clampInt(
      source.historyChars,
      DEFAULTS.historyChars,
      4000,
      200_000,
    ),
    stageTimeoutMinutes: clampInt(
      source.stageTimeoutMinutes,
      DEFAULTS.stageTimeoutMinutes,
      0,
      240,
    ),
    chatTimeoutMinutes: clampInt(
      source.chatTimeoutMinutes,
      DEFAULTS.chatTimeoutMinutes,
      0,
      480,
    ),
    fake: Boolean(source.fake),
  };
}

function messageOf(error) {
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return String(error);
}

function minutesOf(milliseconds) {
  return Math.max(1, Math.round(milliseconds / 60_000));
}

/** Explicit timeout text: what happened, and which setting raises it. */
function timeoutMessage(milliseconds, scope) {
  const minutes = minutesOf(milliseconds);
  if (scope === 'chat') {
    return `Délai de ${minutes} min dépassé : le tour a été interrompu. Relancez, ou augmentez bureau.chatTimeoutMinutes.`;
  }
  return `Délai de ${minutes} min dépassé : le spécialiste a été interrompu. Relancez, ou augmentez bureau.stageTimeoutMinutes.`;
}

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Workspace and desk                                                   */
/* ------------------------------------------------------------------ */

async function workspaceRoot(ctx, settings) {
  if (settings.workspaceDir) return settings.workspaceDir;

  const candidates = [];
  const add = (dir) => {
    if (typeof dir === 'string' && dir && !candidates.includes(dir)) {
      candidates.push(dir);
    }
  };

  // The panel is root-scoped, so there is no Session binding to read directly.
  // Prefer the live root sessions' working directories, then the process
  // default, then the process cwd; choose the first one that holds the desk.
  const agents = typeof ctx.get === 'function' ? ctx.get('agents') : undefined;
  if (agents && typeof agents.roots === 'function') {
    try {
      for (const agent of agents.roots()) {
        try {
          add(ctx.workingDirectory.get(agent.session));
        } catch {
          // A disposed or unbound Session contributes no candidate.
        }
      }
    } catch {
      // The registry may be unavailable during startup.
    }
  }
  add(ctx.workingDirectory?.defaultDirectory);
  add(process.cwd());

  for (const dir of candidates) {
    if (await exists(path.join(dir, DESK_LIB))) return dir;
  }
  return candidates[0] || process.cwd();
}

const deskCache = new Map();

/** Import the desk libraries of one workspace once per process. */
async function deskAt(root) {
  const cached = deskCache.get(root);
  if (cached) return cached;

  const base = path.join(root, DESK_LIB);
  if (!fs.existsSync(base)) {
    throw new Error(`Le desk est introuvable dans ce workspace (${base}).`);
  }
  const load = (file) => import(pathToFileURL(path.join(base, file)).href);
  const [
    paths,
    pieces,
    pipeline,
    roles,
    chat,
    sources,
    store,
    coverage,
    bookmark,
  ] = await Promise.all([
    load('paths.mjs'),
    load('pieces.mjs'),
    load('pipeline.mjs'),
    load('roles.mjs'),
    load('chat.mjs'),
    load('sources.mjs'),
    load('store.mjs'),
    load('coverage.mjs'),
    load('bookmark.mjs'),
  ]);
  const desk = {
    root,
    paths,
    pieces,
    pipeline,
    roles,
    chat,
    sources,
    store,
    coverage,
    bookmark,
  };
  deskCache.set(root, desk);
  return desk;
}

/* ------------------------------------------------------------------ */
/* Live agent taps (token and tool progress)                            */
/* ------------------------------------------------------------------ */

const streamTaps = new Map();
const toolTaps = new Map();
/** Child session id -> the turn the panel is waiting on. */
const turnWaiters = new Map();
/** Piece slug -> a chat turn is already running. */
const activeChats = new Set();
/** Piece slug -> live NDJSON sink, so a tool-driven stage reports to the panel. */
const progressSinks = new Map();
/** Host-authored prompt delivery into a continuable child (see dsh-subagent). */
const DELIVER_PROMPT = Symbol.for('dsh.subagent.deliverPrompt');

function textOfBlocks(blocks) {
  return (blocks ?? [])
    .filter((block) => block?.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('\n')
    .trim();
}

/** Settle the panel's turn for one child session. */
function settleTurn(childId, reason) {
  const waiter = turnWaiters.get(childId);
  if (!waiter) return;
  turnWaiters.delete(childId);
  waiter.cleanup?.();
  if (reason?.kind === 'error') {
    waiter.reject(new Error(reason.error?.message || "L'agent a échoué."));
    return;
  }
  if (reason?.kind === 'aborted' || reason?.kind === 'interrupted') {
    waiter.reject(new Error('Réponse interrompue.'));
    return;
  }
  waiter.resolve(waiter.text);
}

function installTaps(ctx) {
  ctx.effect(() => {
    const offStream = ctx.on('agent/assistant-stream', (payload) => {
      const id = String(payload?.agent?.id ?? '');
      const waiter = turnWaiters.get(id);
      if (waiter) waiter.seen = true;
      const tap = streamTaps.get(id);
      if (!tap) return;
      const frame = payload?.frame;
      if (frame?.type !== 'chunk') return;
      const chunk = frame.chunk;
      if (chunk?.type === 'text-delta' && chunk.text) tap(chunk.text);
    });

    const offSession = ctx.on('session/event', (session, event) => {
      const id = String(session?.id ?? '');
      if (event?.type === 'assistant/message') {
        const waiter = turnWaiters.get(id);
        if (waiter) {
          const text = textOfBlocks(event.data?.message?.content);
          if (text) waiter.text = text;
          waiter.seen = true;
        }
        return;
      }
      if (event?.type === 'turn/end') {
        settleTurn(id, event.data?.reason);
        return;
      }
      if (event?.type === 'tool/call') {
        const tap = toolTaps.get(id);
        if (tap) tap(event);
      }
    });

    // Fallback when the turn/end feed is scoped away: a child that produced
    // output and then went idle has finished its turn.
    const offStatus = ctx.on('agent/status', (payload) => {
      if (payload?.status !== 'idle') return;
      const id = String(payload?.agent?.id ?? '');
      const waiter = turnWaiters.get(id);
      if (waiter?.seen) settleTurn(id, null);
    });

    return () => {
      offStream?.();
      offSession?.();
      offStatus?.();
    };
  }, 'bureau: agent taps');
}

/** Wait for one child turn; returns the promise plus a cancel that leaves it pending. */
function awaitTurn(
  ctx,
  childId,
  parent,
  signal,
  timeoutMs = 0,
  scope = 'chat',
) {
  let waiter;
  const promise = new Promise((resolve, reject) => {
    waiter = { text: '', seen: false, resolve, reject, cleanup: null };
    turnWaiters.set(childId, waiter);

    const timer =
      timeoutMs > 0
        ? setTimeout(() => {
            if (turnWaiters.get(childId) !== waiter) return;
            turnWaiters.delete(childId);
            waiter.cleanup?.();
            try {
              ctx.get('subagents')?.interrupt(childId, {
                kind: 'ancestor',
                agent: parent,
              });
            } catch {
              // The child is already gone.
            }
            reject(new Error(timeoutMessage(timeoutMs, scope)));
          }, timeoutMs)
        : null;

    const onAbort = () => {
      if (turnWaiters.get(childId) !== waiter) return;
      turnWaiters.delete(childId);
      waiter.cleanup?.();
      try {
        ctx.get('subagents')?.interrupt(childId, {
          kind: 'ancestor',
          agent: parent,
        });
      } catch {
        // The child is already gone.
      }
      reject(new Error('Réponse annulée.'));
    };

    signal?.addEventListener('abort', onAbort, { once: true });
    waiter.cleanup = () => {
      if (timer) clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    };
    if (signal?.aborted) onAbort();
  });

  return {
    promise,
    cancel() {
      if (turnWaiters.get(childId) !== waiter) return;
      turnWaiters.delete(childId);
      waiter.cleanup?.();
    },
  };
}

function attachTaps(childId, onDelta, onTool) {
  if (onDelta) streamTaps.set(childId, onDelta);
  if (onTool) toolTaps.set(childId, onTool);
  return () => {
    streamTaps.delete(childId);
    toolTaps.delete(childId);
  };
}

/** Start one continuable child, keeping it resident for the next turn. */
async function startConversation(ctx, parent, root, options) {
  const subagents = ctx.get('subagents');
  if (!subagents) {
    throw new Error("Le service de sous-agents n'est pas disponible.");
  }
  if (!parent) {
    throw new Error(
      "Ouvrez une conversation avant d'écrire : le bureau rattache l'agent de la pièce à votre session active.",
    );
  }

  const turn = awaitTurn(
    ctx,
    options.childId,
    parent,
    options.signal,
    options.timeoutMs ?? 0,
    'chat',
  );
  const detach = attachTaps(options.childId, options.onDelta, options.onTool);
  try {
    const activation = await subagents.startActivation({
      provider: 'spawn',
      childId: options.childId,
      label: String(options.label ?? 'Bureau').slice(0, 160),
      request: {
        cwd: root,
        prompt: [{ type: 'text', text: String(options.prompt ?? '') }],
        parent,
      },
      signal: options.signal,
      delivery: 'caller',
    });
    // The first turn is awaited through the session feed, not this promise.
    activation.result?.catch?.(() => {});
    return { turn, detach };
  } catch (error) {
    turn.cancel();
    detach();
    throw error;
  }
}

/** Deliver one host-authored user message to an existing continuable child. */
async function deliverPrompt(ctx, parent, childId, text, signal) {
  const subagents = ctx.get('subagents');
  if (!subagents) {
    throw new Error("Le service de sous-agents n'est pas disponible.");
  }
  const content = [{ type: 'text', text: String(text ?? '') }];
  const deliver = subagents[DELIVER_PROMPT];
  if (typeof deliver === 'function') {
    // Queue a distinct turn, attributed to the user, exactly like the Web UI.
    return deliver.call(
      subagents,
      parent,
      childId,
      content,
      { kind: 'user' },
      signal,
      'queue',
    );
  }
  return subagents.sendMessage(parent, childId, content, { signal });
}

async function continueConversation(ctx, parent, childId, options) {
  const turn = awaitTurn(
    ctx,
    childId,
    parent,
    options.signal,
    options.timeoutMs ?? 0,
    'chat',
  );
  const detach = attachTaps(childId, options.onDelta, options.onTool);
  try {
    await deliverPrompt(ctx, parent, childId, options.text, options.signal);
    return { turn, detach };
  } catch (error) {
    turn.cancel();
    detach();
    throw error;
  }
}

/** A stored conversation that can no longer be reached: start a fresh child. */
function isDeliveryFailure(error) {
  const code = String(error?.code ?? '');
  const message = String(error?.message ?? '');
  return /UNAUTHORIZED|UNKNOWN_CHILD|PARENT_UNAVAILABLE|DELIVERY_UNAVAILABLE|NOT_RESUMABLE|PERSISTENCE_UNAVAILABLE|CONTINUATION_UNAVAILABLE|DUPLICATE_CHILD/i.test(
    `${code} ${message}`,
  );
}

function toolEvent(event) {
  const name = String(event?.data?.name ?? 'outil');
  let input = {};
  try {
    input = JSON.parse(event?.data?.arguments ?? '{}');
  } catch {
    input = {};
  }
  return {
    type: 'tool_call',
    tool: name,
    input,
    callId: String(event?.data?.callId ?? ''),
  };
}

/** The most recent live root Agent, preferably one running in this workspace. */
function pickParent(ctx, root) {
  const agents = typeof ctx.get === 'function' ? ctx.get('agents') : undefined;
  const roots = typeof agents?.roots === 'function' ? agents.roots() : [];
  let fallback = null;
  let matching = null;
  for (const agent of roots) {
    fallback = agent;
    try {
      if (ctx.workingDirectory.get(agent.session) === root) matching = agent;
    } catch {
      // Ignore an unbound session.
    }
  }
  return matching ?? fallback;
}

/**
 * Run one isolated specialist session in-process.
 *
 * This replaces `spawn(dsh, ['--profile','headless','--json', ...])`: no CLI
 * boot, no stdout parsing, no credential patch, and the caller keeps the child
 * id so token deltas and tool calls can be streamed to the panel.
 */
async function runChild(ctx, parent, root, options) {
  const subagents =
    typeof ctx.get === 'function' ? ctx.get('subagents') : undefined;
  if (!subagents) {
    throw new Error("Le service de sous-agents n'est pas disponible.");
  }
  if (!parent) {
    throw new Error(
      'Ouvrez une conversation avant de lancer un agent : le bureau rattache ses spécialistes à votre session active.',
    );
  }

  const controller = new AbortController();
  const timeoutMs = Number(options.timeoutMs) || 0;
  let timedOut = false;
  const onOuterAbort = () => controller.abort();
  options.signal?.addEventListener('abort', onOuterAbort, { once: true });
  const timer =
    timeoutMs > 0
      ? setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, timeoutMs)
      : null;

  let activation;
  try {
    activation = await subagents.startActivation({
      provider: 'spawn',
      label: String(options.label ?? 'bureau').slice(0, 160),
      request: {
        cwd: root,
        prompt: [{ type: 'text', text: String(options.prompt ?? '') }],
        parent,
      },
      signal: controller.signal,
      delivery: 'caller',
    });
  } catch (error) {
    if (timer) clearTimeout(timer);
    options.signal?.removeEventListener('abort', onOuterAbort);
    throw error;
  }

  const childId = String(activation.childId);
  const interruptChild = () => {
    try {
      subagents.interrupt(childId, { kind: 'ancestor', agent: parent });
    } catch {
      // The child is already gone.
    }
  };
  controller.signal.addEventListener('abort', interruptChild, { once: true });
  if (controller.signal.aborted) interruptChild();

  if (options.onDelta) streamTaps.set(childId, options.onDelta);
  if (options.onTool) toolTaps.set(childId, options.onTool);

  try {
    const result = await activation.result;
    if (result?.stopReason === 'aborted') {
      throw new Error(
        timedOut
          ? timeoutMessage(timeoutMs, 'stage')
          : "L'exécution a été interrompue.",
      );
    }
    if (result?.stopReason === 'error') {
      throw new Error(result.diagnostic || "L'agent a échoué.");
    }
    const text = (result?.output ?? [])
      .filter(
        (block) => block?.type === 'text' && typeof block.text === 'string',
      )
      .map((block) => block.text)
      .join('\n')
      .trim();
    if (!text) {
      throw new Error(
        "L'agent n'a renvoyé aucun texte. Vérifiez la connexion du modèle.",
      );
    }
    return {
      sessionId: childId,
      text,
      stopReason: result?.stopReason ?? 'completed',
    };
  } finally {
    streamTaps.delete(childId);
    toolTaps.delete(childId);
    controller.signal.removeEventListener('abort', interruptChild);
    if (timer) clearTimeout(timer);
    options.signal?.removeEventListener('abort', onOuterAbort);
    try {
      await activation.dispose?.();
    } catch {
      // The activation is already gone.
    }
  }
}

/* ------------------------------------------------------------------ */
/* Desk operations                                                      */
/* ------------------------------------------------------------------ */

/** Deterministic artefacts for the fake mode: no model, no subagent. */
function fakeArtifact(job) {
  const title = job.piece?.title ?? job.piece?.slug ?? 'Pièce';
  const body = `# ${title} (démonstration)

Ce texte est produit par le mode démonstration. Il ne remplace pas un artefact réel.

- rôle : ${job.role}
- étape : ${job.stageId}
- sortie : ${job.output}
`;
  if (job.role === 'redacteur') {
    return `---
title: "${String(title).replace(/"/g, '\\"')}"
description: "Brouillon de démonstration."
pubDate: 2026-01-01
draft: true
---

${body}`;
  }
  if (
    job.role === 'critique-faits' ||
    job.role === 'critique-voix' ||
    job.role === 'critique-structure'
  ) {
    const score = job.role === 'critique-faits' ? 92 : 88;
    return `${body}
## Scorecard

{"role":"${job.role}","score":${score},"must_fix":["démonstration"],"nice_to_have":[]}
`;
  }
  if (job.role === 'editeur') {
    return `${body}
## Titres

- ${title}

## Thread Bluesky

Un post de démonstration.
`;
  }
  return body;
}

function fakeRunAgent(desk, emit) {
  return async (job) => {
    const roleLabel = desk.roles.ROLES[job.role]?.label ?? job.role;
    emit({ type: 'role', role: job.role, label: roleLabel, status: 'start' });
    const target = path.join(desk.paths.SITE_ROOT, job.output);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    let content = fakeArtifact(job);
    if (job.role === 'reviseur' && fs.existsSync(target)) {
      content = `${fs.readFileSync(target, 'utf8').trimEnd()}

Révision (démonstration).
`;
    }
    fs.writeFileSync(target, content, 'utf8');
    if (job.stageId === 'revise') {
      const revision = path.join(
        desk.paths.PIECES_DIR,
        job.piece.slug,
        'critiques',
        'revision.md',
      );
      fs.mkdirSync(path.dirname(revision), { recursive: true });
      fs.writeFileSync(revision, '# Révision (démonstration)\n', 'utf8');
    }
    emit({ type: 'role', role: job.role, status: 'done' });
    return {
      sessionId: `fake-${job.role}`,
      text: `(démonstration) ${roleLabel} a écrit ${job.output}.`,
    };
  };
}

function stageRunAgent(desk, ctx, parent, root, signal, emit, timeoutMs) {
  return async (job) => {
    const roleLabel = desk.roles.ROLES[job.role]?.label ?? job.role;
    const stageLabel = desk.roles.STAGES[job.stageId]?.label ?? job.stageId;
    emit({ type: 'role', role: job.role, label: roleLabel, status: 'start' });
    try {
      const result = await runChild(ctx, parent, root, {
        prompt: job.prompt,
        label: `${stageLabel} · ${roleLabel}`,
        signal,
        timeoutMs,
        onTool: (event) => {
          const parsed = toolEvent(event);
          emit({
            type: 'tool',
            role: job.role,
            tool: parsed.tool,
            label: TOOL_LABELS[parsed.tool] ?? parsed.tool,
            detail:
              parsed.tool === 'bash'
                ? String(parsed.input.command ?? '')
                    .split('\n')[0]
                    .slice(0, 100)
                : String(parsed.input.description ?? '').slice(0, 100),
          });
        },
      });
      emit({ type: 'role', role: job.role, status: 'done' });
      return result;
    } catch (error) {
      emit({
        type: 'role',
        role: job.role,
        status: 'error',
        message: messageOf(error),
      });
      throw error;
    }
  };
}

async function runStage(ctx, settings, parent, slug, stage, emit, signal) {
  const root = await workspaceRoot(ctx, settings);
  const desk = await deskAt(root);
  const notify = (event) => {
    emit(event);
    progressSinks.get(String(slug))?.(event);
  };
  const runAgent = settings.fake
    ? fakeRunAgent(desk, notify)
    : stageRunAgent(
        desk,
        ctx,
        parent,
        root,
        signal,
        notify,
        settings.stageTimeoutMinutes * 60_000,
      );
  const onEvent = (event) => {
    if (event?.type === 'tool_call') {
      const parsed = toolEvent(event);
      const value = {
        type: 'tool',
        role: event.role ?? null,
        tool: parsed.tool,
        label: TOOL_LABELS[parsed.tool] ?? parsed.tool,
        detail:
          parsed.tool === 'bash'
            ? String(parsed.input.command ?? '')
                .split('\n')[0]
                .slice(0, 100)
            : String(parsed.input.description ?? '').slice(0, 100),
      };
      notify(value);
    }
  };
  const result = await desk.pipeline.runStage({
    slug,
    stageId: stage,
    runAgent,
    onEvent,
  });
  return { desk, result };
}

async function runLoop(
  ctx,
  settings,
  parent,
  slug,
  maxIterations,
  emit,
  signal,
) {
  const root = await workspaceRoot(ctx, settings);
  const desk = await deskAt(root);
  const notify = (event) => {
    emit(event);
    progressSinks.get(String(slug))?.(event);
  };
  const runAgent = settings.fake
    ? fakeRunAgent(desk, notify)
    : stageRunAgent(
        desk,
        ctx,
        parent,
        root,
        signal,
        notify,
        settings.stageTimeoutMinutes * 60_000,
      );
  const onEvent = (event) => {
    if (event?.type === 'tool_call') {
      const parsed = toolEvent(event);
      notify({
        type: 'tool',
        role: event.role ?? null,
        tool: parsed.tool,
        label: TOOL_LABELS[parsed.tool] ?? parsed.tool,
        detail: String(parsed.input.description ?? '').slice(0, 100),
      });
    }
  };
  const result = await desk.pipeline.runReviewLoop({
    slug,
    maxIterations,
    runAgent,
    onEvent,
  });
  return { desk, result };
}

function artifactFile(desk, slug, name) {
  const pieceDir = path.join(desk.paths.PIECES_DIR, slug);
  if (name === 'brief') return path.join(pieceDir, 'brief.md');
  if (name === 'research') return path.join(pieceDir, 'research.md');
  if (name === 'package') return path.join(pieceDir, 'package.md');
  if (name === 'angle') return path.join(pieceDir, 'angle.md');
  if (name === 'critiques') return path.join(pieceDir, 'critiques');
  if (name === 'draft') {
    for (const extension of ['mdx', 'md']) {
      const file = path.join(desk.paths.CONTENT_DIR, `${slug}.${extension}`);
      if (fs.existsSync(file)) return file;
    }
  }
  return null;
}

function hasArtifact(desk, slug, name) {
  const target = artifactFile(desk, slug, name);
  if (!target || !fs.existsSync(target)) return false;
  if (name === 'critiques') {
    return (
      fs.statSync(target).isDirectory() &&
      fs.readdirSync(target).some((file) => file.endsWith('.md'))
    );
  }
  return true;
}

async function readArtifact(desk, slug, name) {
  const target = artifactFile(desk, slug, name);
  if (!target || !fs.existsSync(target)) return '';
  if (name === 'critiques') {
    if (!fs.statSync(target).isDirectory()) return '';
    const files = fs
      .readdirSync(target)
      .filter((file) => file.endsWith('.md'))
      .sort();
    const parts = [];
    for (const file of files) {
      const text = await readFile(path.join(target, file), 'utf8');
      parts.push(`# ${file}\n\n${text.trim()}`);
    }
    return parts.join('\n\n---\n\n');
  }
  const text = await readFile(target, 'utf8');
  if (name === 'draft') {
    return text.replace(/^---[\s\S]*?\n---\n/, '');
  }
  return text.length > MAX_TEXT_BYTES ? text.slice(0, MAX_TEXT_BYTES) : text;
}

async function pieceDetail(desk, slug) {
  const piece = desk.pieces.readPiece(slug);
  if (!piece) return null;
  const metas = desk.sources.listSourceMetas();
  return {
    piece,
    stages: desk.pipeline.stageStatus(slug),
    messages: desk.chat.readMessages(slug),
    sources: metas.filter((meta) => piece.sources.includes(meta.bd_id)),
    artifacts: {
      brief: hasArtifact(desk, slug, 'brief'),
      research: hasArtifact(desk, slug, 'research'),
      draft: hasArtifact(desk, slug, 'draft'),
      critiques: hasArtifact(desk, slug, 'critiques'),
      package: hasArtifact(desk, slug, 'package'),
      angle: hasArtifact(desk, slug, 'angle'),
    },
  };
}

async function inboxList(desk, query, limit) {
  const reader = await desk.bookmark.openBookmarkReader();
  try {
    const articles = await reader.list({
      limit: limit ?? 60,
      search: query || null,
    });
    const used = new Map();
    for (const piece of desk.pieces.listPieces()) {
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
      coverage: desk.coverage.assessCoverage(article),
      snapshotted: fs.existsSync(
        path.join(desk.paths.SOURCES_DIR, String(article.id), 'meta.json'),
      ),
      usedIn: used.get(Number(article.id)) ?? [],
    }));
  } finally {
    reader.close();
  }
}

async function createPiece(desk, body) {
  const sourceIds = [...new Set((body.sourceIds ?? []).map(Number))].filter(
    Number.isInteger,
  );
  if (!sourceIds.length) throw new Error('Choisissez au moins un article.');

  const reader = await desk.bookmark.openBookmarkReader();
  const metas = [];
  try {
    for (const id of sourceIds) {
      metas.push(await desk.sources.snapshotSource(reader, id));
    }
  } finally {
    reader.close();
  }

  const title = String(body.title || metas[0].title || '').trim();
  const base = desk.store.slugify(title) || `piece-${Date.now()}`;
  let slug = base;
  let index = 2;
  while (fs.existsSync(desk.pieces.pieceDir(slug))) {
    slug = `${base}-${index}`;
    index += 1;
  }

  const piece = desk.pieces.createPiece({
    slug,
    title,
    sources: sourceIds,
    intent: String(body.intent ?? '').trim(),
  });
  return { piece, sources: metas };
}

function buildChatPrompt(desk, piece, sourceMetas, history, text, budget) {
  const context = desk.chat.buildBootstrapMessage(piece, sourceMetas);
  const transcript = history
    .filter(
      (message) => message.role === 'user' || message.role === 'assistant',
    )
    .slice(-24)
    .map(
      (message) =>
        `${message.role === 'user' ? 'Utilisateur' : 'Agent'} : ${String(
          message.text ?? '',
        ).slice(0, 4000)}`,
    )
    .join('\n\n');

  const prompt = `${context}

## Conversation en cours

${transcript || '(aucun échange)'}

## Nouveau message

${text}

Réponds au nouveau message. Tu peux lire les sources et les artefacts avec tes
outils, et écrire \`editorial/pieces/${piece.slug}/angle.md\` quand l'utilisateur
arrête un angle. Reste dans le cadre de la pièce.`;

  return prompt.length > budget
    ? `${prompt.slice(0, budget)}\n\n[…contexte tronqué]`
    : prompt;
}

/* ------------------------------------------------------------------ */
/* HTTP plumbing                                                        */
/* ------------------------------------------------------------------ */

function sendJson(res, status, value) {
  if (res.writableEnded) return;
  if (res.headersSent) {
    try {
      res.end();
    } catch {
      // The socket is already gone.
    }
    return;
  }
  const body = JSON.stringify(value);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

function originAllowed(ctx, req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const actual = new URL(String(origin));
    const expected = new URL(ctx.webServer.getOrigin());
    const isLoopback = (host) =>
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host === '[::1]';
    return (
      actual.port === expected.port &&
      (actual.hostname === expected.hostname ||
        (isLoopback(actual.hostname) && isLoopback(expected.hostname)))
    );
  } catch {
    return false;
  }
}

async function readJsonBody(req, limit = MAX_BODY_BYTES) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error('Request body is too large.');
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON body.');
  }
}

function openStream(res) {
  res.writeHead(200, {
    'content-type': 'application/x-ndjson; charset=utf-8',
    'cache-control': 'no-store',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
  });
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  let stopped = false;
  return {
    send(value) {
      if (stopped || res.writableEnded) return;
      try {
        res.write(`${JSON.stringify(value)}\n`);
      } catch {
        stopped = true;
      }
    },
    close() {
      if (res.writableEnded) return;
      try {
        res.end();
      } catch {
        // The socket is already gone.
      }
    },
    stop() {
      stopped = true;
    },
  };
}

/* ------------------------------------------------------------------ */
/* Routes                                                               */
/* ------------------------------------------------------------------ */

async function handleChat(ctx, settings, req, res, slug) {
  const body = await readJsonBody(req);
  const root = await workspaceRoot(ctx, settings);
  const desk = await deskAt(root);
  const piece = desk.pieces.readPiece(slug);
  if (!piece) throw new Error('Pièce inconnue.');

  const text = str(body.text, 20_000);
  const bootstrap = Boolean(body.bootstrap);
  if (!bootstrap && !text) throw new Error('Message vide.');
  if (activeChats.has(slug)) {
    throw new Error('Une réponse est déjà en cours pour cette pièce.');
  }

  const history = desk.chat.readMessages(slug);
  if (
    bootstrap &&
    history.some((message) => message.role === 'assistant' && !message.error)
  ) {
    throw new Error('Le contexte a déjà été envoyé.');
  }

  // One durable child per piece, under the session that started it. If that
  // parent is gone, the piece falls back to a fresh child with a replay.
  const agents = typeof ctx.get === 'function' ? ctx.get('agents') : undefined;
  const storedChild = piece.bureau_session_id
    ? String(piece.bureau_session_id)
    : '';
  const storedParent = piece.bureau_parent_id
    ? String(piece.bureau_parent_id)
    : '';
  let parent = storedParent && agents ? agents.get(storedParent) : undefined;
  let childId = storedChild && (settings.fake || parent) ? storedChild : '';
  let continuing = Boolean(childId);
  if (!parent) parent = pickParent(ctx, root);

  const metas = desk.sources
    .listSourceMetas()
    .filter((meta) => piece.sources.includes(meta.bd_id));

  let prompt;
  if (continuing) {
    prompt =
      text || (bootstrap ? desk.chat.buildBootstrapMessage(piece, metas) : '');
  } else if (bootstrap) {
    const previous = [...history]
      .reverse()
      .find((message) => message.role === 'context');
    if (previous) {
      prompt = previous.text;
    } else {
      prompt = desk.chat.buildBootstrapMessage(piece, metas);
      desk.chat.appendMessage(slug, {
        role: 'context',
        at: desk.store.nowIso(),
        text: prompt,
      });
    }
  } else {
    prompt = buildChatPrompt(
      desk,
      piece,
      metas,
      history,
      text,
      settings.historyChars,
    );
  }

  if (!bootstrap) {
    desk.chat.appendMessage(slug, {
      role: 'user',
      at: desk.store.nowIso(),
      text,
    });
  }

  activeChats.add(slug);
  const chatTimeoutMs = settings.chatTimeoutMinutes * 60_000;
  const controller = new AbortController();
  const onClose = () => {
    if (!res.writableEnded) controller.abort();
  };
  res.on('close', onClose);

  const stream = openStream(res);
  const toolNames = [];
  let streamed = '';
  progressSinks.set(String(slug), (event) => stream.send(event));
  stream.send({ type: 'meta', slug, mode: continuing ? 'continue' : 'start' });

  const onDelta = (delta) => {
    streamed += delta;
    stream.send({ type: 'delta', text: delta });
  };
  const onTool = (event) => {
    const parsed = toolEvent(event);
    if (!toolNames.includes(parsed.tool)) toolNames.push(parsed.tool);
    stream.send({
      type: 'tool',
      tool: parsed.tool,
      label: TOOL_LABELS[parsed.tool] ?? parsed.tool,
    });
  };

  let session = null;
  try {
    if (settings.fake) {
      const answer = `${continuing ? '(fake continue)' : '(fake start)'} ${
        bootstrap ? 'Contexte reçu' : text
      }`.trim();
      onDelta(answer);
      desk.chat.appendMessage(slug, {
        role: 'assistant',
        at: desk.store.nowIso(),
        text: answer,
        session: continuing ? childId : null,
        tools: [],
      });
      if (!continuing) {
        desk.pieces.updatePiece(slug, {
          bureau_session_id: `fake-${randomUUID()}`,
          bureau_parent_id: 'fake',
        });
      }
      stream.send({ type: 'done', text: answer });
      return;
    }

    if (continuing) {
      try {
        session = await continueConversation(ctx, parent, childId, {
          text: prompt,
          signal: controller.signal,
          onDelta,
          onTool,
          timeoutMs: chatTimeoutMs,
        });
      } catch (error) {
        if (!isDeliveryFailure(error)) throw error;
        continuing = false;
        childId = '';
        parent = pickParent(ctx, root) ?? parent;
      }
    }

    if (!continuing) {
      childId = randomUUID();
      const freshPrompt = bootstrap
        ? prompt
        : buildChatPrompt(
            desk,
            piece,
            metas,
            history,
            text,
            settings.historyChars,
          );
      session = await startConversation(ctx, parent, root, {
        childId,
        prompt: freshPrompt,
        label: bootstrap ? `Bureau · contexte ${slug}` : `Bureau · ${slug}`,
        signal: controller.signal,
        onDelta,
        onTool,
        timeoutMs: chatTimeoutMs,
      });
      desk.pieces.updatePiece(slug, {
        bureau_session_id: childId,
        bureau_parent_id: String(parent.id),
      });
    }

    let answer;
    try {
      answer = await session.turn.promise;
    } finally {
      session.detach();
    }
    if (!answer && streamed) answer = streamed.trim();
    if (!answer) throw new Error("L'agent n'a renvoyé aucun texte.");

    desk.chat.appendMessage(slug, {
      role: 'assistant',
      at: desk.store.nowIso(),
      text: answer,
      session: childId,
      tools: toolNames,
    });
    stream.send({ type: 'done', text: answer });
  } catch (error) {
    const message = messageOf(error);
    desk.chat.appendMessage(slug, {
      role: 'assistant',
      at: desk.store.nowIso(),
      text: `⚠ ${message}`,
      error: true,
    });
    stream.send({
      type: 'error',
      message: controller.signal.aborted ? 'Réponse annulée.' : message,
      aborted: controller.signal.aborted,
    });
  } finally {
    activeChats.delete(slug);
    progressSinks.delete(String(slug));
    if (typeof res.off === 'function') res.off('close', onClose);
    stream.close();
  }
}

async function handleRun(ctx, settings, req, res, slug, mode) {
  const body = await readJsonBody(req);
  const root = await workspaceRoot(ctx, settings);
  const desk = await deskAt(root);
  const piece = desk.pieces.readPiece(slug);
  if (!piece) throw new Error('Pièce inconnue.');

  const stage = str(body.stage, 40);
  const maxIterations = clampInt(body.maxIterations, 2, 1, 3);

  const controller = new AbortController();
  const onClose = () => {
    if (!res.writableEnded) controller.abort();
  };
  res.on('close', onClose);

  const stream = openStream(res);
  const parent = pickParent(ctx, root);
  const emit = (value) => stream.send(value);

  try {
    stream.send({
      type: 'start',
      stage: mode === 'loop' ? 'loop' : stage,
      label:
        mode === 'loop'
          ? 'Critiques et révision'
          : (desk.roles.STAGES[stage]?.label ?? stage),
    });

    const outcome =
      mode === 'loop'
        ? await runLoop(
            ctx,
            settings,
            parent,
            slug,
            maxIterations,
            emit,
            controller.signal,
          )
        : await runStage(
            ctx,
            settings,
            parent,
            slug,
            stage,
            emit,
            controller.signal,
          );

    const summary =
      mode === 'loop'
        ? outcome.result.history
            .map(
              (entry) =>
                `Itération ${entry.iteration} : ${entry.mustFix} must-fix (${entry.scores
                  .map((score) => `${score.role} ${score.score}`)
                  .join(', ')})`,
            )
            .join('\n')
        : outcome.result.results
            .map(
              (entry) =>
                `**${entry.label}** → \`${entry.output}\`\n\n${entry.text}`,
            )
            .join('\n\n');

    desk.chat.appendMessage(slug, {
      role: 'assistant',
      at: desk.store.nowIso(),
      stage: mode === 'loop' ? 'loop' : stage,
      text:
        mode === 'loop'
          ? `**Boucle critique → révision**\n\n${summary}`
          : `**${outcome.result.label}**\n\n${summary}`,
    });

    stream.send({
      type: 'done',
      stage: mode === 'loop' ? 'loop' : stage,
      summary,
      stages: desk.pipeline.stageStatus(slug),
    });
  } catch (error) {
    const message = messageOf(error);
    desk.chat.appendMessage(slug, {
      role: 'assistant',
      at: desk.store.nowIso(),
      text: `⚠ ${message}`,
      error: true,
      stage: mode === 'loop' ? 'loop' : stage,
    });
    stream.send({
      type: 'error',
      message: controller.signal.aborted ? 'Exécution annulée.' : message,
      aborted: controller.signal.aborted,
    });
  } finally {
    if (typeof res.off === 'function') res.off('close', onClose);
    stream.close();
  }
}

async function handleRoute(ctx, settings, req, res) {
  try {
    if (!originAllowed(ctx, req)) {
      sendJson(res, 403, { ok: false, error: 'Origin not allowed.' });
      return;
    }

    const url = new URL(req.url ?? '/', 'http://localhost');
    const sub = url.pathname.slice(ROUTE.length) || '/';
    const root = await workspaceRoot(ctx, settings);

    if (req.method === 'GET' && sub === '/font') {
      const font = path.join(root, 'tools/desk/ui/fonts/InterVariable.woff2');
      if (!fs.existsSync(font)) {
        sendJson(res, 404, { ok: false, error: 'Font not found.' });
        return;
      }
      const bytes = await readFile(font);
      res.writeHead(200, {
        'content-type': 'font/woff2',
        'cache-control': 'public, max-age=31536000, immutable',
        'content-length': bytes.length,
      });
      res.end(bytes);
      return;
    }

    if (req.method === 'GET' && sub === '/health') {
      let desk = null;
      try {
        desk = await deskAt(root);
      } catch {
        desk = null;
      }
      let selection = null;
      try {
        const defaults = ctx.get('agentDefaultModel');
        selection = defaults?.currentSelection?.() ?? null;
      } catch {
        selection = null;
      }
      let roots = 0;
      try {
        const agents = ctx.get('agents');
        roots = agents?.roots?.().length ?? 0;
      } catch {
        roots = 0;
      }
      sendJson(res, 200, {
        ok: Boolean(desk),
        root,
        desk: Boolean(desk),
        pieces: desk ? desk.pieces.listPieces().length : 0,
        provider: selection?.provider ?? '',
        model: selection?.model ?? '',
        mode: settings.fake ? 'fake' : 'live',
        streaming: true,
        roots,
        timeouts: {
          stageMinutes: settings.stageTimeoutMinutes,
          chatMinutes: settings.chatTimeoutMinutes,
        },
      });
      return;
    }

    if (!(await exists(path.join(root, DESK_LIB)))) {
      sendJson(res, 503, {
        ok: false,
        error: `Le desk est introuvable dans ${root}.`,
      });
      return;
    }
    const desk = await deskAt(root);

    if (req.method === 'GET' && sub === '/pieces') {
      sendJson(res, 200, { ok: true, pieces: desk.pieces.listPieces() });
      return;
    }

    if (req.method === 'POST' && sub === '/pieces') {
      const body = await readJsonBody(req);
      const created = await createPiece(desk, body);
      sendJson(res, 201, { ok: true, ...created });
      return;
    }

    if (req.method === 'GET' && sub === '/inbox') {
      const query = str(url.searchParams.get('q'), 300);
      const articles = await inboxList(desk, query, 60);
      sendJson(res, 200, { ok: true, articles });
      return;
    }

    const parts = sub.split('/').filter(Boolean);
    // pieces/:slug[/...]
    if (parts[0] !== 'pieces' || parts.length < 2) {
      sendJson(res, 404, { ok: false, error: 'Route inconnue.' });
      return;
    }
    const slug = parts[1];
    const tail = parts[2] ?? '';

    if (req.method === 'GET' && parts.length === 2) {
      const detail = await pieceDetail(desk, slug);
      if (!detail) {
        sendJson(res, 404, { ok: false, error: 'Pièce inconnue.' });
        return;
      }
      sendJson(res, 200, { ok: true, ...detail });
      return;
    }

    if (req.method === 'DELETE' && parts.length === 2) {
      const piece = desk.pieces.readPiece(slug);
      const childId = piece?.bureau_session_id
        ? String(piece.bureau_session_id)
        : '';
      const parentId = piece?.bureau_parent_id
        ? String(piece.bureau_parent_id)
        : '';
      if (childId && parentId) {
        const agents =
          typeof ctx.get === 'function' ? ctx.get('agents') : undefined;
        const parent = agents?.get?.(parentId);
        const subagents =
          typeof ctx.get === 'function' ? ctx.get('subagents') : undefined;
        if (parent && subagents?.drainChildren) {
          try {
            await subagents.drainChildren(parent, [childId]);
          } catch {
            // The child is already gone; archiving can proceed.
          }
        }
      }
      const archived = desk.pieces.archivePiece(slug);
      sendJson(res, 200, { ok: true, archived });
      return;
    }

    if (req.method === 'POST' && tail === 'status') {
      const body = await readJsonBody(req);
      const piece = desk.pieces.setStatus(
        slug,
        str(body.status, 40),
        'bureau-plugin',
      );
      sendJson(res, 200, { ok: true, piece });
      return;
    }

    if (req.method === 'GET' && tail === 'artifact') {
      const name = str(url.searchParams.get('name'), 40);
      const text = await readArtifact(desk, slug, name);
      sendJson(res, 200, { ok: true, name, text });
      return;
    }

    if (req.method === 'GET' && tail === 'source') {
      const id = str(url.searchParams.get('id'), 40);
      const file = path.join(desk.paths.SOURCES_DIR, id, 'text.txt');
      const resolved = path.resolve(file);
      if (
        !resolved.startsWith(path.resolve(desk.paths.SOURCES_DIR) + path.sep)
      ) {
        throw new Error('Identifiant de source invalide.');
      }
      if (!fs.existsSync(resolved)) {
        sendJson(res, 404, { ok: false, error: 'Source inconnue.' });
        return;
      }
      const raw = await readFile(resolved, 'utf8');
      sendJson(res, 200, {
        ok: true,
        id,
        text: raw.length > MAX_TEXT_BYTES ? raw.slice(0, MAX_TEXT_BYTES) : raw,
      });
      return;
    }

    if (req.method === 'POST' && tail === 'chat') {
      await handleChat(ctx, settings, req, res, slug);
      return;
    }

    if (req.method === 'POST' && tail === 'run') {
      await handleRun(ctx, settings, req, res, slug, 'stage');
      return;
    }

    if (req.method === 'POST' && tail === 'loop') {
      await handleRun(ctx, settings, req, res, slug, 'loop');
      return;
    }

    sendJson(res, 404, { ok: false, error: 'Route inconnue.' });
  } catch (error) {
    sendJson(res, 400, { ok: false, error: messageOf(error) });
  }
}

/* ------------------------------------------------------------------ */
/* Agent tool                                                           */
/* ------------------------------------------------------------------ */

function createDeskTools(ctx, settings) {
  if (!defineTool) return [];
  return [
    defineTool({
      name: 'desk_run',
      description:
        'Run one desk pipeline stage with its isolated specialist(s). Stages: research, brief, draft, critique, revise, package. The specialist writes the artefact itself; this tool returns a summary. Use desk_loop for critique + revision.',
      parameters: {
        slug: {
          type: 'string',
          required: true,
          description: 'The desk piece slug (for example la-bulle-ia).',
        },
        stage: {
          type: 'string',
          required: true,
          enum: ['research', 'brief', 'draft', 'critique', 'revise', 'package'],
          description: 'The pipeline stage to run.',
        },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: String(value) }],
      },
      isConcurrencySafe: () => false,
      async execute(args, exec) {
        const slug = str(args.slug, 200);
        const stage = str(args.stage, 40);
        const events = [];
        const { result } = await runStage(
          ctx,
          settings,
          exec.agent,
          slug,
          stage,
          (event) => {
            if (event.type === 'role') {
              events.push(`${event.label ?? event.role} : ${event.status}`);
            }
          },
          exec.signal,
        );
        const lines = [`${result.label} — ${result.results.length} rôle(s)`];
        for (const entry of result.results) {
          lines.push(`${entry.label} → ${entry.output}`);
          if (entry.text) lines.push(String(entry.text).slice(0, 600));
        }
        if (events.length) lines.push('', events.join('\n'));
        return lines.join('\n');
      },
    }),
    defineTool({
      name: 'desk_loop',
      description:
        'Run the desk evaluator-optimizer loop: the three critiques in parallel, then the reviser applies the must-fix, until the scores are sufficient or maxIterations. The specialists run in isolated subagents.',
      parameters: {
        slug: {
          type: 'string',
          required: true,
          description: 'The desk piece slug.',
        },
        maxIterations: {
          type: 'integer',
          description: 'Maximum critique/revision passes (1-3, default 2).',
        },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: String(value) }],
      },
      isConcurrencySafe: () => false,
      async execute(args, exec) {
        const slug = str(args.slug, 200);
        const { result } = await runLoop(
          ctx,
          settings,
          exec.agent,
          slug,
          clampInt(args.maxIterations, 2, 1, 3),
          () => {},
          exec.signal,
        );
        return result.history
          .map(
            (entry) =>
              `Itération ${entry.iteration} : ${entry.mustFix} must-fix (${entry.scores
                .map((score) => `${score.role} ${score.score}`)
                .join(', ')})`,
          )
          .join('\n');
      },
    }),
  ];
}

export function apply(ctx, config) {
  const settings = normalizeSettings(config);

  installTaps(ctx);

  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'prefix',
        path: ROUTE,
        handler: (req, res) => handleRoute(ctx, settings, req, res),
      }),
    'bureau: HTTP routes',
  );

  const tools = typeof ctx.get === 'function' ? ctx.get('tools') : undefined;
  const registrations = tools ? createDeskTools(ctx, settings) : [];
  if (tools && registrations.length) {
    ctx.effect(() => {
      const disposers = registrations.map((tool) => tools.register(tool));
      return () => {
        for (const dispose of disposers) dispose();
      };
    }, 'bureau: model tools');
  }
}
