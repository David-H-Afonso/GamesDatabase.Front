import { act, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Route, Routes, useLocation } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import i18n from '@/i18n'
import { server } from '@/test/mocks/server'
import { createTestStore } from '@/test/utils/createTestStore'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { initCustomFetch } from '@/utils/customFetch'
import { forceLogout, setRefreshedTokens } from '@/store/features/auth/authSlice'
import { ProtectedRoute } from './ProtectedRoute'
import { SteamCallback } from './SteamCallback'

vi.mock('@/navigation/router', () => ({ router: { navigate: vi.fn() } }))

const BASE = 'https://localhost:7245/api'
const CODE = '00000000-0000-4000-8000-000000000001'
const HOUSEHOLD = '/integrations/household/authorize?client_id=household&state=synthetic-return-state'
const user = { id: 7, username: 'Synthetic Player', role: 'Standard' as const, isDefault: false, hasPassword: true }
const labels = {
	en: {
		processing: 'Processing Steam sign-in...',
		failed: 'Steam sign-in could not be completed. Please try again.',
		invalid_nonce: 'This Steam sign-in request is invalid. Start again.',
		nonce_expired: 'This Steam sign-in request expired. Start again.',
		validation_failed: 'Steam could not verify this sign-in. Please try again.',
		user_not_found: 'This Games Database account is no longer available.',
		steam_already_linked: 'This Steam account is already linked to another Games Database account.',
		no_account_linked: 'No Games Database account is linked to this Steam account.',
	},
	es: {
		processing: 'Procesando inicio de sesión con Steam...',
		failed: 'No se pudo completar el inicio de sesión con Steam. Inténtalo de nuevo.',
		invalid_nonce: 'Esta solicitud de inicio de sesión con Steam no es válida. Empieza de nuevo.',
		nonce_expired: 'Esta solicitud de inicio de sesión con Steam ha caducado. Empieza de nuevo.',
		validation_failed: 'Steam no pudo verificar este inicio de sesión. Inténtalo de nuevo.',
		user_not_found: 'Esta cuenta de Games Database ya no está disponible.',
		steam_already_linked: 'Esta cuenta de Steam ya está vinculada a otra cuenta de Games Database.',
		no_account_linked: 'No hay ninguna cuenta de Games Database vinculada a esta cuenta de Steam.',
	},
}
const LocationProbe = () => { const location = useLocation(); return <output data-testid='entryflow-location'>{location.pathname}{location.search}</output> }
const destination = () => screen.getByTestId('entryflow-location').textContent!
const returnedError = () => new URLSearchParams(destination().split('?')[1]).get('steamError')

const renderCallback = (query = '', authenticated = false) => {
	const store = createTestStore({ auth: { isAuthenticated: authenticated, user: authenticated ? user : null, token: authenticated ? 'synthetic-existing-session' : null, refreshToken: null, loading: false, error: null } } as any)
	initCustomFetch(store, { purge: vi.fn().mockResolvedValue(undefined) }, forceLogout, setRefreshedTokens)
	return renderWithProviders(<Routes><Route path='/steam-callback' element={<SteamCallback />} /><Route path='/login' element={<LocationProbe />} /><Route path='*' element={<ProtectedRoute><LocationProbe /></ProtectedRoute>} /></Routes>, { store, route: `/steam-callback${query}` })
}

