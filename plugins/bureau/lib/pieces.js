import fs from 'node:fs';
import path from 'node:path';

import {
  ensureDir,
  exists,
  hashFile,
  nowIso,
  readJson,
  readText,
  slugify,
  writeJson,
  writeText,
} from './store.js';

export const STATUSES = [
  'new',
  'briefed',
  'approved',
  'drafted',
  'reviewed',
  'published',
];

export const ARTIFACTS = {
  angle: { label: 'Angle', file: 'angle.md' },
  research: { label: 'Recherche', file: 'research.md' },
  brief: { label: 'Brief', file: 'brief.md' },
  package: { label: 'Paquet', file: 'package.md' },
  relecture: { label: 'Relecture de style', file: 'relecture-style.md' },
  fixes: { label: 'Corrections', file: 'fixes.md' },
  draft: { label: 'Brouillon' },
};

export function editorialDir(root) {
  return path.join(root, 'editorial');
}

export function piecesDir(root) {
  return path.join(editorialDir(root), 'pieces');
}

export function pieceDir(root, slug) {
  return path.join(piecesDir(root), slug);
}

export function pieceFile(root, slug) {
  return path.join(pieceDir(root, slug), 'piece.json');
}

export function contentDir(root) {
  return path.join(root, 'src', 'content', 'blog');
}

/** The draft lives in the blog source tree, not in the desk. */
export function draftFile(root, slug) {
  for (const extension of ['mdx', 'md']) {
    const relative = `src/content/blog/${slug}.${extension}`;
    if (exists(path.join(root, relative))) return relative;
  }
  return null;
}

export function draftPath(root, slug) {
  const relative = draftFile(root, slug) ?? `src/content/blog/${slug}.mdx`;
  return path.join(root, relative);
}

export function readPiece(root, slug) {
  if (!slug || slugify(slug) !== slug) return null;
  const file = pieceFile(root, slug);
  const piece = readJson(file);
  if (!piece) return null;

  // Pieces created before a field existed are normalized on read rather than
  // migrated on disk.
  if (piece.mode !== 'article') piece.mode = 'article';
  if (piece.session_id === undefined) piece.session_id = null;
  if (piece.intent === undefined) {
    const intentFile = path.join(pieceDir(root, slug), 'intent.md');
    piece.intent = exists(intentFile) ? readText(intentFile, '').trim() : '';
  }

  return piece;
}

export function listPieces(root) {
  const dir = piecesDir(root);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readPiece(root, entry.name))
    .filter(Boolean)
    .sort((a, b) =>
      String(b.updated_at ?? '').localeCompare(String(a.updated_at ?? '')),
    );
}

export function appendLog(root, slug, event) {
  const line = `${JSON.stringify({ at: nowIso(), ...event })}\n`;
  ensureDir(pieceDir(root, slug));
  fs.appendFileSync(path.join(pieceDir(root, slug), 'log.jsonl'), line);
}

/** Long enough for the existing descriptive slugs, short enough for one path segment. */
export const MAX_SLUG_LENGTH = 80;

function capSlug(value, max = MAX_SLUG_LENGTH) {
  if (value.length <= max) return value;
  const cut = value.slice(0, max);
  const lastDash = cut.lastIndexOf('-');
  const trimmed = (lastDash >= 20 ? cut.slice(0, lastDash) : cut).replace(
    /-+$/,
    '',
  );
  return trimmed || value.slice(0, max).replace(/-+$/, '');
}

export function uniqueSlug(root, wanted) {
  const base = capSlug(slugify(wanted)) || `piece-${Date.now()}`;
  let slug = base;
  let index = 2;
  while (exists(pieceFile(root, slug))) {
    const suffix = `-${index}`;
    slug = `${capSlug(base, MAX_SLUG_LENGTH - suffix.length)}${suffix}`;
    index += 1;
  }
  return slug;
}

export function createPiece(root, { slug, title, sources = [], intent = '' }) {
  const finalSlug = uniqueSlug(root, slug || title || intent);
  if (!finalSlug) {
    throw new Error(
      `Slug invalide : « ${slug} » (minuscules, chiffres et tirets uniquement)`,
    );
  }

  const now = nowIso();
  const piece = {
    slug: finalSlug,
    title: String(title ?? '').trim() || finalSlug,
    mode: 'article',
    intent: String(intent ?? '').trim(),
    status: 'new',
    session_id: null,
    sources: [...new Set(sources.map(Number))].sort((a, b) => a - b),
    created_at: now,
    updated_at: now,
  };

  ensureDir(pieceDir(root, finalSlug));
  writeJson(pieceFile(root, finalSlug), piece);
  writeText(path.join(pieceDir(root, finalSlug), 'intent.md'), piece.intent);
  appendLog(root, finalSlug, { event: 'created', sources: piece.sources });

  return piece;
}

