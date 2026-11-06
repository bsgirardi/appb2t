import { readFileSync, statSync, createReadStream, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const hash = /^[a-f0-9]{64}$/;
const id = /^sha256:[a-f0-9]{64}$/;
function requireValue(ok, message) { if (!ok) throw new Error(message); }
function keys(value, expected) {
  requireValue(value && typeof value === 'object' && !Array.isArray(value), 'Objeto inválido');
  requireValue(Object.keys(value).sort().join(',') === [...expected].sort().join(','), 'Campos inválidos');
}
export function validateManifest(m) {
  keys(m, ['schemaVersion', 'release', 'appVersion', 'sourceRepository', 'sourceCommit', 'platform', 'baseReference', 'images', 'files']);
  requireValue(m.schemaVersion === 1, 'Schema inválido');
  requireValue(/^\d+\.\d+\.\d+$/.test(m.appVersion), 'Versão inválida');
  requireValue(m.sourceRepository === 'bsgirardi/appb2t' && /^[a-f0-9]{40}$/.test(m.sourceCommit), 'Origem inválida');
  requireValue(['linux/amd64', 'linux/arm64'].includes(m.platform), 'Plataforma inválida');
  requireValue(/^node:22-bookworm-slim@sha256:[a-f0-9]{64}$/.test(m.baseReference), 'Base inválida');
  const prefix = `app-v${m.appVersion}-${m.sourceCommit.slice(0, 12)}-`;
  requireValue(typeof m.release === 'string' && m.release.startsWith(prefix) && /^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$/.test(m.release.slice(prefix.length)), 'Release inválida');
  keys(m.images, ['app', 'tools']);
  for (const name of ['app', 'tools']) {
    const image = m.images[name]; keys(image, ['tag', 'imageId', 'sizeBytes']);
    requireValue(image.tag === `appb2t-${name}:${m.release}` && image.tag.split(':')[1].length <= 128, 'Image tag inválida');
    requireValue(id.test(image.imageId) && Number.isSafeInteger(image.sizeBytes) && image.sizeBytes > 0 && image.sizeBytes <= 64 * 2 ** 30, 'Imagem inválida');
  }
  requireValue(Array.isArray(m.files) && m.files.length === 2, 'Arquivos inválidos');
  requireValue(m.files.map(f => f.name).sort().join(',') === 'compose.production.yaml,images.tar.gz', 'Nomes inválidos');
  for (const file of m.files) {
    keys(file, ['name', 'sizeBytes', 'sha256']);
    requireValue(Number.isSafeInteger(file.sizeBytes) && file.sizeBytes > 0 && file.sizeBytes < 2 ** 31 && hash.test(file.sha256), 'Arquivo/tamanho/checksum inválido');
  }
  return m;
}
export async function checksum(path) {
  const h = createHash('sha256');
  for await (const chunk of createReadStream(path)) h.update(chunk);
  return h.digest('hex');
}
export async function validatePackage(directory) {
  const m = validateManifest(JSON.parse(readFileSync(join(directory, 'manifest.json'), 'utf8')));
  for (const f of m.files) {
    requireValue(statSync(join(directory, f.name)).size === f.sizeBytes, `Tamanho inválido: ${f.name}`);
    requireValue(await checksum(join(directory, f.name)) === f.sha256, `Checksum inválido: ${f.name}`);
  }
  return m;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [command, directory] = process.argv.slice(2);
    if (command === 'validate') {
      const m = await validatePackage(directory); process.stdout.write(`${m.release}\n`);
    } else if (command === 'create') {
      const m = JSON.parse(readFileSync(join(directory, 'metadata.json'), 'utf8'));
      m.files = await Promise.all(['images.tar.gz', 'compose.production.yaml'].map(async name => ({ name, sizeBytes: statSync(join(directory, name)).size, sha256: await checksum(join(directory, name)) })));
      validateManifest(m);
      writeFileSync(join(directory, 'manifest.json'), `${JSON.stringify(m, null, 2)}\n`);
      await validatePackage(directory);
    } else throw new Error('Use create|validate DIRETORIO');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
