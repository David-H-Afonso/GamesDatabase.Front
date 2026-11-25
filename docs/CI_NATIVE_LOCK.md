# Portable native dependencies in CI

## Incident

Front run [45585775270](https://github.com/David-H-Afonso/GamesDatabase.Front/actions/runs/45585775270)
at `a137128` passed all18 version-kit tests and correctly validated version2.0.1.
It then failed before Vitest could start:

```text
Cannot find module @rollup/rollup-linux-x64-gnu
```

The isolated historical lock had been derived from an installed Windows tree.
Its Rollup, esbuild and embedded-Sass parents declared many native optional
dependencies, but only their Windows x64 entries were locked. This is the npm
optional-dependency problem tracked in [npm/cli#4828](https://github.com/npm/cli/issues/4828).
Passing with an already-populated Windows `node_modules` did not validate the
published snapshot on Linux. Changing version rules or installing just one Linux
binary as a direct dependency is not the fix.

## Guards

Run without installing project dependencies:

```sh
node --test scripts/versioning/core.test.mjs scripts/ci/native-lock.test.mjs
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

Docker builds use Node22, matching validation, and copy **both** package files.
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
  incident repair reconstructed all65 exact declared native targets, added62
  missing lock entries, restored native tarball/integrity metadata and left every
  existing version and root dependency declaration unchanged. Temporary metadata
  seeds were used only in the isolated repair directory; no platform package was
  added to the application's direct dependencies.
- General dependency/security upgrades are separate reviewed changes. This
  metadata repair does not claim to remediate the old checkpoint's vulnerabilities.
- Never repair an already-published version by amending it or moving a tag. Use a
  new Conventional Commit and let the existing kit calculate its next patch number.

## Verification boundaries

The incident reproduction uses a fresh checkout of the exact published commit and
portable Node22.23.5/npm10.9.9 verified against the official Node checksum, without
changing the machine's global Node installation or copying pending UI work.

The owner explicitly declined starting local Docker Desktop. Consequently local
checks are Windows checks, **not an executed Linux/Alpine build**. Actual Linux and
container validation must be confirmed by Actions after an explicitly approved
new commit/push. No Docker VM, CasaOS container or production deployment is started
to work around that boundary.

API run [45585763647](https://github.com/David-H-Afonso/GamesDatabase.Api/actions/runs/45585763647)
passed validation, Docker publication and release. Its2.0.1 tag/release points to
`03e2b5bcd200c49f071e93fafe7427a13d5de08a`; no API versioning repair is needed.
Front/API version sequences are independent.