export function updatePiece(root, slug, patch) {
  const piece = readPiece(root, slug);
  if (!piece) throw new Error(`La pièce « ${slug} » n'existe pas`);
  const next = { ...piece, ...patch, updated_at: nowIso() };
  writeJson(pieceFile(root, slug), next);
  return next;
}

export function addSources(root, slug, ids) {
  const piece = readPiece(root, slug);
  if (!piece) throw new Error(`La pièce « ${slug} » n'existe pas`);
  piece.sources = [...new Set([...piece.sources, ...ids.map(Number)])].sort(
    (a, b) => a - b,
  );
  piece.updated_at = nowIso();
  writeJson(pieceFile(root, slug), piece);
  appendLog(root, slug, { event: 'sources-added', sources: ids.map(Number) });
  return piece;
}

export function setStatus(root, slug, status, note = '') {
  if (!STATUSES.includes(status)) {
    throw new Error(
      `Statut inconnu : « ${status} » (attendu : ${STATUSES.join(', ')})`,
    );
  }
  const piece = readPiece(root, slug);
  if (!piece) throw new Error(`La pièce « ${slug} » n'existe pas`);
  const previous = piece.status;
  piece.status = status;
  piece.updated_at = nowIso();
  writeJson(pieceFile(root, slug), piece);
  appendLog(root, slug, { event: 'status', from: previous, to: status, note });
  return piece;
}

/** Move one piece out of the app without destroying its files. */
export function archivePiece(root, slug) {
  if (!slug || slugify(slug) !== slug) {
    throw new Error(`Slug invalide : « ${slug} »`);
  }
  const source = pieceDir(root, slug);
  if (!exists(source)) throw new Error(`La pièce « ${slug} » n'existe pas`);

  const archiveDir = path.join(editorialDir(root), 'archive');
  ensureDir(archiveDir);

  let target = path.join(archiveDir, slug);
  if (exists(target)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    target = path.join(archiveDir, `${slug}-${stamp}`);
  }

  fs.renameSync(source, target);
  return path.relative(editorialDir(root), target);
}

export function writeAngle(root, slug, text) {
  const piece = readPiece(root, slug);
  if (!piece) throw new Error(`La pièce « ${slug} » n'existe pas`);
  const value = String(text ?? '').trim();
  if (!value) throw new Error("L'angle ne peut pas être vide.");
  writeText(path.join(pieceDir(root, slug), 'angle.md'), value);
  appendLog(root, slug, { event: 'angle', chars: value.length });
  updatePiece(root, slug, {});
  return { slug, text: value };
}

export function artifactInfo(root, slug, name) {
  const definition = ARTIFACTS[name];
  if (!definition) throw new Error(`Artefact inconnu : « ${name} »`);

  if (name === 'draft') {
    const relative = draftFile(root, slug);
    const file = relative ? path.join(root, relative) : draftPath(root, slug);
    return describe(file, relative ?? `src/content/blog/${slug}.mdx`, name);
  }

  const relative = `editorial/pieces/${slug}/${definition.file}`;
  return describe(path.join(root, relative), relative, name);
}

function describe(file, relative, name) {
  const present = exists(file);
  return {
    name,
    label: ARTIFACTS[name].label,
    path: relative,
    exists: present,
    size: present ? fileSize(file) : 0,
    mtime: present ? fileMtime(file) : null,
    hash: present && name === 'draft' ? hashFile(file) : null,
  };
}

function fileSize(file) {
  try {
    return fs.statSync(file).size;
  } catch {
    return 0;
  }
}

function fileMtime(file) {
  try {
    return fs.statSync(file).mtime.toISOString();
  } catch {
    return null;
  }
}

export function listArtifacts(root, slug) {
  return Object.keys(ARTIFACTS).map((name) => artifactInfo(root, slug, name));
}

export function readArtifact(root, slug, name) {
  const info = artifactInfo(root, slug, name);
  const text = info.exists ? readText(path.join(root, info.path), '') : '';
  return { ...info, text };
}

export function pieceUsesSource(root, sourceId) {
  return listPieces(root).filter((piece) =>
    piece.sources.includes(Number(sourceId)),
  );
}
