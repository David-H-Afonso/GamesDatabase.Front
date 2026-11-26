import type { PlaylistRules } from '@/models/api/Playlist'
import { createNameSearch } from './nameSearch'

export const blankPlaylistRules = (): PlaylistRules => ({ statusIds: [], platformIds: [], playedStatusIds: [], sortBy: 'Name', sortDescending: false, orderedGameIds: [], excludedGameIds: [], statusPriorityIds: [], groupByStatus: false })
export const playlistNameSearch = (rules: PlaylistRules) => createNameSearch(rules.nameSearch ?? (rules.search ? { includeTerms: [rules.search], caseSensitive: true, accentSensitive: true } : {}))
export const describePlaylistRules = (rules: PlaylistRules, t: (key: string, values?: Record<string, unknown>) => string, catalogs?: { statuses: Array<{ id: number; name: string }>; platforms: Array<{ id: number; name: string }>; playedStatuses: Array<{ id: number; name: string }> }) => {
	const parts: string[] = [], search = rules.nameSearch
	if (rules.playingNow) parts.push(t('gallery.rules.playingNow'))
	if (rules.upcomingReleases) parts.push(t('gallery.rules.upcomingSummary', { timeZone: rules.releaseTimeZone ?? 'UTC' }))
	if (search?.includeTerms.length) parts.push(search.matchType === 'exact' ? `${t('gallery.search.exact')} · ${t(search.matchMode === 'all' ? 'gallery.search.allTerms' : 'gallery.search.anyTerms')}: ${search.includeTerms.join(' · ')}` : t(search.matchMode === 'all' ? 'gallery.rules.includeAll' : 'gallery.rules.includeAny', { terms: search.includeTerms.join(' · ') }))
	else if (!search && rules.search) parts.push(t('gallery.rules.legacySearch', { term: rules.search }))
	if (search?.excludeTerms.length) parts.push(t('gallery.rules.exclude', { terms: search.excludeTerms.join(' · ') }))
	for (const [field, catalog, label] of [['statusIds', 'statuses', 'statuses'], ['platformIds', 'platforms', 'platforms'], ['playedStatusIds', 'playedStatuses', 'playedStatuses']] as const) if (rules[field]?.length) parts.push(`${t(`gallery.rules.${label}`)}: ${rules[field].map(id => catalogs?.[catalog].find(value => value.id === id)?.name ?? `#${id}`).join(' / ')}`)
	for (const [field, label] of [['favorite', 'favorite'], ['hasSteam', 'steam'], ['fullCompletion', 'completed'], ['allAchievements', 'strict']] as const) if (rules[field] != null) parts.push(`${t(`gallery.rules.${label}`)}: ${t(rules[field] ? 'gallery.rules.yes' : 'gallery.rules.no')}`)
	for (const [field, label] of [['minGrade', 'minGrade'], ['maxGrade', 'maxGrade'], ['minCritic', 'minCritic'], ['maxCritic', 'maxCritic'], ['minScore', 'minScore'], ['maxScore', 'maxScore'], ['releasedFromYear', 'releasedIn'], ['releasedToYear', 'releasedTo']] as const) if (rules[field] != null) parts.push(`${t(`gallery.rules.${label}`)}: ${rules[field]}`)
	return parts.join(' · ') || t('gallery.rules.allLibrary')
}