describe.each(['en', 'es'] as const)('SteamCallback entry flow (%s)', language => {
	beforeEach(async () => { vi.clearAllMocks(); await i18n.changeLanguage(language) })

	it('localizes the pending screen and returns a safe localized error on exchange failure', async () => {
		let release!: () => void
		const pending = new Promise<void>(resolve => { release = resolve })
		let exchanges = 0
		server.use(http.get(`${BASE}/auth/steam/exchange/${CODE}`, async () => { exchanges++; await pending; return HttpResponse.json({ message: 'Synthetic internal response must not be shown' }, { status: 503 }) }))
		renderCallback(`?code=${CODE}`)
		try { expect(screen.getByText(labels[language].processing)).toBeInTheDocument(); await waitFor(() => expect(exchanges).toBe(1)) }
		finally { release() }
		await waitFor(() => expect(destination()).toMatch(/^\/login\?/))
		expect(returnedError()).toBe(labels[language].failed)
		expect(destination()).not.toContain('Synthetic internal')
	})

	it.each([false, true])('exchanges once through the real thunk and preserves the internal Household continuation (%s)', async householdReturn => {
		let exchanges = 0, profiles = 0
		server.use(
			http.get(`${BASE}/auth/steam/exchange/${CODE}`, () => { exchanges++; return HttpResponse.json({ token: 'synthetic-exchanged-session', refreshToken: 'synthetic-exchanged-refresh', userId: 7, username: user.username, role: user.role }) }),
			http.get(`${BASE}/users/7`, () => { profiles++; return HttpResponse.json(user) }),
		)
		if (householdReturn) sessionStorage.setItem('householdAuthorizationReturnTo', HOUSEHOLD)
		const { store } = renderCallback(`?code=${CODE}`)
		await waitFor(() => expect(destination()).toBe(householdReturn ? HOUSEHOLD : '/'))
		expect(exchanges).toBe(1); expect(profiles).toBe(1)
		expect(store.getState().auth.isAuthenticated).toBe(true)
		expect(store.getState().auth.user?.id).toBe(7)
		expect(sessionStorage.getItem('householdAuthorizationReturnTo')).toBeNull()
	})

	it('links the synthetic profile without exchanging a login code and retains the settings destination', async () => {
		let exchanges = 0
		server.use(http.get(`${BASE}/auth/steam/exchange/:code`, () => { exchanges++; return HttpResponse.json({}, { status: 400 }) }))
		const { store } = renderCallback('?steamLinked=true&steamId=76561198000000001&steamNickname=Synthetic%20Steam&steamAvatarUrl=https%3A%2F%2Fimages.invalid%2Favatar.png', true)
		await waitFor(() => expect(destination()).toBe('/settings'))
		expect(store.getState().auth.user).toMatchObject({ id: 7, steamId: '76561198000000001', steamNickname: 'Synthetic Steam', steamAvatarUrl: 'https://images.invalid/avatar.png' })
		expect(exchanges).toBe(0)
	})

	it('does not turn a link query flag into an authenticated session for a signed-out visitor', async () => {
		const { store } = renderCallback('?steamLinked=true&steamId=76561198000000001')
		await waitFor(() => expect(destination()).toMatch(/^\/login\?/))
		expect(new URLSearchParams(destination().split('?')[1]).get('returnTo')).toBe('/settings')
		expect(store.getState().auth.isAuthenticated).toBe(false); expect(store.getState().auth.user).toBeNull()
	})

	it.each(['invalid_nonce', 'nonce_expired', 'validation_failed', 'user_not_found', 'steam_already_linked', 'no_account_linked'] as const)('localizes %s without starting an exchange or losing the guarded return route', async reason => {
		let exchanges = 0
		server.use(http.get(`${BASE}/auth/steam/exchange/:code`, () => { exchanges++; return HttpResponse.json({}, { status: 400 }) }))
		sessionStorage.setItem('householdAuthorizationReturnTo', HOUSEHOLD)
		const { store } = renderCallback(`?error=${reason}&code=${CODE}&steamLinked=true`)
		await waitFor(() => expect(returnedError()).toBe(labels[language][reason]))
		expect(new URLSearchParams(destination().split('?')[1]).get('returnTo')).toBe(HOUSEHOLD)
		expect(sessionStorage.getItem('householdAuthorizationReturnTo')).toBeNull()
		expect(store.getState().auth.isAuthenticated).toBe(false); expect(exchanges).toBe(0)
	})

	it('never forwards an unknown callback error payload or an external stored return destination', async () => {
		sessionStorage.setItem('householdAuthorizationReturnTo', 'https://untrusted.invalid/private')
		renderCallback('?error=' + encodeURIComponent('<script>synthetic</script> https://untrusted.invalid/debug'))
		await waitFor(() => expect(returnedError()).toBe(labels[language].failed))
		expect(new URLSearchParams(destination().split('?')[1]).has('returnTo')).toBe(false)
		expect(destination()).not.toContain('untrusted.invalid'); expect(destination()).not.toContain('script')
	})

	it.each([false, true])('handles absent or empty callback inputs without an exchange for authenticated=%s', async authenticated => {
		let exchanges = 0
		server.use(http.get(`${BASE}/auth/steam/exchange/:code`, () => { exchanges++; return HttpResponse.json({}, { status: 400 }) }))
		renderCallback('?code=&error=', authenticated)
		await waitFor(() => expect(destination()).toBe(authenticated ? '/' : '/login'))
		expect(exchanges).toBe(0)
	})
})

it('updates the visible locale during an in-flight one-time exchange without repeating the exchange', async () => {
	await i18n.changeLanguage('en')
	let release!: () => void, exchanges = 0
	const pending = new Promise<void>(resolve => { release = resolve })
	server.use(http.get(`${BASE}/auth/steam/exchange/${CODE}`, async () => { exchanges++; await pending; return HttpResponse.json({}, { status: 400 }) }))
	renderCallback(`?code=${CODE}`)
	try {
		expect(screen.getByText(labels.en.processing)).toBeInTheDocument()
		await waitFor(() => expect(exchanges).toBe(1))
		await act(async () => { await i18n.changeLanguage('es') })
		expect(screen.getByText(labels.es.processing)).toBeInTheDocument(); expect(exchanges).toBe(1)
	} finally { release() }
	await waitFor(() => expect(returnedError()).toBe(labels.es.failed))
	expect(exchanges).toBe(1)
})
