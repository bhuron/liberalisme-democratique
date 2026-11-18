import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  checkRemoteImages,
  checkRepeatedLinks,
  collectAssets,
  parseArticle,
  setDraftFalse,
} from '../../../scripts/publish-article.mjs';

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'publish-test-'));
  const articleDir = path.join(root, 'src', 'content', 'blog');
  const assetsDir = path.join(root, 'src', 'assets');
  fs.mkdirSync(articleDir, { recursive: true });
  fs.mkdirSync(assetsDir, { recursive: true });
  fs.writeFileSync(path.join(assetsDir, 'x.jpg'), 'image');
  const articleFile = path.join(articleDir, 'test.mdx');
  const text = `---
title: "Titre"
description: "Description"
pubDate: 2026-01-01
draft: true
tags:
  - Test
---

![x](../../assets/x.jpg)
`;
  fs.writeFileSync(articleFile, text);
  return { root, articleFile, text };
}

test('publish helpers toggle draft and collect local assets', () => {
  const { root, articleFile, text } = fixture();
  const article = parseArticle(text);
  assert.equal(article.data.draft, true);
  assert.equal(article.data.title, 'Titre');
  assert.deepEqual(collectAssets(root, articleFile, text, article.data), [
    'src/assets/x.jpg',
  ]);

  const published = setDraftFalse(text);
  assert.match(published, /^draft: false$/m);
  assert.match(published, /!\[x\]\(\.\.\/\.\.\/assets\/x\.jpg\)/);
  assert.equal(published.includes('draft: true'), false);
});

test('publish helpers refuse missing or remote visuals', () => {
  const { root, articleFile, text } = fixture();
  const article = parseArticle(text);
  assert.throws(
    () =>
      collectAssets(
        root,
        articleFile,
        '![x](../../assets/missing.jpg)',
        article.data,
      ),
    /introuvable/,
  );
  assert.throws(
    () => checkRemoteImages('![x](https://example.com/x.jpg)'),
    /distante/,
  );
  assert.throws(
    () =>
      checkRepeatedLinks(
        'Le chiffre [a](https://example.com/source) et [b](https://example.com/source).',
      ),
    /répété/,
  );
  assert.doesNotThrow(() =>
    checkRepeatedLinks(
      'Le chiffre [a](https://example.com/source) et [b](https://example.com/autre).',
    ),
  );
});
