import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

export const SITE_ROOT = path.resolve(HERE, '../../..');
export const EDITORIAL_DIR = path.join(SITE_ROOT, 'editorial');
export const SOURCES_DIR = path.join(EDITORIAL_DIR, 'sources');
export const PIECES_DIR = path.join(EDITORIAL_DIR, 'pieces');
export const STYLE_DIR = path.join(EDITORIAL_DIR, 'style');
export const CONTENT_DIR = path.join(SITE_ROOT, 'src/content/blog');

// bookmark-digest vit dans un dépôt voisin. Les deux variables d'environnement
// permettent de le déplacer sans toucher au code.
export const BOOKMARK_ROOT =
  process.env.BOOKMARK_DIGEST_ROOT ??
  path.resolve(SITE_ROOT, '../bookmark-digest');
export const BOOKMARK_DB =
  process.env.BOOKMARK_DIGEST_DB ??
  path.join(BOOKMARK_ROOT, 'backend/data/bookmark-digest.db');
export const BOOKMARK_API =
  process.env.BOOKMARK_DIGEST_API ?? 'http://localhost:3001';
