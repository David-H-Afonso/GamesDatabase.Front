export const AVAILABLE_THEMES = ['light', 'dark', 'steam', 'wolverine-classic', 'wolverine-modern', 'gta-vice-city', 'gta-iv', 'gta-v', 'gta-vi', 'nintendo', 'playstation', 'xbox'] as const

export const THEME_FAMILIES = [
	{ key: 'light', variants: ['light'], defaultTheme: 'light' },
	{ key: 'dark', variants: ['dark'], defaultTheme: 'dark' },
	{ key: 'steam', variants: ['steam'], defaultTheme: 'steam' },
	{ key: 'wolverine', variants: ['wolverine-classic', 'wolverine-modern'], defaultTheme: 'wolverine-classic' },
	{ key: 'gta', variants: ['gta-vice-city', 'gta-iv', 'gta-v', 'gta-vi'], defaultTheme: 'gta-vice-city' },
	{ key: 'nintendo', variants: ['nintendo'], defaultTheme: 'nintendo' },
	{ key: 'playstation', variants: ['playstation'], defaultTheme: 'playstation' },
	{ key: 'xbox', variants: ['xbox'], defaultTheme: 'xbox' },
] as const

export const THEME_VARIANTS_BY_FAMILY: Record<string, readonly string[]> = {
	light: ['light'],
	dark: ['dark'],
	steam: ['steam'],
	wolverine: ['wolverine-classic', 'wolverine-modern'],
	gta: ['gta-vice-city', 'gta-iv', 'gta-v', 'gta-vi'],
	nintendo: ['nintendo'],
	playstation: ['playstation'],
	xbox: ['xbox'],
}

export const DEFAULT_THEME_BY_FAMILY: Record<string, string> = {
	light: 'light',
	dark: 'dark',
	steam: 'steam',
	wolverine: 'wolverine-classic',
	gta: 'gta-vice-city',
	nintendo: 'nintendo',
	playstation: 'playstation',
	xbox: 'xbox',
}

export const THEME_FAMILY_BY_THEME: Record<string, string> = {
	light: 'light',
	dark: 'dark',
	steam: 'steam',
	'wolverine-classic': 'wolverine',
	'wolverine-modern': 'wolverine',
	'gta-v': 'gta',
	'gta-iv': 'gta',
	'gta-vice-city': 'gta',
	'gta-vi': 'gta',
	nintendo: 'nintendo',
	playstation: 'playstation',
	xbox: 'xbox',
}

export const LEGACY_THEME_ALIASES: Record<string, string> = {
	wolverine: 'wolverine-classic',
	gta: 'gta-vice-city',
}

export const normalizeThemeKey = (theme?: string | null): string | null => {
	if (!theme) return null
	return LEGACY_THEME_ALIASES[theme] ?? theme
}

export const getThemeFamilyKey = (theme?: string | null): string | null => {
	const normalizedTheme = normalizeThemeKey(theme)
	if (!normalizedTheme) return null
	return THEME_FAMILY_BY_THEME[normalizedTheme] ?? null
}
