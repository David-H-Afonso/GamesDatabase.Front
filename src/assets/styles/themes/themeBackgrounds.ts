import { getThemeFamilyKey } from './AVAILABLE_THEMES'
import ps5WolverineBackground from '@/assets/backgrounds/wolverine/ps5.avif'

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
	wolverine: [{ id: 'ps5', labelKey: 'nav.bgWolverinePs5', url: ps5WolverineBackground }],
}

const DEFAULT_BACKGROUND_BY_FAMILY: Record<string, string> = { wolverine: 'ps5' }

/** Options available for a given theme key (resolved through its family). */
export const getThemeBackgroundOptions = (theme?: string | null): ThemeBackgroundOption[] => {
	const family = getThemeFamilyKey(theme)
	if (!family) return []
	return BACKGROUNDS_BY_FAMILY[family] ?? []
}

export const getDefaultThemeBackgroundId = (theme?: string | null): string | null => DEFAULT_BACKGROUND_BY_FAMILY[getThemeFamilyKey(theme) ?? ''] ?? null

/** Resolve the CSS `url(...)` for a stored selection, or null for none/unknown. */
export const resolveThemeBackgroundUrl = (theme?: string | null, backgroundId?: string | null): string | null => {
	const options = getThemeBackgroundOptions(theme)
	if (backgroundId === NO_BACKGROUND) return null
	if (!backgroundId) {
		const defaultId = DEFAULT_BACKGROUND_BY_FAMILY[getThemeFamilyKey(theme) ?? '']
		return options.find((option) => option.id === defaultId)?.url ?? null
	}
	const option = options.find((o) => o.id === backgroundId) ?? options.find((candidate) => candidate.id === DEFAULT_BACKGROUND_BY_FAMILY[getThemeFamilyKey(theme) ?? ''])
	return option ? option.url : null
}

export const resolveBackgroundValue = (theme?: string | null, backgroundId?: string | null): string | null =>
	resolveThemeBackgroundUrl(theme, backgroundId)
