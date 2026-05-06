import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { createGame, resetIdCounter } from '@/test/factories'

vi.mock('@/environments', () => ({
	environment: {
		baseUrl: 'https://localhost:7245/api',
		fallbackUrl: 'http://localhost:5011/api',
		apiRoutes: {
			games: {
				base: '/games',
				byId: (id: number) => `/games/${id}`,
				create: '/games',
				update: (id: number) => `/games/${id}`,
				delete: (id: number) => `/games/${id}`,
				bulkUpdate: '/games/bulk',
			},
			gameStatus: {
				base: '/gamestatus',
				special: '/gamestatus/special',
				active: '/gamestatus/active',
				reassignSpecial: '/gamestatus/reassign-special',
				byId: (id: number) => `/gamestatus/${id}`,
				create: '/gamestatus',
				update: (id: number) => `/gamestatus/${id}`,
				delete: (id: number) => `/gamestatus/${id}`,
				reorder: '/gamestatus/reorder',
			},
			gamePlatform: {
				base: '/gameplatforms',
				active: '/gameplatforms/active',
				byId: (id: number) => `/gameplatforms/${id}`,
				create: '/gameplatforms',
				update: (id: number) => `/gameplatforms/${id}`,
				delete: (id: number) => `/gameplatforms/${id}`,
				reorder: '/gameplatforms/reorder',
			},
			gamePlayWith: {
				base: '/gameplaywith',
				active: '/gameplaywith/active',
				byId: (id: number) => `/gameplaywith/${id}`,
				create: '/gameplaywith',
				update: (id: number) => `/gameplaywith/${id}`,
				delete: (id: number) => `/gameplaywith/${id}`,
				reorder: '/gameplaywith/reorder',
			},
			gamePlayedStatus: {
				base: '/gameplayedstatus',
				active: '/gameplayedstatus/active',
				byId: (id: number) => `/gameplayedstatus/${id}`,
				create: '/gameplayedstatus',
				update: (id: number) => `/gameplayedstatus/${id}`,
				delete: (id: number) => `/gameplayedstatus/${id}`,
				reorder: '/gameplayedstatus/reorder',
			},
			gameViews: {
				base: '/gameviews',
				public: '/gameviews/public',
				byId: (id: number) => `/gameviews/${id}`,
				create: '/gameviews',
				update: (id: number) => `/gameviews/${id}`,
				delete: (id: number) => `/gameviews/${id}`,
				configuration: (id: number) => `/gameviews/${id}/configuration`,
			},
			users: { base: '/users', byId: (id: number) => `/users/${id}` },
			auth: { login: '/auth/login', logout: '/auth/logout' },
		},
		pagination: { defaultPageSize: 50 },
	},
}))

vi.mock('./RowView.scss', () => ({}))

vi.mock('@/components/elements/EditableSelect/EditableSelect', () => ({
	EditableSelect: () => <div data-testid='editable-select' />,
}))
vi.mock('@/components/elements/EditableMultiSelect/EditableMultiSelect', () => ({
	EditableMultiSelect: () => <div data-testid='editable-multi-select' />,
}))
vi.mock('@/components/elements/OptimizedImage/OptimizedImage', () => ({
	default: ({ alt }: { alt: string }) => <img alt={alt} data-testid='optimized-image' />,
}))
vi.mock('@/components/elements/PortalDropdown/PortalDropdown', () => ({
	PortalDropdown: ({ children }: { children: React.ReactNode }) => <div data-testid='portal-dropdown'>{children}</div>,
}))

vi.mock('@/helpers/criticScoreHelper', () => ({
	getCriticScoreUrl: vi.fn().mockReturnValue('https://example.com/critic'),
	resolveEffectiveProvider: vi.fn().mockReturnValue('Metacritic'),
}))

const preloadedState = {
	gameStatus: {
		activeStatuses: [{ id: 1, name: 'Playing', color: '#4CAF50', isActive: true, sortOrder: 1 }],
		statuses: [],
		loading: false,
		error: null,
		pagination: { page: 1, totalPages: 1, totalCount: 1 },
	},
	gamePlatform: {
		platforms: [{ id: 1, name: 'PC', color: '#2196F3', isActive: true, sortOrder: 1 }],
		loading: false,
		error: null,
		pagination: { page: 1, totalPages: 1, totalCount: 1 },
	},
	gamePlayWith: {
		playWithOptions: [{ id: 1, name: 'Solo', color: '#FF9800', isActive: true, sortOrder: 1 }],
		loading: false,
		error: null,
		pagination: { page: 1, totalPages: 1, totalCount: 1 },
	},
	gamePlayedStatus: {
		playedStatuses: [{ id: 1, name: 'Completed', color: '#9C27B0', isActive: true, sortOrder: 1 }],
		loading: false,
		error: null,
		pagination: { page: 1, totalPages: 1, totalCount: 1 },
	},
	auth: {
		isAuthenticated: true,
		user: { id: 1, username: 'test', role: 'Admin', useScoreColors: false, scoreProvider: 'Metacritic', showPriceComparisonIcon: false },
		token: 'tok',
		loading: false,
		error: null,
	},
}

