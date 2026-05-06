import { describe, it, expect } from 'vitest'
import { getMetacriticColor } from './scoreColors'

describe('getMetacriticColor', () => {
	describe('green range (≥ 75)', () => {
		it('returns green for score 75', () => {
			expect(getMetacriticColor(75)).toBe('#66cc33')
		})
		it('returns green for score 100', () => {
			expect(getMetacriticColor(100)).toBe('#66cc33')
		})
		it('returns green for score 90', () => {
			expect(getMetacriticColor(90)).toBe('#66cc33')
		})
	})

	describe('yellow range (50–74)', () => {
		it('returns yellow for score 50', () => {
			expect(getMetacriticColor(50)).toBe('#ffcc33')
		})
		it('returns yellow for score 74', () => {
			expect(getMetacriticColor(74)).toBe('#ffcc33')
		})
		it('returns yellow for score 60', () => {
			expect(getMetacriticColor(60)).toBe('#ffcc33')
		})
	})

	describe('red range (0–49)', () => {
		it('returns red for score 0', () => {
			expect(getMetacriticColor(0)).toBe('#ff0000')
		})
		it('returns red for score 49', () => {
			expect(getMetacriticColor(49)).toBe('#ff0000')
		})
		it('returns red for score 25', () => {
			expect(getMetacriticColor(25)).toBe('#ff0000')
		})
	})

	describe('boundary values', () => {
		it('score 74 is yellow, score 75 is green', () => {
			expect(getMetacriticColor(74)).toBe('#ffcc33')
			expect(getMetacriticColor(75)).toBe('#66cc33')
		})
		it('score 49 is red, score 50 is yellow', () => {
			expect(getMetacriticColor(49)).toBe('#ff0000')
			expect(getMetacriticColor(50)).toBe('#ffcc33')
		})
	})
})
