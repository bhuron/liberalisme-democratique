import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { runOneShot } from './agent.mjs';
import { PIECES_DIR, SITE_ROOT } from './paths.mjs';
import { pieceDir, readPiece } from './pieces.mjs';
import {
  buildPrompt,
  ROLES,
  roleOutput,
  STAGES,
  stageOutputs,
} from './roles.mjs';
import { listSourceMetas } from './sources.mjs';
import { nowIso, readText, writeJson } from './store.mjs';

function exists(relative) {
  return fs.existsSync(path.join(SITE_ROOT, relative));
}

function draftFile(slug) {
  for (const extension of ['mdx', 'md']) {
    const relative = `src/content/blog/${slug}.${extension}`;
    if (exists(relative)) return relative;
  }
  return null;
}

function critiqueFiles(slug) {
  const directory = path.join(PIECES_DIR, slug, 'critiques');
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory)
    .filter((file) => file.endsWith('.md'))
    .map((file) => `editorial/pieces/${slug}/critiques/${file}`);
}

function readiness(piece, stageId) {
  const stage = STAGES[stageId];
  const checks = {
    sources: () => piece.sources.length > 0,
    brief: () => exists(`editorial/pieces/${piece.slug}/brief.md`),
    draft: () => Boolean(draftFile(piece.slug)),
    critique: () =>
      STAGES.critique.roles.every((roleId) =>
        exists(roleOutput(roleId, piece.slug)),
      ),
  };

  const missing = stage.requires.filter(
    (requirement) => !checks[requirement](),
  );
  return { ready: missing.length === 0, missing };
}

function availableArtefacts(piece) {
  const candidates = [
    `editorial/pieces/${piece.slug}/brief.md`,
    `editorial/pieces/${piece.slug}/research.md`,
    `editorial/pieces/${piece.slug}/angle.md`,
    ...critiqueFiles(piece.slug),
  ];

  if (draftFile(piece.slug)) candidates.push(draftFile(piece.slug));

  return candidates.filter(exists);
}

function extractScorecard(text) {
  const lines = String(text ?? '')
    .trim()
    .split('\n')
    .reverse();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{')) continue;
    try {
      const value = JSON.parse(trimmed);
      if (value && typeof value.score === 'number') {
        return {
          role: value.role ?? null,
          score: value.score,
          must_fix: value.must_fix ?? [],
          nice_to_have: value.nice_to_have ?? [],
        };
      }
    } catch {
      // Ligne JSON incomplète : on continue, le rapport reste lisible.
    }
  }

  return null;
}

export function stageStatus(slug) {
  const piece = readPiece(slug);
  if (!piece) throw new Error(`La pièce « ${slug} » n'existe pas`);

  return Object.entries(STAGES).map(([id, stage]) => {
    const outputs = stageOutputs(id, slug);
    const { ready, missing } = readiness(piece, id);

    return {
      id,
      label: stage.label,
      description: stage.description,
      roles: stage.roles,
      parallel: Boolean(stage.parallel),
      outputs,
      done: outputs.every(exists),
      ready,
      missing,
    };
  });
}

/**
 * Exécute une étape du workflow.
 *
 * Chaque rôle tourne dans une session neuve (aucun session_id partagé) : c'est
 * le pattern Agent as Tool. Le desk ne récupère que le fichier produit et un
 * résumé de trois phrases, jamais le raisonnement du spécialiste.
 */
