import fs from 'node:fs';
import path from 'node:path';

import { EDITORIAL_DIR } from './paths.mjs';

const ROLES_DIR = path.join(EDITORIAL_DIR, 'agent/roles');

export const ROLES = {
  documentaliste: { label: 'Documentaliste', file: 'documentaliste.md' },
  strategist: { label: 'Stratège', file: 'strategist.md' },
  redacteur: { label: 'Rédacteur', file: 'redacteur.md' },
  'critique-faits': {
    label: 'Critique des faits',
    file: 'critique-faits.md',
    critique: 'faits.md',
  },
  'critique-voix': {
    label: 'Critique de voix',
    file: 'critique-voix.md',
    critique: 'voix.md',
  },
  'critique-structure': {
    label: 'Critique de structure',
    file: 'critique-structure.md',
    critique: 'structure.md',
  },
  reviseur: { label: 'Réviseur', file: 'reviseur.md' },
  editeur: { label: 'Éditeur', file: 'editeur.md' },
};

export function roleInstructions(id) {
  const role = ROLES[id];
  if (!role) throw new Error(`Rôle inconnu : ${id}`);
  return fs.readFileSync(path.join(ROLES_DIR, role.file), 'utf8');
}

export function roleOutput(roleId, slug) {
  const role = ROLES[roleId];
  if (!role) throw new Error(`Rôle inconnu : ${roleId}`);
  if (role.critique) {
    return `editorial/pieces/${slug}/critiques/${role.critique}`;
  }
  if (roleId === 'documentaliste') {
    return `editorial/pieces/${slug}/research.md`;
  }
  if (roleId === 'strategist') {
    return `editorial/pieces/${slug}/brief.md`;
  }
  if (roleId === 'redacteur' || roleId === 'reviseur') {
    return `src/content/blog/${slug}.mdx`;
  }
  if (roleId === 'editeur') {
    return `editorial/pieces/${slug}/package.md`;
  }
  return `editorial/pieces/${slug}/${roleId}.md`;
}

/**
 * Le workflow est décidé ici, pas par le modèle : c'est le pattern Workflow du
 * chapitre 9. Les rôles sont les spécialistes ; leur ordre est fixe.
 */
export const STAGES = {
  research: {
    label: 'Recherche',
    description: 'Vérifie les faits et complète les manques.',
    roles: ['documentaliste'],
    requires: ['sources'],
    task: () =>
      'Vérifie les faits de la pièce et complète les manques. Écris research.md.',
  },
  brief: {
    label: 'Brief',
    description: 'Transforme les sources en brief décisionnel.',
    roles: ['strategist'],
    requires: ['sources'],
    task: () =>
      'Écris le brief de l’angle donné par l’utilisateur, ou déduit des sources. Un seul angle, avec la thèse, le steelman et les critères d’abandon.',
  },
  draft: {
    label: 'Brouillon',
    description: 'Écrit l’article dans la voix du blog.',
    roles: ['redacteur'],
    requires: ['brief'],
    task: () =>
      'Écris le brouillon complet, avec son frontmatter et draft: true.',
  },
  critique: {
    label: 'Critiques',
    description: 'Trois critiques en parallèle : faits, voix, structure.',
    roles: ['critique-faits', 'critique-voix', 'critique-structure'],
    parallel: true,
    requires: ['draft'],
    task: (roleId) =>
      `Applique ton rôle de ${ROLES[roleId].label.toLowerCase()} au brouillon et écris ton rapport.`,
  },
  revise: {
    label: 'Révision',
    description: 'Applique les must-fix des critiques.',
    roles: ['reviseur'],
    requires: ['critique'],
    task: () =>
      'Applique uniquement les must-fix des critiques au brouillon, sans nouvelle affirmation.',
  },
  package: {
    label: 'Publication',
    description: 'Titres, description, tags, liens et thread.',
    roles: ['editeur'],
    requires: ['draft'],
    task: () =>
      'Prépare le paquet de publication et le thread Bluesky. Ne publie rien.',
  },
};

export function stageOutputs(stageId, slug) {
  const stage = STAGES[stageId];
  if (!stage) throw new Error(`Étape inconnue : ${stageId}`);
  const outputs = stage.roles.map((roleId) => roleOutput(roleId, slug));
  if (stageId === 'revise') {
    outputs.push(`editorial/pieces/${slug}/critiques/revision.md`);
  }
  return [...new Set(outputs)];
}

export function buildPrompt({
  piece,
  roleId,
  stageId,
  sources,
  available,
  decision,
}) {
  const role = ROLES[roleId];
  const stage = STAGES[stageId];
  const instructions = roleInstructions(roleId);

  const sourceList =
    sources
      .map(
        (source) =>
          `- [${source.bd_id}] ${source.site ?? 'sans site'} — « ${source.title} » (${source.word_count} mots, couverture ${source.coverage.level})\n  editorial/sources/${source.bd_id}/text.txt`,
      )
      .join('\n') || '- aucune';

  const availableList =
    available.map((file) => `- ${file}`).join('\n') || '- aucun';

  return `Tu exécutes le rôle « ${role.label} » du desk éditorial.

${instructions}

## Pièce

- Titre : ${piece.title}
- Slug : ${piece.slug}
- Intention : ${piece.intent?.trim() || 'à préciser'}

## Sources capturées

${sourceList}

## Artefacts disponibles

${availableList}

## Décision de l'utilisateur

${decision?.trim() || 'Aucune décision consignée. Déduis l’angle des sources et indique-le en une phrase.'}

## Tâche

${stage.task(roleId)}

## Sortie attendue

Écris ${roleOutput(roleId, piece.slug)}.

Termine ta réponse par trois phrases maximum : ce que tu as fait, ce qui bloque,
ce que l'humain doit décider.`;
}
