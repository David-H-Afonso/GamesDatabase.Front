import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import React from 'react'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import i18n from '@/i18n'

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

vi.mock('@/components/Collection/CollectionGameDetailsLazy', async () => {
	const actual = await vi.importActual<typeof import('@/components/Collection/CollectionGameDetailsLazy')>('@/components/Collection/CollectionGameDetailsLazy')
	return {
		...actual,
		CollectionGameDetails: ({ game }: { game: { name: string } }) => React.createElement('div', { 'data-testid': 'game-details' }, game.name),
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
	})

	async function loadComponent() {
		const mod = await import('./AdminAuditLog')
		return mod.AdminAuditLog
	}

	it('renders audit log title', async () => {
		const C = await loadComponent()
		renderWithProviders(<C />, { preloadedState: adminState as any })
		expect(screen.getByText(/Auditoría|Audit/i)).toBeInTheDocument()
		await screen.findByText('Elden Ring')
	})

	it('loads and displays entries', async () => {
		const C = await loadComponent()
		renderWithProviders(<C />, { preloadedState: adminState as any })
		await waitFor(() => {
			expect(screen.getByText('Elden Ring')).toBeInTheDocument()
			expect(screen.getByText('Zelda')).toBeInTheDocument()
		})
	})

	it('shows action type labels', async () => {
		const C = await loadComponent()
		renderWithProviders(<C />, { preloadedState: adminState as any })
		await waitFor(() => {
			expect(screen.getByText('Actualizado')).toBeInTheDocument()
			expect(screen.getByText('Creado')).toBeInTheDocument()
		})
	})

	it('shows field changes for updates', async () => {
		const C = await loadComponent()
		renderWithProviders(<C />, { preloadedState: adminState as any })
		await waitFor(() => {
			expect(screen.getByText('Status')).toBeInTheDocument()
		})
	})

	it('shows pagination info', async () => {
		const C = await loadComponent()
		renderWithProviders(<C />, { preloadedState: adminState as any })
		await waitFor(() => {
			expect(screen.getByText(/Página 1 de 1/)).toBeInTheDocument()
		})
	})

	it('has filter controls', async () => {
		const C = await loadComponent()
		renderWithProviders(<C />, { preloadedState: adminState as any })
		expect(screen.getByRole('combobox', { name: 'Filtrar por campo' })).toBeInTheDocument()
		expect(screen.getByRole('combobox', { name: i18n.t('admin.audit.filterActionLabel') })).toBeInTheDocument()
		expect(screen.getByPlaceholderText('Buscar por juego, campo, acción, descripción o valores...')).toBeInTheDocument()
		await screen.findByText('Elden Ring')
	})

	it('distinguishes a failed read from an empty audit and retries the current query without leaking server details', async () => {
		const { getAdminHistory } = await import('@/services/GameHistoryService')
		vi.mocked(getAdminHistory).mockRejectedValueOnce(new Error('private-fixture-path /database.sqlite'))
		const C = await loadComponent()
		renderWithProviders(<C />, { preloadedState: adminState as any })
		expect(await screen.findByRole('alert')).toHaveTextContent(i18n.t('admin.audit.loadError'))
		expect(screen.queryByText(i18n.t('admin.audit.empty'))).not.toBeInTheDocument()
		expect(screen.queryByText(/private-fixture-path/)).not.toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: i18n.t('common.retry') }))
		expect(await screen.findByText('Elden Ring')).toBeInTheDocument()
		expect(getAdminHistory).toHaveBeenLastCalledWith({ page: 1, pageSize: 50 })
	})

	it('keeps a failed revert review visible and retries only after another explicit confirmation', async () => {
		mockUpdateGame.mockRejectedValueOnce(new Error('private-fixture-path'))
		const C = await loadComponent()
		renderWithProviders(<C />, { preloadedState: adminState as any })
		const row = (await screen.findByText('The Alters')).closest('tr')!
		fireEvent.click(row.querySelector('.aal-action-btn--revert')!)
		const dialog = await screen.findByRole('alertdialog')
		fireEvent.click(within(dialog).getByRole('button', { name: i18n.t('common.confirm') }))
		expect(await within(dialog).findByRole('alert')).toHaveTextContent(i18n.t('admin.audit.revertError'))
		expect(dialog).toHaveTextContent('The Alters')
		expect(dialog).not.toHaveTextContent('private-fixture-path')
		expect(mockUpdateGame).toHaveBeenCalledOnce()
		fireEvent.click(within(dialog).getByRole('button', { name: i18n.t('common.confirm') }))
		await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
		expect(mockUpdateGame).toHaveBeenCalledTimes(2)
		expect(mockUpdateGame).toHaveBeenLastCalledWith(12, { comment: 'De la librería de Kayko' })
	})

	it('catches a failed game read and leaves the audit available with safe feedback', async () => {
		mockFetchGameDetails.mockRejectedValueOnce(new Error('private-detail-failure'))
		const C = await loadComponent()
		renderWithProviders(<C />, { preloadedState: adminState as any })
		const row = (await screen.findByText('The Alters')).closest('tr')!
		fireEvent.click(within(row).getByRole('button', { name: i18n.t('admin.audit.openGame') }))
		expect(await screen.findByRole('alert')).toHaveTextContent(i18n.t('admin.audit.openError'))
		expect(screen.queryByTestId('game-details')).not.toBeInTheDocument()
		expect(screen.queryByText(/private-detail-failure/)).not.toBeInTheDocument()
	})

	it('keeps the empty horizontally scrolling audit reachable and named for keyboard readers', async () => {
		const { getAdminHistory } = await import('@/services/GameHistoryService')
		vi.mocked(getAdminHistory).mockResolvedValueOnce({ data: [], totalPages: 1, totalCount: 0, page: 1, pageSize: 50, hasNextPage: false, hasPreviousPage: false })
		const C = await loadComponent()
		renderWithProviders(<C />, { preloadedState: adminState as any })
		await screen.findByText(i18n.t('admin.audit.empty'))
		expect(screen.getByRole('region', { name: i18n.t('admin.audit.tableLabel') })).toHaveAttribute('tabindex', '0')
	})

	it('can filter by Comment field', async () => {
		const { getAdminHistory } = await import('@/services/GameHistoryService')
		const C = await loadComponent()
		renderWithProviders(<C />, { preloadedState: adminState as any })

		fireEvent.change(screen.getByRole('combobox', { name: 'Filtrar por campo' }), { target: { value: 'Comment' } })

		await waitFor(() => {
			expect(getAdminHistory).toHaveBeenLastCalledWith(expect.objectContaining({ field: 'Comment' }))
		})
	})

	it('reverts safe Comment changes to the previous value', async () => {
		const C = await loadComponent()
		renderWithProviders(<C />, { preloadedState: adminState as any })

		await waitFor(() => {
			expect(screen.getByText('The Alters')).toBeInTheDocument()
		})

		const row = screen.getByText('The Alters').closest('tr')!
		fireEvent.click(row.querySelector('.aal-action-btn--revert')!)

		const dialog = await screen.findByRole('alertdialog')
		fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar' }))

		await waitFor(() => {
			expect(mockUpdateGame).toHaveBeenCalledWith(12, { comment: 'De la librería de Kayko' })
		})
	})
})
