import { describe, expect, it } from 'vitest'
import { effectivePlaytime, playtimeSourceKey } from './collectionFormatting'

describe('recorded playtime sources — manual zero means automatic, positive manual can add', () => {
	it.each([
		[undefined, undefined, false, null], [null, 0, false, 0], [0, undefined, false, null], [0, 120, false, 120], [0, 120, true, 120],
		[90, undefined, false, 90], [90, undefined, true, 90], [90, 0, true, 90], [90, 120, false, 90], [90, 120, true, 210], [600000, 2147483647, true, 2148083647],
	])('manual %s / Steam %s / additive %s yields %s minutes', (manual, steam, additive, expected) => {
		const game = { manualPlaytimeMinutes: manual, steamPlaytimeForever: steam, manualPlaytimeIsAdditive: additive }
		expect(effectivePlaytime(game)).toBe(expected); expect(game.manualPlaytimeMinutes).toBe(manual); expect(game.steamPlaytimeForever).toBe(steam)
	})
	it('labels source contributions without using recorded time as a story estimate', () => {
		expect(playtimeSourceKey({ manualPlaytimeMinutes: 0, steamPlaytimeForever: 120 })).toBe('gallery.statistics.steam')
		expect(playtimeSourceKey({ manualPlaytimeMinutes: 90, steamPlaytimeForever: 120, manualPlaytimeIsAdditive: true })).toBe('gallery.statistics.manualAdded')
		expect(playtimeSourceKey({ manualPlaytimeMinutes: 90, steamPlaytimeForever: 120, manualPlaytimeIsAdditive: false })).toBe('gallery.statistics.manual')
	})
})
