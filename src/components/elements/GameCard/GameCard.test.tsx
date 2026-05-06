import { vi, describe, it, expect, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { createGame as makeGame, resetIdCounter } from '@/test/factories'
import { GameCard } from './GameCard'

vi.mock('@/navigation/router', () => ({ router: { navigate: vi.fn() } }))

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

// Mock CardView and RowView to isolate GameCard logic and avoid SVG/complex import issues
vi.mock('./CardView/CardView', () => ({
	default: ({ game, openDetails }: { game: { id: number; name: string }; openDetails: (g: any) => void }) => (
		<div data-testid='card-view'>
			<span>{game.name}</span>
			<button onClick={() => openDetails(game)}>Open Details</button>
		</div>
	),
}))

vi.mock('./RowView/RowView', () => ({
	default: ({ game, openDetails }: { game: { id: number; name: string }; openDetails: (g: any) => void }) => (
		<div data-testid='row-view'>
			<span>{game.name}</span>
			<button onClick={() => openDetails(game)}>Open Details</button>
		</div>
	),
}))

// Mock GameDetails to avoid rendering its complex internals
vi.mock('@/components/elements/GameDetails/GameDetails', () => ({
	GameDetails: ({ game }: { game: { name: string } }) => <div data-testid='game-details'>{game.name} — details</div>,
}))

describe('GameCard', () => {
	beforeEach(() => resetIdCounter())

	// ── Card variant ───────────────────────────────────────────────────────────

	it('renders card variant with the game name', () => {
		const game = makeGame({ id: 1, name: 'Hollow Knight' })
		renderWithProviders(<GameCard game={game} variant='card' />)
		expect(screen.getByTestId('card-view')).toBeInTheDocument()
		expect(screen.getByText('Hollow Knight')).toBeInTheDocument()
	})

	it('does not render row-view in card variant', () => {
		const game = makeGame({ id: 2, name: 'Celeste' })
		renderWithProviders(<GameCard game={game} variant='card' />)
		expect(screen.queryByTestId('row-view')).not.toBeInTheDocument()
	})

	// ── Row variant ────────────────────────────────────────────────────────────

	it('renders row variant with the game name', () => {
		const game = makeGame({ id: 3, name: 'Hades' })
		renderWithProviders(<GameCard game={game} variant='row' />)
		expect(screen.getByTestId('row-view')).toBeInTheDocument()
		expect(screen.getByText('Hades')).toBeInTheDocument()
	})

	it('does not render card-view in row variant', () => {
		const game = makeGame({ id: 4, name: 'Ori' })
		renderWithProviders(<GameCard game={game} variant='row' />)
		expect(screen.queryByTestId('card-view')).not.toBeInTheDocument()
	})

	// ── Opening details ────────────────────────────────────────────────────────

	it('shows GameDetails after clicking openDetails in card variant', () => {
		const game = makeGame({ id: 5, name: 'Dead Cells' })
		renderWithProviders(<GameCard game={game} variant='card' />)
		expect(screen.queryByTestId('game-details')).not.toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: /open details/i }))
		expect(screen.getByTestId('game-details')).toBeInTheDocument()
		expect(screen.getByText('Dead Cells — details')).toBeInTheDocument()
	})

	it('shows GameDetails after clicking openDetails in row variant', () => {
		const game = makeGame({ id: 6, name: 'Cuphead' })
		renderWithProviders(<GameCard game={game} variant='row' />)
		fireEvent.click(screen.getByRole('button', { name: /open details/i }))
		expect(screen.getByTestId('game-details')).toBeInTheDocument()
	})
})
