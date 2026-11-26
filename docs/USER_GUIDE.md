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

## Automatic information lookup

Open **Game options** (three dots) and **Fill information automatically**.

1. Choose **Fill empty fields** or **Replace existing fields**, and whether to include artwork.
2. Start the lookup. If titles/editions are ambiguous, choose the correct identity.
3. Review current/suggested values and the source link for every field.
4. Uncheck anything you do not want, then **Save selected fields**.

Steam is preferred, with Wikidata used for missing facts. The lookup does not
change personal grade, notes, status, playtime or progress, and does not change
the linked App ID. It does not fill story/completionist estimates from Steam
playtime. Missing/ambiguous sources leave fields unchanged. A changed game or
expired review requires a new lookup; Cancel never applies the preview.

## Search, filters and layouts

- The header search (**Ctrl/Cmd+K**) searches games, playlists, folders and destinations.
- Library's search is independent and searches game names; `/` focuses it.
- Advanced name search supports literal phrases, any/all matching, exclusions,
  and separate case/accent sensitivity.
- **Filters** opens a draft. **View games** changes the query; closing leaves it alone.
  **Reset** resets criteria but still requires View games. Its badge counts applied
  criteria, not pending edits, sorting or pagination.
- Switch between **Covers**, **Cards** and **Row**. Cards offers three/four columns
  on sufficiently wide screens; this presentation preference applies immediately.
  Extended Row exposes more columns. Grade and Critic use /100; calculated Score /10.
- Saved views retain their filters/sorting. The two shortcuts are the last two
  used views, or the first two initially. Reusing either does not shuffle the pair.

Active favourite stars remain visible; inactive stars appear on hover/focus or
touch. In selection mode, click/tap anywhere on a card or row, or use its checkbox
with the keyboard. Its detail/metadata controls cannot intercept selection.
The selection bar holds Edit and further bulk tools; review the IDs before deletion
or explicit image refresh/sync. Changing the page/query clears the old selection.

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

## Home and recommendations

**Customize** adds, hides and reorders playlist/view/filter/Playing/statistics or
daily-recommendation rows. Configure a row, **Save row** into the Home draft,
then **Save home** to keep the layout. Removing a row does not remove its source.
**View all** opens the full source, independently of preview count.

Playing now follows the semantic Playing status. Its side list features a game;
the detail opens separately. Daily picks use regular, non-special statuses by
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

CSV/JSON/ZIP tools have different transfer scopes. A full SQLite backup is still
needed for complete auth/history/cache recovery. Back up consistently with WAL
and test restore to an isolated path. Never restore over newer writes without
an explicit reconciliation decision.

## Errors and conflicts

- Retry a failed read explicitly; an unavailable source is not replaced by all games.
- On409, reload current data and review the draft before saving again.
- A failed save retains its draft/selection. No automatic repeated mutation is started.
- Report a bug with route, steps, expected/actual result, browser and app version;
  do not attach tokens, private env files or databases to a public issue.
