import type { GameQueryParameters } from '@/models/api/Game'

/** Count applied semantic criteria, never pagination, sorting or UI preferences. */
export const countGameFilters = (filters: GameQueryParameters): number => {
	let count = 0
	if (filters.nameSearch?.includeTerms.some(term => term.trim()) || filters.nameSearch?.excludeTerms.some(term => term.trim()) || filters.search?.trim()) count++
	for (const key of ['statusId', 'platformId', 'playWithId', 'playedStatusId', 'criticProvider', 'missingDuration', 'replayTypeId', 'maxStory'] as const) if (filters[key] != null && filters[key] !== '') count++
	for (const key of ['favorite', 'isCheaperByKey', 'fullCompletion', 'allAchievements', 'hasReplays', 'hasSteamApp'] as const) if (filters[key] != null) count++
	if (filters.showIncomplete) count++
	if (filters.excludeStatusIds?.length) count++
	for (const keys of [['minGrade', 'maxGrade'], ['replayGradeMin', 'replayGradeMax'], ['released', 'releasedYear'], ['started', 'startedYear'], ['finished', 'finishedYear'], ['replayStartedFrom', 'replayStartedTo'], ['replayFinishedFrom', 'replayFinishedTo']] as const) if (keys.some(key => filters[key] != null && filters[key] !== '')) count++
	return count
}
