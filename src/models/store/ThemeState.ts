import type { ViewMode } from '@/models/ViewMode'

export interface ThemeState {
	currentTheme: string
	availableThemes: string[]
	cardStyle?: 'card' | 'row' | 'cover'
	viewMode?: ViewMode
	/**
	 * Selected background image id per theme key. `'none'` (or a missing entry)
	 * means the theme uses its plain token background with no image.
	 */
	backgroundByTheme?: Record<string, string>
}
