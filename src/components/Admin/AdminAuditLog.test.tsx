import { screen } from '@testing-library/react'
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
])

vi.mock('@/services/GameHistoryService', () => ({
	getGlobalHistory: vi.fn().mockResolvedValue({ data: mockEntries, totalPages: 1, totalCount: 2 }),
	getAdminHistory: vi.fn().mockResolvedValue({ data: mockEntries, totalPages: 1, totalCount: 2 }),
}))

vi.mock('./AdminAuditLog.scss', () => ({}))

const adminState = {
	auth: {
		isAuthenticated: true,
		user: { id: 1, username: 'Admin', role: 'Admin' },
		token: 'tok',
		loading: false,
		error: null,
	},
}

describe('AdminAuditLog', () => {
	beforeEach(() => vi.clearAllMocks())

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
		expect(screen.getByPlaceholderText('Filtrar por campo...')).toBeInTheDocument()
	})
})
