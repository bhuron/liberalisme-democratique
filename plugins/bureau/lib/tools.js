import { STAGES } from './pipeline.js';
import { STATUSES } from './pieces.js';

const READ = () => true;
const WRITE = () => false;

function json(value) {
  return JSON.stringify(value, null, 2);
}

function line(...parts) {
  return parts.filter(Boolean).join(' · ');
}

function isSubagent(exec) {
  const header = exec?.agent?.session?.header;
  return Boolean(header?.parentSession || header?.origin === 'subagent');
}

function resolveSlug(service, args, exec) {
  if (args.slug) return String(args.slug);
  const bound = service.slugForSession(exec?.agent?.id);
  if (bound) return bound;
  throw new Error(
    'Précisez `slug`. Utilisez desk_piece({ action: "list" }) pour les pièces disponibles.',
  );
}

function formatPieceList(pieces) {
  if (!pieces.length) return 'Aucune pièce.';
  return pieces
    .map(
      (piece) =>
        `- ${piece.slug} — ${piece.title} [${piece.status}] (${piece.source_count} source(s), ${piece.updated_at})`,
    )
    .join('\n');
}

function formatStage(stage) {
  const state = stage.done ? 'fait' : stage.ready ? 'prêt' : 'bloqué';
  const missing = stage.missing.length
    ? ` (manque : ${stage.missing.join(', ')})`
    : '';
  return `- ${stage.id} — ${stage.label} [${state}]${missing} · rôles : ${stage.roles.join(', ')}`;
}

function formatSource(source) {
  return `- [${source.bd_id}] ${source.title} — ${source.site ?? 'sans site'} · ${source.word_count} mots · couverture ${source.coverage?.level ?? 'inconnue'}`;
}

function truncateText(text, max = 20_000) {
  const value = String(text ?? '');
  if (value.length <= max) return value;
  return `${value.slice(0, max)}\n\n[texte tronqué à ${max} caractères]`;
}

