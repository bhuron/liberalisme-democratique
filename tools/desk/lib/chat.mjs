import fs from 'node:fs';
import path from 'node:path';

import { SITE_ROOT, SOURCES_DIR } from './paths.mjs';
import { pieceDir } from './pieces.mjs';

export function messagesFile(slug) {
  return path.join(pieceDir(slug), 'chat.jsonl');
}

export function readMessages(slug) {
  const file = messagesFile(slug);
  if (!fs.existsSync(file)) return [];

  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

export function appendMessage(slug, message) {
  fs.appendFileSync(messagesFile(slug), `${JSON.stringify(message)}\n`);
}

/**
 * Premier message d'une pièce : le contexte exact que l'agent a le droit de
 * voir. Rien d'autre du desk n'est inclus, ce qui garantit qu'une nouvelle
 * pièce repart d'un contexte propre.
 */
export function buildBootstrapMessage(piece, metas) {
  const sources = metas
    .map((meta) => {
      const file = path.relative(
        SITE_ROOT,
        path.join(SOURCES_DIR, String(meta.bd_id), 'text.txt'),
      );
      return [
        `- [${meta.bd_id}] ${meta.site ?? 'sans site'} — « ${meta.title} »`,
        `  ${meta.word_count} mots, couverture ${meta.coverage.level}, langue ${meta.language ?? '?'}`,
        `  ${file}`,
        `  ${meta.url}`,
      ].join('\n');
    })
    .join('\n');

  return `Nouvelle pièce éditoriale.

Titre : ${piece.title}
Slug : ${piece.slug}
Intention : ${piece.intent?.trim() || 'à préciser avec l’utilisateur'}

Sources figées (ne lis qu’elles) :
${sources}

Avant de répondre, lis editorial/agent/desk-agent.md et editorial/style/card.md.
Commence par reformuler le sujet et l’angle en une phrase. Si l’utilisateur a
donné l’angle, reprends-le ; sinon, déduis-le de l’article. Pose au maximum deux
questions si quelque chose reste ambigu. Ne propose pas de liste d’angles et ne
rédige pas encore.

Tu pourras faire des recherches après le choix de l’angle. Consigne tout dans
research.md : sources, URL, dates, ce qui est vérifié et ce qui reste à capturer.`;
}
