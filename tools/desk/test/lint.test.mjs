import assert from 'node:assert/strict';
import test from 'node:test';

import { lintText } from '../lib/lint-fr.mjs';

const rules = (text) => lintText(text).findings.map((finding) => finding.rule);

test('une ponctuation sans espace insécable est signalée', () => {
  assert.ok(rules('Bonjour: le monde').includes('nbsp-manquante'));
});

test('une espace sécable est signalée', () => {
  assert.ok(rules('Bonjour : le monde').includes('espace-secable'));
});

test('des guillemets mal espacés sont signalés', () => {
  const found = rules('Il dit «bonjour» à tous.');
  assert.ok(found.includes('guillemet-ouverture'));
  assert.ok(found.includes('guillemet-fermeture'));
});

test('les guillemets corrects passent', () => {
  const found = rules('Il dit «\u00a0bonjour\u00a0» à tous.');
  assert.deepEqual(found, []);
});

test('AI est signalé en français', () => {
  assert.ok(rules('L’AI progresse.').includes('ai'));
});

test('un tiret cadratin sans espace est signalé', () => {
  assert.ok(rules('La bulle—pas la crise—continue.').includes('tiret'));
});

test('le code et les URL ne sont pas lus comme de la prose', () => {
  assert.deepEqual(rules('Voir https://example.com/a:b et `a:b`.'), []);
});

test('le frontmatter est ignoré', () => {
  assert.deepEqual(
    rules('---\ntitle: "Test: oui"\n---\n\nUn texte propre.\n'),
    [],
  );
});
