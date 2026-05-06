import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { MobileMenu } from './MobileMenu'

vi.mock('./MobileMenu.scss', () => ({}))
vi.mock('@/assets/svgs/user.svg?react', () => ({ default: () => <svg data-testid='user-icon' /> }))

const baseState = {
	auth: {
		isAuthenticated: true,
		user: { id: 1, username: 'Admin', role: 'Admin' },
		token: 'tok',
		loading: false,
		error: null,
	},
}

describe('MobileMenu', () => {
	const onClose = vi.fn()
	const onLogout = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns null when not open', () => {
		const { container } = renderWithProviders(<MobileMenu isOpen={false} onClose={onClose} onLogout={onLogout} />, {
			preloadedState: baseState as any,
		})
		expect(container.innerHTML).toBe('')
	})

	it('renders menu when open', () => {
		renderWithProviders(<MobileMenu isOpen={true} onClose={onClose} onLogout={onLogout} />, {
			preloadedState: baseState as any,
		})
		expect(screen.getByText('Menu')).toBeInTheDocument()
	})

	it('renders nav links', () => {
		renderWithProviders(<MobileMenu isOpen={true} onClose={onClose} onLogout={onLogout} />, {
			preloadedState: baseState as any,
		})
		expect(screen.getByText('Home')).toBeInTheDocument()
		expect(screen.getAllByText('Admin').length).toBeGreaterThanOrEqual(1)
	})

	it('shows Users link for admin', () => {
		renderWithProviders(<MobileMenu isOpen={true} onClose={onClose} onLogout={onLogout} />, {
			preloadedState: baseState as any,
		})
		expect(screen.getByText('Users')).toBeInTheDocument()
	})

	it('hides Users link for non-admin', () => {
		const standardState = {
			auth: {
				...baseState.auth,
				user: { id: 2, username: 'User', role: 'Standard' },
			},
		}
		renderWithProviders(<MobileMenu isOpen={true} onClose={onClose} onLogout={onLogout} />, {
			preloadedState: standardState as any,
		})
		expect(screen.queryByText('Users')).not.toBeInTheDocument()
	})

	it('shows current username', () => {
		const state = {
			auth: {
				...baseState.auth,
				user: { id: 1, username: 'TestUser', role: 'Admin' },
			},
		}
		renderWithProviders(<MobileMenu isOpen={true} onClose={onClose} onLogout={onLogout} />, {
			preloadedState: state as any,
		})
		expect(screen.getByText('TestUser')).toBeInTheDocument()
	})

	it('calls onClose when close button is clicked', async () => {
		const user = userEvent.setup()
		renderWithProviders(<MobileMenu isOpen={true} onClose={onClose} onLogout={onLogout} />, {
			preloadedState: baseState as any,
		})
		await user.click(screen.getByLabelText('Cerrar menú'))
		expect(onClose).toHaveBeenCalledOnce()
	})

	it('calls onClose when overlay is clicked', async () => {
		const user = userEvent.setup()
		renderWithProviders(<MobileMenu isOpen={true} onClose={onClose} onLogout={onLogout} />, {
			preloadedState: baseState as any,
		})
		const overlay = document.querySelector('.mobile-menu-overlay')!
		await user.click(overlay)
		expect(onClose).toHaveBeenCalledOnce()
	})

	it('calls onLogout when logout button is clicked', async () => {
		const user = userEvent.setup()
		renderWithProviders(<MobileMenu isOpen={true} onClose={onClose} onLogout={onLogout} />, {
			preloadedState: baseState as any,
		})
		await user.click(screen.getByText('Logout'))
		expect(onLogout).toHaveBeenCalledOnce()
	})

	it('calls onClose when a nav link is clicked', async () => {
		const user = userEvent.setup()
		renderWithProviders(<MobileMenu isOpen={true} onClose={onClose} onLogout={onLogout} />, {
			preloadedState: baseState as any,
		})
		await user.click(screen.getByText('Home'))
		expect(onClose).toHaveBeenCalledOnce()
	})
})
