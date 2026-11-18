import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { createBureauService } from '../lib/service.js';
import {
  buildPrompt,
  runFix,
  runIllustration,
  runStage,
  STAGES,
} from '../lib/pipeline.js';
import { checkStyle, lintText } from '../lib/checks.js';
import { assessCoverage } from '../lib/coverage.js';
import {
  MAX_SLUG_LENGTH,
  createPiece,
  readPiece,
  renamePiece,
  setStatus,
  updatePiece,
} from '../lib/pieces.js';
import { parseFrontmatter } from '../lib/store.js';

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function makeWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bureau-test-'));
  const roles = [
    'documentaliste',
    'strategist',
    'redacteur',
    'relecture-style',
    'fixeur',
    'illustrateur',
    'editeur',
  ];
  for (const role of roles) {
    write(
      path.join(root, 'editorial', 'agent', 'roles', `${role}.md`),
      `# Rôle : ${role}\n\nInstruction de test pour ${role}.\n`,
    );
  }
  write(
    path.join(root, 'editorial', 'agent', 'desk-agent.md'),
    '# Agent du desk\n\nTu es le test du bureau.\n',
  );
  write(
    path.join(root, 'editorial', 'style', 'card.md'),
    '# Charte\n\nPas de tic.\n',
  );
  write(
    path.join(root, 'editorial', 'style', 'newsroom-profile.md'),
    '# Profil de test\n\nPhrase médiane 22 mots.\n',
  );
  write(
    path.join(root, 'editorial', 'style', 'corpus', 'newsroom-exemplars.md'),
    `# Exemplaires de test

## Financial Times — FT exemplar

- Attaque : une attaque FT.
- Clôture : une clôture FT.
- 500 mots, phrase médiane 20.

## South China Morning Post — SCMP exemplar

- Attaque : une attaque SCMP.
- Clôture : une clôture SCMP.
- 600 mots, phrase médiane 22.

## Le Monde diplomatique — LMD exemplar

- Attaque : une attaque LMD.
- Clôture : une clôture LMD.
- 2 000 mots, phrase médiane 22.

## Le Monde — Monde exemplar

- Attaque : le Monde ne doit pas être sélectionné.
- Clôture : jamais.
`,
  );
  write(
    path.join(
      root,
      'editorial',
      'style',
      'corpus',
      'financial-times',
      '30.txt',
    ),
    'CHOSEN FT FULL TEXT\n',
  );
  write(
    path.join(
      root,
      'editorial',
      'style',
      'corpus',
      'south-china-morning-post',
      '60.txt',
    ),
    'SPILL SCMP FULL TEXT\n',
  );
  write(
    path.join(
      root,
      'editorial',
      'style',
      'corpus',
      'le-monde-diplomatique',
      '50.txt',
    ),
    'CHOSEN LMD FULL TEXT\n',
  );
  write(
    path.join(root, 'editorial', 'style', 'newsroom-corpus.json'),
    JSON.stringify({
      rows: [
        {
          id: 30,
          site: 'Financial Times',
          title: 'Chosen FT full article',
          words: 12,
          file: 'editorial/style/corpus/financial-times/30.txt',
        },
        {
          id: 60,
          site: 'South China Morning Post',
          title: 'Spill SCMP full article',
          words: 12,
          file: 'editorial/style/corpus/south-china-morning-post/60.txt',
        },
        {
          id: 50,
          site: 'Le Monde diplomatique',
          title: 'Chosen LMD full article',
          words: 12,
          file: 'editorial/style/corpus/le-monde-diplomatique/50.txt',
        },
      ],
    }),
  );
  write(path.join(root, 'editorial', 'README.md'), '# Desk\n');
  write(
    path.join(root, 'src', 'content', 'blog', 'data-centres.mdx'),
    '---\ntitle: "Data centres"\ndescription: "La bulle IA et ses data centres"\npubDate: 2026-01-01\ndraft: false\n---\n\nUn texte sur les data centres et l’IA.\n',
  );
  write(
    path.join(root, 'src', 'content', 'blog', 'inflation.mdx'),
    '---\ntitle: "Inflation"\ndescription: "La monnaie et les prix"\npubDate: 2026-01-02\ndraft: false\n---\n\nUn texte sur l’inflation.\n',
  );
  return root;
}
test('strip and frontmatter helpers', () => {
  const parsed = parseFrontmatter(
    '---\ntitle: "Hello"\ndraft: true\ntags:\n  - IA\n  - Tech\n---\n\nBody\n',
  );
  assert.equal(parsed.data.title, 'Hello');
  assert.equal(parsed.data.draft, true);
  assert.deepEqual(parsed.data.tags, ['IA', 'Tech']);
});

