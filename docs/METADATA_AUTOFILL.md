# Metadata review and batch autofill

[Español](METADATA_AUTOFILL.es.md) · [User guide](USER_GUIDE.md)

These are source features. Check the README's published/source status and adopt
the compatible API first; older releases do not implement every review-v2 feature.

## Review one game

Open **Game options → Fill information automatically**. Empty-only is the default.
Choose whether to include critic rating, artwork and duration estimates, then look
up the information. Review the edition, current/proposed values and source links;
only checked fields are saved.

**Replace existing fields** searches the checked groups even when they are already
populated. For review v2 it requests fresh Deku data instead of reusing its parsed
24-hour cache. Provider blocks, cooldowns and rate limits still apply. Missing
information never means clearing a field. Confirming an already-matching value
does not manufacture an edit timestamp or history entry.

### Critic provenance

The order is **Steam-edition Metacritic → Metacritic published by Deku Deals →
OpenCritic published by Deku Deals**. The saved game retains the real provider,
not a provider chosen from the account default. Critic ratings use /100; the
adjacent Metacritic user badge is not a critic rating.

Deku's listed edition may be for another platform. Its Metacritic proposal carries
that warning and needs deliberate review in an automatic batch. OpenCritic's
attributed rating is identified as OpenCritic. SteamDB is not scraped or bypassed:
its [FAQ](https://steamdb.info/faq/) prohibits automated scraping. No calculated
Steam user-review percentage is newly written as a SteamDB critic rating by
import/sync. Existing saved ratings are not silently erased or relabelled.

Optional story/completionist values are attributed HLTB estimates from the same
public Deku page, not player time. Exact source hours and whole-hour rounding are
shown in the manual review. There is no direct HLTB call or new paid/API-key service.
The lookup sends the game title/App ID, not personal notes or playtime.

Deku searches explicitly include its supported Nintendo, PlayStation, Xbox and
Steam catalog instead of accepting the anonymous site's Switch/Switch 2 default.
This changes discovery, not edition certainty: ambiguous names still need a
choice and the listed-platform warning remains. If the page omits Completionist,
it stays absent; Main + Extra is not silently substituted for it.

## Fill selected games

1. Start Library selection and select the intended games in Covers, Cards or Row.
2. Use the visible lightning **Autofill** action. It fills empty fields by default.
3. If replacing populated metadata is intentional, enable the adjacent **Replace**
   checkbox and accept its warning. This only enables the mode; it does not start
   a lookup. Run Autofill separately.

The batch freezes those exact IDs, not future filter results or unseen pages.
Changing owner/query/selection or completing a run resets replacement permission.
Reliable proposals are applied automatically; ambiguous identities are not guessed.
Personal grade, notes, status, play dates, time, achievements and Steam links are
not metadata-enrichment fields. Secondary actions move into an accessible overflow
only when there is insufficient room; the Library and global searches stay separate.

The progress sheet keeps per-game results: updated, already matching/no new fields,
needs review, partial, failed or not processed. Stop cancels read/wait work and
remaining games; an active save is protected until it finishes. Leaving the route
stops after the current save outcome. Account change/unmount aborts remaining work.
Already committed changes are not undone, and a lost response is not proof of failure.

**Retry unfinished information** does a new metadata lookup only for failed,
partial or cancelled results. It never repeats game creation or Steam import, and
never automatically repeats an uncertain write. A short 429 wait may retry the
read once; a longer explicit Retry-After is not shortened. The queue is in memory,
not a persisted/scheduled job. Reloading does not restart it.

## Opt in after creation/import

At the end of **Add Game**, select **Try to autofill info after import**. It starts
the same empty-only batch after the creation/import and selected settings succeed,
using only confirmed newly created/linked IDs. Already-existing/skipped import
receipts are not permission to overwrite another existing record.

The option is off for each new batch. Failed metadata does not remove added games
or their Steam links. If starting autofill fails, successful row receipts remain;
trying to finish does not recreate/reimport those rows. Closed drafts are in memory.
Only the separate explicit Steam on/off preference is persisted per account, as a
boolean—not titles, drafts or sessions. The title receives focus on opening.

## Refresh artwork separately

Choose Logo, Hero or Cover and **Refresh image**. This uses the current owned Steam
App ID, loads a candidate and saves just that reviewed role. It does not clear a
stored URL first, run player sync, or restore an older URL over a concurrent edit.
An unavailable candidate leaves the old URL. A confirmed same-URL refresh can
retry display without inventing a game edit.

For a conflict/expired plan, look up current values again. Check the actual game
after an interrupted save. Browser tests and local captures are not certification
of real Steam availability, hosting, physical devices or assistive technology.