function hashFile(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

export async function runStage({
  slug,
  stageId,
  onEvent,
  runAgent = runOneShot,
  expectedDraftHash = null,
}) {
  const piece = readPiece(slug);
  if (!piece) throw new Error(`La pièce « ${slug} » n'existe pas`);

  const stage = STAGES[stageId];
  if (!stage) {
    throw new Error(
      `Étape inconnue : « ${stageId} » (attendu : ${Object.keys(STAGES).join(', ')})`,
    );
  }

  const check = readiness(piece, stageId);
  if (!check.ready) {
    throw new Error(
      `Étape impossible : il manque ${check.missing.join(', ')}.`,
    );
  }

  const sources = listSourceMetas().filter((source) =>
    piece.sources.includes(source.bd_id),
  );
  const available = availableArtefacts(piece);
  const decision = readText(path.join(pieceDir(slug), 'angle.md'), '');
  const started = nowIso();
  const draftRelative = draftFile(slug);
  const draftPath = path.join(SITE_ROOT, draftRelative);
  const draftHash = stageId === 'critique' ? hashFile(draftPath) : null;

  if (stageId === 'revise' && expectedDraftHash) {
    if (hashFile(draftPath) !== expectedDraftHash) {
      throw new Error(
        'Le brouillon a été modifié depuis la critique. Relance la critique sur la version actuelle.',
      );
    }
  }

  const runRole = async (roleId) => {
    const output = roleOutput(roleId, slug);
    const prompt = buildPrompt({
      piece,
      roleId,
      stageId,
      sources,
      available,
      decision,
    });
    const result = await runAgent({
      prompt,
      role: roleId,
      piece,
      stageId,
      output,
      onEvent: (event) => onEvent?.({ ...event, role: roleId }),
    });

    if (!exists(output)) {
      throw new Error(
        `${ROLES[roleId].label} n'a pas écrit ${output}. Réponse : ${String(
          result.text,
        ).slice(0, 400)}`,
      );
    }

    return {
      role: roleId,
      label: ROLES[roleId].label,
      output,
      session: result.sessionId ?? null,
      text: result.text,
    };
  };

  const results = stage.parallel
    ? await Promise.all(stage.roles.map((roleId) => runRole(roleId)))
    : [await runRole(stage.roles[0])];

  for (const output of stageOutputs(stageId, slug)) {
    if (!exists(output)) throw new Error(`Sortie manquante : ${output}`);
  }

  if (stageId === 'draft' || stageId === 'revise') {
    const raw = fs.readFileSync(draftPath, 'utf8');
    if (!/^---[\s\S]*?draft:\s*true/m.test(raw)) {
      throw new Error('Le brouillon a été écrit sans « draft: true ».');
    }
  }

  const scorecards =
    stageId === 'critique'
      ? results
          .map((result) =>
            extractScorecard(
              fs.readFileSync(path.join(SITE_ROOT, result.output), 'utf8'),
            ),
          )
          .filter(Boolean)
      : [];

  const record = {
    stage: stageId,
    started,
    ended: nowIso(),
    results,
    scorecards,
    ...(draftHash ? { draftHash } : {}),
  };
  writeJson(
    path.join(PIECES_DIR, slug, 'runs', `${stageId}-${Date.now()}.json`),
    record,
  );

  return {
    stage: stageId,
    label: stage.label,
    results,
    outputs: stageOutputs(stageId, slug),
    scorecards,
    draftHash,
  };
}

/**
 * Boucle critique → révision, avec condition d'arrêt (pattern Loop).
 *
 * On s'arrête quand le total des must-fix tombe à zéro, quand les critiques
 * n'ont pas produit de scorecard lisible, ou après maxIterations. Chaque
 * itération relance les trois critiques en parallèle.
 */
export async function runReviewLoop({
  slug,
  maxIterations = 2,
  onEvent,
  runAgent = runOneShot,
}) {
  const history = [];

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    const critique = await runStage({
      slug,
      stageId: 'critique',
      onEvent,
      runAgent,
    });

    const currentDraftHash = hashFile(path.join(SITE_ROOT, draftFile(slug)));
    if (critique.draftHash && currentDraftHash !== critique.draftHash) {
      throw new Error(
        'Le brouillon a été modifié pendant la critique. Relance la critique sur la version actuelle.',
      );
    }

    const mustFix = critique.scorecards.reduce(
      (total, card) => total + card.must_fix.length,
      0,
    );

    history.push({
      iteration,
      mustFix,
      scores: critique.scorecards.map((card) => ({
        role: card.role,
        score: card.score,
        mustFix: card.must_fix.length,
      })),
    });

    if (mustFix === 0 || critique.scorecards.length === 0) break;
    await runStage({
      slug,
      stageId: 'revise',
      onEvent,
      runAgent,
      expectedDraftHash: critique.draftHash,
    });
  }

  writeJson(path.join(PIECES_DIR, slug, 'runs', `loop-${Date.now()}.json`), {
    started: nowIso(),
    history,
  });

  return { history };
}
