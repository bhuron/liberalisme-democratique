import path from 'node:path';

import {
  parseChosenReferences,
  styleCatalog,
  styleReferences,
} from './exemplars.js';
import { newsroomProfileInstruction, roleInstruction } from './instructions.js';
import { draftFile, draftPath, pieceDir, readPiece } from './pieces.js';
import { listSourceMetas } from './sources.js';
import { exists, hasDraftTrue, nowIso, readText, writeJson } from './store.js';

/**
 * The workflow is a small set of writing aids, not a demonstration machine.
 * A role runs in a fresh isolated session, receives its instructions, the
 * piece dossier and the style references, and writes one file. The conversation
 * agent decides when to launch it.
 */

export const ROLES = {
  documentaliste: { label: 'Documentaliste', file: 'documentaliste.md' },
  strategist: { label: 'Préparateur', file: 'strategist.md' },
  redacteur: { label: 'Rédacteur', file: 'redacteur.md' },
  'relecture-style': {
    label: 'Relecture de style',
    file: 'relecture-style.md',
  },
  fixeur: { label: 'Fixeur', file: 'fixeur.md' },
  editeur: { label: 'Éditeur', file: 'editeur.md' },
};

export const STAGES = {
  research: {
    label: 'Recherche',
    description: 'Trouve des liens pour illustrer les faits.',
    roles: ['documentaliste'],
    requires: ['sources'],
    task: () =>
      'Trouve les liens qui illustrent les faits de la pièce et complète les manques. Écris research.md. Tu ne critiques pas la source.',
  },
  brief: {
    label: 'Brief',
    description: 'Rassemble les faits, les liens et un titre de travail.',
    roles: ['strategist'],
    requires: ['sources'],
    task: () =>
      'Prépare un dossier de travail : ce que disent les sources, les faits et citations avec leur source, les liens utiles, un angle de travail en une ou deux phrases, un titre de travail et ce qui reste à vérifier. Choisis aussi deux ou trois articles de référence dans le catalogue et écris leurs chemins dans la section « Références de style ». Pas de thèse, pas de steelman, pas de plan, pas de structure imposée.',
  },
  draft: {
    label: 'Brouillon',
    description: "Écrit l'article dans la voix du blog.",
    roles: ['redacteur'],
    requires: ['brief'],
    task: () =>
      'Écris le brouillon complet, avec son frontmatter et draft: true. Appuie-toi sur le brief, la recherche, les sources et les articles de référence fournis. Imite leur construction, leur rythme et leurs transitions, jamais leurs phrases. Pas de thèse à démontrer, pas de steelman, pas de plan imposé.',
  },
  style: {
    label: 'Relecture de style',
    description:
      'Compare le brouillon aux articles de référence et propose des corrections concrètes.',
    roles: ['relecture-style'],
    requires: ['draft'],
    task: () =>
      'Compare le brouillon aux articles complets et au profil de registre. Propose des corrections concrètes de construction, de rythme, de transitions et de registre. Pas de score, pas de must-fix, pas de thèse, pas de steelman, pas de structure imposée.',
  },
  package: {
    label: 'Paquet',
    description: 'Titres, description, tags, liens et posts.',
    roles: ['editeur'],
    requires: ['draft'],
    task: () =>
      'Prépare le paquet de publication : un titre de travail (des variantes seulement si utiles), la description, les étiquettes, les liens internes et les posts Bluesky. Ne publie rien.',
  },
};

export function roleOutput(roleId, slug) {
  const role = ROLES[roleId];
  if (!role) throw new Error(`Rôle inconnu : « ${roleId} »`);
  if (roleId === 'documentaliste') {
    return `editorial/pieces/${slug}/research.md`;
  }
  if (roleId === 'strategist') {
    return `editorial/pieces/${slug}/brief.md`;
  }
  if (roleId === 'redacteur') {
    return `src/content/blog/${slug}.mdx`;
  }
  if (roleId === 'relecture-style') {
    return `editorial/pieces/${slug}/relecture-style.md`;
  }
  if (roleId === 'fixeur') {
    return `editorial/pieces/${slug}/fixes.md`;
  }
  if (roleId === 'editeur') {
    return `editorial/pieces/${slug}/package.md`;
  }
  return `editorial/pieces/${slug}/${roleId}.md`;
}