test('coverage detects a paywall CTA and short text', () => {
  const full = assessCoverage({
    capture_success: 1,
    content_text: `${'Un fait précis. '.repeat(60)}`,
    word_count: 180,
  });
  assert.equal(full.level, 'full');

  const partial = assessCoverage({
    capture_success: 1,
    content_text: `${'Un fait. '.repeat(20)} Pour lire la suite, abonnez-vous.`,
    word_count: 160,
  });
  assert.equal(partial.level, 'partial');

  const failed = assessCoverage({
    capture_success: 0,
    capture_error: 'timeout',
  });
  assert.equal(failed.level, 'failed');
});

test('lint and style find the known tics', () => {
  const text =
    'AI est partout... et ce n’est pas une mode, c’est un cycle — vraiment.';
  const lint = lintText(text);
  assert.ok(lint.counts.ai >= 1);
  assert.ok(lint.counts['points-suspension'] >= 1);

  const style = checkStyle(
    `---\ntitle: "T"\n---\n\n${'Ce n’est pas X, c’est Y. '.repeat(6)}`,
  );
  const negation = style.metrics.find(
    (metric) => metric.id === 'negation-opposition',
  );
  assert.ok(negation.over);
});

test('the service reads the desk, creates a piece, writes the angle and archives it', async () => {
  const root = makeWorkspace();
  const service = createBureauService({
    ctx: { get: () => undefined },
    config: { workspaceDir: root },
  });

  const health = await service.health();
  assert.equal(health.ok, true);
  assert.equal(health.instructions.agent, true);
  assert.equal(health.instructions.roles, 7);

  const instructions = await service.instructions();
  assert.ok(instructions.some((doc) => doc.id === 'agent'));
  assert.ok(instructions.some((doc) => doc.id === 'role-redacteur'));
  assert.ok(instructions.some((doc) => doc.id === 'style-exemplars'));

  const piece = await service.createPiece({
    title: 'La bulle IA',
    intent: 'Montrer que la fragilité financière devient politique.',
  });
  assert.equal(piece.slug, 'la-bulle-ia');
  assert.equal(piece.status, 'new');

  const detail = await service.getPiece(piece.slug);
  assert.equal(detail.piece.title, 'La bulle IA');
  assert.equal(detail.stages.length, Object.keys(STAGES).length);
  assert.equal(detail.session.live, false);

  await service.writeAngle(
    piece.slug,
    'Thèse : la bulle se déplace du capital vers le politique.',
  );
  const angle = await service.artifact(piece.slug, 'angle');
  assert.equal(angle.exists, true);
  assert.match(angle.text, /Thèse/);

  await service.setStatus(piece.slug, 'approved');
  assert.equal((await service.getPiece(piece.slug)).piece.status, 'approved');

  // A draft with two known typographic defects.
  write(
    path.join(root, 'src', 'content', 'blog', `${piece.slug}.mdx`),
    '---\ntitle: "La bulle IA"\ndescription: "Test"\npubDate: 2026-01-01\ndraft: true\n---\n\nAI est partout; et ce n’est pas une mode, c’est un cycle — vraiment.\n',
  );
  const checks = await service.checks(piece.slug);
  assert.equal(checks.draftTrue, true);
  assert.ok(checks.summary.errors >= 1);
  assert.ok(checks.summary.overBudget >= 1);

  const related = await service.related('data centres IA');
  assert.equal(related[0].slug, 'data-centres');

  const archived = await service.archivePiece(piece.slug);
  assert.match(archived.archived, /archive/);
  assert.equal(readPiece(root, piece.slug), null);
});

