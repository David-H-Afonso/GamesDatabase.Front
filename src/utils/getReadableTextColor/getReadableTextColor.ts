/**
 * Return either '#000' or '#fff' depending on which is more readable
 * on top of the provided color. Returns undefined for unsupported input.
 */
export const getReadableTextColor = (color: string): string | undefined => {
	const rgb = parseHexColor(color) ?? parseRgbColor(color)
	if (!rgb) return undefined

	const [r, g, b] = rgb
	// YIQ luminance formula: higher value => lighter background
	const luminance = (r * 299 + g * 587 + b * 114) / 1000
	return luminance >= 128 ? '#000' : '#fff'
}

/* Helpers */

/** Clamp value to 0..255 */
const clamp8 = (n: number) => Math.max(0, Math.min(255, Math.round(n)))

/** Parse #RGB or #RRGGBB hex color into [r,g,b] or null if not hex */
const parseHexColor = (input: string): [number, number, number] | null => {
	const m = input.trim().match(/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/)
	if (!m) return null

	const hex = m[1]
	if (hex.length === 3) {
		const r = parseInt(hex[0] + hex[0], 16)
		const g = parseInt(hex[1] + hex[1], 16)
		const b = parseInt(hex[2] + hex[2], 16)
		return [r, g, b]
	}

	const r = parseInt(hex.slice(0, 2), 16)
	const g = parseInt(hex.slice(2, 4), 16)
	const b = parseInt(hex.slice(4, 6), 16)
	return [r, g, b]
}

/**
 * Parse rgb(...) or rgba(...) into [r,g,b].
 * Accepts integers for r,g,b. Ignores alpha if present.
 */
const parseRgbColor = (input: string): [number, number, number] | null => {
	// matches: rgb(255, 0, 100) or rgba(255,0,100,0.5) with optional spaces
	const m = input.trim().match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*[\d.]+\s*)?\)$/i)
	if (!m) return null

	const r = clamp8(Number(m[1]))
	const g = clamp8(Number(m[2]))
	const b = clamp8(Number(m[3]))
	return [r, g, b]
}