async function loadComponent() {
	const mod = await import('./RowView')
	return mod.default
}

describe('RowView', () => {
	const mockOpenDetails = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()
		resetIdCounter()
	})

	it('renders game name', async () => {
		const RowView = await loadComponent()
		const game = createGame({ name: 'Elden Ring', statusName: 'Playing' })
		renderWithProviders(<RowView game={game} openDetails={mockOpenDetails} playWithColors={[]} gameStatusColor='#4CAF50' platformColor='#2196F3' playedStatusColor='#9C27B0' />, {
			preloadedState: preloadedState as any,
		})
		expect(screen.getByText('Elden Ring')).toBeInTheDocument()
	})

	it('renders status badge', async () => {
		const RowView = await loadComponent()
		const game = createGame({ statusName: 'Playing' })
		renderWithProviders(<RowView game={game} openDetails={mockOpenDetails} playWithColors={[]} gameStatusColor='#4CAF50' platformColor='#2196F3' playedStatusColor='#9C27B0' />, {
			preloadedState: preloadedState as any,
		})
		expect(screen.getByText('Playing')).toBeInTheDocument()
	})

	it('renders grade with aria-label', async () => {
		const RowView = await loadComponent()
		const game = createGame({ grade: 8 })
		renderWithProviders(<RowView game={game} openDetails={mockOpenDetails} playWithColors={[]} gameStatusColor='#4CAF50' platformColor='#2196F3' playedStatusColor='#9C27B0' />, {
			preloadedState: preloadedState as any,
		})
		expect(screen.getByLabelText('Grade')).toHaveTextContent('8')
	})

	it('renders em-dash when grade is undefined', async () => {
		const RowView = await loadComponent()
		const game = createGame({ grade: undefined })
		renderWithProviders(<RowView game={game} openDetails={mockOpenDetails} playWithColors={[]} gameStatusColor='#4CAF50' platformColor='#2196F3' playedStatusColor='#9C27B0' />, {
			preloadedState: preloadedState as any,
		})
		expect(screen.getByLabelText('Grade')).toHaveTextContent('—')
	})

	it('renders critic score', async () => {
		const RowView = await loadComponent()
		const game = createGame({ critic: 92 })
		renderWithProviders(<RowView game={game} openDetails={mockOpenDetails} playWithColors={[]} gameStatusColor='#4CAF50' platformColor='#2196F3' playedStatusColor='#9C27B0' />, {
			preloadedState: preloadedState as any,
		})
		expect(screen.getByLabelText('Critic')).toHaveTextContent('92')
	})

	it('renders em-dash when critic is undefined', async () => {
		const RowView = await loadComponent()
		const game = createGame({ critic: undefined })
		renderWithProviders(<RowView game={game} openDetails={mockOpenDetails} playWithColors={[]} gameStatusColor='#4CAF50' platformColor='#2196F3' playedStatusColor='#9C27B0' />, {
			preloadedState: preloadedState as any,
		})
		expect(screen.getByLabelText('Critic')).toHaveTextContent('—')
	})

	it('renders story hours', async () => {
		const RowView = await loadComponent()
		const game = createGame({ story: 40 })
		renderWithProviders(<RowView game={game} openDetails={mockOpenDetails} playWithColors={[]} gameStatusColor='#4CAF50' platformColor='#2196F3' playedStatusColor='#9C27B0' />, {
			preloadedState: preloadedState as any,
		})
		expect(screen.getByLabelText('Story')).toHaveTextContent('40h')
	})

	it('renders platform badge', async () => {
		const RowView = await loadComponent()
		const game = createGame({ platformName: 'PC' })
		renderWithProviders(<RowView game={game} openDetails={mockOpenDetails} playWithColors={[]} gameStatusColor='#4CAF50' platformColor='#2196F3' playedStatusColor='#9C27B0' />, {
			preloadedState: preloadedState as any,
		})
		expect(screen.getByText('PC')).toBeInTheDocument()
	})

	it('renders selection checkbox', async () => {
		const RowView = await loadComponent()
		const game = createGame({ name: 'Zelda' })
		renderWithProviders(
			<RowView game={game} openDetails={mockOpenDetails} playWithColors={[]} gameStatusColor='#4CAF50' platformColor='#2196F3' playedStatusColor='#9C27B0' onSelect={vi.fn()} />,
			{ preloadedState: preloadedState as any }
		)
		expect(screen.getByLabelText(/Seleccionar fila/)).toBeInTheDocument()
	})

	it('calls openDetails when row is clicked', async () => {
		const RowView = await loadComponent()
		const user = userEvent.setup()
		const game = createGame({ name: 'Hades' })
		renderWithProviders(<RowView game={game} openDetails={mockOpenDetails} playWithColors={[]} gameStatusColor='#4CAF50' platformColor='#2196F3' playedStatusColor='#9C27B0' />, {
			preloadedState: preloadedState as any,
		})
		await user.click(screen.getByText('Hades'))
		expect(mockOpenDetails).toHaveBeenCalledWith(game)
	})
})