export function stageOutputs(stageId, slug) {
  const stage = STAGES[stageId];
  if (!stage) throw new Error(`Étape inconnue : « ${stageId} »`);
  return [...new Set(stage.roles.map((roleId) => roleOutput(roleId, slug)))];
}

function absolute(root, relative) {
  return path.join(root, relative);
}

function readiness(root, piece, stageId) {
  const stage = STAGES[stageId];
  const checks = {
    sources: () => piece.sources.length > 0,
    brief: () =>
      exists(absolute(root, `editorial/pieces/${piece.slug}/brief.md`)),
    draft: () => Boolean(draftFile(root, piece.slug)),
  };
  const missing = stage.requires.filter(
    (requirement) => !checks[requirement](),
  );
  return { ready: missing.length === 0, missing };
}

export function stageStatus(root, slug) {
  const piece = readPiece(root, slug);
  if (!piece) throw new Error(`La pièce « ${slug} » n'existe pas`);

  return Object.entries(STAGES).map(([id, stage]) => {
    const outputs = stageOutputs(id, slug);
    const { ready, missing } = readiness(root, piece, id);
    return {
      id,
      label: stage.label,
      description: stage.description,
      roles: stage.roles,
      parallel: Boolean(stage.parallel),
      outputs,
      done: outputs.every((output) => exists(absolute(root, output))),
      ready,
      missing,
    };
  });
}

export function availableArtefacts(root, piece) {
  const candidates = [
    `editorial/pieces/${piece.slug}/brief.md`,
    `editorial/pieces/${piece.slug}/research.md`,
    `editorial/pieces/${piece.slug}/angle.md`,
    `editorial/pieces/${piece.slug}/relecture-style.md`,
    `editorial/pieces/${piece.slug}/fixes.md`,
  ];
  const draft = draftFile(root, piece.slug);
  if (draft) candidates.push(draft);
  return candidates.filter((relative) => exists(absolute(root, relative)));
}

function referenceGuidance(root, roleId, piece, sources, briefText) {
  if (roleId === 'strategist') {
    const catalog = styleCatalog(root);
    if (!catalog.text) return '';
    return `## Catalogue des articles de référence

Ces articles sont disponibles pour le rédacteur. Choisis-en **deux ou trois**
pour cette pièce, en variant d'une pièce à l'autre : un FT/SCMP pour
l'actualité, un Le Monde diplomatique pour l'analyse, si possible dans le
domaine de l'article. Écris leurs chemins exacts dans le brief, sous la forme :

\`\`\`markdown
## Références de style
- path: editorial/style/corpus/financial-times/30.txt
- path: editorial/style/corpus/le-monde-diplomatique/50.txt
\`\`\`

Catalogue :

${catalog.text}`;
  }

  if (roleId !== 'redacteur' && roleId !== 'relecture-style') return '';

  const chosen = parseChosenReferences(root, briefText);
  const refs = styleReferences(root, piece, sources, { chosen });
  const parts = [];
  const profile = newsroomProfileInstruction(root);
  if (profile) parts.push(`## Profil de registre\n\n${profile}`);

  if (refs.inlineText) {
    parts.push(`## Exemples complets (inline)

Ces articles sont des exemples de construction, de rythme, de transitions et de
registre. Imite leur manière d'ouvrir, de poser les faits, de citer et de
refermer ; ne recopie aucune phrase et n'emprunte aucun fait.

${refs.inlineText}`);
  } else if (refs.fallbackText) {
    parts.push(`## Exemples de registre (extraits)

${refs.fallbackText}`);
  }

  if (refs.catalogText) {
    parts.push(`## Autres références (spill)

Si tu as besoin d'un autre exemple, lis-le avec l'outil \`read\` ; ne le recopie
pas. Priorité au domaine : ${refs.domainLabel}.

${refs.catalogText}`);
  }

  return parts.join('\n\n');
}

