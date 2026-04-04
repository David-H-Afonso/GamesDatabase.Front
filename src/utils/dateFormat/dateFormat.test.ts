import { describe, it, expect } from 'vitest'
import { formatToLocaleDate } from './dateFormat'

describe('formatToLocaleDate', () => {
	it('returns formatted date string for a valid ISO date', () => {
		const result = formatToLocaleDate('2025-06-15T00:00:00Z')
		// The formatted string depends on locale, but it must contain "2025"
		expect(result).toContain('2025')
		expect(result).not.toBe('N/A')
		expect(result).not.toBe('Invalid Date')
	})

	it('returns "N/A" for undefined', () => {
		expect(formatToLocaleDate()).toBe('N/A')
	})

	it('returns "N/A" for empty string', () => {
		expect(formatToLocaleDate('')).toBe('N/A')
	})

	it('does not throw for an invalid date string', () => {
		// new Date('not-a-date').toLocaleDateString() returns 'Invalid Date' in most environments
		const result = formatToLocaleDate('not-a-date')
		expect(typeof result).toBe('string')
	})
})
