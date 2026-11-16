import fs from 'node:fs';
import path from 'node:path';

import { assessCoverage } from './coverage.js';
import {
  nowIso,
  readJson,
  readText,
  sha256,
  writeJson,
  writeText,
} from './store.js';

export function sourcesDir(root) {
  return path.join(root, 'editorial', 'sources');
}

export function sourceDir(root, id) {
  return path.join(sourcesDir(root), String(id));
}

export function readSourceMeta(root, id) {
  return readJson(path.join(sourceDir(root, id), 'meta.json'));
}

export function listSourceMetas(root) {
  const dir = sourcesDir(root);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readSourceMeta(root, entry.name))
    .filter(Boolean)
    .sort((a, b) => String(b.captured_at).localeCompare(String(a.captured_at)));
}

export function readSourceText(root, id) {
  return readText(path.join(sourceDir(root, id), 'text.txt'), null);
}

/**
 * Freeze one capture into the desk.
 *
 * The desk never re-reads the capture database for a frozen source: if the
 * article disappears from the reading app, the piece keeps its evidence. The
 * hash detects a later re-capture of the same article.
 */
export async function snapshotSource(root, reader, id) {
  const article = await reader.get(id);
  if (!article) {
    throw new Error(`Article ${id} introuvable dans bookmark-digest`);
  }

  const text = String(article.content_text ?? '').trim();
  const coverage = assessCoverage({ ...article, content_text: text });
  const hash = sha256(text);
  const dir = sourceDir(root, article.id);
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
