import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils/renderWithProviders'

const mockService = vi.hoisted(() => ({
	getAllUsers: vi.fn().mockResolvedValue([
		{ id: 1, username: 'Admin', role: 'Admin', isDefault: true },
		{ id: 2, username: 'Player1', role: 'Standard', isDefault: false },
	]),
	createUser: vi.fn().mockResolvedValue({ id: 3, username: 'New', role: 'Standard' }),
	updateUser: vi.fn().mockResolvedValue(undefined),
	deleteUser: vi.fn().mockResolvedValue(undefined),
	changePassword: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/services/UserService', () => ({
	userService: mockService,
}))

vi.mock('./AdminUsers.scss', () => ({}))

const adminState = {
	auth: {
		isAuthenticated: true,
		user: { id: 1, username: 'Admin', role: 'Admin' },
		token: 'tok',
		loading: false,
		error: null,
	},
}

describe('AdminUsers', () => {
	beforeEach(() => vi.clearAllMocks())

	async function loadComponent() {
		const mod = await import('./AdminUsers')
		return mod.AdminUsers
	}

	it('renders users title', async () => {
		const C = await loadComponent()
		renderWithProviders(<C />, { preloadedState: adminState as any })
		expect(screen.getByText('User Management')).toBeInTheDocument()
	})

	it('loads and displays users', async () => {
		const C = await loadComponent()
		renderWithProviders(<C />, { preloadedState: adminState as any })
		await vi.waitFor(() => {
			expect(screen.getByText('Player1')).toBeInTheDocument()
		})
	})

	it('shows user roles', async () => {
		const C = await loadComponent()
		renderWithProviders(<C />, { preloadedState: adminState as any })
		await vi.waitFor(() => {
			expect(screen.getAllByText('Admin').length).toBeGreaterThanOrEqual(1)
			expect(screen.getByText('Standard')).toBeInTheDocument()
		})
	})

	it('has search functionality', async () => {
		const C = await loadComponent()
		renderWithProviders(<C />, { preloadedState: adminState as any })
		const searchInput = screen.getByPlaceholderText('Search users by username or role...')
		expect(searchInput).toBeInTheDocument()
	})

	it('filters users by search term', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		renderWithProviders(<C />, { preloadedState: adminState as any })
		await vi.waitFor(() => expect(screen.getByText('Player1')).toBeInTheDocument())
		const searchInput = screen.getByPlaceholderText('Search users by username or role...')
		await user.type(searchInput, 'Player')
		expect(screen.getByText('Player1')).toBeInTheDocument()
	})

	it('opens create user modal', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		renderWithProviders(<C />, { preloadedState: adminState as any })
		await user.click(screen.getByText('+ Create New User'))
		expect(screen.getByText('Create New User', { selector: 'h2' })).toBeInTheDocument()
	})

	it('opens edit user modal', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		renderWithProviders(<C />, { preloadedState: adminState as any })
		await vi.waitFor(() => expect(screen.getByText('Player1')).toBeInTheDocument())
		const editButtons = screen.getAllByText('Edit')
		await user.click(editButtons[0])
		expect(screen.getByText('Edit User')).toBeInTheDocument()
	})

	it('submits create user form', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		renderWithProviders(<C />, { preloadedState: adminState as any })
		await user.click(screen.getByText('+ Create New User'))
		// Labels lack htmlFor, so query by role
		const inputs = screen.getAllByRole('textbox')
		const usernameInput = inputs[inputs.length - 1] // last textbox in modal
		await user.type(usernameInput, 'NewUser')
		await user.click(screen.getByText('Create'))
		await waitFor(() => {
			expect(mockService.createUser).toHaveBeenCalled()
		})
	})

	it('submits edit user form (update)', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		renderWithProviders(<C />, { preloadedState: adminState as any })
		await vi.waitFor(() => expect(screen.getByText('Player1')).toBeInTheDocument())
		const editButtons = screen.getAllByText('Edit')
		await user.click(editButtons[editButtons.length - 1])
		await vi.waitFor(() => expect(screen.getByText('Edit User')).toBeInTheDocument())
		await user.click(screen.getByText('Update'))
		await waitFor(() => {
			expect(mockService.updateUser).toHaveBeenCalled()
		})
	})

	it('opens delete confirm for non-default user', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		renderWithProviders(<C />, { preloadedState: adminState as any })
		await vi.waitFor(() => expect(screen.getByText('Player1')).toBeInTheDocument())
		const deleteButtons = screen.getAllByText('Delete')
		await user.click(deleteButtons[deleteButtons.length - 1])
		expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
	})

	it('confirms delete user', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		renderWithProviders(<C />, { preloadedState: adminState as any })
		await vi.waitFor(() => expect(screen.getByText('Player1')).toBeInTheDocument())
		const deleteButtons = screen.getAllByText('Delete')
		await user.click(deleteButtons[deleteButtons.length - 1])
		await vi.waitFor(() => expect(screen.getByText(/are you sure/i)).toBeInTheDocument())
		await user.click(screen.getByText('Yes, Delete User'))
		await waitFor(() => {
			expect(mockService.deleteUser).toHaveBeenCalledWith(2)
		})
	})

	it('opens change password modal', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		renderWithProviders(<C />, { preloadedState: adminState as any })
		await vi.waitFor(() => expect(screen.getByText('Player1')).toBeInTheDocument())
		const pwButtons = screen.getAllByText('Change Password')
		await user.click(pwButtons[0])
		expect(screen.getByText(/new password/i)).toBeInTheDocument()
	})

	it('handles load error gracefully', async () => {
		mockService.getAllUsers.mockRejectedValueOnce(new Error('Network error'))
		const C = await loadComponent()
		renderWithProviders(<C />, { preloadedState: adminState as any })
		await vi.waitFor(() => {
			expect(screen.getByText(/network error/i)).toBeInTheDocument()
		})
	})
})
