import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { ThemeSelector } from './ThemeSelector'

vi.mock('./ThemeSelector.scss', () => ({}))

describe('ThemeSelector', () => {
	const themeState = {
		theme: {
			currentTheme: 'light',
			availableThemes: ['light', 'dark'],
		},
	}

	it('renders a select with available themes', () => {
		renderWithProviders(<ThemeSelector />, { preloadedState: themeState as any })
		const select = screen.getByLabelText('Tema')
		expect(select).toBeInTheDocument()
		expect(screen.getByText('Claro')).toBeInTheDocument()
		expect(screen.getByText('Oscuro')).toBeInTheDocument()
	})

	it('shows current theme as selected', () => {
		renderWithProviders(<ThemeSelector />, { preloadedState: themeState as any })
		const select = screen.getByLabelText('Tema') as HTMLSelectElement
		expect(select.value).toBe('light')
	})

	it('dispatches setTheme on change', async () => {
		const user = userEvent.setup()
		const { store } = renderWithProviders(<ThemeSelector />, { preloadedState: themeState as any })
		const select = screen.getByLabelText('Tema')
		await user.selectOptions(select, 'dark')
		expect(store.getState().theme.currentTheme).toBe('dark')
	})

	it('uses fallback display name for unknown themes', () => {
		const customState = {
			theme: {
				currentTheme: 'custom',
				availableThemes: ['light', 'dark', 'custom'],
			},
		}
		renderWithProviders(<ThemeSelector />, { preloadedState: customState as any })
		expect(screen.getByText('Custom')).toBeInTheDocument()
	})
})
