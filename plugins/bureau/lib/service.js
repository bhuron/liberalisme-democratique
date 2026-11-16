import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { openBookmarkReader, bookmarkSettings } from './bookmark.js';
import { assessCoverage } from './coverage.js';
import { checkStyle, lintText, rankRelated } from './checks.js';
import {
  deskAgentInstruction,
  exemplarSelection,
  listInstructions,
  newsroomProfileInstruction,
  readInstruction,
  roleInstruction,
  styleCardInstruction,
} from './instructions.js';
import {
  archivePiece as archivePieceOnDisk,
  artifactInfo,
  createPiece as createPieceOnDisk,
  draftFile,
  listArtifacts,
  listPieces as listPiecesOnDisk,
  pieceDir,
  readArtifact,
  readPiece,
  setStatus as setStatusOnDisk,
  uniqueSlug,
  updatePiece,
  writeAngle as writeAngleOnDisk,
} from './pieces.js';
import {
  ROLES,
  STAGES,
  availableArtefacts,
  formatStageSummary,
  runFix,
  runIllustration,
  runStage,
  stageStatus,
} from './pipeline.js';
import {
  listSourceMetas,
  readSourceMeta,
  readSourceText,
  snapshotSource,
} from './sources.js';
import { hasDraftTrue, nowIso, readText, truncate } from './store.js';

const DEFAULT_SETTINGS = {
  workspaceDir: '',
  bookmarkRoot: '',
  bookmarkDb: '',
  bookmarkApi: '',
  agentPreset: 'standard',
  stageTimeoutMinutes: 15,
};

const ARTIFACT_NAMES = [
  'angle',
  'research',
  'brief',
  'draft',
  'relecture',
  'fixes',
  'illustrations',
  'package',
];

function normalizeSettings(config) {
  const source = config && typeof config === 'object' ? config : {};
  return {
    workspaceDir: String(source.workspaceDir ?? '').trim(),
    bookmarkRoot: String(source.bookmarkRoot ?? '').trim(),
    bookmarkDb: String(source.bookmarkDb ?? '').trim(),
    bookmarkApi: String(source.bookmarkApi ?? '').trim(),
    agentPreset: String(source.agentPreset ?? 'standard').trim(),
    stageTimeoutMinutes: clampInt(
      source.stageTimeoutMinutes,
      DEFAULT_SETTINGS.stageTimeoutMinutes,
      0,
      240,
    ),
  };
}

function clampInt(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function messageOf(error) {
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return String(error);
}

function textOfBlocks(blocks) {
  return (blocks ?? [])
    .filter((block) => block?.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('\n')
    .trim();
}

function abortError() {
  const error = new Error('Étape annulée.');
  error.name = 'AbortError';
  return error;
}

/**
 * Settle the activation's result promptly when the caller aborts. The
 * activation manager's `signal` only covers startup; the child run has to be
 * disposed to stop it.
 */
function awaitActivation(activation, signal) {
  if (signal.aborted) return Promise.reject(abortError());
  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => signal.removeEventListener('abort', onAbort);
    const onAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(abortError());
    };
    signal.addEventListener('abort', onAbort, { once: true });
    activation.result.then(
      (value) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(value);
      },
      (error) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      },
    );
  });
}

async function disposeActivation(activation, signal) {
  if (signal.aborted) {
    void activation.dispose().catch(() => {});
    return;
  }
  await activation.dispose().catch(() => {});
}

function timeoutSignal(signal, minutes) {
  if (!minutes) return { signal, clear: () => {} };
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(
      new Error(
        `Délai de ${minutes} min dépassé : le spécialiste a été interrompu. Relancez, ou augmentez bureau.stageTimeoutMinutes.`,
      ),
    );
  }, minutes * 60_000);
  return {
    signal: AbortSignal.any([signal, controller.signal]),
    clear: () => clearTimeout(timer),
  };
}

/**
 * The office's application service. The HTTP UI, the agent tools and the
 * per-piece session all call these methods; there is one implementation of each
 * operation.
 */
