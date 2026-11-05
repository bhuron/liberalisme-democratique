import fs from 'node:fs';
import path from 'node:path';

import { EDITORIAL_DIR, PIECES_DIR } from './paths.mjs';
import { nowIso, readJson, slugify, writeJson, writeText } from './store.mjs';

export const STATUSES = [
  'new',
  'briefed',
  'approved',
  'drafted',
  'reviewed',
  'published',
];

export function pieceDir(slug) {
  return path.join(PIECES_DIR, slug);
}

export function pieceFile(slug) {
  return path.join(pieceDir(slug), 'piece.json');
}

/**
 * Retire une pièce de l'application sans détruire ses fichiers : elle part dans
 * editorial/archive/. Le brouillon dans src/content/blog/ n'est pas touché.
 */
export function archivePiece(slug) {
  if (!slug || slugify(slug) !== slug) {
    throw new Error(`Slug invalide : « ${slug} »`);
  }

  const source = pieceDir(slug);
  if (!fs.existsSync(source)) {
    throw new Error(`La pièce « ${slug} » n'existe pas`);
  }

  const archiveDir = path.join(EDITORIAL_DIR, 'archive');
  fs.mkdirSync(archiveDir, { recursive: true });

  let target = path.join(archiveDir, slug);
  if (fs.existsSync(target)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    target = path.join(archiveDir, `${slug}-${stamp}`);
  }

  fs.renameSync(source, target);
  return path.relative(EDITORIAL_DIR, target);
}

export function readPiece(slug) {
  const piece = readJson(pieceFile(slug));
  if (!piece) return null;

  // Pièces créées avant l'ajout du mode et de l'intention : on normalise à la
  // lecture plutôt que de migrer les fichiers.
  if (piece.mode !== 'article') piece.mode = 'article';
  if (piece.session_id === undefined) piece.session_id = null;
  if (piece.intent === undefined) {
    const intentFile = path.join(pieceDir(slug), 'intent.md');
    piece.intent = fs.existsSync(intentFile)
      ? fs.readFileSync(intentFile, 'utf8').trim()
      : '';
  }

  return piece;
}

export function listPieces() {
  if (!fs.existsSync(PIECES_DIR)) return [];
  return fs
    .readdirSync(PIECES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readPiece(entry.name))
    .filter(Boolean)
    .sort((a, b) =>
      String(b.updated_at ?? '').localeCompare(String(a.updated_at ?? '')),
    );
}

export function appendLog(slug, event) {
  const line = `${JSON.stringify({ at: nowIso(), ...event })}\n`;
  fs.appendFileSync(path.join(pieceDir(slug), 'log.jsonl'), line);
}

export function createPiece({ slug, title, sources = [], intent = '' }) {
  if (!slug || slugify(slug) !== slug) {
    throw new Error(
      `Slug invalide : « ${slug} » (minuscules, chiffres et tirets uniquement)`,
    );
  }
  if (fs.existsSync(pieceFile(slug))) {
    throw new Error(`La pièce « ${slug} » existe déjà`);
  }

  const now = nowIso();
  const piece = {
    slug,
    title,
    mode: 'article',
    intent,
    status: 'new',
    session_id: null,
    sources: [...new Set(sources.map(Number))],
    created_at: now,
    updated_at: now,
  };

  writeJson(pieceFile(slug), piece);
  writeText(path.join(pieceDir(slug), 'intent.md'), intent);
  appendLog(slug, { event: 'created', sources: piece.sources });

  return piece;
}

export function updatePiece(slug, patch) {
  const piece = readPiece(slug);
  if (!piece) throw new Error(`La pièce « ${slug} » n'existe pas`);

  const next = { ...piece, ...patch, updated_at: nowIso() };
  writeJson(pieceFile(slug), next);
  return next;
}

export function addSources(slug, ids) {
  const piece = readPiece(slug);
  if (!piece) throw new Error(`La pièce « ${slug} » n'existe pas`);

  piece.sources = [...new Set([...piece.sources, ...ids.map(Number)])].sort(
    (a, b) => a - b,
  );
  piece.updated_at = nowIso();

  writeJson(pieceFile(slug), piece);
  appendLog(slug, { event: 'sources-added', sources: ids.map(Number) });

  return piece;
}

export function setStatus(slug, status, note = '') {
  if (!STATUSES.includes(status)) {
    throw new Error(
      `Statut inconnu : « ${status} » (attendu : ${STATUSES.join(', ')})`,
    );
  }
  const piece = readPiece(slug);
  if (!piece) throw new Error(`La pièce « ${slug} » n'existe pas`);

  const previous = piece.status;
  piece.status = status;
  piece.updated_at = nowIso();

  writeJson(pieceFile(slug), piece);
  appendLog(slug, { event: 'status', from: previous, to: status, note });

  return piece;
}
