import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const toolsDependencies = ['@inquirer/prompts', '@prisma/client', 'prisma', 'tsx', 'zod'];
const installHooks = ['preinstall', 'install', 'postinstall', 'prepublish', 'preprepare', 'prepare', 'postprepare', 'dependencies'];
const clone = (value) => structuredClone(value);

export function createManifests(pkg, lock) {
  if (pkg.workspaces) throw new Error('Workspace manifests require a dedicated cache strategy.');
  if (lock.lockfileVersion !== 3 || !lock.packages?.['']) throw new Error('Expected npm lockfileVersion 3.');
  if (!pkg.version || pkg.version !== lock.version || pkg.version !== lock.packages[''].version)
    throw new Error('Root version must match package.json and both lockfile entries.');
  const deps = { pkg: clone(pkg), lock: clone(lock) };
  // Root lifecycle hooks can observe npm_package_version; preserve their semantics.
  if (!installHooks.some((hook) => pkg.scripts?.[hook])) {
    deps.pkg.version = deps.lock.version = deps.lock.packages[''].version = '0.0.0';
  }
  const dependencies = {};
  for (const name of toolsDependencies) {
    const declared = pkg.dependencies?.[name] ?? pkg.devDependencies?.[name];
    const recorded = lock.packages[''].dependencies?.[name] ?? lock.packages[''].devDependencies?.[name];
    if (!declared || declared !== recorded || !lock.packages[`node_modules/${name}`]?.version)
      throw new Error(`Missing or inconsistent tools dependency: ${name}`);
    dependencies[name] = declared;
  }
  const toolsPkg = {
    name: `${pkg.name}-tools`, version: '0.0.0', private: true,
    scripts: {}, dependencies,
  };
  for (const command of ['db:migrate', 'admin:create']) {
    if (!pkg.scripts?.[command]) throw new Error(`Missing tools command: ${command}`);
    toolsPkg.scripts[command] = pkg.scripts[command];
  }
  for (const field of ['engines', 'overrides', 'prisma']) {
    if (pkg[field] !== undefined) toolsPkg[field] = clone(pkg[field]);
  }
  const toolsLock = clone(lock);
  toolsLock.name = toolsPkg.name;
  toolsLock.version = '0.0.0';
  toolsLock.packages[''] = { name: toolsPkg.name, version: '0.0.0', dependencies: clone(dependencies) };
  return { deps, tools: { pkg: toolsPkg, lock: toolsLock } };
}

export function finalizeTools(pkg, resolvedLock, sourceLock) {
  const { tools } = createManifests(pkg, sourceLock);
  // npm may rehoist a package while pruning, but must not introduce a new artifact.
  const identity = (path, entry) => JSON.stringify([
    path.slice(path.lastIndexOf('node_modules/') + 13), entry.version, entry.resolved, entry.integrity,
  ]);
  const original = new Set(Object.entries(sourceLock.packages).filter(([path]) => path).map(([path, entry]) => identity(path, entry)));
  for (const [path, entry] of Object.entries(resolvedLock.packages)) {
    if (path && !original.has(identity(path, entry))) throw new Error(`Offline resolution changed locked artifact: ${path}`);
  }
  const final = { pkg: clone(tools.pkg), lock: clone(resolvedLock) };
  final.pkg.version = final.lock.version = final.lock.packages[''].version = pkg.version;
  return final;
}

const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
function writePair(directory, pair) {
  mkdirSync(directory, { recursive: true });
  writeFileSync(resolve(directory, 'package.json'), JSON.stringify(pair.pkg, null, 2) + '\n');
  writeFileSync(resolve(directory, 'package-lock.json'), JSON.stringify(pair.lock, null, 2) + '\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [mode, input, output] = process.argv.slice(2);
  if (!['create', 'finalize'].includes(mode) || !input || !output)
    throw new Error('Usage: build-manifests.mjs create|finalize INPUT OUTPUT');
  const pkg = read(resolve(input, 'package.json'));
  const lock = read(resolve(input, 'package-lock.json'));
  if (mode === 'create') {
    const generated = createManifests(pkg, lock);
    writePair(resolve(output, 'deps'), generated.deps);
    writePair(resolve(output, 'tools'), generated.tools);
  } else {
    writePair(resolve(output, 'tools-runtime'), finalizeTools(pkg, read(resolve(output, 'tools/package-lock.json')), lock));
  }
}