test('the pipeline builds a role prompt and runs brief, draft and style with a fake specialist', async () => {
  const root = makeWorkspace();
  write(
    path.join(root, 'editorial', 'sources', '1', 'meta.json'),
    JSON.stringify({
      bd_id: 1,
      title: 'La source',
      site: 'Test',
      captured_at: '2026-01-03',
      word_count: 500,
      coverage: { level: 'full', reasons: [] },
    }),
  );
  write(
    path.join(root, 'editorial', 'sources', '1', 'text.txt'),
    'Texte de la source.',
  );
  const piece = createPiece(root, {
    slug: 'piece-test',
    title: 'Pièce test',
    intent: 'Tester.',
    sources: [1],
  });
  assert.equal(piece.slug, 'piece-test');

  const prompt = buildPrompt({
    root,
    piece,
    roleId: 'strategist',
    stageId: 'brief',
    sources: [
      {
        bd_id: 1,
        title: 'La source',
        site: 'Test',
        word_count: 500,
        coverage: { level: 'full' },
      },
    ],
    available: [],
    decision: '',
  });
  assert.match(prompt, /Rôle : strategist/);
  assert.match(prompt, /editorial\/sources\/1\/text.txt/);
  assert.match(prompt, /Chosen FT full article/);
  assert.match(prompt, /editorial\/style\/corpus\/financial-times\/30.txt/);

  const briefContent = `# Brief

## Références de style
- path: editorial/style/corpus/financial-times/30.txt
- path: editorial/style/corpus/le-monde-diplomatique/50.txt
`;
  write(
    path.join(root, 'editorial', 'pieces', 'piece-test', 'brief.md'),
    briefContent,
  );

  const writerPrompt = buildPrompt({
    root,
    piece,
    roleId: 'redacteur',
    stageId: 'draft',
    sources: [
      {
        bd_id: 1,
        title: 'La source',
        site: 'Test',
        word_count: 500,
        coverage: { level: 'full' },
      },
    ],
    available: [],
    decision: '',
  });
  assert.match(writerPrompt, /Profil de registre/);
  assert.match(writerPrompt, /Phrase médiane 22 mots/);
  assert.match(writerPrompt, /CHOSEN FT FULL TEXT/);
  assert.match(writerPrompt, /CHOSEN LMD FULL TEXT/);
  assert.match(writerPrompt, /Autres références \(spill\)/);
  assert.match(writerPrompt, /south-china-morning-post\/60\.txt/);
  assert.doesNotMatch(writerPrompt, /Le Monde — Monde exemplar/);

  const fake = async (job) => {
    if (job.output.includes('brief.md')) {
      write(path.join(root, job.output), briefContent);
    }
    if (job.output.endsWith('.mdx')) {
      write(
        path.join(root, job.output),
        '---\ntitle: "T"\ndescription: "D"\npubDate: 2026-01-01\ndraft: true\n---\n\nCorps.\n',
      );
    }
    if (job.output.includes('relecture-style.md')) {
      write(
        path.join(root, job.output),
        '# Relecture de style\n\nRapproche le rythme des exemples.\n',
      );
    }
    return { text: 'fait', sessionId: 'child' };
  };

  const brief = await runStage({
    root,
    slug: 'piece-test',
    stageId: 'brief',
    runAgent: fake,
  });
  assert.equal(brief.results[0].output, 'editorial/pieces/piece-test/brief.md');
  assert.equal(
    fs.existsSync(path.join(root, 'editorial/pieces/piece-test/brief.md')),
    true,
  );

  const draft = await runStage({
    root,
    slug: 'piece-test',
    stageId: 'draft',
    runAgent: fake,
  });
  assert.equal(draft.results[0].output, 'src/content/blog/piece-test.mdx');

  const style = await runStage({
    root,
    slug: 'piece-test',
    stageId: 'style',
    runAgent: fake,
  });
  assert.equal(
    style.results[0].output,
    'editorial/pieces/piece-test/relecture-style.md',
  );
  assert.equal(
    fs.existsSync(
      path.join(root, 'editorial/pieces/piece-test/relecture-style.md'),
    ),
    true,
  );

  setStatus(root, 'piece-test', 'drafted');
});

