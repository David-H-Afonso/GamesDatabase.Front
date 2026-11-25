import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { nativeLockIssues } from './native-lock.mjs';

const version = '1.2.3', integrity = `sha512-${createHash('sha512').update('native lock fixture').digest('base64')}`;
const tools = {
  rollup: ['@rollup/rollup-linux-x64-gnu', '@rollup/rollup-linux-x64-musl', '@rollup/rollup-linux-arm64-gnu', '@rollup/rollup-linux-arm64-musl', '@rollup/rollup-win32-x64-msvc'],
  esbuild: ['@esbuild/linux-x64', '@esbuild/linux-arm64', '@esbuild/win32-x64'],
  'sass-embedded': ['sass-embedded-linux-x64', 'sass-embedded-linux-musl-x64', 'sass-embedded-linux-arm64', 'sass-embedded-linux-musl-arm64', 'sass-embedded-win32-x64'],
};
const native = () => ({ version, resolved: 'https://registry.npmjs.org/native/-/native-1.2.3.tgz', integrity, optional: true });
function fixture() {
  const packages = { '': { name: 'fixture', version: '2.0.1' } };
  for (const [name, dependencies] of Object.entries(tools)) {
    packages[`node_modules/${name}`] = { version, optionalDependencies: Object.fromEntries(dependencies.map(dependency => [dependency, version])) };
    for (const dependency of dependencies) packages[`node_modules/${dependency}`] = native();
  }
  return { lockfileVersion: 3, packages };
}

test('a complete portable native graph passes before npm installation', () => assert.deepEqual(nativeLockIssues(fixture()), []));
for (const dependency of ['@rollup/rollup-linux-x64-gnu', '@esbuild/linux-arm64', 'sass-embedded-linux-musl-x64']) test(`missing ${dependency} is rejected rather than relying on Windows node_modules`, () => {
  const lock = fixture(); delete lock.packages[`node_modules/${dependency}`];
  assert.ok(nativeLockIssues(lock).some(issue => issue.dependency === dependency && issue.reason.includes('absent')));
});
test('a platform-pruned parent map is rejected even when its remaining entries exist', () => {
  const lock = fixture(); delete lock.packages['node_modules/rollup'].optionalDependencies['@rollup/rollup-linux-x64-gnu'];
  assert.ok(nativeLockIssues(lock).some(issue => issue.reason.includes('cross-platform target')));
});
test('native and parent versions must agree', () => {
  const lock = fixture(); lock.packages['node_modules/@rollup/rollup-linux-x64-gnu'].version = '9.0.0';
  assert.ok(nativeLockIssues(lock).some(issue => issue.reason.includes('does not match')));
});
test('native tarball and integrity metadata must be present', () => {
  const lock = fixture(), entry = lock.packages['node_modules/@esbuild/linux-x64']; delete entry.resolved; delete entry.integrity;
  assert.equal(nativeLockIssues(lock).filter(issue => issue.dependency === '@esbuild/linux-x64').length, 2);
});
test('nested native dependencies follow Node resolution instead of requiring a flattened layout', () => {
  const lock = fixture(), dependency = '@rollup/rollup-linux-x64-gnu';
  lock.packages[`node_modules/rollup/node_modules/${dependency}`] = lock.packages[`node_modules/${dependency}`];
  delete lock.packages[`node_modules/${dependency}`];
  assert.deepEqual(nativeLockIssues(lock), []);
});
test('multiple parent versions cannot silently reuse the wrong root native binary', () => {
  const lock = fixture();
  lock.packages['node_modules/vite/node_modules/rollup'] = { version: '4.0.0', optionalDependencies: Object.fromEntries(tools.rollup.map(dependency => [dependency, '4.0.0'])) };
  assert.ok(nativeLockIssues(lock).some(issue => issue.parent === 'node_modules/vite/node_modules/rollup' && issue.reason.includes('does not match')));
});
test('invalid/missing package metadata does not produce a false pass', () => {
  for (const lock of [null, {}, { lockfileVersion: 3, packages: [] }, { lockfileVersion: 3, packages: {} }]) assert.ok(nativeLockIssues(lock).length);
});
test('CLI preflight is read-only and requires no installed dependencies', () => {
  const scratch = join(tmpdir(), 'opencode'); mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(join(scratch, 'native-lock-test-')), file = join(root, 'package-lock.json');
  try {
    const input = JSON.stringify(fixture(), null, 2) + '\n'; writeFileSync(file, input);
    const cli = join(dirname(fileURLToPath(import.meta.url)), 'native-lock.mjs');
    const result = spawnSync(process.execPath, [cli, '--root', root], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr); assert.equal(JSON.parse(result.stdout).nativeLockValid, true); assert.equal(readFileSync(file, 'utf8'), input);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
