import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { runAgent } from '../lib/agent.mjs';

test('remonte le message d’erreur de dsh au lieu d’un code nu', async () => {
  const previousBinary = process.env.DSH_BIN;
  const previousAgent = process.env.DESK_AGENT;

  process.env.DSH_BIN = fileURLToPath(
    new URL('./fixtures/failing-dsh.mjs', import.meta.url),
  );
  process.env.DESK_AGENT = 'dsh';

  try {
    await assert.rejects(
      runAgent({
        piece: { slug: 'x', session_id: null },
        prompt: 'test',
        bootstrap: true,
      }),
      /boom: credentials refusées/,
    );
  } finally {
    if (previousBinary === undefined) delete process.env.DSH_BIN;
    else process.env.DSH_BIN = previousBinary;

    if (previousAgent === undefined) delete process.env.DESK_AGENT;
    else process.env.DESK_AGENT = previousAgent;
  }
});