test('a specialist refusal surfaces its diagnostic', async () => {
  const root = makeWorkspace();
  write(
    path.join(root, 'editorial', 'sources', '1', 'meta.json'),
    JSON.stringify({
      bd_id: 1,
      title: 'La source',
      site: 'Test',
      captured_at: '2026-01-03',
      word_count: 500,
      coverage: { level: 'full', reasons: [] },
    }),
  );
  write(
    path.join(root, 'editorial', 'sources', '1', 'text.txt'),
    'Texte de la source.',
  );
  createPiece(root, {
    slug: 'refusal-test',
    title: 'Pièce refusée',
    intent: 'Tester un refus.',
    sources: [1],
  });

  await assert.rejects(
    () =>
      runStage({
        root,
        slug: 'refusal-test',
        stageId: 'brief',
        runAgent: async () => ({
          text: '',
          sessionId: 'child-refusal',
          stopReason: 'error',
          diagnostic:
            'DeepSeek refused to answer under its content safety review',
        }),
      }),
    /DeepSeek refused to answer/,
  );
});

test('the fixer edits the draft in place and writes a report', async () => {
  const root = makeWorkspace();
  write(
    path.join(root, 'editorial', 'sources', '1', 'meta.json'),
    JSON.stringify({
      bd_id: 1,
      title: 'La source',
      site: 'Test',
      captured_at: '2026-01-03',
      word_count: 500,
      coverage: { level: 'full', reasons: [] },
    }),
  );
  write(
    path.join(root, 'editorial', 'sources', '1', 'text.txt'),
    'Texte de la source.',
  );
  createPiece(root, {
    slug: 'fix-test',
    title: 'Pièce à corriger',
    intent: 'Corriger une faute.',
    sources: [1],
  });
  const draft = path.join(root, 'src', 'content', 'blog', 'fix-test.mdx');
  write(
    draft,
    '---\ntitle: "T"\ndescription: "D"\npubDate: 2026-01-01\ndraft: true\n---\n\nLe comerce russo-chinois progresse.\n',
  );

  let seen = '';
  const result = await runFix({
    root,
    slug: 'fix-test',
    runAgent: async (job) => {
      seen = job.prompt;
      const before = fs.readFileSync(draft, 'utf8');
      write(draft, before.replace('comerce', 'commerce'));
      write(
        path.join(root, 'editorial', 'pieces', 'fix-test', 'fixes.md'),
        '# Corrections\n\n- « comerce » → « commerce » — typo.\n',
      );
      return { text: 'corrigé', sessionId: 'child' };
    },
  });

  assert.match(seen, /Rôle : fixeur/);
  assert.match(seen, /edit/);
  assert.equal(result.stage, 'fix');
  assert.ok(result.outputs.includes('editorial/pieces/fix-test/fixes.md'));
  assert.equal(
    fs.readFileSync(draft, 'utf8').includes('commerce russo-chinois'),
    true,
  );
  assert.equal(
    fs.existsSync(
      path.join(root, 'editorial', 'pieces', 'fix-test', 'fixes.md'),
    ),
    true,
  );
});

