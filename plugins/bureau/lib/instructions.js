import fs from 'node:fs';
import path from 'node:path';

import { readText } from './store.js';

/**
 * The instruction files are the one deliberate dependency on the blog
 * repository. The plugin reads them at run time; it does not copy or import
 * application code, so editing a role or the style card changes the desk on the
 * next message and after an HMR reload.
 */

export const ROLE_FILES = {
  documentaliste: 'documentaliste.md',
  strategist: 'strategist.md',
  redacteur: 'redacteur.md',
  'relecture-style': 'relecture-style.md',
  fixeur: 'fixeur.md',
  illustrateur: 'illustrateur.md',
  editeur: 'editeur.md',
};

export const INSTRUCTION_DOCS = [
  {
    id: 'agent',
    title: 'Agent du bureau',
    group: 'Fonctionnement',
    path: 'editorial/agent/desk-agent.md',
  },
  ...Object.entries(ROLE_FILES).map(([roleId, file]) => ({
    id: `role-${roleId}`,
    title: `Rôle · ${roleId}`,
    group: 'Rôles du pipeline',
    path: `editorial/agent/roles/${file}`,
  })),
  {
    id: 'style-card',
    title: 'Charte de style',
    group: 'Charte',
    path: 'editorial/style/card.md',
  },
  {
    id: 'style-newsroom',
    title: 'Profil de registre',
    group: 'Charte',
    path: 'editorial/style/newsroom-profile.md',
  },
  {
    id: 'style-exemplars',
    title: 'Exemplaires de registre',
    group: 'Charte',
    path: 'editorial/style/corpus/newsroom-exemplars.md',
  },
  {
    id: 'desk-readme',
    title: 'Le desk éditorial',
    group: 'Documentation',
    path: 'editorial/README.md',
  },
];

export function instructionFile(root, id) {
  const doc = INSTRUCTION_DOCS.find((entry) => entry.id === id);
  if (!doc) throw new Error(`Instruction inconnue : « ${id} »`);
  return path.join(root, doc.path);
}

export function readInstruction(root, id) {
  const doc = INSTRUCTION_DOCS.find((entry) => entry.id === id);
  if (!doc) throw new Error(`Instruction inconnue : « ${id} »`);
  const text = readText(path.join(root, doc.path), null);
  return {
    ...doc,
    exists: text !== null,
    text: text ?? '',
    mtime: fileMtime(path.join(root, doc.path)),
  };
}

export function listInstructions(root) {
  return INSTRUCTION_DOCS.map((doc) => {
    const file = path.join(root, doc.path);
    const text = readText(file, null);
    return {
      ...doc,
      title: titleOf(text) ?? doc.title,
      exists: text !== null,
      mtime: fileMtime(file),
    };
  }).filter((doc) => doc.exists);
}

export function roleInstruction(root, roleId) {
  const file = ROLE_FILES[roleId];
  if (!file) throw new Error(`Rôle inconnu : « ${roleId} »`);
  const text = readText(
    path.join(root, 'editorial', 'agent', 'roles', file),
    null,
  );
  if (text === null) {
    throw new Error(`Instruction du rôle « ${roleId} » introuvable.`);
  }
  return text;
}

export function deskAgentInstruction(root) {
  const text = readText(
    path.join(root, 'editorial', 'agent', 'desk-agent.md'),
    null,
  );
  if (text === null) {
    throw new Error(
      'Le fichier editorial/agent/desk-agent.md est introuvable dans ce workspace.',
    );
  }
  return text;
}

export function styleCardInstruction(root) {
  return readText(path.join(root, 'editorial', 'style', 'card.md'), '');
}

export function newsroomProfileInstruction(root) {
  return readText(
    path.join(root, 'editorial', 'style', 'newsroom-profile.md'),
    '',
  );
}

export function newsroomExemplarsInstruction(root) {
  return readText(
    path.join(root, 'editorial', 'style', 'corpus', 'newsroom-exemplars.md'),
    '',
  );
}

/**
 * Select a small, balanced set of exemplar openings: FT/SCMP for news, LMD
 * for analysis. The full corpus stays local; only these short extracts enter a
 * writer prompt.
 */
export function exemplarSelection(root, { news = 3, analysis = 3 } = {}) {
  const text = newsroomExemplarsInstruction(root);
  if (!text) return '';
  const sections = text
    .split(/\n## /)
    .slice(1)
    .map((block) => {
      const newline = block.indexOf('\n');
      const heading =
        newline === -1 ? block.trim() : block.slice(0, newline).trim();
      const body = newline === -1 ? '' : block.slice(newline + 1).trim();
      return { heading, body };
    })
    .filter((section) => section.heading);
  const pick = (pattern, count) =>
    sections.filter((section) => pattern.test(section.heading)).slice(0, count);
  const selected = [
    ...pick(/^(Financial Times|South China Morning Post)\b/, news),
    ...pick(/^Le Monde diplomatique\b/, analysis),
  ];
  if (!selected.length) return '';
  return selected
    .map((section) => `## ${section.heading}\n\n${section.body}`)
    .join('\n\n');
}

function titleOf(text) {
  if (!text) return null;
  const match = /^#\s+(.+)$/m.exec(text);
  return match ? match[1].trim() : null;
}

function fileMtime(file) {
  try {
    return fs.statSync(file).mtime.toISOString();
  } catch {
    return null;
  }
}
