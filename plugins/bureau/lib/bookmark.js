import fs from 'node:fs';
import path from 'node:path';

import { readJson, toSqlDate } from './store.js';

/**
 * Read-only access to bookmark-digest, the capture app that feeds the desk.
 *
 * It is a separate program, not a dependency of the plugin: the bureau reads
 * either its SQLite database (when `node:sqlite` is available) or its local REST
 * API. When neither answers, the desk still opens and every other feature
 * works; only the capture inbox is unavailable.
 */

const COLUMNS = [
  'id',
  'url',
  'original_url',
  'title',
  'content_text',
  'content_html',
  'excerpt',
  'author',
  'site_name',
  'published_at',
  'word_count',
  'reading_time_minutes',
  'language',
  'created_at',
  'capture_success',
  'capture_error',
].join(', ');

function ftsQuery(search) {
  return String(search)
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => `"${term.replace(/"/g, '')}"*`)
    .join(' AND ');
}

async function openSqlite(file) {
  if (!fs.existsSync(file)) return null;
  try {
    const { DatabaseSync } = await import('node:sqlite');
    const db = new DatabaseSync(file, { readOnly: true });
    db.prepare('SELECT 1').get();
    return db;
  } catch {
    return null;
  }
}

class SqliteReader {
  constructor(db) {
    this.db = db;
    this.via = 'sqlite';
  }

  async list({ limit = 20, since = null, search = null } = {}) {
    const where = ['deleted_at IS NULL'];
    const params = [];

    if (since) {
      where.push('created_at >= ?');
      params.push(toSqlDate(since));
    }

    if (search) {
      where.push(
        'id IN (SELECT rowid FROM articles_fts WHERE articles_fts MATCH ?)',
      );
      params.push(ftsQuery(search));
    }

    const sql = `SELECT ${COLUMNS} FROM articles
      WHERE ${where.join(' AND ')}
      ORDER BY created_at DESC, id DESC
      LIMIT ?`;

    return this.db.prepare(sql).all(...params, limit);
  }

  async get(id) {
    return (
      this.db.prepare(`SELECT ${COLUMNS} FROM articles WHERE id = ?`).get(id) ??
      null
    );
  }

  close() {
    this.db.close();
  }
}

class ApiReader {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.via = 'api';
  }

  async request(pathname) {
    const response = await fetch(new URL(pathname, this.baseUrl), {
      headers: { 'x-api-key': this.apiKey },
    });
    if (!response.ok) {
      throw new Error(
        `bookmark-digest a répondu ${response.status} sur ${pathname}`,
      );
    }
    return response.json();
  }

  async list({ limit = 20, since = null, search = null } = {}) {
    const url = new URL('/api/articles', this.baseUrl);
    url.searchParams.set('limit', String(limit));
    if (search) url.searchParams.set('search', search);

    const json = await this.request(`${url.pathname}${url.search}`);
    let articles = json?.data?.articles ?? [];
    if (since) {
      const cutoff = toSqlDate(since);
      articles = articles.filter((article) => article.created_at >= cutoff);
    }
    return articles.slice(0, limit);
  }

  async get(id) {
    const json = await this.request(`/api/articles/${id}`);
    return json?.article ?? null;
  }

  close() {}
}

/**
 * Resolve the capture data source for one workspace.
 * @param {object} options - workspace root and optional overrides.
 */
export function bookmarkSettings({
  root,
  bookmarkRoot,
  bookmarkDb,
  bookmarkApi,
}) {
  const resolvedRoot =
    bookmarkRoot ||
    process.env.BOOKMARK_DIGEST_ROOT ||
    path.resolve(root, '../bookmark-digest');
  const resolvedDb =
    bookmarkDb ||
    process.env.BOOKMARK_DIGEST_DB ||
    path.join(resolvedRoot, 'backend/data/bookmark-digest.db');
  const resolvedApi =
    bookmarkApi || process.env.BOOKMARK_DIGEST_API || 'http://localhost:3001';
  return { root: resolvedRoot, db: resolvedDb, api: resolvedApi };
}

export async function openBookmarkReader(options) {
  const settings = bookmarkSettings(options);
  const db = await openSqlite(settings.db);
  if (db) return new SqliteReader(db);

  const apiKey = readJson(path.join(settings.root, 'config.json'))?.apiKey;
  if (!apiKey) {
    throw new Error(
      `Base introuvable (${settings.db}) et clé API absente de ${settings.root}/config.json`,
    );
  }
  return new ApiReader(settings.api, apiKey);
}

export { bookmarkSettings as settingsFor };
