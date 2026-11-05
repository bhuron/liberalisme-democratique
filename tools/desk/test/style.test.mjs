import assert from 'node:assert/strict';
import test from 'node:test';

import { checkStyle } from '../lib/style-check.mjs';

const metric = (result, id) =>
  result.metrics.find((candidate) => candidate.id === id);

test('détecte le renversement « ce n’est pas X, c’est Y »', () => {
  const result = checkStyle(
    "Ce n'est pas la dette qui arrêtera la bulle, c'est le bulletin de vote.",
  );
  assert.ok(metric(result, 'negation-opposition').count >= 1);
});

test('détecte l’annonce « Deux… Ensemble… »', () => {
  const result = checkStyle(
    'Deux nouvelles. Ensemble, elles déplacent la contrainte.',
  );
  assert.ok(metric(result, 'ensemble').count >= 1);
});

test('un texte sobre ne dépasse aucun budget', () => {
  const result = checkStyle(
    'Les électeurs ont élu trois gouverneurs hostiles. Microsoft a refusé une option de 500 mégawatts. Le crédit se ferme.',
  );
  assert.equal(
    result.metrics.some((candidate) => candidate.over),
    false,
  );
});

test('compte les tirets par millier de mots', () => {
  const text = `Un ${'— '.repeat(30)}texte de quelques mots seulement.`;
  assert.ok(metric(checkStyle(text), 'tiret').over);
});

test('le frontmatter et le code sont ignorés', () => {
  const result = checkStyle(
    '---\ntitle: "Ce n\'est pas X, c\'est Y"\n---\n\nUn texte propre.\n',
  );
  assert.equal(metric(result, 'negation-opposition').count, 0);
});
