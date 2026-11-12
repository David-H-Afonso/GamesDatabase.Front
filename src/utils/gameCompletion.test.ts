import type { Game } from '@/models/api/Game'
import { completionLabelKey, isGameCompleted, isGameFullyCompleted } from './gameCompletion'

const game: Game = { id: 1, name: 'Game', statusId: 1, favorite: false, playWithIds: [], playWithNames: [] }

describe('shared completion policy', () => {
	it('includes Vampire Survivors-style completed sets without claiming 100%', () => {
		const vampire = { ...game, steamAppId: 1794680, steamSetsCompleted: 4, steamAchievementsUnlocked: 197, steamAchievementsTotal: 243, isCompleted: true, isFullyCompleted: false }
		expect(isGameCompleted(vampire)).toBe(true)
		expect(isGameFullyCompleted(vampire)).toBe(false)
		expect(completionLabelKey(vampire)).toBe('game.card.completed')
	})
	it('preserves historical completion separately from the current percentage', () => {
		const historical = { ...game, steamCompletionPreserved: true, steamAppId: 1, steamAchievementsUnlocked: 10, steamAchievementsTotal: 12 }
		expect(isGameCompleted(historical)).toBe(true)
		expect(isGameFullyCompleted(historical)).toBe(false)
	})
	it('retains the old 100% badge when all achievements are still unlocked', () => {
		const full = { ...game, steamAppId: 1, steamAchievementsUnlocked: 12, steamAchievementsTotal: 12 }
		expect(isGameFullyCompleted(full)).toBe(true)
		expect(completionLabelKey(full)).toBe('game.card.full')
	})
	it('retains manual non-Steam 100% declarations', () => {
		expect(isGameCompleted({ ...game, isManuallyCompleted: true })).toBe(true)
		expect(isGameFullyCompleted({ ...game, isManuallyCompleted: true })).toBe(true)
	})
	it('a manual mark cannot override missing Steam achievements in the strict filter', () => {
		const manualSteam = { ...game, steamAppId: 1, isManuallyCompleted: true, steamAchievementsUnlocked: 1, steamAchievementsTotal: 2 }
		expect(isGameCompleted(manualSteam)).toBe(true)
		expect(isGameFullyCompleted(manualSteam)).toBe(false)
	})
	it('trusts an explicit server false rather than a stale local counter', () => {
		const server = { ...game, steamAchievementsUnlocked: 2, steamAchievementsTotal: 2, isCompleted: false, isFullyCompleted: false }
		expect(isGameCompleted(server)).toBe(false)
		expect(isGameFullyCompleted(server)).toBe(false)
	})
	it('never mistakes 100 estimated hours or zero achievements for completion', () => {
		expect(isGameCompleted({ ...game, completion: 100 })).toBe(false)
		expect(isGameFullyCompleted({ ...game, steamAchievementsUnlocked: 0, steamAchievementsTotal: 0 })).toBe(false)
	})
})
