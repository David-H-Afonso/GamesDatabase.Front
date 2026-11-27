# Frontend architecture

Games Database is a React 19/TypeScript SPA. Vite builds the static artifact;
the ASP.NET Core API owns persistence, permissions and integrations.

```text
Routes / app shells
  Header · Home · Library · Focus · Playlists · Statistics
    Components and owned resource hooks
      Services + TypeScript API contracts
        customFetch (session boundary, cancellation, timeout)
          Games Database API
```

## Boundaries

- `src/components/Collection`: Home, statistics, shelves, detail/editor,
  metadata review and shared native sheets.
- `src/components/Home`: the full Library, filters, saved views and bulk actions.
- `src/components/Onboarding`: account-owned guide coordination and chapters.
- `src/components/Admin`: personal catalogs/tools and privileged user administration.
- `src/models/api`, `src/services`, `src/environments/apiRoutes.ts`: transport contracts.
- `src/store`: shared catalogs/query state, auth and per-browser appearance.

Collection resource identity includes the account and query. Old requests are
aborted; responses from an old account cannot replace current data. Explicit
mutations reconcile their authoritative result rather than relying on a stale read.
Private collection state is cleared on account transitions; appearance is retained.

## Workflow hosts

Detail and metadata selection live outside replaceable result cards. An updated
query can remove a card without destroying its open workflow. Selection and close
callbacks are ownership-scoped. Header has an owned detail fallback for the Admin
shell. Focus owns its validated detail snapshot and accepts only its own reads and
mutation results; shared route-cache replacements cannot substitute its queue.

The editor keeps a draft and sends a sparse patch on Save. Artwork lookup and
metadata lookup are separate read operations; neither starts player synchronization.
Metadata Apply uses the server's signed review plan and timestamp conflict check.
Optional duration candidates include exact public `sourceHours` and a disclosed
integer-hour proposal. The client never converts Steam playtime into an estimate.

`GameMetadataProvider` observes owned durable metadata jobs outside the router.
`useMetadataAutofillJob` recovers the current job/history, polls active work and guards
owner/read generations. Header hides surfaces on navigation, never cancels the job.
The API freezes IDs and commits each signed Apply with its job receipt in SQLite.
Banner/details visibility is separate from task lifetime; individual reviews keep
their siblings and return path. Creation and Library selection share this service;
retries cannot repeat creation/import. Critic v2 retains provider/scope/link and exact
receipts; Replace explicitly accepts listed-platform ratings for reliable matches.
`useMetadataAutofillBatch` remains for browser-validated role-only artwork refresh,
which never clears a URL or runs player sync.
See [Metadata workflows](METADATA_AUTOFILL.md).

## Discovery and onboarding

The server selects random games from the owned collection or validates and samples
the exact displayed IDs chosen in the scope modal. `DisplayedGamesProvider` keys
the loaded page by owner, route and dataset; changes abort a pending pick, and an
out-of-scope response is rejected. Global search never replaces that page registry.
A page-scoped observer
uses the server deadline and visibility state to refresh daily rows; it is removed
when the page/account changes.

Guide progress comes from the API, not a global browser “seen” flag. Samples are
added only after an explicit choice. Cleanup freezes game/list IDs and timestamps
until confirmation, so a concurrent edit requires a new review.
The additive Views chapter explicitly creates three localized normal views;
sample cleanup never owns or deletes them. Capability fields retain old-API UX.
Quick shortcuts reserve two persisted server slots and fill vacancies from recent
usage; pin mutation metadata is merged separately from configuration/use, and read
revisions reject pre-pin snapshots. Playing rotation is a visible-page20s UI timer,
not synchronization or a background worker; visibility/dialog/motion/interaction
guards and keyboard/touch controls are covered independently.

## Presentation and testing

SCSS adapts semantic tokens across thirteen themes. Layout keys and color-theme
keys remain separate. Native dialogs provide the modal layer; keyboard boundaries,
focus return, reduced motion, touch targets and image decoding have browser checks.

Cards density persists separately from filters. Whole-card native selection labels
make underlying detail/edit controls inert in selection mode. Shared portalled
action panels avoid scroll-rail clipping and restore logical keyboard order.
Native selects progressively enhance their picker; unsupported engines retain a
legible native fallback. Creation retains per-row receipts across partial retries;
the API's optional UUID/hash prevents duplicate manual requests.

Vitest/Testing Library/MSW covers state and interaction contracts. Cypress exercises
the compiled Vite artifact with intercepted API fixtures. Neither jsdom success
nor mocked UI tests alone prove rendered geometry or backend authorization.

See [Get started](GETTING_STARTED.md), [User guide](USER_GUIDE.md) and
[the API architecture](https://github.com/David-H-Afonso/GamesDatabase.Api).
