import fs from 'node:fs';
import path from 'node:path';

import { BOOKMARK_API, BOOKMARK_DB, BOOKMARK_ROOT } from './paths.mjs';
import { readJson, toSqlDate } from './store.mjs';

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

/**
 * Ouvre la base en lecture seule. `node:sqlite` n'existe pas sur toutes les
 * versions de Node supportées par le site : dans ce cas on retombe sur l'API
 * REST du backend, qui doit alors tourner.
 */
async function openSqlite() {
  if (!fs.existsSync(BOOKMARK_DB)) return null;
  try {
    const { DatabaseSync } = await import('node:sqlite');
    const db = new DatabaseSync(BOOKMARK_DB, { readOnly: true });
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
    let articles = json.data.articles;
    if (since) {
      const cutoff = toSqlDate(since);
      articles = articles.filter((article) => article.created_at >= cutoff);
    }
    return articles.slice(0, limit);
  }

  async get(id) {
    const json = await this.request(`/api/articles/${id}`);
    return json.article ?? null;
  }

  close() {}
}

export async function openBookmarkReader() {
  const db = await openSqlite();
  if (db) return new SqliteReader(db);

  const apiKey = readJson(path.join(BOOKMARK_ROOT, 'config.json'))?.apiKey;
  if (!apiKey) {
    throw new Error(
      `Base introuvable (${BOOKMARK_DB}) et clé API absente de ${BOOKMARK_ROOT}/config.json`,
    );
  }
  return new ApiReader(BOOKMARK_API, apiKey);
}
