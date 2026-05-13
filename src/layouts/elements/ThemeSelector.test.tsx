import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { ThemeSelector } from './ThemeSelector'

vi.mock('./ThemeSelector.scss', () => ({}))

describe('ThemeSelector', () => {
	const lightState = {
		theme: {
			currentTheme: 'light',
			availableThemes: ['light', 'dark'],
		},
	}

	const darkState = {
		theme: {
			currentTheme: 'dark',
			availableThemes: ['light', 'dark'],
		},
	}

	it('renders a toggle button', () => {
		renderWithProviders(<ThemeSelector />, { preloadedState: lightState as any })
		expect(screen.getByRole('button')).toBeInTheDocument()
	})

	it('shows sun icon (switch to light) when dark theme is active', () => {
		renderWithProviders(<ThemeSelector />, { preloadedState: darkState as any })
		const btn = screen.getByRole('button')
		expect(btn).toHaveAttribute('aria-pressed', 'true')
	})

	it('shows moon icon (switch to dark) when light theme is active', () => {
		renderWithProviders(<ThemeSelector />, { preloadedState: lightState as any })
		const btn = screen.getByRole('button')
		expect(btn).toHaveAttribute('aria-pressed', 'false')
	})

	it('dispatches setTheme to dark when clicking in light mode', async () => {
		const user = userEvent.setup()
		const { store } = renderWithProviders(<ThemeSelector />, { preloadedState: lightState as any })
		await user.click(screen.getByRole('button'))
		expect(store.getState().theme.currentTheme).toBe('dark')
	})

	it('dispatches setTheme to light when clicking in dark mode', async () => {
		const user = userEvent.setup()
		const { store } = renderWithProviders(<ThemeSelector />, { preloadedState: darkState as any })
		await user.click(screen.getByRole('button'))
		expect(store.getState().theme.currentTheme).toBe('light')
	})
})
