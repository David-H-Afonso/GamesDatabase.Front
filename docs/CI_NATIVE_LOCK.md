# Portable native dependencies in CI

## Why a complete lock matters

An incomplete platform-specific lock can pass with populated Windows dependencies
and fail on a fresh Linux installation before tests start:

```text
Cannot find module @rollup/rollup-linux-x64-gnu
```

Rollup, esbuild and embedded-Sass parents declare multiple native optional
dependencies. Keeping only Windows entries prunes their other targets. This is the npm
optional-dependency problem tracked in [npm/cli#4828](https://github.com/npm/cli/issues/4828).
Passing with an already-populated Windows `node_modules` does not validate the
published snapshot on Linux. Changing version rules or installing just one Linux
binary as a direct dependency is not the fix.

## Guards

Run without installing project dependencies:

```sh
node --test scripts/versioning/core.test.mjs scripts/versioning/release.test.mjs scripts/ci/native-lock.test.mjs
node scripts/ci/native-lock.mjs
npm ci --include=optional
node scripts/ci/native-lock.mjs --installed
```

The read-only preflight requires the supported Linux GNU/musl x64/arm64 and Windows
targets, validates every declared native variant, follows nested Node resolution,
and checks exact parent/native versions plus tarball/integrity metadata. The
post-install smoke actually parses with Rollup, transforms TypeScript with esbuild
and compiles CSS with embedded Sass. It does not merely check whether folders exist.

CI runs the guards before installation and exercises installed tools before
lint/tests/build. A broken lock therefore fails with an explicit native-dependency
diagnostic before publication. No job skips tests or bypasses a failed gate.

Docker builds use Node 22, matching validation, and copy **both** package files.
They use the same guarded `npm ci` instead of resolving a different graph with
`npm install`. The build still runs on `$BUILDPLATFORM`; emitted static files can
be packaged for either runtime architecture. Temporary browser/review directories
are excluded from the Docker context.

## Updating or repairing the lock

- Keep `package-lock.json` tracked and do not generate its platform metadata from
  a populated single-platform dependency tree.
- Work in an isolated empty directory for lock maintenance. Review the complete
  manifest and lock diff, including transitive versions, before copying it back.
- A plain `npm install --package-lock-only` can preserve an already-pruned lock;
  always rerun the preflight rather than assuming it repaired missing targets.
- A native-metadata-only repair must retain existing package versions. The
  repair restores exact native tarball/integrity metadata without changing existing
  versions or root declarations. Temporary metadata seeds stay in the isolated
  repair directory; platform packages do not become application dependencies.
- General dependency/security upgrades are separate reviewed changes. This
  metadata repair does not claim to remediate the old checkpoint's vulnerabilities.
- Never repair an already-published version by amending it or moving a tag. Use a
  new Conventional Commit and let the existing kit calculate its next patch number.

## Verification boundaries

Reproduce installation from a clean checkout using a supported Node/npm pair.
When using a portable runtime, verify its official checksum before executing it.

Native smoke on one operating system proves only that installed platform's tools.
The cross-platform lock guard checks metadata, not Linux/Alpine binary execution.
CI checks the exact commit on Linux and the image build checks its container graph;
neither a populated local dependency tree nor Windows success substitutes for them.
Web/API versions and release gates remain independent.