export function registerTools(ctx, service, defineTool) {
  if (!defineTool) return () => {};

  const tools = [
    defineTool({
      name: 'desk_status',
      description:
        'État du bureau éditorial : workspace, instructions, captures, pièces et modèle par défaut. À appeler en premier quand une pièce ou un chemin est inconnu.',
      parameters: {},
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: String(value) }],
      },
      isConcurrencySafe: READ,
      async execute() {
        const health = await service.health();
        const pieces = await service.listPieces();
        return [
          `Workspace : ${health.root}`,
          `Instructions : agent ${health.instructions.agent ? 'oui' : 'non'}, ${health.instructions.roles} rôle(s), charte ${health.instructions.style ? 'oui' : 'non'}`,
          `Captures : ${health.bookmark.available ? `disponibles (${health.bookmark.via})` : `indisponibles — ${health.bookmark.error}`}`,
          `Modèle : ${health.model ? `${health.model.provider}/${health.model.model}` : 'défaut'}`,
          `Pièces : ${pieces.length}`,
          formatPieceList(pieces),
        ].join('\n');
      },
    }),

    defineTool({
      name: 'desk_piece',
      description:
        'Gère les pièces du bureau : lister, lire le dossier complet, créer depuis des captures, archiver, changer le statut. Une pièce est un dossier editorial/pieces/<slug> ; le brouillon vit dans src/content/blog/<slug>.mdx.',
      parameters: {
        action: {
          type: 'string',
          required: true,
          enum: ['list', 'get', 'create', 'archive', 'status'],
          description: 'Opération à effectuer.',
        },
        slug: {
          type: 'string',
          description:
            'Slug de la pièce. Omis, la pièce de la session courante est utilisée.',
        },
        title: { type: 'string', description: 'Titre de la pièce à créer.' },
        intent: {
          type: 'string',
          description: 'Intention de la pièce à créer.',
        },
        sourceIds: {
          type: 'array',
          items: { type: 'number' },
          description: 'Identifiants de captures bookmark-digest à figer.',
        },
        status: {
          type: 'string',
          enum: STATUSES,
          description: 'Nouveau statut (action status).',
        },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: String(value) }],
      },
      isConcurrencySafe: WRITE,
      async execute(args, exec) {
        if (
          isSubagent(exec) &&
          ['create', 'archive', 'status'].includes(args.action)
        ) {
          throw new Error(
            'Un spécialiste ne modifie pas la pièce ; écris ton artefact.',
          );
        }
        if (args.action === 'list') {
          return formatPieceList(await service.listPieces());
        }
        if (args.action === 'create') {
          const piece = await service.createPiece({
            title: args.title,
            slug: args.slug,
            intent: args.intent,
            sourceIds: args.sourceIds ?? [],
          });
          return `Pièce créée : ${piece.slug} — ${piece.title} [${piece.status}]`;
        }
        const slug = resolveSlug(service, args, exec);
        if (args.action === 'get') {
          const detail = await service.getPiece(slug);
          return [
            `# ${detail.piece.title}`,
            `Slug : ${detail.piece.slug} · statut : ${detail.piece.status} · ${detail.piece.source_count} source(s)`,
            `Intention : ${detail.piece.intent || '—'}`,
            `Session : ${detail.session.id ?? 'aucune'}${detail.session.live ? ' (active)' : ''}`,
            '',
            '## Sources',
            detail.sources.length
              ? detail.sources.map(formatSource).join('\n')
              : '- aucune',
            '',
            '## Étapes',
            detail.stages.map(formatStage).join('\n'),
            '',
            '## Artefacts',
            detail.artifacts
              .map(
                (artifact) =>
                  `- ${artifact.name} — ${artifact.label} · ${artifact.exists ? artifact.path : 'absent'}`,
              )
              .join('\n'),
          ].join('\n');
        }
        if (args.action === 'archive') {
          const result = await service.archivePiece(slug);
          return `Pièce archivée dans ${result.archived}`;
        }
        const piece = await service.setStatus(slug, args.status);
        return `Statut de ${piece.slug} : ${piece.status}`;
      },
    }),

    defineTool({
      name: 'desk_sources',
      description:
        'Sources capturées : inbox de bookmark-digest, métadonnées figées, texte intégral, ou snapshot de nouvelles captures. Le desk fige une capture ; il ne relit pas la base pour une source déjà figée.',
      parameters: {
        action: {
          type: 'string',
          required: true,
          enum: ['list', 'inbox', 'get', 'snapshot'],
          description: 'Opération à effectuer.',
        },
        id: {
          type: 'integer',
          description: 'Identifiant de capture (action get).',
        },
        ids: {
          type: 'array',
          items: { type: 'integer' },
          description: 'Identifiants à figer (action snapshot).',
        },
        q: {
          type: 'string',
          description: 'Recherche plein texte (action inbox).',
        },
        limit: { type: 'integer', description: 'Nombre de résultats (1-100).' },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: String(value) }],
      },
      isConcurrencySafe: WRITE,
      async execute(args, exec) {
        if (isSubagent(exec) && args.action === 'snapshot') {
          throw new Error(
            'Un spécialiste ne fige pas de source ; utilise les sources de la pièce.',
          );
        }
        if (args.action === 'list') {
          const sources = await service.sourceList();
          return sources.length
            ? sources.map(formatSource).join('\n')
            : 'Aucune source figée.';
        }
        if (args.action === 'inbox') {
          const inbox = await service.inbox({ q: args.q, limit: args.limit });
          if (!inbox.available) {
            return `Captures indisponibles : ${inbox.error}`;
          }
          if (!inbox.articles.length) return 'Aucune capture trouvée.';
          return inbox.articles
            .map(
              (article) =>
                `- [${article.id}] ${article.title} — ${article.site ?? 'sans site'} · ${article.word_count ?? '?'} mots · couverture ${article.coverage.level}${article.used_by.length ? ` · déjà dans ${article.used_by.map((entry) => entry.slug).join(', ')}` : ''}`,
            )
            .join('\n');
        }
        if (args.action === 'snapshot') {
          const metas = await service.snapshotSources(args.ids ?? []);
          return metas.map(formatSource).join('\n');
        }
        const source = await service.source(args.id);
        return [
          `# ${source.title}`,
          `${source.site ?? ''} · ${source.url ?? ''} · ${source.word_count} mots · couverture ${source.coverage?.level ?? 'inconnue'}`,
          '',
          truncateText(source.text),
        ].join('\n');
      },
    }),

    defineTool({
      name: 'desk_artifact',
      description:
        'Lit les artefacts d’une pièce : angle, recherche, brief, brouillon, relecture de style, paquet. Utilisez-le après une étape pour vérifier le fichier produit.',
      parameters: {
        action: {
          type: 'string',
          enum: ['list', 'read'],
          default: 'read',
          description: 'Lister les artefacts ou en lire un.',
        },
        slug: { type: 'string', description: 'Slug de la pièce.' },
        name: {
          type: 'string',
          enum: ['angle', 'research', 'brief', 'draft', 'relecture', 'package'],
          description: 'Artefact à lire.',
        },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: String(value) }],
      },
      isConcurrencySafe: READ,
      async execute(args, exec) {
        const slug = resolveSlug(service, args, exec);
        if (args.action === 'list' || !args.name) {
          const artifacts = await service.artifactList(slug);
          return artifacts
            .map(
              (artifact) =>
                `- ${artifact.name} — ${artifact.label} · ${artifact.exists ? artifact.path : 'absent'}`,
            )
            .join('\n');
        }
        const artifact = await service.artifact(slug, args.name);
        if (!artifact.exists) {
          return `${artifact.path} est absent.`;
        }
        return `# ${artifact.label} — ${artifact.path}\n\n${truncateText(artifact.text)}`;
      },
    }),

    defineTool({
      name: 'desk_angle',
      description:
        'Écrit editorial/pieces/<slug>/angle.md : la décision de l’utilisateur (ce que la pièce veut dire, ce qu’on écarte, ce qui reste à vérifier). C’est le seul artefact que l’agent de conversation rédige ; les spécialistes le lisent.',
      parameters: {
        slug: { type: 'string', description: 'Slug de la pièce.' },
        text: {
          type: 'string',
          required: true,
          description: 'Angle en deux ou trois phrases.',
        },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: String(value) }],
      },
      isConcurrencySafe: WRITE,
      async execute(args, exec) {
        if (isSubagent(exec)) {
          throw new Error(
            "L'angle est écrit par l'agent de conversation, pas par un spécialiste.",
          );
        }
        const slug = resolveSlug(service, args, exec);
        await service.writeAngle(slug, args.text);
        return `Angle écrit pour ${slug}.`;
      },
    }),

    defineTool({
      name: 'desk_instructions',
      description:
        'Liste ou relit les instructions du bureau : agent, cinq rôles, charte de style, profil de registre. Les fichiers restent dans le dépôt du blog.',
      parameters: {
        action: {
          type: 'string',
          enum: ['list', 'read'],
          default: 'list',
          description: 'Lister les documents ou en lire un.',
        },
        id: {
          type: 'string',
          description:
            'Identifiant du document (agent, role-documentaliste, style-card…).',
        },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: String(value) }],
      },
      isConcurrencySafe: READ,
      async execute(args) {
        if (args.action === 'read' && args.id) {
          const doc = await service.instruction(args.id);
          return `# ${doc.title} — ${doc.path}\n\n${truncateText(doc.text)}`;
        }
        const docs = await service.instructions();
        return docs
          .map((doc) => `- ${doc.id} — ${doc.title} (${doc.path})`)
          .join('\n');
      },
    }),

    defineTool({
      name: 'desk_check',
      description:
        'Mesure le brouillon : typographie française (lint), tics de style et budgets, ou proximité avec le corpus du blog. Remplace les commandes externes du desk.',
      parameters: {
        slug: { type: 'string', description: 'Slug de la pièce.' },
        scope: {
          type: 'string',
          enum: ['all', 'style', 'lint', 'related'],
          default: 'all',
          description: 'Mesure à effectuer.',
        },
        query: {
          type: 'string',
          description:
            'Requête pour la recherche de proximité (scope related).',
        },
        limit: {
          type: 'integer',
          description: 'Nombre de résultats liés (1-10).',
        },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: String(value) }],
      },
      isConcurrencySafe: READ,
      async execute(args, exec) {
        if (args.scope === 'related') {
          const query = args.query || (await thisQuery(service, args, exec));
          const related = await service.related(query, {
            exclude: args.slug,
            limit: args.limit,
          });
          return related.length
            ? related
                .map(
                  (entry) =>
                    `- ${entry.slug} — ${entry.title} (score ${entry.score})`,
                )
                .join('\n')
            : 'Aucun article proche.';
        }

        const slug = resolveSlug(service, args, exec);
        const checks = await service.checks(slug);
        const lines = [
          `# Mesures — ${checks.draft}`,
          `Mots : ${checks.style.words} · erreurs typographiques : ${checks.summary.errors} · avertissements : ${checks.summary.warnings} · budgets dépassés : ${checks.summary.overBudget}`,
        ];
        if (args.scope !== 'lint') {
          lines.push('', '## Style');
          for (const metric of checks.style.metrics) {
            lines.push(
              `- ${metric.label} : ${metric.count} (${metric.density}/1000) ${metric.over ? '— DÉPASSÉ' : '— ok'}`,
            );
          }
          lines.push(
            `- structure : phrase médiane ${checks.style.structure.sentenceMedian} mots, paragraphe médian ${checks.style.structure.paragraphMedian}, attaque ${checks.style.structure.leadWords}, ${checks.style.structure.headings} intertitre(s)`,
          );
        }
        if (args.scope !== 'style') {
          lines.push('', '## Typographie');
          if (!checks.lint.findings.length) {
            lines.push('- aucun défaut.');
          } else {
            for (const finding of checks.lint.findings.slice(0, 30)) {
              lines.push(
                `- ligne ${finding.line} : ${finding.message} — ${finding.excerpt}`,
              );
            }
          }
        }
        return lines.join('\n');
      },
    }),

    defineTool({
      name: 'desk_run',
      description:
        'Lance une étape du pipeline avec son spécialiste isolé. Étapes : research, brief, draft, style, package. Le spécialiste écrit l’artefact ; l’outil renvoie un résumé.',
      parameters: {
        slug: { type: 'string', description: 'Slug de la pièce.' },
        stage: {
          type: 'string',
          required: true,
          enum: Object.keys(STAGES),
          description: 'Étape à exécuter.',
        },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: String(value) }],
      },
      isConcurrencySafe: WRITE,
      async execute(args, exec) {
        if (!exec.agent) {
          throw new Error("desk_run a besoin de l'agent appelant.");
        }
        if (isSubagent(exec)) {
          throw new Error(
            'Un spécialiste écrit son artefact ; il ne lance pas une autre étape.',
          );
        }
        const slug = resolveSlug(service, args, exec);
        const result = await service.runStageForAgent({
          slug,
          stageId: args.stage,
          agent: exec.agent,
          signal: exec.signal,
        });
        return service.formatStageSummary(result);
      },
    }),
  ];

  return ctx.effect(() => {
    const disposers = tools.map((tool) => ctx.tools.register(tool));
    return () => {
      for (const dispose of disposers) dispose();
    };
  }, 'bureau: tools');
}

async function thisQuery(service, args, exec) {
  const slug = resolveSlug(service, args, exec);
  const piece = (await service.getPiece(slug)).piece;
  return `${piece.title} ${piece.intent}`;
}
