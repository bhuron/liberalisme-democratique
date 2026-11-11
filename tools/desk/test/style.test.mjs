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

test('détecte la variante « X n’est pas Y, elle est Z »', () => {
  const result = checkStyle(
    'La performance n’est pas dans l’outil, elle est dans les gens.',
  );
  assert.ok(metric(result, 'negation-opposition').count >= 1);
});

test('détecte la variante « X n’est pas Y mais Z »', () => {
  const result = checkStyle(
    'Le problème n’est pas technique mais politique, et il se règle ailleurs.',
  );
  assert.ok(metric(result, 'negation-opposition').count >= 1);
});

test('détecte la négation reprise par un pronom, quel que soit le verbe', () => {
  const result = checkStyle(
    'Le cas de Binance ne rompt pas cette série, il en déplace l’échelle.',
  );
  assert.ok(metric(result, 'negation-opposition').count >= 1);
});

test('détecte la négation reprise après deux-points', () => {
  const result = checkStyle(
    'Le dispositif ne cherche pas à former tout le monde : il cherche à trier.',
  );
  assert.ok(metric(result, 'negation-opposition').count >= 1);
});

test('ne signale pas une conditionnelle ni une relative', () => {
  assert.equal(
    metric(
      checkStyle('Si on ne se trompe pas, on repart avec la voiture.'),
      'negation-opposition',
    ).count,
    0,
  );
  assert.equal(
    metric(
      checkStyle(
        'Des activités qui ne sont pas viables, ce qui suppose un soutien public.',
      ),
      'negation-opposition',
    ).count,
    0,
  );
});

test('ne signale pas « non pas seulement … mais également »', () => {
  const result = checkStyle(
    'On peut réaliser le possible, non pas seulement dans le présent mais également dans le passé.',
  );
  assert.equal(metric(result, 'negation-opposition').count, 0);
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
