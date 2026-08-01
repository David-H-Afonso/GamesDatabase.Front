import { getThemeFamilyKey } from './AVAILABLE_THEMES'

/** Sentinel id meaning "no background image; use the plain theme surface". */
export const NO_BACKGROUND = 'none'

export interface ThemeBackgroundOption {
	/** Stable id persisted per theme. */
	id: string
	/** i18n key for the human label shown in the selector. */
	labelKey: string
	/** Public URL of the background image (served from /public). */
	url: string
}

/**
 * Predefined background images grouped by theme family. To add a new option,
 * drop the optimized asset under `public/theme-backgrounds/<family>/` and add
 * an entry here — no component changes are needed.
 */
const BACKGROUNDS_BY_FAMILY: Record<string, ThemeBackgroundOption[]> = {
	light: [
		{ id: 'aurora', labelKey: 'nav.bgAurora', url: '/theme-backgrounds/light/aurora.svg' },
		{ id: 'grid', labelKey: 'nav.bgGrid', url: '/theme-backgrounds/light/grid.svg' },
	],
	dark: [
		{ id: 'aurora', labelKey: 'nav.bgAurora', url: '/theme-backgrounds/dark/aurora.svg' },
		{ id: 'grid', labelKey: 'nav.bgGrid', url: '/theme-backgrounds/dark/grid.svg' },
	],
	steam: [
		{ id: 'aurora', labelKey: 'nav.bgAurora', url: '/theme-backgrounds/steam/aurora.svg' },
		{ id: 'grid', labelKey: 'nav.bgGrid', url: '/theme-backgrounds/steam/grid.svg' },
	],
	wolverine: [
		{ id: 'aurora', labelKey: 'nav.bgAurora', url: '/theme-backgrounds/wolverine/aurora.svg' },
		{ id: 'grid', labelKey: 'nav.bgGrid', url: '/theme-backgrounds/wolverine/grid.svg' },
	],
	gta: [
		{ id: 'aurora', labelKey: 'nav.bgAurora', url: '/theme-backgrounds/gta/aurora.svg' },
		{ id: 'grid', labelKey: 'nav.bgGrid', url: '/theme-backgrounds/gta/grid.svg' },
	],
	nintendo: [
		{ id: 'aurora', labelKey: 'nav.bgAurora', url: '/theme-backgrounds/nintendo/aurora.svg' },
		{ id: 'grid', labelKey: 'nav.bgGrid', url: '/theme-backgrounds/nintendo/grid.svg' },
	],
	playstation: [
		{ id: 'aurora', labelKey: 'nav.bgAurora', url: '/theme-backgrounds/playstation/aurora.svg' },
		{ id: 'grid', labelKey: 'nav.bgGrid', url: '/theme-backgrounds/playstation/grid.svg' },
	],
	xbox: [
		{ id: 'aurora', labelKey: 'nav.bgAurora', url: '/theme-backgrounds/xbox/aurora.svg' },
		{ id: 'grid', labelKey: 'nav.bgGrid', url: '/theme-backgrounds/xbox/grid.svg' },
	],
}

/** Options available for a given theme key (resolved through its family). */
export const getThemeBackgroundOptions = (theme?: string | null): ThemeBackgroundOption[] => {
	const family = getThemeFamilyKey(theme)
	if (!family) return []
	return BACKGROUNDS_BY_FAMILY[family] ?? []
}

/** Resolve the CSS `url(...)` for a stored selection, or null for none/unknown. */
export const resolveThemeBackgroundUrl = (theme?: string | null, backgroundId?: string | null): string | null => {
	if (!backgroundId || backgroundId === NO_BACKGROUND) return null
	const option = getThemeBackgroundOptions(theme).find((o) => o.id === backgroundId)
	return option ? option.url : null
}
