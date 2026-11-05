import assert from 'node:assert/strict';
import test from 'node:test';

import { assessCoverage, looksTruncated } from '../lib/coverage.mjs';

const body = 'Une phrase complète et sourcée. '.repeat(40);

test('un texte qui finit proprement est complet', () => {
  const coverage = assessCoverage({ content_text: body, word_count: 240 });
  assert.equal(coverage.level, 'full');
});

test('un encart court après le dernier point reste complet', () => {
  const text = `${body}Bill Gates on the risks and rewards of AI | FT Interview`;
  assert.equal(looksTruncated(text), false);
  assert.equal(
    assessCoverage({ content_text: text, word_count: 250 }).level,
    'full',
  );
});

test('un appel à l’abonnement rend la capture partielle', () => {
  const text = `${body}Subscribe to read more.`;
  const coverage = assessCoverage({ content_text: text, word_count: 250 });
  assert.equal(coverage.level, 'partial');
  assert.match(coverage.reasons.join(' '), /abonnement/);
});

test('une longue traîne sans ponctuation rend la capture partielle', () => {
  const tail = `La phrase finale continue ${'sans ponctuation '.repeat(18)}`;
  const text = `${body}${tail}`;
  assert.equal(looksTruncated(text), true);
  assert.equal(
    assessCoverage({ content_text: text, word_count: 250 }).level,
    'partial',
  );
});

test('un texte très court est partiel', () => {
  assert.equal(
    assessCoverage({ content_text: 'Trop court.', word_count: 2 }).level,
    'partial',
  );
});

test('une capture échouée est signalée', () => {
  const coverage = assessCoverage({ content_text: '', capture_success: 0 });
  assert.equal(coverage.level, 'failed');
});
