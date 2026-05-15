import { describe, expect, it } from 'vitest'
import { DEFAULT_PLATFORM_ICON, PLATFORM_ICON_PRESETS, STEAM_PLATFORM_ICON, formatPlaytime, hoursToMinutesValue, minutesToHoursValue } from './platformIcons'

describe('platformIcons', () => {
	it('provides default and preset icons as image data URLs', () => {
		expect(DEFAULT_PLATFORM_ICON).toContain('data:image/png;base64')
		expect(STEAM_PLATFORM_ICON).toContain('data:image/png;base64')
		expect(PLATFORM_ICON_PRESETS.map((preset) => preset.id)).toEqual([
			'switch',
			'switch2',
			'epic',
			'gog',
			'ubisoft',
			'emulator',
			'itchio',
			'battlenet',
			'steam',
			'ea',
			'playstation',
			'xbox',
		])
		expect(PLATFORM_ICON_PRESETS.every((preset) => preset.logo.startsWith('data:image/'))).toBe(true)
		expect(PLATFORM_ICON_PRESETS.every((preset) => preset.logo.length <= 500_000)).toBe(true)
	})

	it('formats playtime minutes as compact hours', () => {
		expect(formatPlaytime(60)).toBe('1h')
		expect(formatPlaytime(75)).toBe('1.3h')
		expect(formatPlaytime(null)).toBe('')
	})

	it('converts between manual hours and stored minutes', () => {
		expect(hoursToMinutesValue('2.5')).toBe(150)
		expect(hoursToMinutesValue('')).toBeNull()
		expect(minutesToHoursValue(150)).toBe(2.5)
		expect(minutesToHoursValue(undefined)).toBeUndefined()
	})
})
