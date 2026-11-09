import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const moduleUrl = new URL('../../scripts/distribution/manifest.mjs', import.meta.url);
const sha = 'a'.repeat(64);
const commit = 'b'.repeat(40);
export function fixture() {
  const release = `app-v1.21.0-${commit.slice(0, 12)}-20261106T010203Z`;
  return { schemaVersion: 1, release, appVersion: '1.21.0', sourceRepository: 'bsgirardi/appb2t', sourceCommit: commit,
    platform: 'linux/amd64', baseReference: `node:22-bookworm-slim@sha256:${sha}`,
    images: { app: { tag: `appb2t-app:${release}`, imageId: `sha256:${sha}`, sizeBytes: 1024 },
      tools: { tag: `appb2t-tools:${release}`, imageId: `sha256:${sha}`, sizeBytes: 2048 } },
    files: [{ name: 'images.tar.gz', sizeBytes: 512, sha256: sha }, { name: 'compose.production.yaml', sizeBytes: 200, sha256: sha }] };
}
test('distribution contract exists', () => assert.ok(existsSync(moduleUrl)));
test('accepts numeric releases while retaining unique image build identities', async () => {
  const { validateManifest } = await import(moduleUrl);
  const m = fixture(); m.release = '1.21.0';
  assert.equal(validateManifest(m).release, '1.21.0');
  m.images.tools.tag = m.images.tools.tag.replace('010203', '010204');
  assert.throws(() => validateManifest(m), /tag/);
});
test('rejects numeric release versions that disagree with the application', async () => {
  const { validateManifest } = await import(moduleUrl);
  for (const release of ['1.21.1', 'v1.21.0', '1.21.0/other', 'latest']) {
    const m = fixture(); m.release = release;
    assert.throws(() => validateManifest(m), /Release/);
  }
});
test('accepts a complete delivery and distinguishes rebuilds', async () => {
  const { validateManifest } = await import(moduleUrl);
  const m = fixture(); assert.deepEqual(validateManifest(m), m);
  m.release = m.release.replace('010203', '010204');
  assert.throws(() => validateManifest(m), /tag/);
});
test('rejects ambiguous or unsafe delivery metadata', async () => {
  const { validateManifest } = await import(moduleUrl);
  const cases = [m => m.extra = 'secret', m => m.files[0].name = '../images.tar.gz', m => m.platform = 'windows/amd64',
    m => m.sourceCommit = 'main', m => m.files[0].sha256 = 'bad', m => m.files[0].sizeBytes = 2 ** 31,
    m => m.images.app.sizeBytes = -1, m => m.files.push(m.files[0]), m => m.images.app.extra = true,
    m => m.baseReference = 'node:latest', m => m.appVersion = '1.20.0', m => m.images.app.imageId = 'sha256:bad',
    m => m.files[0].sizeBytes = 1.5, m => m.images.tools.tag = 'other:latest'];
  for (const mutate of cases) { const m = fixture(); mutate(m); assert.throws(() => validateManifest(m)); }
});
test('production compose never builds or pulls and requires an explicit image', () => {
  const compose = readFileSync(new URL('../../compose.production.yaml', import.meta.url), 'utf8');
  assert.doesNotMatch(compose, /^\s+build:/m);
  assert.match(compose, /APP_IMAGE_TAG:\?/);
  assert.match(compose, /pull_policy: never/);
});
test('CLI rejects invalid JSON without invoking Docker', () => {
  const r = spawnSync(process.execPath, [moduleUrl.pathname.replace(/^\/(\w:)/, '$1'), 'validate', 'does-not-exist'], { encoding: 'utf8' });
  assert.notEqual(r.status, 0);
});
