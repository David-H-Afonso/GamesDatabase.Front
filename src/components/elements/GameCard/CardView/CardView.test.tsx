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

vi.mock('./CardView.scss', () => ({}))

vi.mock('calendar.svg?react', () => ({ default: () => <svg data-testid='calendar-icon' /> }))
vi.mock('score.svg?react', () => ({ default: () => <svg data-testid='score-icon' /> }))
vi.mock('critic.svg?react', () => ({ default: () => <svg data-testid='critic-icon' /> }))
vi.mock('opencritic.svg?react', () => ({ default: () => <svg data-testid='opencritic-icon' /> }))
vi.mock('steamdb.svg?react', () => ({ default: () => <svg data-testid='steamdb-icon' /> }))
vi.mock('key.svg?react', () => ({ default: () => <svg data-testid='key-icon' /> }))
vi.mock('store.svg?react', () => ({ default: () => <svg data-testid='store-icon' /> }))

vi.mock('@/components/elements/EditableSelect/EditableSelect', () => ({
	EditableSelect: () => <div data-testid='editable-select' />,
}))
vi.mock('@/components/elements/EditableMultiSelect/EditableMultiSelect', () => ({
	EditableMultiSelect: () => <div data-testid='editable-multi-select' />,
}))
vi.mock('@/components/elements/OptimizedImage/OptimizedImage', () => ({
	default: ({ alt }: { alt: string }) => <img alt={alt} data-testid='optimized-image' />,
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
	auth: {
		isAuthenticated: true,
		user: { id: 1, username: 'test', role: 'Admin', useScoreColors: false, scoreProvider: 'Metacritic', showPriceComparisonIcon: false },
		token: 'tok',
		loading: false,
		error: null,
	},
}

async function loadComponent() {
	const mod = await import('./CardView')
	return mod.default
}

describe('CardView', () => {
	const mockOpenDetails = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()
		resetIdCounter()
	})

	it('renders game title', async () => {
		const CardView = await loadComponent()
		const game = createGame({ name: 'Elden Ring', statusName: 'Playing' })
		renderWithProviders(<CardView game={game} openDetails={mockOpenDetails} playWithColors={[]} gameStatusColor='#4CAF50' platformColor='#2196F3' />, {
			preloadedState: preloadedState as any,
		})
		expect(screen.getByText('Elden Ring')).toBeInTheDocument()
	})

	it('renders status badge', async () => {
		const CardView = await loadComponent()
		const game = createGame({ statusName: 'Playing' })
		renderWithProviders(<CardView game={game} openDetails={mockOpenDetails} playWithColors={[]} gameStatusColor='#4CAF50' platformColor='#2196F3' />, {
			preloadedState: preloadedState as any,
		})
		expect(screen.getByText('Playing')).toBeInTheDocument()
	})

	it('renders grade or N/A', async () => {
		const CardView = await loadComponent()
		const game = createGame({ grade: 8 })
		renderWithProviders(<CardView game={game} openDetails={mockOpenDetails} playWithColors={[]} gameStatusColor='#4CAF50' platformColor='#2196F3' />, {
			preloadedState: preloadedState as any,
		})
		expect(screen.getByText('8')).toBeInTheDocument()
	})

	it('renders N/A when grade is undefined', async () => {
		const CardView = await loadComponent()
		const game = createGame({ grade: undefined })
		renderWithProviders(<CardView game={game} openDetails={mockOpenDetails} playWithColors={[]} gameStatusColor='#4CAF50' platformColor='#2196F3' />, {
			preloadedState: preloadedState as any,
		})
		expect(screen.getAllByText('N/A').length).toBeGreaterThanOrEqual(1)
	})

	it('renders score', async () => {
		const CardView = await loadComponent()
		const game = createGame({ score: 7 })
		renderWithProviders(<CardView game={game} openDetails={mockOpenDetails} playWithColors={[]} gameStatusColor='#4CAF50' platformColor='#2196F3' />, {
			preloadedState: preloadedState as any,
		})
		expect(screen.getByRole('group', { name: /Score: 7 \/ 10/ })).toBeInTheDocument()
	})

	it('renders platform badge when platformName provided', async () => {
		const CardView = await loadComponent()
		const game = createGame({ platformName: 'PC' })
		renderWithProviders(<CardView game={game} openDetails={mockOpenDetails} playWithColors={[]} gameStatusColor='#4CAF50' platformColor='#2196F3' />, {
			preloadedState: preloadedState as any,
		})
		expect(screen.getByText('PC')).toBeInTheDocument()
	})

	it('renders story and completion hours', async () => {
		const CardView = await loadComponent()
		const game = createGame({ story: 40, completion: 60 })
		renderWithProviders(<CardView game={game} openDetails={mockOpenDetails} playWithColors={[]} gameStatusColor='#4CAF50' platformColor='#2196F3' />, {
			preloadedState: preloadedState as any,
		})
		expect(screen.getByText('40h')).toBeInTheDocument()
		expect(screen.getByText('60h')).toBeInTheDocument()
	})

	it('renders selection checkbox with correct aria label', async () => {
		const CardView = await loadComponent()
		const game = createGame({ name: 'Zelda' })
		renderWithProviders(<CardView game={game} openDetails={mockOpenDetails} playWithColors={[]} gameStatusColor='#4CAF50' platformColor='#2196F3' onSelect={vi.fn()} />, {
			preloadedState: preloadedState as any,
		})
		expect(screen.getByLabelText(/Select Zelda/)).toBeInTheDocument()
	})

	it('calls openDetails when card is clicked', async () => {
		const CardView = await loadComponent()
		const user = userEvent.setup()
		const game = createGame({ name: 'Hades' })
		renderWithProviders(<CardView game={game} openDetails={mockOpenDetails} playWithColors={[]} gameStatusColor='#4CAF50' platformColor='#2196F3' />, {
			preloadedState: preloadedState as any,
		})
		await user.click(screen.getByText('Hades'))
		expect(mockOpenDetails).toHaveBeenCalledWith(game)
	})

	it('renders critic score when critic is set', async () => {
		const CardView = await loadComponent()
		const game = createGame({ critic: 92 })
		renderWithProviders(<CardView game={game} openDetails={mockOpenDetails} playWithColors={[]} gameStatusColor='#4CAF50' platformColor='#2196F3' />, {
			preloadedState: preloadedState as any,
		})
		expect(screen.getByText('92')).toBeInTheDocument()
	})
})
