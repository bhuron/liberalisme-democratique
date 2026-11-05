import fs from 'node:fs';
import path from 'node:path';

import { assessCoverage } from './coverage.mjs';
import { SOURCES_DIR } from './paths.mjs';
import { nowIso, readJson, sha256, writeJson, writeText } from './store.mjs';

export function sourceDir(id) {
  return path.join(SOURCES_DIR, String(id));
}

export function readSourceMeta(id) {
  return readJson(path.join(sourceDir(id), 'meta.json'));
}

export function listSourceMetas() {
  if (!fs.existsSync(SOURCES_DIR)) return [];
  return fs
    .readdirSync(SOURCES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readSourceMeta(entry.name))
    .filter(Boolean)
    .sort((a, b) => String(b.captured_at).localeCompare(String(a.captured_at)));
}

/**
 * Fige une capture de bookmark-digest dans le desk.
 *
 * Le desk ne relit jamais la base après coup : si l'article est supprimé de
 * l'application de lecture, la pièce garde son evidence. Le hash permet de
 * détecter une nouvelle capture du même article.
 */
export async function snapshotSource(reader, id) {
  const article = await reader.get(id);
  if (!article) {
    throw new Error(`Article ${id} introuvable dans bookmark-digest`);
  }

  const text = String(article.content_text ?? '').trim();
  const coverage = assessCoverage({ ...article, content_text: text });
  const hash = sha256(text);
  const dir = sourceDir(article.id);
  const metaPath = path.join(dir, 'meta.json');
  const previous = readJson(metaPath);

  const meta = {
    bd_id: Number(article.id),
    title: article.title,
    url: article.url,
    original_url: article.original_url ?? null,
    site: article.site_name ?? null,
    author: article.author ?? null,
    language: article.language ?? null,
    published_at: article.published_at ?? null,
    captured_at: article.created_at ?? null,
    word_count: article.word_count ?? coverage.word_count ?? 0,
    reading_time_minutes: article.reading_time_minutes ?? null,
    excerpt: article.excerpt ?? null,
    hash,
    coverage,
    via: reader.via,
    snapshot_at: previous?.snapshot_at ?? nowIso(),
    refreshed_at:
      previous && previous.hash !== hash
        ? nowIso()
        : (previous?.refreshed_at ?? null),
  };

  writeText(path.join(dir, 'text.txt'), text);
  writeJson(metaPath, meta);

  return meta;
}
