#!/usr/bin/env node

// Faux binaire dsh qui échoue comme le vrai : l'erreur est un événement JSON
// sur stdout, stderr reste vide, et le code de sortie est 1.

process.stdout.write(
  `${JSON.stringify({ type: 'error', message: 'boom: credentials refusées' })}\n`,
);
process.exit(1);
