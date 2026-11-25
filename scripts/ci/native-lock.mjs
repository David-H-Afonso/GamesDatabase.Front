#!/usr/bin/env node
// Project-specific, read-only guard for npm's platform-pruned optional-dependency bug.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const nativeName = name => /^(?:@rollup\/rollup-|@esbuild\/|sass-embedded-)/.test(name);
const targets = {
  rollup: ['@rollup/rollup-linux-x64-gnu', '@rollup/rollup-linux-x64-musl', '@rollup/rollup-linux-arm64-gnu', '@rollup/rollup-linux-arm64-musl', '@rollup/rollup-win32-x64-msvc'],
  esbuild: ['@esbuild/linux-x64', '@esbuild/linux-arm64', '@esbuild/win32-x64'],
  'sass-embedded': ['sass-embedded-linux-x64', 'sass-embedded-linux-musl-x64', 'sass-embedded-linux-arm64', 'sass-embedded-linux-musl-arm64', 'sass-embedded-win32-x64'],
};

function dependencyEntry(packages, parent, dependency) {
  let base = parent;
  while (base) {
    const candidate = packages[`${base}/node_modules/${dependency}`];
    if (candidate) return candidate;
    const at = base.lastIndexOf('node_modules/');
    base = at < 0 ? '' : base.slice(0, at).replace(/\/$/, '');
  }
  return packages[`node_modules/${dependency}`];
}

export function nativeLockIssues(lock) {
  if (!lock || ![2, 3].includes(lock.lockfileVersion) || !lock.packages || Array.isArray(lock.packages)) return [{ reason: 'A complete npm lockfile v2/v3 with packages metadata is required.' }];
  const issues = [], found = new Set();
  for (const [parent, entry] of Object.entries(lock.packages)) {
    const tool = Object.keys(targets).find(name => parent === `node_modules/${name}` || parent.endsWith(`/node_modules/${name}`));
    if (!tool) continue;
    found.add(tool);
    const optional = entry.optionalDependencies ?? {};
    for (const dependency of targets[tool]) if (!Object.hasOwn(optional, dependency)) issues.push({ parent, dependency, reason: 'Required cross-platform target is missing from the tool metadata.' });
    for (const [dependency, expected] of Object.entries(optional).filter(([name]) => nativeName(name))) {
      const actual = dependencyEntry(lock.packages, parent, dependency);
      if (!actual) { issues.push({ parent, dependency, expected, reason: 'Native optional package is absent from the lockfile.' }); continue; }
      if (/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(expected) && actual.version !== expected) issues.push({ parent, dependency, expected, actual: actual.version, reason: 'Native package version does not match its parent.' });
      if (typeof actual.resolved !== 'string' || !actual.resolved.startsWith('https://')) issues.push({ parent, dependency, reason: 'Native package is missing its HTTPS resolved tarball.' });
      if (typeof actual.integrity !== 'string' || !/^sha(?:1|256|384|512)-[A-Za-z0-9+/=]+(?:\s|$)/.test(actual.integrity)) issues.push({ parent, dependency, reason: 'Native package is missing its integrity metadata.' });
    }
  }
  for (const tool of Object.keys(targets)) if (!found.has(tool)) issues.push({ parent: tool, reason: 'Expected native build tool is absent from the lockfile.' });
  return issues;
}

export function installedNativeSmoke(root) {
  const require = createRequire(resolve(root, 'package.json'));
  const rollup = require('rollup');
  require('rollup/parseAst').parseAst('const nativeSmoke = 1;');
  const esbuild = require('esbuild');
  esbuild.transformSync('const nativeSmoke: number = 1;', { loader: 'ts' });
  const sass = require('sass-embedded');
  if (!sass.compileString('a { color: red }').css.includes('red')) throw new Error('Embedded Sass native smoke returned no CSS.');
  return { rollup: rollup.VERSION, esbuild: esbuild.version, sassEmbedded: sass.info.split('\n')[0] };
}

export function main(args = process.argv.slice(2)) {
  const at = args.indexOf('--root');
  if (at >= 0 && (!args[at + 1] || args[at + 1].startsWith('--'))) throw new Error('--root requires an explicit directory.');
  const root = at < 0 ? ROOT : resolve(args[at + 1]);
  const lock = JSON.parse(readFileSync(resolve(root, 'package-lock.json'), 'utf8'));
  const issues = nativeLockIssues(lock);
  if (issues.length) {
    console.error(JSON.stringify({ nativeLockValid: false, issues }, null, 2));
    console.error('Repair the lock in an isolated empty directory without node_modules and review version changes. Do not copy a Windows-only node_modules-derived lock, add one platform binary as a direct dependency, or replace npm ci with an unreviewed install.');
    process.exitCode = 1;
    return;
  }
  console.log(JSON.stringify({ nativeLockValid: true, ...(args.includes('--installed') ? { installed: installedNativeSmoke(root) } : {}) }, null, 2));
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try { main(); } catch (error) { console.error(`Native dependency preflight: ${error.message}`); process.exitCode = 1; }
}