export function createBureauService({ ctx, config }) {
  const settings = normalizeSettings(config);
  let rootCache = null;
  /** slug → live AgentHandle created or resumed by this plugin. */
  const handles = new Map();
  /** session id → slug. */
  const bindings = new Map();
  /** run id → run record. */
  const runs = new Map();
  /** slug → current run id. */
  const activeRuns = new Map();
  /** slug → an in-flight session creation/resume. */
  const sessionLocks = new Map();

  async function resolveRoot() {
    if (settings.workspaceDir) return settings.workspaceDir;
    if (rootCache && workspaceReady(rootCache)) return rootCache;

    const candidates = [];
    const add = (dir) => {
      if (typeof dir === 'string' && dir && !candidates.includes(dir)) {
        candidates.push(dir);
      }
    };

    const workingDirectory = ctx.get?.('workingDirectory');
    const agents = ctx.get?.('agents');
    for (const agent of agents?.list?.() ?? []) {
      try {
        add(workingDirectory?.get?.(agent.session ?? agent));
      } catch {
        // A disposed or unbound session contributes no candidate.
      }
    }
    add(workingDirectory?.defaultDirectory);
    add(process.cwd());

    for (const dir of candidates) {
      if (workspaceReady(dir)) {
        rootCache = dir;
        return dir;
      }
    }
    return candidates[0] ?? process.cwd();
  }

  function workspaceReady(root) {
    return (
      fs.existsSync(path.join(root, 'editorial', 'agent', 'desk-agent.md')) ||
      fs.existsSync(path.join(root, 'editorial', 'style', 'card.md'))
    );
  }

  async function requireRoot() {
    const root = await resolveRoot();
    if (!workspaceReady(root)) {
      throw new Error(
        `Le bureau est introuvable : éditez la configuration du plugin pour indiquer le workspace du blog (editorial/agent/desk-agent.md absent de ${root}).`,
      );
    }
    return root;
  }

  function selection() {
    try {
      return ctx.get?.('agentDefaultModel')?.currentSelection?.() ?? undefined;
    } catch {
      return undefined;
    }
  }

  function logWarning(message) {
    try {
      console.warn(`[bureau] ${message}`);
    } catch {
      // Logging must never break an operation.
    }
  }

  async function bookmarkStatus(root) {
    const base = bookmarkSettings({
      root,
      bookmarkRoot: settings.bookmarkRoot,
      bookmarkDb: settings.bookmarkDb,
      bookmarkApi: settings.bookmarkApi,
    });
    try {
      const reader = await openBookmarkReader({
        root,
        bookmarkRoot: settings.bookmarkRoot,
        bookmarkDb: settings.bookmarkDb,
        bookmarkApi: settings.bookmarkApi,
      });
      try {
        await reader.list({ limit: 1 });
      } finally {
        reader.close();
      }
      return { available: true, via: reader.via, db: base.db };
    } catch (error) {
      return { available: false, error: messageOf(error), db: base.db };
    }
  }

  async function usedByMap(root) {
    const map = new Map();
    for (const piece of listPiecesOnDisk(root)) {
      for (const id of piece.sources) {
        if (!map.has(id)) map.set(id, []);
        map.get(id).push({ slug: piece.slug, title: piece.title });
      }
    }
    return map;
  }

  function summarizePiece(piece) {
    return {
      slug: piece.slug,
      title: piece.title,
      status: piece.status,
      mode: piece.mode,
      intent: piece.intent,
      sources: piece.sources,
      source_count: piece.sources.length,
      session_id: piece.session_id ?? null,
      created_at: piece.created_at,
      updated_at: piece.updated_at,
    };
  }

  function stageSummary(result) {
    return {
      stage: result.stage,
      label: result.label,
      outputs: result.outputs,
      results: result.results.map((entry) => ({
        role: entry.role,
        label: entry.label,
        output: entry.output,
        session: entry.session,
        text: truncate(entry.text, 300),
      })),
    };
  }

  function setupFor(root, slug) {
    return (agentCtx) => {
      const systemPrompt =
        agentCtx.systemPrompt ?? agentCtx.get?.('systemPrompt');
      if (!systemPrompt) return;
      const install = () =>
        systemPrompt.section({
          name: 'bureau',
          order: 60,
          text: () => deskPrompt(root, slug),
        });
      if (typeof agentCtx.effect === 'function') {
        agentCtx.effect(install, 'bureau: desk prompt');
      } else {
        install();
      }
    };
  }

  function deskPrompt(root, slug) {
    const piece = readPiece(root, slug);
    if (!piece) return '';

    const sources = listSourceMetas(root).filter((source) =>
      piece.sources.includes(source.bd_id),
    );
    const available = availableArtefacts(root, piece);
    const angle = readText(path.join(pieceDir(root, slug), 'angle.md'), '');
    const sourceLines =
      sources
        .map(
          (source) =>
            `- [${source.bd_id}] ${source.site ?? 'sans site'} — « ${source.title} » (${source.word_count} mots, couverture ${source.coverage?.level ?? 'inconnue'})\n  editorial/sources/${source.bd_id}/text.txt`,
        )
        .join('\n') || '- aucune source capturée';

    const artifactLines =
      available.map((file) => `- ${file}`).join('\n') || '- aucun';

    return `# Session du bureau éditorial

${deskAgentInstruction(root)}

## Charte de style

${styleCardInstruction(root)}

## Profil de registre

${newsroomProfileInstruction(root) || 'Profil non disponible.'}

Les exemplaires de registre sont dans editorial/style/corpus/newsroom-exemplars.md.

## Pièce courante

- Titre : ${piece.title}
- Slug : ${piece.slug}
- Statut : ${piece.status}
- Intention : ${piece.intent?.trim() || 'à préciser'}

### Sources

${sourceLines}

### Artefacts disponibles

${artifactLines}

### Angle consigné

${angle.trim() || "Aucune décision consignée. Déduis l'angle des sources et propose-le avant de rédiger."}

## Outils du bureau

- \`desk_piece\` : lister, lire, créer, archiver une pièce ; changer son statut.
- \`desk_sources\` : inbox des captures, métadonnées, texte d'une source, snapshot.
- \`desk_artifact\` : lire un artefact (angle, recherche, brief, brouillon, relecture, corrections, paquet).
- \`desk_angle\` : écrire \`editorial/pieces/${slug}/angle.md\`.
- \`desk_run\` : lancer une étape (${Object.keys(STAGES).join(', ')}) dans une session isolée.
- \`desk_fix\` : corrections mécaniques du brouillon en place (fautes, accents, ponctuation) ; le fixeur écrit fixes.md, sans réécrire l'article.
- \`desk_illustrate\` : visuels de l'article (photos libres, graphiques sourcés, vidéo si demandée) ; l'illustrateur insère dans le brouillon et écrit illustrations.md.
- \`desk_publish\` : préflight puis publication de l'article sur le site, sur instruction explicite ; sans \`confirm\`, aucun changement.
- \`desk_check\` : style, typographie et corpus du blog.
- \`desk_instructions\` : relire un rôle ou la charte.

Les outils ciblent cette pièce par défaut : le slug peut être omis. Le pipeline
écrit les artefacts à ta place via des spécialistes isolés ; tu ne les rédiges
pas toi-même. Tu ne publies pas, tu ne commits pas, tu ne merges pas.`;
  }

  async function ensureWorkspace(root) {
    const registry = ctx.get?.('workspaceRegistry');
    if (!registry?.resolveByPath) return undefined;
    try {
      const existing = await registry.resolveByPath(root);
      if (existing) return existing;
      return await registry.create(root, path.basename(root));
    } catch (error) {
      logWarning(`workspace non enregistré pour ${root} : ${messageOf(error)}`);
      return undefined;
    }
  }

  async function archiveSession(sessionId) {
    const registry = ctx.get?.('workspaceRegistry');
    if (!registry?.archiveSession) return;
    try {
      await registry.archiveSession(sessionId);
    } catch (error) {
      logWarning(`session ${sessionId} non archivée : ${messageOf(error)}`);
    }
  }

  function ensureModel(agent) {
    const choice = selection();
    if (!choice || !agent?.model) return;
    try {
      if (!agent.model.current()) agent.model.select(choice);
    } catch (error) {
      logWarning(`modèle non appliqué : ${messageOf(error)}`);
    }
  }

  function hasUserMessage(agent) {
    try {
      return Boolean(
        agent?.session
          ?.ownEvents?.()
          .some((event) => event.type === 'user/message'),
      );
    } catch {
      return false;
    }
  }

  function bootstrapPrompt(root, piece) {
    const sources = listSourceMetas(root).filter((source) =>
      piece.sources.includes(source.bd_id),
    );
    const sourceLines =
      sources
        .map(
          (source) =>
            `- [${source.bd_id}] « ${source.title} » — editorial/sources/${source.bd_id}/text.txt (couverture ${source.coverage?.level ?? 'inconnue'})`,
        )
        .join('\n') || '- aucune source figée';

    return `Je travaille la pièce « ${piece.title} » (slug \`${piece.slug}\`).

Intention : ${piece.intent?.trim() || 'à préciser'}

Sources figées :
${sourceLines}

Commence par reformuler le sujet et l'angle en une phrase, puis pose-moi au plus
deux questions. Ne rédige rien avant que l'angle soit fixé. Les instructions du
bureau sont dans editorial/agent/desk-agent.md et la charte dans
editorial/style/card.md ; les outils desk_* ciblent cette pièce par défaut.`;
  }

  async function waitForUserMessage(sessionId, timeoutMs = 2000) {
    if (typeof ctx.on !== 'function') return false;
    return new Promise((resolve) => {
      let off = () => {};
      const timer = setTimeout(() => {
        off();
        resolve(false);
      }, timeoutMs);
      try {
        off = ctx.on('session/event', (session, event) => {
          if (
            String(session?.id) === String(sessionId) &&
            event?.type === 'user/message'
          ) {
            clearTimeout(timer);
            off();
            resolve(true);
          }
        });
      } catch {
        clearTimeout(timer);
        resolve(false);
      }
    });
  }

  function startConversation(agent, root, slug) {
    if (!agent || typeof agent.followup !== 'function') return false;
    if (hasUserMessage(agent)) return false;
    const piece = readPiece(root, slug);
    if (!piece) return false;
    try {
      agent.followup({
        id: randomUUID(),
        role: 'user',
        content: [{ type: 'text', text: bootstrapPrompt(root, piece) }],
        source: { kind: 'user' },
      });
      return true;
    } catch (error) {
      logWarning(
        `premier message impossible pour ${slug} : ${messageOf(error)}`,
      );
      return false;
    }
  }

  async function ensureSessionRecord(slug) {
    const root = await requireRoot();
    const piece = readPiece(root, slug);
    if (!piece) throw new Error(`La pièce « ${slug} » n'existe pas`);

    const agents = ctx.get?.('agents');
    if (!agents) {
      throw new Error(
        'Le service agents de DSH est indisponible : impossible de créer la session de la pièce.',
      );
    }

    const workspace = await ensureWorkspace(root);
    const existing = piece.session_id;
    if (existing) {
      // A session created outside the workspace order shows up under
      // “Ungrouped”, and a session created without a model fails its first
      // turn. Reuse only a grouped session; otherwise start clean.
      const accounted = workspace?.sessionIds?.includes(existing) ?? true;
      if (accounted) {
        const live = agents.get?.(existing);
        if (live) {
          ensureModel(live);
          bindings.set(String(existing), slug);
          return {
            sessionId: String(existing),
            agent: live,
            created: false,
            root,
            workspaceId: workspace?.id,
          };
        }
        try {
          const handle = await agents.resume({
            resumeSessionId: existing,
            agentOptions: selection(),
            setup: setupFor(root, slug),
          });
          handles.set(slug, handle);
          const resumed = agents.get?.(existing) ?? handle.agent;
          ensureModel(resumed);
          bindings.set(String(existing), slug);
          return {
            sessionId: String(existing),
            agent: resumed,
            created: false,
            root,
            workspaceId: workspace?.id,
          };
        } catch (error) {
          logWarning(
            `reprise de la session ${existing} impossible (${messageOf(error)}), création d’une nouvelle session`,
          );
        }
      } else {
        logWarning(
          `session ${existing} non rattachée à l'espace de travail, création d'une nouvelle session`,
        );
        await archiveSession(existing);
      }
    }

    const sessionId = randomUUID();
    const handle = await agents.create({
      sessionId,
      meta: {
        cwd: root,
        ...(settings.agentPreset ? { agentPreset: settings.agentPreset } : {}),
      },
      agentOptions: selection(),
      setup: setupFor(root, slug),
    });
    handles.set(slug, handle);
    bindings.set(sessionId, slug);
    updatePiece(root, slug, { session_id: sessionId });
    if (workspace?.attachSession) {
      try {
        await workspace.attachSession(sessionId);
      } catch (error) {
        logWarning(`session ${sessionId} non rattachée : ${messageOf(error)}`);
      }
    }
    return {
      sessionId,
      agent: agents.get?.(sessionId) ?? handle.agent,
      created: true,
      root,
      workspaceId: workspace?.id,
    };
  }

  function ensureSession(slug) {
    const inFlight = sessionLocks.get(slug);
    if (inFlight) return inFlight;
    const attempt = ensureSessionRecord(slug).finally(() => {
      sessionLocks.delete(slug);
    });
    sessionLocks.set(slug, attempt);
    return attempt;
  }

  function slugForSession(sessionId) {
    if (!sessionId) return null;
    const key = String(sessionId);
    if (bindings.has(key)) return bindings.get(key);
    try {
      const root = rootCache;
      if (!root) return null;
      for (const piece of listPiecesOnDisk(root)) {
        if (String(piece.session_id) === key) {
          bindings.set(key, piece.slug);
          return piece.slug;
        }
      }
    } catch {
      // A root that is not ready yet simply has no binding.
    }
    return null;
  }

  async function parentFor(slug) {
    const root = await requireRoot();
    const piece = readPiece(root, slug);
    const agents = ctx.get?.('agents');
    if (!agents) {
      throw new Error('Le service agents de DSH est indisponible.');
    }

    if (piece?.session_id) {
      const live = agents.get?.(piece.session_id);
      if (live) return live;
    }

    const workingDirectory = ctx.get?.('workingDirectory');
    const liveAgents = agents.list?.() ?? [];
    const inWorkspace = liveAgents.find((agent) => {
      try {
        return workingDirectory?.get?.(agent.session) === root;
      } catch {
        return false;
      }
    });
    const chosen = inWorkspace ?? liveAgents[liveAgents.length - 1];
    if (!chosen) {
      throw new Error(
        'Ouvrez la discussion de la pièce avant de lancer une étape.',
      );
    }
    return chosen;
  }

  function specialistRunner({ parent, subagents, timeout, root }) {
    return async (job) => {
      const activation = await subagents.startActivation({
        provider: 'spawn',
        label: `${job.stageId} · ${job.role}`,
        ...(settings.agentPreset ? { agentPreset: settings.agentPreset } : {}),
        cwd: root,
        prompt: [{ type: 'text', text: job.prompt }],
        parent,
        signal: timeout.signal,
        delivery: 'caller',
      });

      try {
        const result = await awaitActivation(activation, timeout.signal);
        return {
          sessionId: String(activation.childId),
          text: textOfBlocks(result.output),
          structured: result.structured,
        };
      } finally {
        await disposeActivation(activation, timeout.signal);
      }
    };
  }

  async function runStageForAgent({ slug, stageId, agent, signal, onEvent }) {
    const root = await requireRoot();
    const parent = agent ?? (await parentFor(slug));
    const subagents = ctx.get?.('subagents');
    if (!subagents) {
      throw new Error(
        'Le service subagents de DSH est indisponible : impossible de lancer un spécialiste.',
      );
    }
    const timeout = timeoutSignal(
      signal ?? new AbortController().signal,
      settings.stageTimeoutMinutes,
    );

    try {
      return await runStage({
        root,
        slug,
        stageId,
        onEvent,
        runAgent: specialistRunner({ parent, subagents, timeout, root }),
      });
    } finally {
      timeout.clear();
    }
  }

  async function runFixesForAgent({ slug, agent, signal }) {
    const root = await requireRoot();
    const parent = agent ?? (await parentFor(slug));
    const subagents = ctx.get?.('subagents');
    if (!subagents) {
      throw new Error(
        'Le service subagents de DSH est indisponible : impossible de lancer le fixeur.',
      );
    }
    const timeout = timeoutSignal(
      signal ?? new AbortController().signal,
      settings.stageTimeoutMinutes,
    );

    try {
      return await runFix({
        root,
        slug,
        runAgent: specialistRunner({ parent, subagents, timeout, root }),
      });
    } finally {
      timeout.clear();
    }
  }

  async function runIllustrationForAgent({ slug, agent, request, signal }) {
    const root = await requireRoot();
    const parent = agent ?? (await parentFor(slug));
    const subagents = ctx.get?.('subagents');
    if (!subagents) {
      throw new Error(
        'Le service subagents de DSH est indisponible : impossible de lancer l’illustrateur.',
      );
    }
    const timeout = timeoutSignal(
      signal ?? new AbortController().signal,
      settings.stageTimeoutMinutes,
    );

    try {
      return await runIllustration({
        root,
        slug,
        request,
        runAgent: specialistRunner({ parent, subagents, timeout, root }),
      });
    } finally {
      timeout.clear();
    }
  }

  async function publishForAgent({ slug, confirm, signal }) {
    const root = await requireRoot();
    const script = path.join(root, 'scripts', 'publish-article.mjs');
    if (!fs.existsSync(script)) {
      throw new Error('scripts/publish-article.mjs est introuvable.');
    }

    const args = [script, slug, confirm === true ? '--publish' : '--check'];
    return await new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(abortError());
        return;
      }

      const child = spawn(process.execPath, args, {
        cwd: root,
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let stdout = '';
      let stderr = '';
      let settled = false;

      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        callback(value);
      };
      const onAbort = () => {
        child.kill('SIGKILL');
        finish(reject, abortError());
      };
      const timer = setTimeout(
        () => {
          child.kill('SIGKILL');
          finish(reject, new Error('Publication : délai dépassé (30 min).'));
        },
        30 * 60 * 1000,
      );

      signal?.addEventListener('abort', onAbort, { once: true });
      child.stdout.on('data', (chunk) => {
        stdout += chunk;
      });
      child.stderr.on('data', (chunk) => {
        stderr += chunk;
      });
      child.on('error', (error) => finish(reject, error));
      child.on('close', (code) => {
        const full = `${stdout}${stderr}`.trim();
        const text =
          full.length > 16000
            ? `… (sortie tronquée)\n${full.slice(-16000)}`
            : full;
        if (code === 0) {
          finish(resolve, text);
        } else {
          finish(
            reject,
            new Error(text || `Publication échouée (code ${code}).`),
          );
        }
      });
    });
  }

  async function autoStatus(root, slug, stageId) {
    const piece = readPiece(root, slug);
    if (!piece) return;
    if (stageId === 'brief' && piece.status === 'new') {
      setStatusOnDisk(root, slug, 'briefed', 'étape brief');
      return;
    }
    if (
      stageId === 'draft' &&
      ['new', 'briefed', 'approved'].includes(piece.status)
    ) {
      setStatusOnDisk(root, slug, 'drafted', 'étape brouillon');
      return;
    }
    if (stageId === 'style' && piece.status === 'drafted') {
      setStatusOnDisk(root, slug, 'reviewed', 'relecture de style');
    }
  }

  async function executeRun(run) {
    try {
      const result = await runStageForAgent({
        slug: run.slug,
        stageId: run.stage,
        agent: run.agent,
        signal: run.controller.signal,
        onEvent: (event) => {
          if (event?.type === 'role' || event?.message) {
            run.events.push(String(event.message ?? event.type));
          }
        },
      });
      run.status = 'done';
      run.result = stageSummary(result);
      run.ended_at = nowIso();
      await autoStatus(run.root, run.slug, run.stage);
    } catch (error) {
      const cancelled = run.controller.signal.aborted;
      run.status = cancelled ? 'cancelled' : 'error';
      run.error = cancelled ? 'Étape annulée.' : messageOf(error);
      run.ended_at = nowIso();
    } finally {
      activeRuns.delete(run.slug);
    }
  }

  const api = {
    settings,
    async root() {
      return requireRoot();
    },
    async health() {
      const root = await resolveRoot();
      const ready = workspaceReady(root);
      const workspaceId = ready ? (await ensureWorkspace(root))?.id : undefined;
      const bookmark = ready
        ? await bookmarkStatus(root)
        : { available: false, error: 'workspace introuvable' };
      let pieces = 0;
      let instructions = { agent: false, roles: 0, style: false };
      if (ready) {
        pieces = listPiecesOnDisk(root).length;
        const docs = listInstructions(root);
        instructions = {
          agent: docs.some((doc) => doc.id === 'agent'),
          roles: docs.filter((doc) => doc.id.startsWith('role-')).length,
          style: docs.some((doc) => doc.id === 'style-card'),
        };
      }
      return {
        ok: ready,
        root,
        workspaceId,
        workspaceReady: ready,
        instructions,
        bookmark,
        pieces,
        model: selection() ?? null,
        stages: Object.entries(STAGES).map(([id, stage]) => ({
          id,
          label: stage.label,
          roles: stage.roles,
        })),
      };
    },
    async listPieces() {
      const root = await requireRoot();
      return listPiecesOnDisk(root).map(summarizePiece);
    },
    async getPiece(slug) {
      const root = await requireRoot();
      await ensureWorkspace(root);
      const piece = readPiece(root, slug);
      if (!piece) throw new Error(`La pièce « ${slug} » n'existe pas`);
      const sources = listSourceMetas(root).filter((source) =>
        piece.sources.includes(source.bd_id),
      );
      const sessionId = piece.session_id ?? null;
      const runId = activeRuns.get(slug);
      return {
        piece: summarizePiece(piece),
        sources,
        stages: stageStatus(root, slug),
        artifacts: listArtifacts(root, slug),
        session: {
          id: sessionId,
          live: Boolean(sessionId && ctx.get?.('agents')?.get?.(sessionId)),
        },
        run: runId ? this.runStatus(runId) : null,
        instructions: {
          agent: 'editorial/agent/desk-agent.md',
          card: 'editorial/style/card.md',
        },
      };
    },
    async createPiece({ title, slug, intent, sourceIds = [] }) {
      const root = await requireRoot();
      const ids = [...new Set(sourceIds.map(Number).filter(Number.isFinite))];
      const wanted = String(title ?? '').trim();
      const wantedIntent = String(intent ?? '').trim();
      if (!wanted && !wantedIntent) {
        throw new Error('Indiquez un titre ou une intention.');
      }

      if (ids.length) {
        const reader = await openBookmarkReader({
          root,
          bookmarkRoot: settings.bookmarkRoot,
          bookmarkDb: settings.bookmarkDb,
          bookmarkApi: settings.bookmarkApi,
        });
        try {
          for (const id of ids) await snapshotSource(root, reader, id);
        } finally {
          reader.close();
        }
      }

      // The intent is prose, not a filename. Without a title, use a short
      // dated slug and keep a readable excerpt as the piece title.
      const fallbackSlug = `piece-${new Date().toISOString().slice(0, 10)}`;
      const finalSlug = uniqueSlug(root, slug || wanted || fallbackSlug);
      const displayTitle = wanted || truncate(wantedIntent, 80) || finalSlug;
      const piece = createPieceOnDisk(root, {
        slug: finalSlug,
        title: displayTitle,
        intent: wantedIntent,
        sources: ids,
      });
      return summarizePiece(piece);
    },
    async archivePiece(slug) {
      const root = await requireRoot();
      const handle = handles.get(slug);
      if (handle) {
        handles.delete(slug);
        await handle.dispose().catch(() => {});
      }
      if (bindings.size) {
        for (const [sessionId, bound] of [...bindings]) {
          if (bound === slug) bindings.delete(sessionId);
        }
      }
      return { archived: archivePieceOnDisk(root, slug) };
    },
    async setStatus(slug, status) {
      const root = await requireRoot();
      return summarizePiece(setStatusOnDisk(root, slug, status));
    },
    async writeAngle(slug, text) {
      const root = await requireRoot();
      return writeAngleOnDisk(root, slug, text);
    },
    async inbox({ q = '', limit = 30 } = {}) {
      const root = await requireRoot();
      const capped = clampInt(limit, 30, 1, 100);
      let reader;
      try {
        reader = await openBookmarkReader({
          root,
          bookmarkRoot: settings.bookmarkRoot,
          bookmarkDb: settings.bookmarkDb,
          bookmarkApi: settings.bookmarkApi,
        });
        const articles = await reader.list({
          limit: capped,
          search: q || null,
        });
        const used = await usedByMap(root);
        return {
          available: true,
          via: reader.via,
          articles: articles.map((article) => ({
            id: article.id,
            title: article.title,
            url: article.url,
            site: article.site_name,
            author: article.author,
            language: article.language,
            published_at: article.published_at,
            captured_at: article.created_at,
            word_count: article.word_count,
            excerpt: article.excerpt,
            coverage: assessCoverage(article),
            used_by: used.get(Number(article.id)) ?? [],
          })),
        };
      } catch (error) {
        return { available: false, error: messageOf(error), articles: [] };
      } finally {
        reader?.close();
      }
    },
    async snapshotSources(ids) {
      const root = await requireRoot();
      const numeric = [...new Set(ids.map(Number).filter(Number.isFinite))];
      const reader = await openBookmarkReader({
        root,
        bookmarkRoot: settings.bookmarkRoot,
        bookmarkDb: settings.bookmarkDb,
        bookmarkApi: settings.bookmarkApi,
      });
      try {
        const metas = [];
        for (const id of numeric)
          metas.push(await snapshotSource(root, reader, id));
        return metas;
      } finally {
        reader.close();
      }
    },
    async source(id) {
      const root = await requireRoot();
      const meta = readSourceMeta(root, id);
      if (!meta) throw new Error(`La source ${id} n'est pas capturée.`);
      const text = readSourceText(root, id) ?? '';
      return { ...meta, text };
    },
    async sourceList() {
      const root = await requireRoot();
      return listSourceMetas(root);
    },
    async artifact(slug, name) {
      const root = await requireRoot();
      return readArtifact(root, slug, name);
    },
    async artifactList(slug) {
      const root = await requireRoot();
      return listArtifacts(root, slug);
    },
    async artifactInfo(slug, name) {
      const root = await requireRoot();
      return artifactInfo(root, slug, name);
    },
    async checks(slug) {
      const root = await requireRoot();
      const relative = draftFile(root, slug);
      if (!relative) {
        throw new Error(`Le brouillon de « ${slug} » n'existe pas encore.`);
      }
      const raw = readText(path.join(root, relative), '');
      const style = checkStyle(raw);
      const lint = lintText(raw, { file: relative });
      const errors = lint.findings.filter(
        (finding) => finding.severity === 'error',
      ).length;
      const warnings = lint.findings.length - errors;
      return {
        draft: relative,
        draftTrue: hasDraftTrue(raw),
        style,
        lint,
        summary: {
          errors,
          warnings,
          overBudget: style.metrics.filter((metric) => metric.over).length,
          words: style.words,
        },
      };
    },
    async related(query, { exclude = '', limit = 5 } = {}) {
      const root = await requireRoot();
      return rankRelated(root, String(query ?? ''), {
        limit: clampInt(limit, 5, 1, 10),
        exclude: exclude ? [exclude] : [],
      });
    },
    async instructions() {
      const root = await requireRoot();
      return listInstructions(root);
    },
    async instruction(id) {
      const root = await requireRoot();
      return readInstruction(root, id);
    },
    async openSession(slug) {
      const record = await ensureSession(slug);
      const agent =
        record.agent ?? ctx.get?.('agents')?.get?.(record.sessionId);
      const started = agent
        ? startConversation(agent, record.root, slug)
        : false;
      if (started) await waitForUserMessage(record.sessionId);
      return {
        sessionId: record.sessionId,
        live: Boolean(agent),
      };
    },
    slugForSession,
    async runStageForAgent(options) {
      return runStageForAgent(options);
    },
    async runFixesForAgent(options) {
      return runFixesForAgent(options);
    },
    async runIllustrationForAgent(options) {
      return runIllustrationForAgent(options);
    },
    async publishForAgent(options) {
      return publishForAgent(options);
    },
    async startStage(slug, stageId) {
      const root = await requireRoot();
      if (!STAGES[stageId]) {
        throw new Error(
          `Étape inconnue : « ${stageId} » (attendu : ${Object.keys(STAGES).join(', ')})`,
        );
      }
      if (activeRuns.has(slug)) {
        throw new Error('Une étape tourne déjà sur cette pièce.');
      }
      const agent = await parentFor(slug);
      const run = {
        id: randomUUID(),
        slug,
        stage: stageId,
        root,
        agent,
        controller: new AbortController(),
        status: 'running',
        events: [],
        started_at: nowIso(),
        ended_at: null,
        result: null,
        error: null,
      };
      runs.set(run.id, run);
      activeRuns.set(slug, run.id);
      void executeRun(run);
      return this.runStatus(run.id);
    },
    runStatus(id) {
      const run = runs.get(String(id));
      if (!run) throw new Error(`Exécution inconnue : « ${id} »`);
      return {
        id: run.id,
        slug: run.slug,
        stage: run.stage,
        status: run.status,
        events: run.events.slice(0, 50),
        started_at: run.started_at,
        ended_at: run.ended_at,
        result: run.result,
        error: run.error,
      };
    },
    cancelRun(id) {
      const run = runs.get(String(id));
      if (!run) throw new Error(`Exécution inconnue : « ${id} »`);
      if (run.status === 'running' && run.controller) {
        run.controller.abort(abortError());
      }
      return this.runStatus(run.id);
    },
    activeRun(slug) {
      const id = activeRuns.get(slug);
      return id ? this.runStatus(id) : null;
    },
    async skillContent() {
      const root = await requireRoot();
      const roles = Object.entries(ROLES)
        .map(([id, role]) => {
          const body = roleInstruction(root, id);
          return `### ${role.label}\n\nFichier : \`editorial/agent/roles/${role.file}\`\n\n${body}`;
        })
        .join('\n\n');
      return `# Le bureau éditorial

${deskAgentInstruction(root)}

## Rôles du pipeline

${roles}

## Charte de style

${styleCardInstruction(root)}

## Profil de registre

${newsroomProfileInstruction(root)}

## Exemplaires de registre

${exemplarSelection(root) || 'Aucun exemplaire local disponible.'}

## Outils

\`desk_run\`, \`desk_fix\`, \`desk_illustrate\`, \`desk_publish\`, \`desk_angle\`,
\`desk_piece\`, \`desk_sources\`, \`desk_artifact\`, \`desk_check\`, \`desk_instructions\`.`;
    },
    formatStageSummary,
    async dispose() {
      for (const handle of handles.values()) {
        await handle.dispose().catch(() => {});
      }
      handles.clear();
      bindings.clear();
      runs.clear();
      activeRuns.clear();
    },
  };

  return api;
}

export { ARTIFACT_NAMES, DEFAULT_SETTINGS, normalizeSettings };
