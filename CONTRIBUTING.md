# Contributing

[Español](CONTRIBUTING.es.md) · [Setup](docs/GETTING_STARTED.md)

Keep changes focused and preserve the application's existing collection workflows.
For a UI change, include real screenshots at relevant phone/tablet/desktop sizes.

## Before opening a pull request

```sh
npm ci --include=optional
npm run build
npm run lint
npm run test
npm run test:i18n
npm run test:versioning
node scripts/ci/native-lock.mjs --installed
npm run security:all
```

Run compiled Cypress journeys for changed workflows as documented in the README.
Use isolated fixtures/accounts, not personal data. Keep first failures visible;
do not skip tests, silence exceptions or update a visual baseline to conceal a bug.

## Conventions

- TypeScript components/hooks, existing services and semantic SCSS tokens.
- English and Spanish keys for every user-facing string.
- Keyboard access, visible focus, touch targets and reduced-motion support.
- HTTP DTO/model/service updates together with the matching API change.
- Sparse mutations; preserve drafts, account isolation and concurrent-save recovery.
- No new UI library, recurring sync or external service requirement without discussion.

Commits use `type(scope): concise summary`. The version kit derives a prepared
version from the committed parent; use [its documented checks](scripts/versioning/README.md).
Owner-selected release milestones may use an explicit `Release-As` trailer.
Do not amend published tags or publish/deploy as part of a routine contribution.

## Reports and pull requests

Explain the problem, approach, affected contracts, verification commands/results
and any migration/recovery impact. Include reproduction steps and app/browser
versions for bugs. Source tests and useful architecture/usage docs belong in Git;
build output, private reports, sessions, databases, exports and env files do not.

Do not post credentials, tokens, signing keys, private logs or database dumps in
public issues. Follow the private-contact procedure in [Security](SECURITY.md)
before disclosing sensitive details. Contributions remain subject to the repository's GPL license.
