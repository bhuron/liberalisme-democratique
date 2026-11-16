import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/** Filesystem helpers shared by the bureau. Everything is synchronous: the
 * pieces are small JSON documents and the writes are short. */

export function exists(file) {
  try {
    fs.accessSync(file);
    return true;
  } catch {
    return false;
  }
}

export function isDirectory(file) {
  try {
    return fs.statSync(file).isDirectory();
  } catch {
    return false;
  }
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function atomicWrite(file, content) {
  ensureDir(path.dirname(file));
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, file);
}

export function writeText(file, content) {
  const text = String(content ?? '');
  atomicWrite(file, text.endsWith('\n') ? text : `${text}\n`);
}

export function readText(file, fallback = null) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

export function writeJson(file, value) {
  atomicWrite(file, `${JSON.stringify(value, null, 2)}\n`);
}

export function readJson(file, fallback = null) {
  const raw = readText(file);
  if (raw === null) return fallback;
  return JSON.parse(raw);
}

export function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

export function hashFile(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

export function slugify(text) {
  return String(text ?? '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export function nowIso() {
  return new Date().toISOString();
}

export function toSqlDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Date invalide : ${String(value)}`);
  }
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

export function truncate(text, max = 60) {
  const clean = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

/**
 * Parse the Markdown frontmatter the blog uses. The schema is small, so this
 * avoids pulling a YAML dependency into the plugin: scalars, quoted strings and
 * simple block lists are enough for the content collection.
 */
export function parseFrontmatter(raw) {
  const text = String(raw ?? '');
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!match) return { data: {}, content: text };

  const data = {};
  let currentKey = null;
  for (const line of match[1].split(/\r?\n/)) {
    const item = /^\s+-\s*(.+)\s*$/.exec(line);
    if (item && currentKey) {
      if (!Array.isArray(data[currentKey])) data[currentKey] = [];
      data[currentKey].push(unquote(item[1]));
      continue;
    }
    const entry = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!entry) continue;
    currentKey = entry[1];
    const value = entry[2].trim();
    data[currentKey] = value ? unquote(value) : [];
  }

  return { data, content: text.slice(match[0].length) };
}

function unquote(value) {
  const trimmed = String(value ?? '').trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  return trimmed;
}

/** A draft is only valid for the desk when its frontmatter says `draft: true`. */
export function hasDraftTrue(raw) {
  const { data } = parseFrontmatter(raw);
  return data.draft === true || data.draft === 'true';
}
