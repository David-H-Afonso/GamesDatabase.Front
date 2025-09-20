import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { ThemeState } from '@/models/store/ThemeState'
import type { ViewMode } from '@/models/ViewMode'
import { AVAILABLE_THEMES } from '@/assets/styles/themes/AVAILABLE_THEMES'

// Function to get initial theme
const getInitialTheme = (): string => {
	if (typeof window === 'undefined') return 'light'

	try {
		const savedTheme = localStorage.getItem('theme')
		if (savedTheme && AVAILABLE_THEMES.includes(savedTheme as any)) {
			return savedTheme
		}

		const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
		return systemPrefersDark ? 'dark' : 'light'
	} catch {
		return 'light'
	}
}

const initialState: ThemeState = {
	currentTheme: getInitialTheme(),
	availableThemes: [...AVAILABLE_THEMES],
	cardStyle: 'row',
	viewMode: 'default',
}

const themeSlice = createSlice({
	name: 'theme',
	initialState,
	reducers: {
		setTheme: (state, action: PayloadAction<string>) => {
			if (state.availableThemes.includes(action.payload)) {
				state.currentTheme = action.payload

				// Apply theme to document immediately
				if (typeof document !== 'undefined') {
					document.documentElement.setAttribute('data-theme', action.payload)
				}
			} else {
				console.warn(`Attempted to set unavailable theme: ${action.payload}`)
			}
		},
		addTheme: (state, action: PayloadAction<string>) => {
			if (!state.availableThemes.includes(action.payload)) {
				state.availableThemes.push(action.payload)
			}
		},
		removeTheme: (state, action: PayloadAction<string>) => {
			if (action.payload !== state.currentTheme) {
				state.availableThemes = state.availableThemes.filter((theme) => theme !== action.payload)
			}
		},
		initializeTheme: (state) => {
			// Get theme from localStorage or system preference
			let themeToSet = 'dark' // default fallback

			if (typeof window !== 'undefined') {
				const savedTheme = localStorage.getItem('theme')
				const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

				if (savedTheme && state.availableThemes.includes(savedTheme)) {
					themeToSet = savedTheme
				} else if (systemPrefersDark && state.availableThemes.includes('dark')) {
					themeToSet = 'dark'
				}
			}

			state.currentTheme = themeToSet

			// Apply theme to document immediately
			if (typeof document !== 'undefined') {
				document.documentElement.setAttribute('data-theme', themeToSet)
			}
		},
		setCardStyle: (state, action: PayloadAction<'card' | 'row' | 'tile'>) => {
			state.cardStyle = action.payload
		},
		setViewMode: (state, action: PayloadAction<ViewMode>) => {
			state.viewMode = action.payload
		},
		reset: () => initialState,
	},
})

export const {
	setTheme,
	addTheme,
	removeTheme,
	initializeTheme,
	setCardStyle,
	setViewMode,
	reset,
} = themeSlice.actions

export default themeSlice.reducer
