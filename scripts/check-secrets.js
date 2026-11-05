#!/usr/bin/env node

// Refuse les secrets dans les fichiers suivis par git.
// Volontairement simple : pas de dépendance, pas d'appel réseau, exécutable en CI.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const PATTERNS = [
  {
    name: 'clé API de fournisseur',
    pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/,
  },
  {
    name: 'clé API affectée dans un fichier',
    pattern:
      /\b(?:DEEPSEEK|OPENAI|ANTHROPIC|MISTRAL|GOOGLE|GEMINI|GROQ|TOGETHER)_API_KEY\s*=\s*["']?[A-Za-z0-9_-]{20,}/,
  },
  {
    name: 'en-tête x-api-key avec valeur',
    pattern: /x-api-key["']?\s*[:=]\s*["'][A-Za-z0-9_-]{16,}["']/i,
  },
  {
    name: 'clé privée',
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  },
];

const SKIP = new Set(['scripts/check-secrets.js', 'package-lock.json']);

const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);

let found = 0;

for (const file of files) {
  if (
    SKIP.has(file) ||
    file.startsWith('node_modules/') ||
    file.startsWith('dist/')
  ) {
    continue;
  }

  let content;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  // Fichier binaire : on ne cherche pas de motif dedans.
  if (content.includes('\0')) continue;

  const lines = content.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    for (const { name, pattern } of PATTERNS) {
      const match = pattern.exec(lines[index]);
      if (!match) continue;

      found += 1;
      const redacted = `${match[0].slice(0, 5)}…`;
      console.error(`${file}:${index + 1} — ${name} (${redacted})`);
    }
  }
}

if (found) {
  console.error(`\n${found} secret(s) potentiel(s) dans des fichiers suivis.`);
  console.error(
    'Retirez-les, rotationnez la clé, et purgez l’historique si nécessaire.',
  );
  process.exit(1);
}

console.log('Aucun secret détecté dans les fichiers suivis.');