test('the illustrator inserts a visual in place and writes a report', async () => {
  const root = makeWorkspace();
  write(
    path.join(root, 'editorial', 'sources', '1', 'meta.json'),
    JSON.stringify({
      bd_id: 1,
      title: 'La source',
      site: 'Test',
      captured_at: '2026-01-03',
      word_count: 500,
      coverage: { level: 'full', reasons: [] },
    }),
  );
  write(
    path.join(root, 'editorial', 'sources', '1', 'text.txt'),
    'Texte de la source.',
  );
  createPiece(root, {
    slug: 'illustration-test',
    title: 'Pièce à illustrer',
    intent: 'Ajouter une photo.',
    sources: [1],
  });
  const draft = path.join(
    root,
    'src',
    'content',
    'blog',
    'illustration-test.mdx',
  );
  write(
    draft,
    '---\ntitle: "T"\ndescription: "D"\npubDate: 2026-01-01\ndraft: true\n---\n\nCorps.\n',
  );

  let seen = '';
  const result = await runIllustration({
    root,
    slug: 'illustration-test',
    request: 'une photo de port',
    runAgent: async (job) => {
      seen = job.prompt;
      const before = fs.readFileSync(draft, 'utf8');
      write(
        draft,
        `${before}\n![Port](../../assets/illustration-test-port.jpg)\n`,
      );
      write(
        path.join(
          root,
          'editorial',
          'pieces',
          'illustration-test',
          'illustrations.md',
        ),
        '# Illustrations\n\n## Insérées\n\n- port.jpg — photo libre.\n',
      );
      return { text: 'illustré', sessionId: 'child' };
    },
  });

  assert.match(seen, /Rôle : illustrateur/);
  assert.match(seen, /edit/);
  assert.match(seen, /photo de port/);
  assert.equal(result.stage, 'illustrate');
  assert.ok(
    result.outputs.includes(
      'editorial/pieces/illustration-test/illustrations.md',
    ),
  );
  assert.equal(
    fs
      .readFileSync(draft, 'utf8')
      .includes('![Port](../../assets/illustration-test-port.jpg)'),
    true,
  );
  assert.equal(
    fs.existsSync(
      path.join(
        root,
        'editorial',
        'pieces',
        'illustration-test',
        'illustrations.md',
      ),
    ),
    true,
  );
});

test('a piece and its draft can be renamed together', () => {
  const root = makeWorkspace();
  createPiece(root, {
    slug: 'old-slug',
    title: 'Ancienne pièce',
    intent: 'Renommer.',
  });
  write(
    path.join(root, 'editorial', 'pieces', 'old-slug', 'angle.md'),
    '# Angle\n\nVoir editorial/pieces/old-slug et src/content/blog/old-slug.mdx.\n',
  );
  write(
    path.join(root, 'editorial', 'pieces', 'old-slug', 'brief.md'),
    '# Brief\n\nVoir src/content/blog/old-slug.mdx.\n',
  );
  write(
    path.join(root, 'src', 'content', 'blog', 'old-slug.mdx'),
    '---\ntitle: "T"\ndescription: "D"\npubDate: 2026-01-01\ndraft: true\n---\n\nVoir editorial/pieces/old-slug.\n',
  );

  const result = renamePiece(root, 'old-slug', 'new-slug');
  assert.equal(result.oldSlug, 'old-slug');
  assert.equal(result.newSlug, 'new-slug');
  assert.equal(
    fs.existsSync(path.join(root, 'editorial', 'pieces', 'old-slug')),
    false,
  );
  assert.equal(
    fs.existsSync(path.join(root, 'editorial', 'pieces', 'new-slug')),
    true,
  );
  assert.equal(
    fs.existsSync(path.join(root, 'src', 'content', 'blog', 'old-slug.mdx')),
    false,
  );
  assert.equal(
    fs.existsSync(path.join(root, 'src', 'content', 'blog', 'new-slug.mdx')),
    true,
  );
  const piece = readPiece(root, 'new-slug');
  assert.equal(piece.slug, 'new-slug');
  const angle = fs.readFileSync(
    path.join(root, 'editorial', 'pieces', 'new-slug', 'angle.md'),
    'utf8',
  );
  assert.match(angle, /editorial\/pieces\/new-slug/);
  assert.doesNotMatch(angle, /old-slug/);
  const draft = fs.readFileSync(
    path.join(root, 'src', 'content', 'blog', 'new-slug.mdx'),
    'utf8',
  );
  assert.match(draft, /editorial\/pieces\/new-slug/);
  assert.doesNotMatch(draft, /old-slug/);
});

