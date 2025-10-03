import type { GameQueryParameters } from '@/models/api/Game'

/**
 * Keys of GameQueryParameters to compare when checking equivalence.
 */
const FILTER_KEYS: (keyof GameQueryParameters)[] = [
	'page',
	'pageSize',
	'search',
	'sortBy',
	'sortDescending',
	'isActive',
	'statusId',
	'platformId',
	'playWithId',
	'playedStatusId',
	'minGrade',
	'maxGrade',
	'released',
	'releasedYear',
	'started',
	'startedYear',
	'finished',
	'finishedYear',
	'excludeStatusIds',
	'viewName',
]

/** Normalize null -> undefined for consistent comparisons */
const normalizeNullToUndefined = (v: unknown): unknown => (v === null ? undefined : v)

/** Compare two values after normalization */
const areValuesEqual = (a: unknown, b: unknown): boolean => {
	const normalizedA = normalizeNullToUndefined(a)
	const normalizedB = normalizeNullToUndefined(b)

	// Handle array comparison for excludeStatusIds
	if (Array.isArray(normalizedA) && Array.isArray(normalizedB)) {
		if (normalizedA.length !== normalizedB.length) return false
		return normalizedA.every((item, index) => item === normalizedB[index])
	}

	// One is array, other is not
	if (Array.isArray(normalizedA) || Array.isArray(normalizedB)) return false

	return normalizedA === normalizedB
}

/**
 * Compare two filter objects to determine if they are equivalent.
 * - Normalizes null to undefined to avoid false differences.
 */
export const areFiltersEqual = (
	filters1: GameQueryParameters | null,
	filters2: GameQueryParameters | null
): boolean => {
	// both empty -> equal
	if (!filters1 && !filters2) return true

	// one empty, the other not -> different
	if (!filters1 || !filters2) return false

	// compare each relevant key
	for (const key of FILTER_KEYS) {
		if (!areValuesEqual(filters1[key], filters2[key])) return false
	}

	return true
}

/** Safely clone a possible Date; returns undefined for null/undefined, clones Date instances */
const cloneDateOrValue = (value: unknown): unknown => {
	if (value == null) return undefined
	if (value instanceof Date) return new Date(value.getTime())
	return value
}

/**
 * Deep-ish clone of the filters for storing in state.
 * - Clones Date objects to avoid shared references
 * - Clones arrays to avoid shared references
 */
export const cloneFilters = (filters: GameQueryParameters): GameQueryParameters => ({
	...filters,
	released: cloneDateOrValue(filters.released) as GameQueryParameters['released'],
	releasedYear: filters.releasedYear,
	started: cloneDateOrValue(filters.started) as GameQueryParameters['started'],
	startedYear: filters.startedYear,
	finished: cloneDateOrValue(filters.finished) as GameQueryParameters['finished'],
	finishedYear: filters.finishedYear,
	excludeStatusIds: filters.excludeStatusIds ? [...filters.excludeStatusIds] : undefined,
})
