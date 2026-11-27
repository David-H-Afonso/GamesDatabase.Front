# Using Games Database

[Español](USER_GUIDE.es.md) · [Install](GETTING_STARTED.md)

## Your account and first steps

The profile menu holds appearance, data tools, administration and the guide.
Administrators also see Users. Each account has its own games, catalogs, views,
playlists and preferences.

New users may be offered the guide. Choose your own library or explicitly try
six fictional examples. You can pause, resume or start again from the profile.
Guide progress records chapters, not whether you completed a game.

Examples are labelled in the library and detail. They count as records until
removed or kept. **Manage example data** reviews the current batch. Removal
keeps edited examples by default; choosing to remove edits is explicit. Lists
containing other games survive, and a concurrent edit requires another review.
Keeping examples turns them into ordinary records without deleting their data.

## Add and edit a game

1. Use **Add Game** in the header. Enter a title and status; other metadata is optional.
2. Open its artwork or title to see the detail.
3. Choose **Edit game** and the appropriate tab:
   - **Your playthrough:** status, companions, dates, manual time, notes, favourite/completion.
   - **Game:** title, platform, release, personal grade, critic and duration estimates.
   - **Artwork:** independent Logo/Hero/Cover URLs, previews, Steam App ID and store link.
   - **Studio:** developer/studio name.
4. **Save changes** sends changed fields. **Cancel** discards the draft.

The linked Steam App ID starts locked. Unlock it explicitly to change the link.
Artwork lookups affect only the requested draft role and do not sync player data.
If a lookup fails, the prior URL remains. Images are previewed before Save.

The compact **Add Game** dialog starts with only a title and an adjacent Steam
icon. Toggle the icon to search that title (grey means off, colored means on);
choose a result to link it. Without choosing, the title is added manually.
The chevron reveals platform, status and price preference; closing it keeps those
settings. **Add another row** builds a batch without repeating expanded forms.
Choosing a result does not discard another title's draft. Successful rows remain
marked after a partial failure, and retry sends only unfinished work. A Steam
import whose settings failed is not imported again. Manual rows carry an owned
request UUID so retrying the same request cannot create a duplicate record.
Closing/reopening the sheet retains this in-memory draft; a page reload does not.
The title receives focus when opened. Explicit Steam on **and** off are remembered
per account across new rows and remounts; only a boolean is stored, never the draft.
The final **Try to autofill info after import** checkbox defaults off for a new batch.
When selected, reliable empty-field proposals are applied after confirmed new/linked
receipts and their settings, without repeating creation/import if information fails.

## Automatic information lookup

Open **Game options** (three dots) and **Fill information automatically**.

1. Choose **Fill empty fields** or **Replace existing fields**, and whether to include critic rating, artwork and duration estimates.
2. Start the lookup. If titles/editions are ambiguous, choose the correct identity.
3. Review current/suggested values and the source link for every field.
4. Uncheck anything you do not want, then **Save selected fields**.

Steam is preferred, with Wikidata used for missing facts. The lookup does not
change personal grade, notes, status, playtime or progress, and does not change
the linked App ID. Optional story/completionist estimates use HLTB figures published
on the public Deku Deals website, not Steam playtime. This sends only the game title,
not your notes or playtime; it does not contact HLTB directly. Non-exact editions
require a choice. The current fields store integer hours, so a fractional source
value and its rounded proposal are both disclosed before Save. Missing/ambiguous
or blocked sources leave fields unchanged. A changed game or
expired review requires a new lookup; Cancel never applies the preview.

Artwork review compares the actual and proposed Logo/Hero/Cover independently.
These previews show their exact URLs, even when the displayed cover elsewhere uses
Hero as a fallback; a display fallback is never copied into the saved Cover field.

Critic priority is Steam-edition Metacritic, then Metacritic/OpenCritic attributed by
Deku. The actual provider is saved; listed-platform differences are disclosed.
SteamDB scraping and falsely named user-review percentages are not used. Replace
checks populated groups again; confirming equal values does not create false edits.

For multiple games, select their cards/rows and run lightning **Autofill**. It fills
vacant fields; enabling adjacent **Replace** requires its own warning confirmation
and does not run lookup. Progress keeps the exact selected IDs and per-game outcomes.
**Retry unfinished information** never creates/imports games again. See
[Metadata review and batch autofill](METADATA_AUTOFILL.md) for scope, source ambiguity,
protected saves, cancellation and safe role-only artwork refresh.

## Search, filters and layouts

- The header search (**Ctrl/Cmd+K**) searches games, playlists, folders and destinations.
- Library's search is independent and searches game names; `/` focuses it.
- Advanced name search supports literal phrases, any/all matching, exclusions,
  and separate case/accent sensitivity.
- **Filters** opens a draft. **View games** changes the query; closing leaves it alone.
  **Reset** resets criteria but still requires View games. Its badge counts applied
  criteria, not pending edits, sorting or pagination.
  Page size is immediately above Favorites; Completed/100% are visible below it,
  without opening More filters. They remain part of the same cancellable draft.
- Switch between **Covers**, **Cards** and **Row**. Cards defaults to four columns
  on sufficiently wide screens; an explicitly saved three-column choice is kept.
  This presentation preference applies immediately.
  Extended Row exposes more columns. Grade and Critic use /100; calculated Score /10.
- Saved views retain their filters/sorting. The two shortcuts are the last two
  used views, or the first two initially. Reusing either does not shuffle the pair.
  Pin up to two with the pin shown on hover or keyboard focus; pinned positions stay
  fixed and remaining positions use recent views. On touch, select a view and use
  its adjacent pin. Press again to unpin; a third pin never displaces an existing one.
  Pins persist per account without changing filters, sorting or selection.