const FIX_TASK =
  "Corrige uniquement les fautes de frappe, accents, ponctuation, espaces, répétitions involontaires et accords évidents. Utilise `edit` avec le texte exact ; ne réécris jamais un paragraphe ; ne change ni les faits, ni les chiffres, ni les noms, ni l'ordre, ni le style. Écris fixes.md avec les corrections appliquées et celles qui demandent une réécriture.";

export function buildPrompt({
  root,
  piece,
  roleId,
  stageId,
  sources,
  available,
  decision,
  task,
}) {
  const role = ROLES[roleId];
  const stage = STAGES[stageId];
  const instructions = roleInstruction(root, roleId);
  const briefText = readText(
    path.join(pieceDir(root, piece.slug), 'brief.md'),
    '',
  );
  const referenceText = referenceGuidance(
    root,
    roleId,
    piece,
    sources,
    briefText,
  );

  const sourceList =
    sources
      .map(
        (source) =>
          `- [${source.bd_id}] ${source.site ?? 'sans site'} — « ${source.title} » (${source.word_count} mots, couverture ${source.coverage?.level ?? 'inconnue'})\n  editorial/sources/${source.bd_id}/text.txt`,
      )
      .join('\n') || '- aucune';

  const availableList =
    available.map((file) => `- ${file}`).join('\n') || '- aucun';
  const output = roleOutput(roleId, piece.slug);
  const execution =
    roleId === 'fixeur'
      ? `Corrige le brouillon en place avec \`edit\` (jamais \`write\`), puis écris ${output}.`
      : `Écris ton artefact avec les outils de fichier (\`write\`, \`edit\`) à ${output}.`;
  const expected =
    roleId === 'fixeur'
      ? `Corrige le brouillon avec \`edit\`, puis écris ${output}.`
      : `Écris ${output}.`;

  return `Tu exécutes le rôle « ${role.label} » du bureau éditorial.

${instructions}

${referenceText}

## Pièce

- Titre : ${piece.title}
- Slug : ${piece.slug}
- Intention : ${piece.intent?.trim() || 'à préciser'}

## Sources capturées

${sourceList}

## Artefacts disponibles

${availableList}

## Décision de l'utilisateur

${decision?.trim() || "Aucune décision consignée. Déduis l'angle des sources et indique-le en une phrase."}

## Tâche

${task ?? stage.task(roleId)}

## Exécution

Tu es un spécialiste isolé. ${execution} N'appelle jamais \`desk_run\` : le
pipeline est lancé par l'agent de conversation.

## Sortie attendue

${expected}

Termine ta réponse par trois phrases maximum : ce que tu as fait, ce qui bloque,
ce que l'humain doit décider.`;
}

