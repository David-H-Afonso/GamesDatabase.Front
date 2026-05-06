import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/store/hooks', () => ({
	useAppSelector: vi.fn((selector: any) => selector({ auth: { user: { role: 'Admin' } } })),
	useAppDispatch: () => vi.fn(),
}))

vi.mock('@/store/features/auth/selector', () => ({
	selectIsAdmin: (state: any) => state.auth.user?.role === 'Admin',
}))

import { Outlet } from 'react-router-dom'

vi.mock('../AdminLayout', () => ({
	default: () => {
		return (
			<div data-testid='admin-layout'>
				<Outlet />
			</div>
		)
	},
}))

vi.mock('../AdminPlatforms', () => ({ default: () => <div>AdminPlatforms</div> }))
vi.mock('../AdminStatus', () => ({ default: () => <div>AdminStatus</div> }))
vi.mock('../AdminPlayWith', () => ({ default: () => <div>AdminPlayWith</div> }))
vi.mock('../AdminPlayedStatus', () => ({ default: () => <div>AdminPlayedStatus</div> }))
vi.mock('../AdminDataExport', () => ({ default: () => <div>AdminDataExport</div> }))
vi.mock('../AdminGameViews', () => ({ default: () => <div>AdminGameViews</div> }))
vi.mock('../AdminUsers', () => ({ default: () => <div>AdminUsers</div> }))
vi.mock('../AdminPreferences', () => ({ AdminPreferences: () => <div>AdminPreferences</div> }))
vi.mock('../AdminReplayTypes', () => ({ default: () => <div>AdminReplayTypes</div> }))
vi.mock('../AdminAuditLog', () => ({ AdminAuditLog: () => <div>AdminAuditLog</div> }))

describe('Admin container', () => {
	it('renders AdminLayout', async () => {
		const Admin = (await import('./Admin')).default
		render(
			<MemoryRouter initialEntries={['/platforms']}>
				<Admin />
			</MemoryRouter>
		)
		expect(screen.getByTestId('admin-layout')).toBeInTheDocument()
	})

	it('renders AdminPlatforms at /platforms route', async () => {
		const Admin = (await import('./Admin')).default
		render(
			<MemoryRouter initialEntries={['/platforms']}>
				<Admin />
			</MemoryRouter>
		)
		expect(screen.getByText('AdminPlatforms')).toBeInTheDocument()
	})

	it('renders AdminUsers route for admin users', async () => {
		const Admin = (await import('./Admin')).default
		render(
			<MemoryRouter initialEntries={['/users']}>
				<Admin />
			</MemoryRouter>
		)
		expect(screen.getByText('AdminUsers')).toBeInTheDocument()
	})
})