test('a piece session is created with a scoped desk prompt and resumed after restart', async () => {
  const root = makeWorkspace();
  const piece = createPiece(root, {
    slug: 'session-test',
    title: 'Session test',
    intent: 'Vérifier la session.',
    sources: [],
  });
  const sections = [];
  const created = [];
  const followups = [];
  let hasUserMessage = false;
  const agent = {
    id: 'live-agent',
    session: {
      ownEvents: () => (hasUserMessage ? [{ type: 'user/message' }] : []),
    },
    followup: (message) => {
      hasUserMessage = true;
      followups.push(message);
    },
  };
  const service = createBureauService({
    ctx: {
      get(name) {
        if (name === 'agents') {
          return {
            create: async (options) => {
              created.push(options);
              return { agent, dispose: async () => {} };
            },
            get: (id) =>
              String(id) === String(piece.session_id) ? agent : agent,
            resume: async () => ({ agent, dispose: async () => {} }),
          };
        }
        if (name === 'agentDefaultModel') {
          return {
            currentSelection: () => ({
              provider: 'deepseek-official',
              model: 'deepseek-flash',
            }),
          };
        }
        return undefined;
      },
    },
    config: { workspaceDir: root },
  });

  const sessionId = await service.openSession('session-test');
  assert.equal(created.length, 1);
  assert.equal(created[0].sessionId, sessionId.sessionId);
  assert.equal(created[0].meta.cwd, root);
  assert.equal(created[0].agentOptions.provider, 'deepseek-official');
  assert.equal(created[0].meta.agentPreset, 'standard');
  assert.equal(readPiece(root, 'session-test').session_id, sessionId.sessionId);
  assert.equal(followups.length, 1);
  assert.match(followups[0].content[0].text, /Session test/);
  assert.match(followups[0].content[0].text, /aucune source figée/);
  assert.equal(followups[0].source.kind, 'user');

  // Opening the same piece again must not replay the bootstrap.
  await service.openSession('session-test');
  assert.equal(followups.length, 1);
  assert.equal(created.length, 1);

  const agentCtx = {
    systemPrompt: {
      section: (section) => {
        sections.push(section);
        return () => {};
      },
    },
    effect: (callback) => callback(),
  };
  created[0].setup(agentCtx, agent);
  assert.equal(sections.length, 1);
  assert.equal(sections[0].name, 'bureau');
  assert.match(sections[0].text(), /Agent du desk/);
  assert.match(sections[0].text(), /Session test/);
  assert.match(sections[0].text(), /Outils du bureau/);
});

