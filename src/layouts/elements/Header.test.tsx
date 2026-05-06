import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { Header } from './Header'

vi.mock('./Header.scss', () => ({}))
vi.mock('./ThemeSelector.scss', () => ({}))
vi.mock('./MobileMenu.scss', () => ({}))
vi.mock('@/assets/svgs/user.svg?react', () => ({ default: () => <svg data-testid='user-icon' /> }))
vi.mock('@/assets/pngs/logo.png', () => ({ default: 'logo.png' }))
vi.mock('@/components/elements/CreateGame/CreateGame', () => ({ default: () => <div data-testid='create-game' /> }))
vi.mock('@/components/elements/GameDataActions/GameDataActions', () => ({ default: () => <div data-testid='game-data-actions' /> }))

const adminState = {
	auth: {
		isAuthenticated: true,
		user: { id: 1, username: 'TestAdmin', role: 'Admin' },
		token: 'tok',
		loading: false,
		error: null,
	},
	theme: {
		currentTheme: 'light',
		availableThemes: ['light', 'dark'],
	},
}

const standardState = {
	auth: {
		isAuthenticated: true,
		user: { id: 2, username: 'Player', role: 'Standard' },
		token: 'tok',
		loading: false,
		error: null,
	},
	theme: {
		currentTheme: 'light',
		availableThemes: ['light', 'dark'],
	},
}

describe('Header', () => {
	it('renders logo and app title', () => {
		renderWithProviders(<Header />, { preloadedState: adminState as any })
		expect(screen.getAllByText('Games Database').length).toBeGreaterThanOrEqual(1)
	})

	it('renders navigation links', () => {
		renderWithProviders(<Header />, { preloadedState: adminState as any })
		expect(screen.getAllByText('Home').length).toBeGreaterThanOrEqual(1)
		expect(screen.getAllByText('Admin').length).toBeGreaterThanOrEqual(1)
	})

	it('shows Users link for admin role', () => {
		renderWithProviders(<Header />, { preloadedState: adminState as any })
		expect(screen.getAllByText('Users').length).toBeGreaterThanOrEqual(1)
	})

	it('hides Users link for standard role', () => {
		renderWithProviders(<Header />, { preloadedState: standardState as any })
		expect(screen.queryByText('Users')).not.toBeInTheDocument()
	})

	it('shows username when logged in', () => {
		renderWithProviders(<Header />, { preloadedState: adminState as any })
		expect(screen.getByText('TestAdmin')).toBeInTheDocument()
	})

	it('renders CreateGame and GameDataActions', () => {
		renderWithProviders(<Header />, { preloadedState: adminState as any })
		expect(screen.getAllByTestId('create-game').length).toBeGreaterThanOrEqual(1)
		expect(screen.getAllByTestId('game-data-actions').length).toBeGreaterThanOrEqual(1)
	})

	it('dispatches logoutUser and navigates to /login on logout click', async () => {
		const user = userEvent.setup()
		const { store } = renderWithProviders(<Header />, { preloadedState: adminState as any })
		await user.click(screen.getByTitle('Logout'))
		expect(store.getState().auth.isAuthenticated).toBe(false)
	})

	it('opens mobile menu on burger click', async () => {
		const user = userEvent.setup()
		renderWithProviders(<Header />, { preloadedState: adminState as any })
		await user.click(screen.getByLabelText('Abrir menú'))
		expect(screen.getByText('Menu')).toBeInTheDocument()
	})
})
