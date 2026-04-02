import { describe, it, expect } from 'vitest'
import { DEFAULT_PAGE_SIZE } from './constants'

describe('constants', () => {
	it('DEFAULT_PAGE_SIZE is 50', () => {
		expect(DEFAULT_PAGE_SIZE).toBe(50)
	})

	it('DEFAULT_PAGE_SIZE is a number', () => {
		expect(typeof DEFAULT_PAGE_SIZE).toBe('number')
	})
})
