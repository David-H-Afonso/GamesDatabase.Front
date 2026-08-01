import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { ThemeState } from '@/models/store/ThemeState'
import type { ViewMode } from '@/models/ViewMode'
import { AVAILABLE_THEMES, normalizeThemeKey } from '@/assets/styles/themes/AVAILABLE_THEMES'
import { NO_BACKGROUND, resolveThemeBackgroundUrl } from '@/assets/styles/themes/themeBackgrounds'

// Function to get initial theme
const getInitialTheme = (): string => {
	if (typeof window === 'undefined') return 'light'

	try {
		const savedTheme = normalizeThemeKey(localStorage.getItem('theme'))
		if (savedTheme && AVAILABLE_THEMES.includes(savedTheme as any)) {
			return savedTheme
		}

		const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
		return systemPrefersDark ? 'dark' : 'light'
	} catch {
		return 'light'
	}
}

// Apply the selected background image for a theme onto the document as a CSS
// custom property consumed by the app shell (see themes/index.scss).
const applyBackground = (theme: string, backgroundByTheme?: Record<string, string>) => {
	if (typeof document === 'undefined') return
	const backgroundId = backgroundByTheme?.[theme]
	const url = resolveThemeBackgroundUrl(theme, backgroundId)
	document.documentElement.style.setProperty('--app-bg-image', url ? `url("${url}")` : 'none')
	if (document.body) document.body.classList.toggle('has-app-bg', !!url)
}

const initialState: ThemeState = {
	currentTheme: getInitialTheme(),
	availableThemes: [...AVAILABLE_THEMES],
	cardStyle: 'card',
	viewMode: 'default',
	backgroundByTheme: {},
}

const themeSlice = createSlice({
	name: 'theme',
	initialState,
	reducers: {
		setTheme: (state, action: PayloadAction<string>) => {
			const normalizedTheme = normalizeThemeKey(action.payload)

			if (normalizedTheme && (AVAILABLE_THEMES as readonly string[]).includes(normalizedTheme)) {
				state.currentTheme = normalizedTheme

				// Apply theme to document immediately
				if (typeof document !== 'undefined') {
					document.documentElement.setAttribute('data-theme', normalizedTheme)
					applyBackground(normalizedTheme, state.backgroundByTheme)
				}
			} else {
				console.warn(`Attempted to set unavailable theme: ${action.payload}`)
			}
		},
		setThemeBackground: (state, action: PayloadAction<{ theme?: string; backgroundId: string }>) => {
			const theme = normalizeThemeKey(action.payload.theme) ?? state.currentTheme
			if (!state.backgroundByTheme) state.backgroundByTheme = {}
			if (action.payload.backgroundId === NO_BACKGROUND) {
				delete state.backgroundByTheme[theme]
			} else {
				state.backgroundByTheme[theme] = action.payload.backgroundId
			}
			if (theme === state.currentTheme) applyBackground(theme, state.backgroundByTheme)
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
			// Re-sync with the source of truth in case persisted state predates a new theme.
			state.availableThemes = [...AVAILABLE_THEMES]
			if (!state.backgroundByTheme) state.backgroundByTheme = {}

			// Get theme from localStorage or system preference
			let themeToSet = 'dark' // default fallback

			if (typeof window !== 'undefined') {
				const savedTheme = normalizeThemeKey(localStorage.getItem('theme'))
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
				applyBackground(themeToSet, state.backgroundByTheme)
			}
		},
		setCardStyle: (state, action: PayloadAction<'card' | 'row' | 'cover'>) => {
			state.cardStyle = action.payload
		},
		setViewMode: (state, action: PayloadAction<ViewMode>) => {
			state.viewMode = action.payload
		},
		reset: () => initialState,
	},
})

export const { setTheme, setThemeBackground, addTheme, removeTheme, initializeTheme, setCardStyle, setViewMode, reset } = themeSlice.actions

export default themeSlice.reducer
