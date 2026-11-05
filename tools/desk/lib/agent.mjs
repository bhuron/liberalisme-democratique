import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { SITE_ROOT } from './paths.mjs';
import { pieceDir } from './pieces.mjs';
import { writeText } from './store.mjs';

const AUTH_PATCH = path.join(SITE_ROOT, 'tools/desk/headless-auth.cordis.yml');
const PLUGIN_PATCH = path.join(SITE_ROOT, '.desk', 'desk-plugin.cordis.yml');

function ensurePluginPatch() {
  const plugin = path.join(SITE_ROOT, 'tools/desk/dsh-plugin/index.mjs');
  fs.mkdirSync(path.dirname(PLUGIN_PATCH), { recursive: true });
  fs.writeFileSync(
    PLUGIN_PATCH,
    `- insert:\n    - id: desk-plugin\n      name: ${JSON.stringify(plugin)}\n`,
    'utf8',
  );
  return PLUGIN_PATCH;
}
const TIMEOUT_MS = Number(process.env.DESK_AGENT_TIMEOUT_MS ?? 15 * 60 * 1000);

export function agentMode() {
  return process.env.DESK_AGENT ?? 'dsh';
}

/**
 * Trouve l'exécutable dsh : variable dédiée, PATH, puis cache npx.
 * Le CLI n'est pas installé globalement dans l'installation actuelle.
 */
export function findDsh() {
  if (process.env.DSH_BIN && fs.existsSync(process.env.DSH_BIN)) {
    return process.env.DSH_BIN;
  }

  for (const dir of (process.env.PATH ?? '').split(path.delimiter)) {
    if (!dir) continue;
    const candidate = path.join(dir, 'dsh');
    if (fs.existsSync(candidate)) return candidate;
  }

  const npxRoot = path.join(os.homedir(), '.npm/_npx');
  if (fs.existsSync(npxRoot)) {
    for (const entry of fs.readdirSync(npxRoot).sort().reverse()) {
      const candidate = path.join(npxRoot, entry, 'node_modules/.bin/dsh');
      if (fs.existsSync(candidate)) return candidate;
    }
  }

  return null;
}

function parseStream(stdout) {
  let sessionId = null;
  let text = '';
  let finalText = '';
  let errorMessage = '';
  const tools = [];

  for (const line of stdout.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let event;
    try {
      event = JSON.parse(trimmed);
    } catch {
      continue;
    }

    if (event.type === 'session' && event.sessionId) {
      sessionId = event.sessionId;
    }
    if (event.type === 'text' && event.text) {
      text += event.text;
    }
    if (event.type === 'final' && typeof event.text === 'string') {
      finalText = event.text;
    }
    if (event.type === 'tool_call' && event.name) {
      tools.push(event.name);
    }
    if (event.type === 'error' && event.message) {
      errorMessage = event.message;
    }
  }

  return { sessionId, text: finalText || text, tools, error: errorMessage };
}

function createEventFeed(onEvent) {
  let buffer = '';
  return (chunk) => {
    buffer += chunk;
    let index = buffer.indexOf('\n');
    while (index !== -1) {
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      if (line) {
        try {
          onEvent?.(JSON.parse(line));
        } catch {
          /* ligne partielle ou non JSON */
        }
      }
      index = buffer.indexOf('\n');
    }
  };
}

function runDsh({ prompt, sessionId, onEvent, plugin = false }) {
  const dsh = findDsh();
  if (!dsh) {
    throw new Error(
      'La commande dsh est introuvable. Définissez DSH_BIN ou installez le CLI.',
    );
  }

  // Les options du lanceur (--profile, --patch) doivent précéder les options de
  // l'application (--json, --session-id) : le lanceur s'arrête au premier
  // argument d'application.
  const args = ['--profile', 'headless'];
  if (fs.existsSync(AUTH_PATCH)) args.push('--patch', AUTH_PATCH);
  if (plugin) args.push('--patch', ensurePluginPatch());
  args.push('--json');
  args.push('--permission-mode', 'workspace-write');
  args.push('--approval-policy', 'never');
  if (sessionId) args.push('--session-id', sessionId);

  return new Promise((resolve, reject) => {
    const child = spawn(dsh, args, {
      cwd: SITE_ROOT,
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(value);
    };

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      const minutes = Math.max(1, Math.round(TIMEOUT_MS / 60000));
      const error = new Error(
        `L’agent n’a pas répondu dans les ${minutes} minute${
          minutes > 1 ? 's' : ''
        }. La session a été interrompue ; une nouvelle sera ouverte au prochain essai.`,
      );
      error.timeout = true;
      finish(error);
    }, TIMEOUT_MS);

    const feed = createEventFeed(onEvent);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      feed(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.stdin.on('error', () => {});
    child.on('error', (error) => finish(error));
    child.on('close', (code) => {
      const parsed = parseStream(stdout);

      if (code !== 0) {
        const detail =
          parsed.error ||
          stderr.trim().slice(-1200) ||
          stdout.trim().slice(-1200);
        finish(
          new Error(
            `dsh a échoué (code ${code}).${detail ? `\n${detail}` : ''}`,
          ),
        );
        return;
      }

      if (!parsed.text.trim()) {
        finish(
          new Error(
            'dsh n’a renvoyé aucun texte. Vérifiez la connexion DSH et le profil headless.',
          ),
        );
        return;
      }
      finish(null, parsed);
    });

    child.stdin.end(prompt);
  });
}