test('a stage runs through a DSH subagent activation with the piece agent as parent', async () => {
  const root = makeWorkspace();
  write(
    path.join(root, 'editorial', 'sources', '7', 'meta.json'),
    JSON.stringify({
      bd_id: 7,
      title: 'Source sept',
      site: 'Test',
      captured_at: '2026-01-03',
      word_count: 400,
      coverage: { level: 'full', reasons: [] },
    }),
  );
  write(path.join(root, 'editorial', 'sources', '7', 'text.txt'), 'Texte.');
  createPiece(root, {
    slug: 'activation-test',
    title: 'Activation test',
    intent: 'Vérifier le sous-agent.',
    sources: [7],
  });
  const parent = { id: 'parent-session' };
  const specs = [];
  const service = createBureauService({
    ctx: {
      get(name) {
        if (name === 'subagents') {
          return {
            startActivation: async (spec) => {
              specs.push(spec);
              write(
                path.join(root, 'editorial/pieces/activation-test/brief.md'),
                '# Brief\n\nThèse.\n',
              );
              return {
                childId: 'child-session',
                result: Promise.resolve({
                  output: [{ type: 'text', text: 'fait' }],
                  stopReason: 'completed',
                }),
                dispose: async () => {},
              };
            },
          };
        }
        return undefined;
      },
    },
    config: { workspaceDir: root },
  });

  const result = await service.runStageForAgent({
    slug: 'activation-test',
    stageId: 'brief',
    agent: parent,
  });
  assert.equal(result.label, 'Brief');
  assert.equal(specs.length, 1);
  assert.equal(specs[0].provider, 'spawn');
  assert.equal(specs[0].agentPreset, 'standard');
  assert.equal(specs[0].parent, parent);
  assert.equal(specs[0].cwd, root);
  assert.equal(specs[0].delivery, 'caller');
  assert.equal(specs[0].prompt[0].type, 'text');
  assert.ok(specs[0].signal instanceof AbortSignal);
  assert.match(specs[0].prompt[0].text, /Rôle : strategist/);
  assert.equal(
    fs.existsSync(path.join(root, 'editorial/pieces/activation-test/brief.md')),
    true,
  );
});

test('the bundled Inter font and its license are present', () => {
  const root = path.resolve(import.meta.dirname, '..');
  const font = path.join(root, 'fonts', 'InterVariable.woff2');
  const license = path.join(root, 'fonts', 'OFL.txt');
  assert.ok(fs.statSync(font).size > 100_000);
  assert.match(fs.readFileSync(license, 'utf8'), /SIL OPEN FONT LICENSE/i);
});

test('long titles and intents never become an overlong directory name', async () => {
  const root = makeWorkspace();
  const longTitle = 'Un titre très long pour une pièce éditoriale '.repeat(8);
  const first = createPiece(root, {
    title: longTitle,
    intent: 'Une intention courte.',
  });
  assert.ok(first.slug.length <= MAX_SLUG_LENGTH);
  assert.ok(fs.existsSync(path.join(root, 'editorial', 'pieces', first.slug)));
  assert.ok(readPiece(root, first.slug));

  const second = createPiece(root, {
    title: longTitle,
    intent: 'Une autre intention.',
  });
  assert.ok(second.slug.length <= MAX_SLUG_LENGTH);
  assert.notEqual(second.slug, first.slug);
  assert.match(second.slug, /-2$/);

  const service = createBureauService({
    ctx: { get: () => undefined },
    config: { workspaceDir: root },
  });
  const longIntent =
    "Ce que je veux dire est long, et ce n'est pas un nom de fichier : ".repeat(
      20,
    );
  const third = await service.createPiece({ intent: longIntent });
  assert.match(third.slug, /^piece-\d{4}-\d{2}-\d{2}/);
  assert.ok(third.slug.length <= MAX_SLUG_LENGTH);
  assert.ok(third.title.length <= 80);
  assert.ok(readPiece(root, third.slug));
  assert.equal(readPiece(root, third.slug).intent, longIntent.trim());
});

