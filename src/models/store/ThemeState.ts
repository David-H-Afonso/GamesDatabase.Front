import type { ViewMode } from '@/models/ViewMode'

export interface ThemeState {
	currentTheme: string
	availableThemes: string[]
	cardStyle?: 'card' | 'row' | 'tile'
	viewMode?: ViewMode
}
