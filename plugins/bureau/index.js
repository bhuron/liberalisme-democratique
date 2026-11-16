/**
 * Le bureau — Host half.
 *
 * The editorial desk as a DSH bundle. The application code lives here, in the
 * plugin: the blog repository contributes its instruction files
 * (`editorial/agent/**`, `editorial/style/*.md`) and the data it owns
 * (`editorial/pieces`, `editorial/sources`, `src/content/blog`). The plugin
 * relies on DSH for everything else: tools, isolated specialist sessions,
 * agents, the system prompt, the web carrier, slots and locale.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createBureauService } from './lib/service.js';
import { registerRoutes } from './lib/http.js';
import { registerSkill } from './lib/skill.js';
import { registerTools } from './lib/tools.js';

export const name = 'bureau';

/** `tools` is the one hard dependency: it is the agent-facing surface. */
export const inject = ['tools'];

// Resolve DSH helpers from the running installation, not from this repository:
// the plugin is loaded by the dsh process, whose own node_modules owns these
// packages. Missing helpers degrade gracefully (the panel still works).
const requireFromDsh = createRequire(
  process.argv[1] ?? path.join(process.cwd(), 'index.js'),
);

let defineTool;
try {
  ({ defineTool } = await import(
    requireFromDsh.resolve('@deepseek-ai/dsh-tools')
  ));
} catch {
  defineTool = undefined;
}

let z;
try {
  z = (await import(requireFromDsh.resolve('@deepseek-ai/schemastery')))
    .default;
} catch {
  z = undefined;
}

export const Config = z
  ? z.object({
      workspaceDir: z.string().default(''),
      bookmarkRoot: z.string().default(''),
      bookmarkDb: z.string().default(''),
      bookmarkApi: z.string().default(''),
      agentPreset: z.string().default('standard'),
      stageTimeoutMinutes: z.number().default(15),
    })
  : undefined;

export function apply(ctx, config) {
  const service = createBureauService({ ctx, config });
  const assetRoot = path.dirname(fileURLToPath(import.meta.url));

  if (!ctx.get?.('bureau')) {
    ctx.effect(() => ctx.provide('bureau', service), 'bureau: service');
  }

  if (defineTool) {
    registerTools(ctx, service, defineTool);
  } else {
    console.warn(
      '[bureau] @deepseek-ai/dsh-tools introuvable : les outils desk_* ne sont pas enregistrés.',
    );
  }

  const installRoutes = (owner, web) => {
    owner.effect(
      () => registerRoutes({ web, service, assetRoot }),
      'bureau: same-origin panel API',
    );
  };

  const web = ctx.get?.('webServer');
  if (web) {
    installRoutes(ctx, web);
  } else if (typeof ctx.inject === 'function') {
    // The web carrier may mount after this plugin. Wait for the service
    // instead of concluding at apply time that there is no panel.
    ctx.inject(['webServer'], (scope) => {
      if (scope.webServer) installRoutes(scope, scope.webServer);
    });
  }

  registerSkill(ctx, service);

  ctx.effect(
    () => () => {
      void service.dispose();
    },
    'bureau: dispose sessions and runs',
  );
}