test('an ungrouped legacy session is archived and replaced by a grouped one', async () => {
  const root = makeWorkspace();
  createPiece(root, {
    slug: 'legacy-session',
    title: 'Legacy session',
    intent: 'Reprendre une ancienne session.',
    sources: [],
  });
  updatePiece(root, 'legacy-session', { session_id: 'old-session' });

  const archived = [];
  const attached = [];
  const created = [];
  const followups = [];
  const agent = {
    id: 'new-session',
    session: { ownEvents: () => [] },
    followup: (message) => followups.push(message),
    model: { current: () => undefined, select: () => {} },
  };
  const workspace = {
    id: 'ws-1',
    sessionIds: [],
    attachSession: async (id) => attached.push(id),
  };
  const service = createBureauService({
    ctx: {
      get(name) {
        if (name === 'workspaceRegistry') {
          return {
            resolveByPath: async () => workspace,
            archiveSession: async (id) => archived.push(id),
          };
        }
        if (name === 'agents') {
          return {
            create: async (options) => {
              created.push(options);
              return { agent, dispose: async () => {} };
            },
            get: () => agent,
            list: () => [agent],
          };
        }
        if (name === 'agentDefaultModel') {
          return {
            currentSelection: () => ({
              provider: 'deepseek-official',
              model: 'deepseek-flash',
            }),
          };
        }
        return undefined;
      },
    },
    config: { workspaceDir: root },
  });

  const session = await service.openSession('legacy-session');
  assert.deepEqual(archived, ['old-session']);
  assert.equal(created.length, 1);
  assert.equal(created[0].agentOptions.provider, 'deepseek-official');
  assert.equal(created[0].meta.agentPreset, 'standard');
  assert.deepEqual(attached, [session.sessionId]);
  assert.equal(readPiece(root, 'legacy-session').session_id, session.sessionId);
  assert.equal(followups.length, 1);
});

test('stopping the conversation aborts desk_run and disposes the specialist', async () => {
  const root = makeWorkspace();
  write(
    path.join(root, 'editorial', 'sources', '9', 'meta.json'),
    JSON.stringify({
      bd_id: 9,
      title: 'Source neuf',
      site: 'Test',
      captured_at: '2026-01-03',
      word_count: 400,
      coverage: { level: 'full', reasons: [] },
    }),
  );
  write(path.join(root, 'editorial', 'sources', '9', 'text.txt'), 'Texte.');
  createPiece(root, {
    slug: 'abort-test',
    title: 'Abort test',
    intent: 'Vérifier l’arrêt.',
    sources: [9],
  });

  let disposed = 0;
  const service = createBureauService({
    ctx: {
      get(name) {
        if (name === 'subagents') {
          return {
            startActivation: async () => ({
              childId: 'child-session',
              result: new Promise(() => {}),
              dispose: async () => {
                disposed += 1;
              },
            }),
          };
        }
        return undefined;
      },
    },
    config: { workspaceDir: root, stageTimeoutMinutes: 30 },
  });

  const controller = new AbortController();
  const run = service.runStageForAgent({
    slug: 'abort-test',
    stageId: 'research',
    agent: { id: 'parent-session' },
    signal: controller.signal,
  });
  setTimeout(() => controller.abort(), 20);
  await assert.rejects(
    run,
    (error) => error instanceof Error && error.name === 'AbortError',
  );
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.ok(disposed >= 1);
});

test('a pipeline run can be cancelled from the panel', async () => {
  const root = makeWorkspace();
  write(
    path.join(root, 'editorial', 'sources', '10', 'meta.json'),
    JSON.stringify({
      bd_id: 10,
      title: 'Source dix',
      site: 'Test',
      captured_at: '2026-01-03',
      word_count: 400,
      coverage: { level: 'full', reasons: [] },
    }),
  );
  write(path.join(root, 'editorial', 'sources', '10', 'text.txt'), 'Texte.');
  createPiece(root, {
    slug: 'cancel-run',
    title: 'Cancel run',
    intent: 'Vérifier l’arrêt du panneau.',
    sources: [10],
  });

  const parent = { id: 'parent-session' };
  const service = createBureauService({
    ctx: {
      get(name) {
        if (name === 'agents') {
          return { list: () => [parent], get: () => parent };
        }
        if (name === 'subagents') {
          return {
            startActivation: async () => ({
              childId: 'child-session',
              result: new Promise(() => {}),
              dispose: async () => {},
            }),
          };
        }
        return undefined;
      },
    },
    config: { workspaceDir: root, stageTimeoutMinutes: 30 },
  });

  const started = await service.startStage('cancel-run', 'research');
  assert.equal(started.status, 'running');
  service.cancelRun(started.id);
  for (let index = 0; index < 50; index += 1) {
    if (service.runStatus(started.id).status !== 'running') break;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.equal(service.runStatus(started.id).status, 'cancelled');
});
