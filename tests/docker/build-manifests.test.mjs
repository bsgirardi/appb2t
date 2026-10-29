import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createManifests, finalizeTools } from '../../scripts/docker/build-manifests.mjs';

const source = () => ({
  pkg: JSON.parse(readFileSync(new URL('../../package.json', import.meta.url))),
  lock: JSON.parse(readFileSync(new URL('../../package-lock.json', import.meta.url))),
});
const bump = ({ pkg, lock }) => {
  pkg.version = lock.version = lock.packages[''].version = '99.0.1';
};

test('version-only update preserves installation inputs and restores visible tools version', () => {
  const input = source();
  const before = structuredClone(input);
  const first = createManifests(input.pkg, input.lock);
  assert.deepEqual(input, before);
  bump(input);
  const next = createManifests(input.pkg, input.lock);
  assert.deepEqual(first.deps, next.deps);
  assert.deepEqual(first.tools, next.tools);
  const final = finalizeTools(input.pkg, next.tools.lock, input.lock);
  assert.equal(final.pkg.version, '99.0.1');
  assert.equal(final.lock.version, '99.0.1');
  assert.equal(final.lock.packages[''].version, '99.0.1');
});

test('real manifest changes and transitive lock changes invalidate installation', () => {
  const input = source();
  const first = createManifests(input.pkg, input.lock);
  input.pkg.dependencies.zod = input.lock.packages[''].dependencies.zod = '^99.0.0';
  const changed = createManifests(input.pkg, input.lock);
  assert.notDeepEqual(changed.deps, first.deps);
  assert.notDeepEqual(changed.tools, first.tools);
  input.lock.packages['node_modules/zod'].integrity += '-different';
  assert.notDeepEqual(createManifests(input.pkg, input.lock).tools, changed.tools);
});

test('root install hooks preserve version-sensitive full installation semantics', () => {
  for (const hook of ['preinstall', 'install', 'postinstall', 'prepublish', 'preprepare', 'prepare', 'postprepare', 'dependencies']) {
    const input = source();
    input.pkg.scripts[hook] = 'node prepare.mjs';
    const first = createManifests(input.pkg, input.lock);
    assert.deepEqual(first.deps.pkg, input.pkg);
    bump(input);
    assert.notDeepEqual(createManifests(input.pkg, input.lock).deps, first.deps);
  }
});

test('tools contains only audited commands and direct dependencies', () => {
  const { pkg, lock } = source();
  const result = createManifests(pkg, lock).tools;
  assert.deepEqual(Object.keys(result.pkg.dependencies).sort(), ['@inquirer/prompts', '@prisma/client', 'prisma', 'tsx', 'zod']);
  assert.equal(result.pkg.devDependencies, undefined);
  assert.deepEqual(result.pkg.scripts, { 'db:migrate': pkg.scripts['db:migrate'], 'admin:create': pkg.scripts['admin:create'] });
  assert.equal(result.pkg.dependencies.tsx, pkg.devDependencies.tsx);
  assert.equal(result.lock.packages[''].devDependencies, undefined);
});

test('rejects incomplete sources, version mismatch and workspaces', () => {
  const { pkg, lock } = source();
  const bad = structuredClone(pkg);
  delete bad.dependencies.zod;
  assert.throws(() => createManifests(bad, lock), /zod/);
  assert.throws(() => createManifests({ ...pkg, version: 'mismatch' }, lock), /version/i);
  assert.throws(() => createManifests({ ...pkg, workspaces: ['packages/*'] }, lock), /workspace/i);
  assert.throws(() => createManifests(pkg, { ...lock, lockfileVersion: 1 }), /lockfile/i);
});

test('does not rewrite registry versions or integrity records in seed lock', () => {
  const { pkg, lock } = source();
  const generated = createManifests(pkg, lock);
  for (const [name, value] of Object.entries(lock.packages)) {
    if (name) assert.deepEqual(generated.tools.lock.packages[name], value);
  }
});

test('rejects lock resolution that introduces a new package artifact', () => {
  const { pkg, lock } = source();
  const resolved = createManifests(pkg, lock).tools.lock;
  resolved.packages['node_modules/zod'].version = '99.0.0';
  assert.throws(() => finalizeTools(pkg, resolved, lock), /changed locked artifact/);
});
