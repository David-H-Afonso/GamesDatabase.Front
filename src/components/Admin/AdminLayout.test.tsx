import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { AdminLayout } from './AdminLayout'

vi.mock('./AdminLayout.scss', () => ({}))
vi.mock('@/layouts/elements/Header.scss', () => ({}))
vi.mock('@/layouts/elements/MobileMenu.scss', () => ({}))
vi.mock('@/layouts/elements/ThemeSelector.scss', () => ({}))
vi.mock('@/assets/svgs/user.svg?react', () => ({ default: () => <svg data-testid='user-icon' /> }))
vi.mock('@/assets/pngs/logo.png', () => ({ default: 'logo.png' }))
vi.mock('@/components/elements/CreateGame/CreateGame', () => ({ default: () => <div /> }))
vi.mock('@/components/elements/GameDataActions/GameDataActions', () => ({ default: () => <div /> }))
vi.mock('@/components/DataLoader', () => ({ DataLoader: () => null }))

// Globals for build info
vi.stubGlobal('__APP_VERSION__', '1.0.0')
vi.stubGlobal('__COMMIT_HASH__', 'abc1234')
vi.stubGlobal('__BUILD_DATE__', '2025-01-01')

const adminState = {
	auth: {
		isAuthenticated: true,
		user: { id: 1, username: 'Admin', role: 'Admin' },
		token: 'tok',
		loading: false,
		error: null,
	},
	theme: { currentTheme: 'light', availableThemes: ['light', 'dark'] },
}

const standardState = {
	auth: {
		isAuthenticated: true,
		user: { id: 2, username: 'Player', role: 'Standard' },
		token: 'tok',
		loading: false,
		error: null,
	},
	theme: { currentTheme: 'light', availableThemes: ['light', 'dark'] },
}

describe('AdminLayout', () => {
	it('renders sidebar with title', () => {
		renderWithProviders(<AdminLayout />, { preloadedState: adminState as any, route: '/admin/platforms' })
		expect(screen.getByText('Administración')).toBeInTheDocument()
	})

	it('renders all nav links', () => {
		renderWithProviders(<AdminLayout />, { preloadedState: adminState as any, route: '/admin/platforms' })
		expect(screen.getByText('Plataformas')).toBeInTheDocument()
		expect(screen.getByText('Status')).toBeInTheDocument()
		expect(screen.getByText('Play With')).toBeInTheDocument()
		expect(screen.getByText('Played Status')).toBeInTheDocument()
		expect(screen.getByText('Tipos de Rejugada')).toBeInTheDocument()
		expect(screen.getByText('Importar/Exportar')).toBeInTheDocument()
		expect(screen.getByText('Vistas de Juego')).toBeInTheDocument()
		expect(screen.getByText('Auditoría')).toBeInTheDocument()
		expect(screen.getByText('Preferencias')).toBeInTheDocument()
	})

	it('shows Usuarios link for admin user', () => {
		renderWithProviders(<AdminLayout />, { preloadedState: adminState as any, route: '/admin/platforms' })
		expect(screen.getByText('Usuarios')).toBeInTheDocument()
	})

	it('hides Usuarios link for standard user', () => {
		renderWithProviders(<AdminLayout />, { preloadedState: standardState as any, route: '/admin/platforms' })
		expect(screen.queryByText('Usuarios')).not.toBeInTheDocument()
	})

	it('shows build info', () => {
		renderWithProviders(<AdminLayout />, { preloadedState: adminState as any, route: '/admin/platforms' })
		expect(screen.getByText(/v1\.0\.0/)).toBeInTheDocument()
		expect(screen.getByText(/abc1234/)).toBeInTheDocument()
	})

	it('marks Usuarios link active when on users route', () => {
		renderWithProviders(<AdminLayout />, { preloadedState: adminState as any, route: '/admin/users' })
		const link = screen.getByText('Usuarios')
		expect(link.className).toContain('active')
	})

	it('marks Status link active when on status route', () => {
		renderWithProviders(<AdminLayout />, { preloadedState: adminState as any, route: '/admin/status' })
		const link = screen.getByText('Status')
		expect(link.className).toContain('active')
	})

	it('marks Play With link active when on play-with route', () => {
		renderWithProviders(<AdminLayout />, { preloadedState: adminState as any, route: '/admin/play-with' })
		const link = screen.getByText('Play With')
		expect(link.className).toContain('active')
	})

	it('marks Played Status link active when on played-status route', () => {
		renderWithProviders(<AdminLayout />, { preloadedState: adminState as any, route: '/admin/played-status' })
		const link = screen.getByText('Played Status')
		expect(link.className).toContain('active')
	})

	it('marks Tipos de Rejugada link active when on replay-types route', () => {
		renderWithProviders(<AdminLayout />, { preloadedState: adminState as any, route: '/admin/replay-types' })
		const link = screen.getByText('Tipos de Rejugada')
		expect(link.className).toContain('active')
	})

	it('marks Importar/Exportar link active when on data-export route', () => {
		renderWithProviders(<AdminLayout />, { preloadedState: adminState as any, route: '/admin/data-export' })
		const link = screen.getByText('Importar/Exportar')
		expect(link.className).toContain('active')
	})

	it('marks Vistas de Juego link active when on game-views route', () => {
		renderWithProviders(<AdminLayout />, { preloadedState: adminState as any, route: '/admin/game-views' })
		const link = screen.getByText('Vistas de Juego')
		expect(link.className).toContain('active')
	})

	it('marks Auditoría link active when on audit-log route', () => {
		renderWithProviders(<AdminLayout />, { preloadedState: adminState as any, route: '/admin/audit-log' })
		const link = screen.getByText('Auditoría')
		expect(link.className).toContain('active')
	})

	it('marks Preferencias link active when on preferences route', () => {
		renderWithProviders(<AdminLayout />, { preloadedState: adminState as any, route: '/admin/preferences' })
		const link = screen.getByText('Preferencias')
		expect(link.className).toContain('active')
	})
})
