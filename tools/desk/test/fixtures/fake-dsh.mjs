#!/usr/bin/env node

// Faux binaire dsh pour tester le pont sans modèle ni credentials.
// Il lit le prompt sur stdin et projette le même flux NDJSON que
// `dsh --profile headless --json`.

let prompt = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  prompt += chunk;
});
process.stdin.on('end', () => {
  const sessionId = process.env.FAKE_SESSION_ID ?? 'fake-session-1';
  const lines = [
    { type: 'session', sessionId, cwd: process.cwd() },
    { type: 'text', text: 'Réponse du faux agent. ' },
    {
      type: 'final',
      text: `Réponse du faux agent.\n\nPrompt reçu : ${prompt.slice(0, 200)}`,
    },
  ];
  for (const line of lines) console.log(JSON.stringify(line));
});