function fakeBrief(piece) {
  return `# Brief (démonstration)

Ce texte est produit par le mode démonstration. Il ne remplace pas un vrai brief.

## Thèse

La contrainte qui pèse sur la bulle IA s’est déplacée du crédit vers les permis,
l’électricité et le vote local.

## Angle

Le maillon politique : la bulle peut être arrêtée par un permis refusé avant de
l’être par le crédit.

## Prochaine étape

Demander le brouillon.
`;
}

function fakeResearch(piece) {
  return `# Recherche (démonstration)

Aucune recherche réelle n’a été effectuée : ce fichier montre la forme attendue.

## Questions

- Le refus de Microsoft porte-t-il sur la demande ou sur l’électricité ?
- Les 38 votes locaux sont-ils contraignants ?

## Ce qui est établi

- Les sources capturées sont complètes ; les chiffres de Nscale viennent du FT.

## À capturer

- Un document de la SEC sur la capacité du site d’Ionic.
- Le communiqué de Nscale sur son introduction en Bourse.

## Reste incertain

- La part du carnet de commandes adossée à des projets autorisés.
`;
}

function yamlString(value) {
  return String(value ?? '')
    .replace(/"/g, "'")
    .replace(/\n/g, ' ')
    .trim();
}

function fakeDraft(piece) {
  const date = new Date().toISOString().slice(0, 10);
  return `---
title: "${yamlString(piece.title)}"
description: "Brouillon de démonstration produit par le desk."
pubDate: ${date}
author: Benoît Huron
draft: true
tags:
  - Économie
  - IA
---

La démonstration n'écrit pas un vrai article. Elle vérifie que le pipeline produit un fichier valide, avec son frontmatter, et que la boucle de critique peut s'exécuter.

Le brouillon de démonstration se contente de trois paragraphes. Il ne cite aucun chiffre, précisément pour ne pas simuler une source qu'il n'a pas lue.

La suite du pipeline remplace ce texte par le vrai brouillon du rédacteur.
`;
}

function fakeCritique(kind) {
  const critiques = {
    faits: {
      label: 'faits',
      score: 74,
      must_fix: ['Le chiffre de 103 milliards n’est pas relié à sa source.'],
      nice: ['Ajouter la date de consultation du FT.'],
    },
    voix: {
      label: 'voix',
      score: 68,
      must_fix: ['Deux paragraphes commencent par « C’est ».'],
      nice: ['Réduire le nombre de tirets cadratins.'],
    },
    structure: {
      label: 'structure',
      score: 71,
      must_fix: ['Le steelman annonce l’argument adverse sans le développer.'],
      nice: ['Fusionner les sections 3 et 4.'],
    },
  };
  const critique = critiques[kind] ?? critiques.faits;

  return `# Critique ${critique.label} (démonstration)

Ce rapport est produit par le mode démonstration. Il montre la forme attendue.

## Must-fix

${critique.must_fix.map((item) => `- ${item}`).join('\n')}

## Nice-to-have

${critique.nice.map((item) => `- ${item}`).join('\n')}

{"role":"${critique.label}","score":${critique.score},"must_fix":${JSON.stringify(critique.must_fix)},"nice_to_have":${JSON.stringify(critique.nice)}}
`;
}

function fakePackage(piece) {
  return `# Paquet de publication (démonstration)

## Titres

1. ${piece.title}
2. Le maillon politique de la chaîne IA
3. Nscale ou la facture politique de la bulle

## Description

Brouillon de démonstration : la description réelle sera écrite par l’éditeur.

## Tags

- Économie
- IA
- Politique

## Liens internes

- /blog/la-bulle-ia-nest-pas-un-remake-de-2000-elle-est-pire/
- /blog/leconomie-de-lia-est-une-chaine-financiere-fragile/

## Thread Bluesky

1. La bulle IA a un problème que ses modèles financiers ne mesurent pas : les permis de construire.
2. Nscale vise 35 milliards en Bourse pour 141 millions de revenus et 1 milliard de pertes.
3. Microsoft a refusé une option de 500 MW au Texas. Le carnet de commandes reste une promesse.
4. Le crédit se ferme en même temps que les permis se refusent.
5. Le lien : https://liberalisme-democratique.uk/
`;
}

function fakeStage({ role, piece, stageId, output, onEvent }) {
  const file = path.join(SITE_ROOT, output);
  const sessionId = `fake-${stageId}-${role}`;
  const tool =
    role === 'documentaliste' || role.startsWith('critique-')
      ? 'read'
      : 'write';
  onEvent?.({ type: 'tool_call', tool });

  if (role === 'documentaliste') {
    writeText(file, fakeResearch(piece));
    return {
      sessionId,
      text: 'J’ai écrit `research.md` (démonstration) : questions, sources à capturer, incertitudes.',
    };
  }

  if (role === 'strategist') {
    writeText(file, fakeBrief(piece));
    return {
      sessionId,
      text: 'J’ai écrit `brief.md` (démonstration) : thèse, un angle, steelman.',
    };
  }

  if (role === 'redacteur') {
    writeText(file, fakeDraft(piece));
    return {
      sessionId,
      text: 'J’ai écrit le brouillon (démonstration) avec `draft: true`.',
    };
  }

  if (role.startsWith('critique-')) {
    writeText(file, fakeCritique(role.replace('critique-', '')));
    return {
      sessionId,
      text: `J’ai écrit ${output} (démonstration).`,
    };
  }

  if (role === 'reviseur') {
    const draft = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    writeText(
      file,
      `${draft.trimEnd()}\n\n<!-- Révision (démonstration) : must-fix appliqués. -->\n`,
    );
    writeText(
      path.join(pieceDir(piece.slug), 'critiques', 'revision.md'),
      '# Révision (démonstration)\n\nLes must-fix ont été appliqués. Aucune nouvelle affirmation.\n',
    );
    return {
      sessionId,
      text: 'J’ai appliqué les must-fix (démonstration) et écrit `critiques/revision.md`.',
    };
  }

  if (role === 'editeur') {
    writeText(file, fakePackage(piece));
    return {
      sessionId,
      text: 'J’ai écrit `package.md` (démonstration) : titres, description, thread.',
    };
  }

  throw new Error(`Rôle de démonstration inconnu : ${role}`);
}

export async function runOneShot({
  prompt,
  role,
  piece,
  stageId,
  output,
  onEvent,
}) {
  if (agentMode() === 'fake') {
    return fakeStage({ role, piece, stageId, output, onEvent });
  }
  if (agentMode() === 'off') {
    throw new Error('Agent désactivé (DESK_AGENT=off).');
  }
  return runDsh({ prompt, sessionId: null, onEvent });
}

async function runFake({ piece, prompt, bootstrap, onEvent }) {
  onEvent?.({ type: 'tool_call', tool: 'read' });
  await new Promise((resolve) => setTimeout(resolve, 700));
  onEvent?.({ type: 'text', text: '' });
  const sessionId = piece.session_id ?? `fake-${piece.slug}`;

  if (bootstrap) {
    return {
      sessionId,
      text: `**Mode démonstration.** J’ai lu les ${piece.sources.length} source(s) et la charte. Le sujet, en une phrase : la contrainte de la bulle IA s’est déplacée du crédit vers les permis et l’électricité.

L’angle que je déduis de l’article : la bulle peut être arrêtée par un permis
refusé avant de l’être par le crédit.

Deux questions avant d’aller plus loin : faut-il parler des élections américaines
ou seulement de Nscale ? et quel fait vous semble le plus solide ?

Dites-moi si l’angle est juste, ou demandez le brief.`,
    };
  }

  if (/recherche|vérifie|verifie/i.test(prompt)) {
    const file = path.join(pieceDir(piece.slug), 'research.md');
    if (!fs.existsSync(file)) writeText(file, fakeResearch(piece));
    return {
      sessionId,
      text: 'J’ai écrit `research.md` (démonstration). Il montre la forme attendue : questions, sources à capturer, ce qui reste incertain. Aucune recherche réelle n’a été faite.',
    };
  }

  if (/brief/i.test(prompt)) {
    const file = path.join(pieceDir(piece.slug), 'brief.md');
    if (!fs.existsSync(file)) writeText(file, fakeBrief(piece));
    return {
      sessionId,
      text:
        'J’ai écrit une proposition de brief dans `editorial/pieces/' +
        piece.slug +
        '/brief.md`. Elle est marquée démonstration : relisez-la et dites-moi ce qui ne va pas.',
    };
  }

  return {
    sessionId,
    text: `**Mode démonstration.** Message reçu : « ${prompt.slice(0, 160)} ». Le vrai agent répondrait ici, avec les sources et le brief en contexte.`,
  };
}

export async function runAgent({ piece, prompt, bootstrap, onEvent }) {
  if (agentMode() === 'fake') {
    return runFake({ piece, prompt, bootstrap, onEvent });
  }
  if (agentMode() === 'off') {
    throw new Error('Agent désactivé (DESK_AGENT=off).');
  }
  return runDsh({
    prompt,
    sessionId: piece.session_id ?? null,
    onEvent,
    plugin: true,
  });
}

export function agentInfo() {
  return { mode: agentMode(), dsh: findDsh() };
}