The guide can explicitly add Favorites, Not rated and Short games example views,
with or without fictional games. These are normal dynamic views you can edit;
finishing the guide or removing its fictional games does not delete them.

Active favourite stars remain visible; inactive stars appear on hover/focus or
touch. In selection mode, click/tap anywhere on a card or row, or use its checkbox
with the keyboard. Its detail/metadata controls cannot intercept selection.
The selection bar holds Autofill/Replace, Edit and separate role-only artwork refresh;
less frequent actions overflow only when necessary. Review scope before deletion.
Changing page/query clears selection and replacement permission. Image refresh does
not clear URLs first or run player sync.

## Playlists, folders, shelves and Focus

Manual playlists contain the games and order you choose. Automatic playlists
follow saved filters; optional templates are editable starting points. Capacity
is separate from preview size. Removing a game from a playlist does not delete it.

Folders organize playlists. Their action menus provide direct Edit/Move without
entering check mode. Item menus/handles reorder membership; a view-only sort must
be changed back to Playlist order before moving games. Bulk-list selection remains.
Use drag/drop or the alternative Move controls;
deleting a folder ungroups its playlists. Shelves presents manual lists and opens
their existing games, not another catalog.

Focus is a small manual queue, normally four slots. Add/manage from the game
detail or Focus page. Reorder, remove or choose games explicitly. Switching the
featured game does not change playlist order or game status.
Focus renders its independently loaded, validated manual list rather than the
shared current-playlist cache. Other playlist activity cannot replace its queue;
invalid list/game identities show a retryable load error instead of another game.

## Home and recommendations

**Customize** adds, hides and reorders playlist/view/filter/Playing/statistics or
daily-recommendation rows. Configure a row, **Save row** into the Home draft,
then **Save home** to keep the layout. Removing a row does not remove its source.
**View all** opens the full source, independently of preview count.

Playing now follows the semantic Playing status. Its side list features a game;
the detail opens separately. The visible spotlight rotates every 20 seconds; the
quiet pause control stops/resumes it. Interaction, reduced motion, hidden tabs,
offscreen content and dialogs prevent unwanted changes. This never syncs data or
changes playlist order. Daily picks use regular, non-special statuses by
default. Included statuses select a pool; exclusions always win. All accounts
share **00:00 UTC** as the change boundary, while each sees only its own collection.
A small pool can repeat games; the order rotates daily.

The dice is in the profile, and in the desktop header when space permits. Choose
**Entire library** or **Games shown**: only the current page's IDs, not every match
behind its filters. Library and playlist pages register that scope; Home's mixed
preview does not invent one. A stale/foreign pool fails instead of widening it.
Picking does not change status or start synchronization.

## Progress, Replays and statistics

Positive manual time replaces Steam lifetime time unless **Add manual time to Steam**
is checked. Zero/empty restores automatic Steam. Unknown Steam time remains unknown,
not an invented zero. Manual input is limited to 600,000 minutes (10,000 hours).
Story/completionist estimates are hours, not percentages or Steam playtime.

Replays keep their own type, dates, grade and notes. Change history records saved
field changes, not play sessions. Statistics uses the complete owned collection,
stored dates and current achievement data. Personal GOTY is an explicit eligible
dated-game selection, not automatically the highest grade.

Completed includes manual/preserved/set completion. Strict100% requires every
current public base-game/DLC achievement; archived content is excluded. Manual
non-Steam completion retains its declaration. A duration is never completion.

## Steam and data tools

Link Steam and run player synchronization only when desired. Bulk sync starts an
explicit server job; progress/recovery does not resubmit it. Restarting the API
loses temporary job status, not already saved games.

Steam playtime and last sync appear above achievement sets; base game and DLC
remain distinct. **Play on Steam** uses a validated `steam://rungameid/<id>` link
and requires a compatible installed Steam client. Opening a detail never follows it.

**Look for Steam dates** opens the same reviewed tool used in Administration → Steam.
Nothing is selected automatically: choose start and finish independently, check their
source and the disclosed timezone, then **Save selected dates**. First/last achievements
and last played are references, not proof of when the story started or ended. Existing
dates are kept, 1970 sentinels are excluded, and later sync cannot move an accepted finish.
If Steam omits last played, a valid last cached achievement can be offered as a labelled
alternative; otherwise enter a known date manually. Ignoring a reference does not set a date.

Statistics' **Finish / Start** buttons choose which saved dates define a year/month,
including Replays. The choice is kept when opening a month. An undated game is not assigned
to a year from lifetime playtime; the achievement timeline separately labels its UTC dates.
See the [date contract and limitations](https://github.com/David-H-Afonso/GamesDatabase.Api/blob/HEAD/DOCS/STEAM_DATES.md).

CSV/JSON/ZIP tools have different transfer scopes. A full SQLite backup is still
needed for complete auth/history/cache recovery. Back up consistently with WAL
and test restore to an isolated path. Never restore over newer writes without
an explicit reconciliation decision.

## Errors and conflicts

- Retry a failed read explicitly; an unavailable source is not replaced by all games.
- On409, reload current data and review the draft before saving again.
- On a busy database, keep the successful import receipt and retry only unfinished
  settings when needed. Do not repeat the whole Steam import after an uncertain result.
- A failed save retains its draft/selection. No automatic repeated mutation is started.
- Administration keeps failed catalog drafts and Audit revert reviews open with an
  error inside the active dialog. A failed Audit read is not shown as an empty log.
- If Preferences cannot refresh, cached choices are labelled and read-only. Use
  **Try again** before editing; simply opening or retrying never saves them.
- Report a bug with route, steps, expected/actual result, browser and app version;
  do not attach tokens, private env files or databases to a public issue.
