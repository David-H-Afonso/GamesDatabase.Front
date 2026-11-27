import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import i18n from '@/i18n'

vi.mock('./AdminPreferences.scss', () => ({}))

const prefsState = {
	auth: {
		isAuthenticated: true,
		user: {
			id: 1,
			username: 'Admin',
			role: 'Admin',
			useScoreColors: false,
			scoreProvider: 'Metacritic',
			showPriceComparisonIcon: false,
		},
		token: 'tok',
		refreshToken: null,
		loading: false,
		error: null,
	},
}

describe('AdminPreferences', () => {
	beforeEach(() => vi.clearAllMocks())

	async function loadComponent() {
		const mod = await import('./AdminPreferences')
		return mod.AdminPreferences
	}

	it('renders preferences title', async () => {
		const C = await loadComponent()
		renderWithProviders(<C />, { preloadedState: prefsState as any })
		expect(screen.getByText('Preferencias de Usuario')).toBeInTheDocument()
	})

	it('renders score colors toggle', async () => {
		const C = await loadComponent()
		renderWithProviders(<C />, { preloadedState: prefsState as any })
		expect(screen.getByText('Colores de Puntuación Metacritic')).toBeInTheDocument()
	})

	it('renders score provider selector', async () => {
		const C = await loadComponent()
		renderWithProviders(<C />, { preloadedState: prefsState as any })
		expect(screen.getByLabelText('Logo del Proveedor de Puntuación')).toBeInTheDocument()
	})

	it('renders price comparison toggle', async () => {
		const C = await loadComponent()
		renderWithProviders(<C />, { preloadedState: prefsState as any })
		expect(screen.getByText('Icono de Comparación de Precios')).toBeInTheDocument()
	})

	it('toggles score colors', async () => {
		const C = await loadComponent()
		const user = userEvent.setup()
		renderWithProviders(<C />, { preloadedState: prefsState as any })
		const checkboxes = screen.getAllByRole('checkbox')
		// First checkbox is score colors
		await waitFor(() => expect(checkboxes[0]).toBeEnabled())
		await user.click(checkboxes[0])
		// The local state updates immediately even if thunk fails
		expect(checkboxes[0]).toBeChecked()
	})

	it('discloses a failed refresh, keeps cached choices read-only, and recovers with a read-only retry', async () => {
		let unavailable = true
		const writes = vi.fn()
		server.use(
			http.get(/\/api\/users\/1$/, () => unavailable ? HttpResponse.json({ message: 'private-preference-path' }, { status: 503 }) : HttpResponse.json({ ...prefsState.auth.user, useScoreColors: true, scoreProvider: 'OpenCritic' })),
			http.put(/\/api\/users\/1$/, () => { writes(); return new HttpResponse(null, { status: 204 }) }),
		)
		const C = await loadComponent()
		renderWithProviders(<C />, { preloadedState: prefsState as any })
		expect(await screen.findByRole('alert')).toHaveTextContent(i18n.t('admin.preferences.loadError'))
		const score = screen.getByRole('checkbox', { name: i18n.t('admin.preferences.scoreColors') })
		expect(score).not.toBeChecked(); expect(score).toBeDisabled()
		expect(screen.queryByText(/private-preference-path/)).not.toBeInTheDocument()
		unavailable = false
		await userEvent.click(screen.getByRole('button', { name: i18n.t('common.retry') }))
		await waitFor(() => expect(score).toBeEnabled())
		expect(score).toBeChecked()
		expect(screen.getByRole('combobox', { name: i18n.t('admin.preferences.scoreProvider') })).toHaveValue('OpenCritic')
		expect(writes).not.toHaveBeenCalled()
	})
})