export async function runStage({ root, slug, stageId, onEvent, runAgent }) {
  const piece = readPiece(root, slug);
  if (!piece) throw new Error(`La pièce « ${slug} » n'existe pas`);

  const stage = STAGES[stageId];
  if (!stage) {
    throw new Error(
      `Étape inconnue : « ${stageId} » (attendu : ${Object.keys(STAGES).join(', ')})`,
    );
  }

  const check = readiness(root, piece, stageId);
  if (!check.ready) {
    throw new Error(
      `Étape impossible : il manque ${check.missing.join(', ')}.`,
    );
  }

  const sources = listSourceMetas(root).filter((source) =>
    piece.sources.includes(source.bd_id),
  );
  const available = availableArtefacts(root, piece);
  const decision = readText(path.join(pieceDir(root, slug), 'angle.md'), '');
  const started = nowIso();

  const runRole = async (roleId) => {
    const output = roleOutput(roleId, slug);
    const prompt = buildPrompt({
      root,
      piece,
      roleId,
      stageId,
      sources,
      available,
      decision,
    });
    const result = await runAgent({
      prompt,
      role: roleId,
      piece,
      stageId,
      output,
      onEvent: (event) => onEvent?.({ ...event, role: roleId }),
    });

    if (!exists(absolute(root, output))) {
      throw new Error(
        `${ROLES[roleId].label} n'a pas écrit ${output}. Réponse : ${String(
          result.text,
        ).slice(0, 400)}`,
      );
    }

    return {
      role: roleId,
      label: ROLES[roleId].label,
      output,
      session: result.sessionId ?? null,
      text: result.text,
    };
  };

  const results = stage.parallel
    ? await Promise.all(stage.roles.map((roleId) => runRole(roleId)))
    : [await runRole(stage.roles[0])];

  for (const output of stageOutputs(stageId, slug)) {
    if (!exists(absolute(root, output))) {
      throw new Error(`Sortie manquante : ${output}`);
    }
  }

  if (stageId === 'draft') {
    const raw = readText(
      absolute(root, draftFile(root, slug) ?? draftPath(root, slug)),
      '',
    );
    if (!hasDraftTrue(raw)) {
      throw new Error('Le brouillon a été écrit sans « draft: true ».');
    }
  }

  const record = {
    stage: stageId,
    started,
    ended: nowIso(),
    results,
  };
  writeJson(
    path.join(pieceDir(root, slug), 'runs', `${stageId}-${Date.now()}.json`),
    record,
  );

  return {
    stage: stageId,
    label: stage.label,
    results,
    outputs: stageOutputs(stageId, slug),
  };
}

export async function runFix({ root, slug, runAgent, onEvent }) {
  const piece = readPiece(root, slug);
  if (!piece) throw new Error(`La pièce « ${slug} » n'existe pas`);

  const draft = draftFile(root, slug) ?? draftPath(root, slug);
  if (!exists(absolute(root, draft))) {
    throw new Error('Le fixeur a besoin d’un brouillon existant.');
  }

  const sources = listSourceMetas(root).filter((source) =>
    piece.sources.includes(source.bd_id),
  );
  const available = availableArtefacts(root, piece);
  const decision = readText(path.join(pieceDir(root, slug), 'angle.md'), '');
  const output = roleOutput('fixeur', slug);
  const started = nowIso();

  const prompt = buildPrompt({
    root,
    piece,
    roleId: 'fixeur',
    stageId: 'fix',
    sources,
    available,
    decision,
    task: FIX_TASK,
  });
  const result = await runAgent({
    prompt,
    role: 'fixeur',
    piece,
    stageId: 'fix',
    output,
    onEvent: (event) => onEvent?.({ ...event, role: 'fixeur' }),
  });

  if (!exists(absolute(root, output))) {
    throw new Error(
      `Le fixeur n'a pas écrit ${output}. Réponse : ${String(result.text).slice(0, 400)}`,
    );
  }
  const raw = readText(absolute(root, draft), '');
  if (!hasDraftTrue(raw)) {
    throw new Error(
      'Le fixeur a cassé le frontmatter : « draft: true » manque.',
    );
  }

  const entry = {
    role: 'fixeur',
    label: ROLES.fixeur.label,
    output,
    session: result.sessionId ?? null,
    text: result.text,
  };
  const record = {
    stage: 'fix',
    started,
    ended: nowIso(),
    results: [entry],
  };
  writeJson(
    path.join(pieceDir(root, slug), 'runs', `fix-${Date.now()}.json`),
    record,
  );

  return {
    stage: 'fix',
    label: 'Corrections',
    results: [entry],
    outputs: [output, draft],
  };
}

export function formatStageSummary(result) {
  const lines = [`${result.label} — ${result.results.length} rôle(s)`];
  for (const entry of result.results) {
    lines.push(`${entry.label} → ${entry.output}`);
    if (entry.text) lines.push(String(entry.text).slice(0, 600));
  }
  return lines.join('\n');
}
