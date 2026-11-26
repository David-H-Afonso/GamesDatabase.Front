import type { HomeRow } from '@/models/api/Collection'
import type { PlaylistCreateDto, PlaylistRules } from '@/models/api/Playlist'
import { blankPlaylistRules } from './playlistRules'

export const collectionTemplateIds = ['favorites', 'playingNow', 'upcoming'] as const
export type CollectionTemplateId = typeof collectionTemplateIds[number]
type Translate = (key: string) => string

export const localReleaseTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

/** Templates are new editable drafts, never pre-created lists or sample game data. */
export const collectionTemplateRules = (id: CollectionTemplateId, timeZone = localReleaseTimeZone()): PlaylistRules => {
	const rules = blankPlaylistRules()
	if (id === 'favorites') return { ...rules, favorite: true }
	if (id === 'playingNow') return { ...rules, playingNow: true }
	return { ...rules, upcomingReleases: true, releaseTimeZone: timeZone, sortBy: 'Released' }
}

export const playlistFromTemplate = (id: CollectionTemplateId, t: Translate, timeZone = localReleaseTimeZone()): PlaylistCreateDto => ({
	name: t(`gallery.templates.${id}.title`),
	description: t(`gallery.templates.${id}.description`),
	isAutomatic: true,
	maxLength: null,
	rules: collectionTemplateRules(id, timeZone),
})

export const homeRowFromTemplate = (id: CollectionTemplateId, rowId: string, t: Translate, timeZone = localReleaseTimeZone()): HomeRow => ({
	id: rowId,
	enabled: true,
	title: t(`gallery.templates.${id}.title`),
	source: id === 'playingNow' ? { kind: 'playingNow' } : { kind: 'filter', rules: collectionTemplateRules(id, timeZone) },
	presentation: id === 'playingNow' ? 'cards' : 'covers',
	previewCount: id === 'playingNow' ? 6 : 12,
	highlightFirst: id === 'playingNow',
})
