import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils/renderWithProviders'

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
		await user.click(checkboxes[0])
		// The local state updates immediately even if thunk fails
		expect(checkboxes[0]).toBeChecked()
	})
})
