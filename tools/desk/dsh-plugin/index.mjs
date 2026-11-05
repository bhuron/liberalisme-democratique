import { createRequire } from 'node:module';
import { runStage, runReviewLoop } from '../lib/pipeline.mjs';
import { STAGES } from '../lib/roles.mjs';

// Resolve the DSH package from the running dsh installation, not from this
// repository: the plugin is loaded by the dsh process, whose own node_modules
// owns @deepseek-ai/dsh-tools.
const require = createRequire(process.argv[1] ?? `${process.cwd()}/`);
const { defineTool } = await import(require.resolve('@deepseek-ai/dsh-tools'));

export const name = 'desk-plugin';
export const inject = ['tools', 'subagents'];

async function runNative(ctx, exec, job) {
  if (!exec.agent) {
    throw new Error('desk plugin requires a calling agent (exec.agent).');
  }

  const activation = await ctx.subagents.startActivation({
    provider: 'spawn',
    label: `${job.stageId} · ${job.role}`,
    request: {
      prompt: [{ type: 'text', text: job.prompt }],
      parent: exec.agent,
    },
    signal: exec.signal,
    delivery: 'caller',
  });

  try {
    const result = await activation.result;
    const text = (result.output ?? [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');
    return {
      sessionId: String(activation.childId),
      text,
      tools: [],
    };
  } finally {
    await activation.dispose().catch(() => {});
  }
}

function formatStage(result) {
  const lines = [`${result.label} — ${result.results.length} rôle(s)`];
  for (const entry of result.results) {
    lines.push(`${entry.label} → ${entry.output}`);
    if (entry.text) lines.push(String(entry.text).slice(0, 600));
  }
  for (const card of result.scorecards ?? []) {
    lines.push(
      `${card.role} : ${card.score}/100, ${card.must_fix.length} must-fix`,
    );
  }
  return lines.join('\n');
}

function formatLoop(result) {
  return result.history
    .map(
      (entry) =>
        `Itération ${entry.iteration} : ${entry.mustFix} must-fix (${entry.scores
          .map((score) => `${score.role} ${score.score}`)
          .join(', ')})`,
    )
    .join('\n');
}

export function apply(ctx) {
  const deskRun = defineTool({
    name: 'desk_run',
    description:
      'Run one desk pipeline stage with its isolated specialist(s). Stages: research, brief, draft, critique, revise, package. The specialist writes the artefact itself; this tool returns a summary. Use desk_loop for critique + revision.',
    parameters: {
      slug: {
        type: 'string',
        required: true,
        description: 'The desk piece slug (for example la-bulle-ia).',
      },
      stage: {
        type: 'string',
        required: true,
        enum: Object.keys(STAGES),
        description: 'The pipeline stage to run.',
      },
    },
    output: {
      schema: { type: 'string' },
      render: (args, value) => [{ type: 'text', text: String(value) }],
    },
    isConcurrencySafe: () => false,
    async execute(args, exec) {
      const result = await runStage({
        slug: args.slug,
        stageId: args.stage,
        runAgent: (job) => runNative(ctx, exec, job),
      });
      return formatStage(result);
    },
  });

  const deskLoop = defineTool({
    name: 'desk_loop',
    description:
      'Run the desk evaluator-optimizer loop: the three critiques in parallel, then the reviser applies the must-fix, until the scores are sufficient or maxIterations. The specialists run in isolated subagents.',
    parameters: {
      slug: {
        type: 'string',
        required: true,
        description: 'The desk piece slug.',
      },
      maxIterations: {
        type: 'integer',
        description: 'Maximum critique/revision passes (1-3, default 2).',
      },
    },
    output: {
      schema: { type: 'string' },
      render: (args, value) => [{ type: 'text', text: String(value) }],
    },
    isConcurrencySafe: () => false,
    async execute(args, exec) {
      const result = await runReviewLoop({
        slug: args.slug,
        maxIterations: Math.min(
          Math.max(Number(args.maxIterations) || 2, 1),
          3,
        ),
        runAgent: (job) => runNative(ctx, exec, job),
      });
      return formatLoop(result);
    },
  });

  ctx.effect(() => {
    const disposeRun = ctx.tools.register(deskRun);
    const disposeLoop = ctx.tools.register(deskLoop);
    return () => {
      disposeRun();
      disposeLoop();
    };
  });
}
