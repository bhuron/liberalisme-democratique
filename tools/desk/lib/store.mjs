import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function atomicWrite(file, content) {
  ensureDir(path.dirname(file));
  const tmp = `${file}.${process.pid}.tmp`;
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

export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  // SQLite stocke CURRENT_TIMESTAMP en UTC, sans suffixe de fuseau.
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
    ? `${value.replace(' ', 'T')}Z`
    : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toSqlDate(value) {
  const date = value instanceof Date ? value : toDate(value);
  if (!date) throw new Error(`Date invalide : ${String(value)}`);
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

export function formatDate(value) {
  const date = toDate(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Europe/Paris',
  }).format(date);
}

export function parseSince(value) {
  if (!value) return null;
  const relative = /^(\d+)([dh])$/.exec(value);
  if (relative) {
    const factor = relative[2] === 'd' ? 86_400_000 : 3_600_000;
    return new Date(Date.now() - Number(relative[1]) * factor);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(
      `Fenêtre invalide : « ${value} » (attendu : 7d, 12h ou une date ISO)`,
    );
  }
  return date;
}

export function truncate(text, max = 60) {
  const clean = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}
