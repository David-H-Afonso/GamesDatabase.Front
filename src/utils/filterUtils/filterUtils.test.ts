import { describe, it, expect } from 'vitest'
import { areFiltersEqual, cloneFilters } from './filterUtils'
import type { GameQueryParameters } from '@/models/api/Game'

describe('areFiltersEqual', () => {
	it('returns true when both filters are null', () => {
		expect(areFiltersEqual(null, null)).toBe(true)
	})

	it('returns false when first is null and second is not', () => {
		expect(areFiltersEqual(null, { search: 'zelda' })).toBe(false)
	})

	it('returns false when second is null and first is not', () => {
		expect(areFiltersEqual({ search: 'zelda' }, null)).toBe(false)
	})

	it('returns true for two identical filter objects', () => {
		const f: GameQueryParameters = { search: 'zelda', statusId: 2, page: 1 }
		expect(areFiltersEqual(f, { ...f })).toBe(true)
	})

	it('returns false when a field differs', () => {
		expect(areFiltersEqual({ search: 'zelda' }, { search: 'mario' })).toBe(false)
	})

	it('returns true for two empty objects', () => {
		expect(areFiltersEqual({}, {})).toBe(true)
	})

	it('normalizes null to undefined — treats null and undefined as equal', () => {
		const a: GameQueryParameters = { search: undefined }
		const b = { search: null } as unknown as GameQueryParameters
		expect(areFiltersEqual(a, b)).toBe(true)
	})

	it('returns true for equal excludeStatusIds arrays', () => {
		expect(areFiltersEqual({ excludeStatusIds: [1, 2] }, { excludeStatusIds: [1, 2] })).toBe(true)
	})

	it('returns false for different excludeStatusIds arrays (different values)', () => {
		expect(areFiltersEqual({ excludeStatusIds: [1, 2] }, { excludeStatusIds: [1, 3] })).toBe(false)
	})

	it('returns false for different excludeStatusIds arrays (different length)', () => {
		expect(areFiltersEqual({ excludeStatusIds: [1] }, { excludeStatusIds: [1, 2] })).toBe(false)
	})

	it('returns false when one has excludeStatusIds and the other does not', () => {
		expect(areFiltersEqual({ excludeStatusIds: [1] }, {})).toBe(false)
	})

	it('compares numeric filters correctly', () => {
		expect(areFiltersEqual({ minGrade: 70, maxGrade: 100 }, { minGrade: 70, maxGrade: 100 })).toBe(true)
		expect(areFiltersEqual({ minGrade: 70 }, { minGrade: 80 })).toBe(false)
	})
})

describe('cloneFilters', () => {
	it('returns a new object (not the same reference)', () => {
		const original: GameQueryParameters = { search: 'zelda', page: 1 }
		const clone = cloneFilters(original)
		expect(clone).not.toBe(original)
	})

	it('cloned object has the same scalar values as original', () => {
		const original: GameQueryParameters = { search: 'zelda', page: 2, pageSize: 50, statusId: 3 }
		const clone = cloneFilters(original)
		expect(clone.search).toBe(original.search)
		expect(clone.page).toBe(original.page)
		expect(clone.pageSize).toBe(original.pageSize)
		expect(clone.statusId).toBe(original.statusId)
	})

	it('mutation of clone does not affect original', () => {
		const original: GameQueryParameters = { search: 'zelda' }
		const clone = cloneFilters(original)
		;(clone as any).search = 'mutated'
		expect(original.search).toBe('zelda')
	})

	it('clones excludeStatusIds array (not same reference)', () => {
		const original: GameQueryParameters = { excludeStatusIds: [1, 2, 3] }
		const clone = cloneFilters(original)
		expect(clone.excludeStatusIds).toEqual([1, 2, 3])
		expect(clone.excludeStatusIds).not.toBe(original.excludeStatusIds)
	})

	it('mutation of cloned excludeStatusIds does not affect original', () => {
		const original: GameQueryParameters = { excludeStatusIds: [1, 2] }
		const clone = cloneFilters(original)
		clone.excludeStatusIds!.push(999)
		expect(original.excludeStatusIds).toEqual([1, 2])
	})

	it('sets excludeStatusIds to undefined when original has none', () => {
		const original: GameQueryParameters = { search: 'test' }
		const clone = cloneFilters(original)
		expect(clone.excludeStatusIds).toBeUndefined()
	})

	it('clones Date values as new Date instances', () => {
		const date = new Date('2025-01-01')
		const original: GameQueryParameters = { released: date as any, started: date as any, finished: date as any }
		const clone = cloneFilters(original)
		expect(clone.released).not.toBe(date)
		expect(new Date(clone.released as any).getTime()).toBe(date.getTime())
		expect(clone.started).not.toBe(date)
		expect(clone.finished).not.toBe(date)
	})
})
