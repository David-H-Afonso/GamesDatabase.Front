import { describe, expect, it } from 'vitest'
import { countGameFilters } from './countGameFilters'

describe('applied filter count', () => {
	it('ignores view, sorting, page, replay matching and presentation preferences', () => {
		expect(countGameFilters({ page: 5, pageSize: 50, sortBy: 'grade', sortDescending: true, viewId: 7, replayMatchMode: 'all' })).toBe(0)
	})
	it('counts false booleans and valid zero bounds, grouping ranges as a single criterion', () => {
		expect(countGameFilters({ favorite: false, hasSteamApp: false, fullCompletion: false, minGrade: 0, maxGrade: 0, maxStory: 0, replayGradeMin: 0, replayGradeMax: 0 })).toBe(6)
	})
	it('groups name terms and honors each distinct advanced semantic criterion', () => {
		expect(countGameFilters({ nameSearch: { version: 1, matchType: 'contains', includeTerms: ['Amber', 'Harbor'], excludeTerms: ['Remaster'], matchMode: 'any', caseSensitive: false, accentSensitive: false }, excludeStatusIds: [1, 2], replayStartedTo: '2026-11-26', replayFinishedTo: '2026-11-26', showIncomplete: true, missingDuration: 'both', criticProvider: 'SteamDB' })).toBe(7)
	})
})
