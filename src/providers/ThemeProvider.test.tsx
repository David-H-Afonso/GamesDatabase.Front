import { render, screen } from '@testing-library/react'
import { ThemeProvider } from './ThemeProvider'

vi.mock('@/hooks/useTheme', () => ({
	useTheme: vi.fn().mockReturnValue({ currentTheme: 'dark' }),
}))

describe('ThemeProvider', () => {
	beforeEach(() => {
		document.documentElement.removeAttribute('data-theme')
		document.body.className = ''
	})

	it('renders children', () => {
		render(
			<ThemeProvider>
				<span>child content</span>
			</ThemeProvider>
		)
		expect(screen.getByText('child content')).toBeInTheDocument()
	})

	it('sets data-theme on documentElement', () => {
		render(
			<ThemeProvider>
				<div />
			</ThemeProvider>
		)
		expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
	})

	it('sets body class for legacy compatibility', () => {
		render(
			<ThemeProvider>
				<div />
			</ThemeProvider>
		)
		expect(document.body.className).toBe('theme-dark')
	})
})
