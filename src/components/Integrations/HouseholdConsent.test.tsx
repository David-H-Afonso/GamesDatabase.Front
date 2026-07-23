import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { createTestStore } from '@/test/utils/createTestStore'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { initCustomFetch } from '@/utils/customFetch'
import { HouseholdConsent } from './HouseholdConsent'

vi.mock('@/navigation/router', () => ({ router: { navigate: vi.fn() } }))

const BASE = 'https://localhost:7245/api'
const CHALLENGE = 'A'.repeat(43)
const validRoute = `/integrations/household/authorize?client_id=household&redirect_uri=${encodeURIComponent('https://household.test/callback')}&state=request-state&code_challenge=${CHALLENGE}&code_challenge_method=S256&scope=${encodeURIComponent('profile.read games.read')}`

const authenticatedState = {
	auth: {
		isAuthenticated: true,
		user: { id: 7, username: 'Player One', role: 'Standard' as const },
		token: 'web-jwt',
		refreshToken: 'web-refresh',
		loading: false,
		error: null,
	},
}

describe('HouseholdConsent', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('shows the account and requested scopes without displaying integration credentials', () => {
		const store = createTestStore(authenticatedState as any)
		initCustomFetch(store, { purge: vi.fn().mockResolvedValue(undefined) }, vi.fn(), vi.fn())
		renderWithProviders(<HouseholdConsent onRedirect={vi.fn()} />, { store, route: validRoute })

		expect(screen.getByText(/Player One/)).toBeInTheDocument()
		expect(screen.getByText('Ver tu perfil')).toBeInTheDocument()
		expect(screen.getByText('Consultar tu colección')).toBeInTheDocument()
		expect(screen.queryByText(/access token|refresh token/i)).not.toBeInTheDocument()
	})

	it('approves with the normal web session and follows only the API-validated redirect', async () => {
		const onRedirect = vi.fn()
		let requestBody: Record<string, unknown> | undefined
		let authorizationHeader: string | null = null
		server.use(
			http.post(`${BASE}/integrations/household/v1/authorize`, async ({ request }) => {
				requestBody = (await request.json()) as Record<string, unknown>
				authorizationHeader = request.headers.get('authorization')
				return HttpResponse.json({ redirectUrl: 'https://household.test/callback?code=opaque&state=request-state' })
			})
		)
		const store = createTestStore(authenticatedState as any)
		initCustomFetch(store, { purge: vi.fn().mockResolvedValue(undefined) }, vi.fn(), vi.fn())
		renderWithProviders(<HouseholdConsent onRedirect={onRedirect} />, { store, route: validRoute })

		await userEvent.click(screen.getByRole('button', { name: 'Permitir conexión' }))
		await waitFor(() => expect(onRedirect).toHaveBeenCalledWith('https://household.test/callback?code=opaque&state=request-state'))

		expect(authorizationHeader).toBe('Bearer web-jwt')
		expect(requestBody).toMatchObject({
			clientId: 'household',
			state: 'request-state',
			codeChallengeMethod: 'S256',
			scopes: ['profile.read', 'games.read'],
			approved: true,
		})
		expect(JSON.stringify(requestBody)).not.toContain('web-jwt')
	})

	it('sends a denial decision and follows the validated access_denied redirect', async () => {
		const onRedirect = vi.fn()
		let approved: unknown
		server.use(
			http.post(`${BASE}/integrations/household/v1/authorize`, async ({ request }) => {
				approved = ((await request.json()) as { approved: unknown }).approved
				return HttpResponse.json({ redirectUrl: 'https://household.test/callback?error=access_denied&state=request-state' })
			})
		)
		const store = createTestStore(authenticatedState as any)
		initCustomFetch(store, { purge: vi.fn().mockResolvedValue(undefined) }, vi.fn(), vi.fn())
		renderWithProviders(<HouseholdConsent onRedirect={onRedirect} />, { store, route: validRoute })

		await userEvent.click(screen.getByRole('button', { name: 'Denegar' }))
		await waitFor(() => expect(onRedirect).toHaveBeenCalled())
		expect(approved).toBe(false)
	})

	it('blocks malformed PKCE requests before calling the API', () => {
		const store = createTestStore(authenticatedState as any)
		initCustomFetch(store, { purge: vi.fn().mockResolvedValue(undefined) }, vi.fn(), vi.fn())
		renderWithProviders(<HouseholdConsent onRedirect={vi.fn()} />, {
			store,
			route: validRoute.replace(`code_challenge=${CHALLENGE}`, 'code_challenge=invalid'),
		})

		expect(screen.getByRole('alert')).toHaveTextContent(/PKCE S256/)
		expect(screen.queryByRole('button', { name: 'Permitir conexión' })).not.toBeInTheDocument()
	})
})
