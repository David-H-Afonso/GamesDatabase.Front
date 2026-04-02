import { describe, it, expect } from 'vitest'
import { getReadableTextColor } from './getReadableTextColor'

describe('getReadableTextColor', () => {
	describe('hex #RRGGBB colors', () => {
		it('returns #000 for white (#ffffff)', () => {
			expect(getReadableTextColor('#ffffff')).toBe('#000')
		})

		it('returns #fff for black (#000000)', () => {
			expect(getReadableTextColor('#000000')).toBe('#fff')
		})

		it('returns #000 for a light yellow', () => {
			expect(getReadableTextColor('#ffff00')).toBe('#000')
		})

		it('returns #fff for a dark navy blue', () => {
			expect(getReadableTextColor('#003366')).toBe('#fff')
		})

		it('returns #fff for a dark red (#aa0000)', () => {
			expect(getReadableTextColor('#aa0000')).toBe('#fff')
		})

		it('returns #000 for a light green (#90ee90)', () => {
			expect(getReadableTextColor('#90ee90')).toBe('#000')
		})
	})

	describe('hex #RGB shorthand colors', () => {
		it('returns #000 for white #fff', () => {
			expect(getReadableTextColor('#fff')).toBe('#000')
		})

		it('returns #fff for black #000', () => {
			expect(getReadableTextColor('#000')).toBe('#fff')
		})

		it('returns appropriate color for #4af (medium-light blue)', () => {
			// #4af → #44aaff — YIQ = (68*299 + 170*587 + 255*114)/1000 ≈ 166 → light → #000
			expect(getReadableTextColor('#4af')).toBe('#000')
		})
	})

	describe('rgb() and rgba() colors', () => {
		it('returns #000 for rgb(255, 255, 255)', () => {
			expect(getReadableTextColor('rgb(255, 255, 255)')).toBe('#000')
		})

		it('returns #fff for rgb(0, 0, 0)', () => {
			expect(getReadableTextColor('rgb(0, 0, 0)')).toBe('#fff')
		})

		it('returns #000 for rgba(255, 255, 255, 0.5)', () => {
			expect(getReadableTextColor('rgba(255, 255, 255, 0.5)')).toBe('#000')
		})

		it('returns #fff for rgba(0, 0, 0, 1)', () => {
			expect(getReadableTextColor('rgba(0, 0, 0, 1)')).toBe('#fff')
		})

		it('handles rgb without spaces', () => {
			expect(getReadableTextColor('rgb(255,255,255)')).toBe('#000')
		})
	})

	describe('invalid input', () => {
		it('returns undefined for an empty string', () => {
			expect(getReadableTextColor('')).toBeUndefined()
		})

		it('returns undefined for a non-color string', () => {
			expect(getReadableTextColor('not-a-color')).toBeUndefined()
		})

		it('returns undefined for a color name (not supported)', () => {
			expect(getReadableTextColor('red')).toBeUndefined()
		})

		it('returns undefined for malformed hex (#gggggg)', () => {
			expect(getReadableTextColor('#gggggg')).toBeUndefined()
		})
	})
})
