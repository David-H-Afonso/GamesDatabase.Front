import { fireEvent, screen } from '@testing-library/react'
import React from 'react'
import { renderWithProviders } from '@/test/utils/renderWithProviders'

const mockEntries = vi.hoisted(() => [
	{
		id: 1,
		gameId: 10,
		gameName: 'Elden Ring',
		field: 'Status',
		oldValue: 'Playing',
		newValue: 'Completed',
		actionType: 'Updated',
		changedAt: '2025-01-15T10:30:00Z',
		changedBy: 'Admin',
	},
	{
		id: 2,
		gameId: 11,
		gameName: 'Zelda',
		field: null,
		oldValue: null,
		newValue: null,
		actionType: 'Created',
		changedAt: '2025-01-14T09:00:00Z',
		changedBy: 'Admin',
	},
	{
		id: 3,
		gameId: 12,
		gameName: 'The Alters',
		field: 'Comment',
		oldValue: 'De la librería de Kayko',
		newValue: 'De la librería de Kayko The Alters is great',
		actionType: 'Updated',
		changedAt: '2025-01-13T09:00:00Z',
		changedBy: 'Admin',
	},
])

const mockFetchGameDetails = vi.hoisted(() => vi.fn().mockResolvedValue({ id: 12, name: 'The Alters', statusId: 1 }))
const mockUpdateGame = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))

vi.mock('@/services/GameHistoryService', () => ({
	getGlobalHistory: vi.fn().mockResolvedValue({ data: mockEntries, totalPages: 1, totalCount: 3 }),
	getAdminHistory: vi.fn().mockResolvedValue({ data: mockEntries, totalPages: 1, totalCount: 3 }),
}))

vi.mock('@/services/GamesService', async () => {
	const actual = await vi.importActual<typeof import('@/services/GamesService')>('@/services/GamesService')
	return {
		...actual,
		updateGame: mockUpdateGame,
	}
})

vi.mock('@/hooks/useGames/useGames', async () => {
	const actual = await vi.importActual<typeof import('@/hooks/useGames/useGames')>('@/hooks/useGames/useGames')
	return {
		...actual,
		useGames: () => ({
			fetchGameDetails: mockFetchGameDetails,
		}),
	}
})

vi.mock('@/components/elements/GameDetails/GameDetails', async () => {
	const actual = await vi.importActual<typeof import('@/components/elements/GameDetails/GameDetails')>('@/components/elements/GameDetails/GameDetails')
	return {
		...actual,
		GameDetails: ({ game }: { game: { name: string } }) => React.createElement('div', { 'data-testid': 'game-details' }, game.name),
	}
})

vi.mock('./AdminAuditLog.scss', () => ({}))

const adminState = {
	auth: {
		isAuthenticated: true,
		user: { id: 1, username: 'Admin', role: 'Admin' },
		token: 'tok',
			refreshToken: null,
		loading: false,
		error: null,
	},
}

describe('AdminAuditLog', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		window.confirm = vi.fn().mockReturnValue(true)
	})

	async function loadComponent() {
		const mod = await import('./AdminAuditLog')
		return mod.AdminAuditLog
	}

	it('renders audit log title', async () => {
		const C = await loadComponent()
		renderWithProviders(<C />, { preloadedState: adminState as any })
		expect(screen.getByText(/Auditoría|Audit/i)).toBeInTheDocument()
	})

	it('loads and displays entries', async () => {
		const C = await loadComponent()
		renderWithProviders(<C />, { preloadedState: adminState as any })
		await vi.waitFor(() => {
			expect(screen.getByText('Elden Ring')).toBeInTheDocument()
			expect(screen.getByText('Zelda')).toBeInTheDocument()
		})
	})

	it('shows action type labels', async () => {
		const C = await loadComponent()
		renderWithProviders(<C />, { preloadedState: adminState as any })
		await vi.waitFor(() => {
			expect(screen.getByText('Actualizado')).toBeInTheDocument()
			expect(screen.getByText('Creado')).toBeInTheDocument()
		})
	})

	it('shows field changes for updates', async () => {
		const C = await loadComponent()
		renderWithProviders(<C />, { preloadedState: adminState as any })
		await vi.waitFor(() => {
			expect(screen.getByText('Status')).toBeInTheDocument()
		})
	})

	it('shows pagination info', async () => {
		const C = await loadComponent()
		renderWithProviders(<C />, { preloadedState: adminState as any })
		await vi.waitFor(() => {
			expect(screen.getByText(/Página 1 de 1/)).toBeInTheDocument()
		})
	})

	it('has filter controls', async () => {
		const C = await loadComponent()
		renderWithProviders(<C />, { preloadedState: adminState as any })
		expect(screen.getByRole('combobox', { name: 'Filtrar por campo' })).toBeInTheDocument()
		expect(screen.getByPlaceholderText('Buscar por juego, campo, acción, descripción o valores...')).toBeInTheDocument()
	})

	it('can filter by Comment field', async () => {
		const { getAdminHistory } = await import('@/services/GameHistoryService')
		const C = await loadComponent()
		renderWithProviders(<C />, { preloadedState: adminState as any })

		fireEvent.change(screen.getByRole('combobox', { name: 'Filtrar por campo' }), { target: { value: 'Comment' } })

		await vi.waitFor(() => {
			expect(getAdminHistory).toHaveBeenLastCalledWith(expect.objectContaining({ field: 'Comment' }))
		})
	})

	it('reverts safe Comment changes to the previous value', async () => {
		const C = await loadComponent()
		renderWithProviders(<C />, { preloadedState: adminState as any })

		await vi.waitFor(() => {
			expect(screen.getByText('The Alters')).toBeInTheDocument()
		})

		const row = screen.getByText('The Alters').closest('tr')!
		fireEvent.click(row.querySelector('.aal-action-btn--revert')!)

		await vi.waitFor(() => {
			expect(mockUpdateGame).toHaveBeenCalledWith(12, { comment: 'De la librería de Kayko' })
		})
	})
})
