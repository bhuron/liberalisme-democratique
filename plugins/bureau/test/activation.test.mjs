import assert from 'node:assert/strict';
import test from 'node:test';

import { apply } from '../index.js';

test('the panel routes wait for the webServer service', () => {
  const provided = new Map();
  const injections = [];
  const routes = [];

  const ctx = {
    get(name) {
      return provided.get(name);
    },
    provide(name, value) {
      provided.set(name, value);
      return () => provided.delete(name);
    },
    effect(callback) {
      const disposable = callback();
      return typeof disposable === 'function' ? disposable : () => {};
    },
    inject(services, callback) {
      injections.push({ services, callback });
      return () => {};
    },
    on() {
      return () => {};
    },
    tools: { register: () => () => {} },
  };

  apply(ctx, {});

  assert.equal(injections.length, 1);
  assert.deepEqual(injections[0].services, ['webServer']);

  const web = {
    register(route) {
      routes.push(route);
      return () => {};
    },
  };
  injections[0].callback({
    webServer: web,
    effect(callback) {
      const disposable = callback();
      return typeof disposable === 'function' ? disposable : () => {};
    },
  });

  assert.equal(routes.length, 1);
  assert.equal(routes[0].kind, 'prefix');
  assert.equal(routes[0].path, '/api/bureau');
});
