import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { Header } from './Header'

vi.mock('./Header.scss', () => ({}))
vi.mock('./ThemeSelector.scss', () => ({}))
vi.mock('./MobileMenu.scss', () => ({}))
vi.mock('@/assets/svgs/user.svg?react', () => ({ default: () => <svg data-testid='user-icon' /> }))
vi.mock('@/assets/pngs/logo.png', () => ({ default: 'logo.png' }))
vi.mock('@/components/elements/CreateGame/CreateGame', async () => {
	const { forwardRef } = await import('react')
	return { default: forwardRef(() => <div data-testid='create-game' />) }
})
vi.mock('@/components/elements/GameDataActions/GameDataActions', () => ({ default: () => <div data-testid='game-data-actions' /> }))

const adminState = {
	auth: {
		isAuthenticated: true,
		user: { id: 1, username: 'TestAdmin', role: 'Admin' },
		token: 'tok',
			refreshToken: null,
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
			refreshToken: null,
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
		const brand = screen.getByRole('link', { name: /Games Database.*Inicio/i })
		expect(brand).toHaveAttribute('href', '/')
		expect(brand.querySelector('img.gdb-brand-mark')).toHaveAttribute('src', 'logo.png')
		expect(brand.querySelector('svg.gdb-brand-mark')).not.toBeInTheDocument()
	})

	it('renders navigation links', () => {
		renderWithProviders(<Header />, { preloadedState: adminState as any })
		expect(screen.getAllByText('Inicio').length).toBeGreaterThanOrEqual(1)
		expect(screen.getAllByText('Focus').length).toBeGreaterThanOrEqual(1)
		expect(screen.getAllByRole('link', { name: 'Biblioteca' })).toHaveLength(2)
		expect(screen.getAllByRole('link', { name: 'Estadísticas' })).toHaveLength(2)
	})

	it('marks Focus as the current page when opened', () => {
		renderWithProviders(<Header />, { preloadedState: adminState as any, route: '/focus' })
		for (const link of screen.getAllByRole('link', { name: 'Focus' })) expect(link).toHaveAttribute('aria-current', 'page')
	})

	it('keeps shelves under the Playlists navigation and exposes the auxiliary page from the account', async () => {
		renderWithProviders(<Header />, { preloadedState: adminState as any, route: '/shelves' })
		for (const link of screen.getAllByRole('link', { name: 'Playlists' })) expect(link).toHaveAttribute('aria-current', 'page')
		await userEvent.click(screen.getByRole('button', { name: /Tu espacio.*TestAdmin/ }))
		expect(screen.getByRole('link', { name: 'Tus estanterías' })).toHaveAttribute('href', '/shelves')
	})

	it('keeps administration and users reachable from the account sheet', async () => {
		renderWithProviders(<Header />, { preloadedState: adminState as any })
		await userEvent.click(screen.getByRole('button', { name: /Tu espacio.*TestAdmin/ }))
		expect(screen.getByRole('link', { name: 'Administración' })).toHaveAttribute('href', '/admin/platforms')
		expect(screen.getAllByText('Usuarios').length).toBeGreaterThanOrEqual(1)
	})

	it('hides Users link for standard role', async () => {
		renderWithProviders(<Header />, { preloadedState: standardState as any })
		await userEvent.click(screen.getByRole('button', { name: /Tu espacio.*Player/ }))
		expect(screen.queryByRole('link', { name: 'Usuarios' })).not.toBeInTheDocument()
	})

	it('shows username in the account sheet', async () => {
		renderWithProviders(<Header />, { preloadedState: adminState as any })
		await userEvent.click(screen.getByRole('button', { name: /Tu espacio.*TestAdmin/ }))
		expect(screen.getByText('TestAdmin')).toBeInTheDocument()
	})

	it('keeps CreateGame and the account data tools available', async () => {
		renderWithProviders(<Header />, { preloadedState: adminState as any })
		expect(screen.getAllByTestId('create-game').length).toBeGreaterThanOrEqual(1)
		await userEvent.click(screen.getByRole('button', { name: /Tu espacio.*TestAdmin/ }))
		expect(screen.getAllByTestId('game-data-actions').length).toBeGreaterThanOrEqual(1)
	})

	it('dispatches logoutUser and navigates to /login on logout click', async () => {
		const user = userEvent.setup()
		const { store } = renderWithProviders(<Header />, { preloadedState: adminState as any })
		await user.click(screen.getByRole('button', { name: /Tu espacio.*TestAdmin/ }))
		await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
		expect(store.getState().auth.isAuthenticated).toBe(false)
	})

	it('provides all five destinations in mobile navigation without hiding them in a burger menu', () => {
		const { container } = renderWithProviders(<Header />, { preloadedState: adminState as any })
		const links = [...container.querySelectorAll('.gdb-mobile-nav a')]
		expect(links.map(link => link.getAttribute('href'))).toEqual(['/', '/library', '/focus', '/playlists', '/statistics'])
	})
})
