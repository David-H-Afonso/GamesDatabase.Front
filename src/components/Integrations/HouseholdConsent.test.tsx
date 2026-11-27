import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { createTestStore } from '@/test/utils/createTestStore'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { initCustomFetch } from '@/utils/customFetch'
import { forceLogout, setRefreshedTokens } from '@/store/features/auth/authSlice'
import { ProtectedRoute } from '@/components/Auth/ProtectedRoute'
import i18n from '@/i18n'
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

const labels = {
	en: { profile: 'View your profile', games: 'View your collection', status: 'Update game statuses', approve: 'Allow connection', deny: 'Deny', approving: 'Connecting…', denying: 'Cancelling…', failed: 'The authorization could not be completed. Check the request or try again.', invalidClient: 'The integration client is not valid.', missingParameters: 'The request does not include all the required information.', invalidRedirect: 'The return URL is not valid.', invalidPkce: 'The request does not use PKCE S256 correctly.', unsupportedScope: 'Household requested an unsupported permission.' },
	es: { profile: 'Ver tu perfil', games: 'Consultar tu colección', status: 'Actualizar estados', approve: 'Permitir conexión', deny: 'Denegar', approving: 'Conectando…', denying: 'Cancelando…', failed: 'No se pudo completar la autorización. Revisa la solicitud o inténtalo de nuevo.', invalidClient: 'El cliente de integración no es válido.', missingParameters: 'La solicitud no incluye todos los datos necesarios.', invalidRedirect: 'La URL de retorno no es válida.', invalidPkce: 'La solicitud no usa PKCE S256 correctamente.', unsupportedScope: 'Household ha solicitado un permiso no admitido.' },
}
const LocationProbe = () => { const location = useLocation(); return <output data-testid='consent-location'>{location.pathname}{location.search}</output> }
const renderConsent = (onRedirect = vi.fn(), route = validRoute, authenticated = true, username = 'Player One') => {
	const state = authenticated ? { ...authenticatedState, auth: { ...authenticatedState.auth, user: { ...authenticatedState.auth.user, username } } } : undefined
	const store = createTestStore(state as any)
	initCustomFetch(store, { purge: vi.fn().mockResolvedValue(undefined) }, forceLogout, setRefreshedTokens)
	return { onRedirect, ...renderWithProviders(<Routes><Route path='/integrations/household/authorize' element={<ProtectedRoute><HouseholdConsent onRedirect={onRedirect} /></ProtectedRoute>} /><Route path='*' element={<LocationProbe />} /></Routes>, { store, route }) }
}
const reproduceDisabledControlBlur = () => {
	// jsdom refuses .blur() on its disabled active element. Focusing BODY models
	// the real Chromium state measured in the retained BEFORE-FIX capture.
	const tabIndex = document.body.getAttribute('tabindex')
	document.body.tabIndex = -1; document.body.focus()
	if (tabIndex === null) document.body.removeAttribute('tabindex')
	else document.body.setAttribute('tabindex', tabIndex)
	expect(document.body).toHaveFocus()
}

describe.each(['en', 'es'] as const)('HouseholdConsent (%s)', language => {
	beforeEach(async () => {
		vi.clearAllMocks()
		await i18n.changeLanguage(language)
	})

	it('shows the account and requested scopes without displaying integration credentials', () => {
		renderConsent()

		expect(screen.getByText(/Player One/)).toBeInTheDocument()
		expect(screen.getByText(labels[language].profile)).toBeInTheDocument()
		expect(screen.getByText(labels[language].games)).toBeInTheDocument()
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
		renderConsent(onRedirect)

		await userEvent.click(screen.getByRole('button', { name: labels[language].approve }))
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
		renderConsent(onRedirect)

		await userEvent.click(screen.getByRole('button', { name: labels[language].deny }))
		await waitFor(() => expect(onRedirect).toHaveBeenCalled())
		expect(approved).toBe(false)
	})

	it('blocks malformed PKCE requests before calling the API', () => {
		renderConsent(vi.fn(), validRoute.replace(`code_challenge=${CHALLENGE}`, 'code_challenge=invalid'))

		expect(screen.getByRole('alert')).toHaveTextContent(/PKCE S256/)
		expect(screen.queryByRole('button', { name: labels[language].approve })).not.toBeInTheDocument()
	})

	it.each([
		['client_id', 'untrusted', 'invalidClient'],
		['state', '', 'missingParameters'],
		['redirect_uri', 'file:///synthetic', 'invalidRedirect'],
		['code_challenge_method', 'plain', 'invalidPkce'],
		['scope', 'games.delete', 'unsupportedScope'],
	] as const)('rejects invalid %s before an authorization call in the current locale', (parameter, value, reason) => {
		let writes = 0
		server.use(http.post(`${BASE}/integrations/household/v1/authorize`, () => { writes++; return HttpResponse.json({}) }))
		const [path, query] = validRoute.split('?'), params = new URLSearchParams(query); params.set(parameter, value)
		const { onRedirect } = renderConsent(vi.fn(), `${path}?${params}`)
		expect(screen.getByRole('alert')).toHaveTextContent(labels[language][reason])
		expect(screen.queryByRole('button', { name: labels[language].approve })).not.toBeInTheDocument()
		expect(writes).toBe(0); expect(onRedirect).not.toHaveBeenCalled()
	})

	it('renders every requested scope and keeps account text escaped', () => {
		const [path, query] = validRoute.split('?'), params = new URLSearchParams(query); params.set('scope', 'games.status.write profile.read games.read games.read')
		const username = '<img src=x onerror=synthetic> & Player'
		renderConsent(vi.fn(), `${path}?${params}`, true, username)
		expect(screen.getByText(labels[language].status)).toBeInTheDocument()
		expect(screen.getAllByRole('listitem')).toHaveLength(3)
		expect(screen.getByText('https://household.test')).toBeInTheDocument()
		expect(screen.getByText(username)).toHaveProperty('tagName', 'STRONG')
		expect(document.querySelector('.household-consent__header img')).toBeNull()
	})

	it('retains the request after a localized pending/failure state and retries only on another explicit decision', async () => {
		let release!: () => void, writes = 0
		const pending = new Promise<void>(resolve => { release = resolve })
		server.use(http.post(`${BASE}/integrations/household/v1/authorize`, async () => { writes++; await pending; return HttpResponse.json({ message: 'Synthetic internal server detail' }, { status: 503 }) }))
		const { onRedirect } = renderConsent()
		try {
			await userEvent.click(screen.getByRole('button', { name: labels[language].approve }))
			expect(screen.getByRole('button', { name: labels[language].approving })).toBeDisabled()
			expect(screen.getByRole('button', { name: labels[language].deny })).toBeDisabled()
			expect(onRedirect).not.toHaveBeenCalled(); await waitFor(() => expect(writes).toBe(1))
		} finally { release() }
		await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(labels[language].failed))
		expect(screen.queryByText('Synthetic internal server detail')).not.toBeInTheDocument()
		expect(screen.getByRole('button', { name: labels[language].approve })).toBeEnabled()
		expect(screen.getByText(labels[language].games)).toBeInTheDocument()
		server.use(http.post(`${BASE}/integrations/household/v1/authorize`, () => { writes++; return HttpResponse.json({ redirectUrl: 'https://household.test/callback?code=synthetic-retry&state=request-state' }) }))
		await userEvent.click(screen.getByRole('button', { name: labels[language].approve }))
		await waitFor(() => expect(onRedirect).toHaveBeenCalledTimes(1)); expect(writes).toBe(2)
	})

	it('localizes a pending denial and never navigates externally itself in this test', async () => {
		let release!: () => void
		const pending = new Promise<void>(resolve => { release = resolve })
		server.use(http.post(`${BASE}/integrations/household/v1/authorize`, async () => { await pending; return HttpResponse.json({ redirectUrl: 'https://household.test/callback?error=access_denied&state=request-state' }) }))
		const { onRedirect } = renderConsent()
		try { await userEvent.click(screen.getByRole('button', { name: labels[language].deny })); expect(screen.getByRole('button', { name: labels[language].denying })).toBeDisabled() }
		finally { release() }
		await waitFor(() => expect(onRedirect).toHaveBeenCalledWith('https://household.test/callback?error=access_denied&state=request-state'))
	})

	it('rejects a missing API-validated redirect without following the request URI', async () => {
		server.use(http.post(`${BASE}/integrations/household/v1/authorize`, () => HttpResponse.json({})))
		const { onRedirect } = renderConsent()
		await userEvent.click(screen.getByRole('button', { name: labels[language].approve }))
		await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(labels[language].failed))
		expect(onRedirect).not.toHaveBeenCalled()
	})

	it('requires the real ProtectedRoute guard and retains the complete consent request for login', async () => {
		let writes = 0
		server.use(http.post(`${BASE}/integrations/household/v1/authorize`, () => { writes++; return HttpResponse.json({}) }))
		renderConsent(vi.fn(), validRoute, false)
		await waitFor(() => expect(screen.getByTestId('consent-location')).toHaveTextContent(/^\/login\?/))
		const route = screen.getByTestId('consent-location').textContent!
		expect(new URLSearchParams(route.split('?')[1]).get('returnTo')).toBe(validRoute)
		expect(writes).toBe(0)
	})

	it.each(['approve', 'deny'] as const)('restores keyboard focus to the initiating %s control only after a failed response re-enables it', async decision => {
		let release!: () => void
		const pending = new Promise<void>(resolve => { release = resolve })
		let writes = 0
		server.use(http.post(`${BASE}/integrations/household/v1/authorize`, async () => { writes++; await pending; return HttpResponse.json({}, { status: 503 }) }))
		const { onRedirect } = renderConsent()
		const trigger = screen.getByRole('button', { name: labels[language][decision] })
		try {
			trigger.focus(); await userEvent.keyboard('{Enter}')
			expect(trigger).toBeDisabled()
			// jsdom does not reproduce Chromium blurring a disabled focused button.
			// Model the observed BODY focus precondition, not the recovery behavior.
			reproduceDisabledControlBlur()
			await waitFor(() => expect(writes).toBe(1))
		} finally { release() }
		await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(labels[language].failed))
		await waitFor(() => expect(trigger).toHaveFocus())
		expect(trigger).toBeEnabled(); expect(writes).toBe(1); expect(onRedirect).not.toHaveBeenCalled()
	})

	it('does not steal focus from another deliberate focus target after a failed consent response', async () => {
		let release!: () => void
		const pending = new Promise<void>(resolve => { release = resolve })
		server.use(http.post(`${BASE}/integrations/household/v1/authorize`, async () => { await pending; return HttpResponse.json({}, { status: 503 }) }))
		renderConsent()
		const other = document.createElement('button'); other.textContent = 'Other synthetic focus target'; document.body.append(other)
		try {
			const trigger = screen.getByRole('button', { name: labels[language].approve })
			trigger.focus(); await userEvent.keyboard('{Enter}'); expect(trigger).toBeDisabled(); reproduceDisabledControlBlur(); other.focus()
			release()
			await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(labels[language].failed))
			expect(other).toHaveFocus()
		} finally { release(); other.remove() }
	})

	it('never restores an old-account initiator into another account while retaining the real request ownership guard', async () => {
		let release!: () => void
		const pending = new Promise<void>(resolve => { release = resolve })
		server.use(http.post(`${BASE}/integrations/household/v1/authorize`, async () => { await pending; return HttpResponse.json({ redirectUrl: 'https://household.test/callback?code=old-account' }) }))
		const { store, onRedirect } = renderConsent()
		const trigger = screen.getByRole('button', { name: labels[language].approve })
		try {
			trigger.focus(); await userEvent.keyboard('{Enter}'); expect(trigger).toBeDisabled(); reproduceDisabledControlBlur()
			act(() => { store.dispatch({ type: 'auth/login/fulfilled', payload: { userId: 8, username: 'Different synthetic account', role: 'Standard', token: 'different-synthetic-session', refreshToken: null } }) })
			expect(screen.getByText('Different synthetic account')).toBeInTheDocument()
		} finally { release() }
		await waitFor(() => expect(trigger).toBeEnabled())
		expect(trigger).not.toHaveFocus(); expect(document.body).toHaveFocus(); expect(onRedirect).not.toHaveBeenCalled()
	})

	it('recovers the same initiator after a pending locale change without submitting the request again', async () => {
		let release!: () => void, writes = 0
		const pending = new Promise<void>(resolve => { release = resolve })
		server.use(http.post(`${BASE}/integrations/household/v1/authorize`, async () => { writes++; await pending; return HttpResponse.json({}, { status: 503 }) }))
		renderConsent()
		const trigger = screen.getByRole('button', { name: labels[language].deny }), nextLanguage = language === 'en' ? 'es' : 'en'
		try {
			trigger.focus(); await userEvent.keyboard('{Enter}'); expect(trigger).toBeDisabled(); reproduceDisabledControlBlur()
			await act(async () => { await i18n.changeLanguage(nextLanguage) })
			expect(screen.getByRole('button', { name: labels[nextLanguage].denying })).toBe(trigger)
		} finally { release() }
		await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(labels[nextLanguage].failed))
		await waitFor(() => expect(trigger).toHaveFocus())
		expect(trigger).toBeEnabled(); expect(writes).toBe(1)
	})

	it('keeps competing same-tick decisions single-flight without bypassing the component or HTTP guard', async () => {
		let release!: () => void, writes = 0
		const pending = new Promise<void>(resolve => { release = resolve })
		server.use(http.post(`${BASE}/integrations/household/v1/authorize`, async () => { writes++; await pending; return HttpResponse.json({}, { status: 503 }) }))
		renderConsent()
		const approve = screen.getByRole('button', { name: labels[language].approve }), deny = screen.getByRole('button', { name: labels[language].deny })
		try { act(() => { approve.click(); deny.click(); approve.click() }); await waitFor(() => expect(writes).toBe(1)) }
		finally { release() }
		await waitFor(() => expect(approve).toBeEnabled()); expect(writes).toBe(1)
	})
})

it('registers complete nonempty entry-flow catalogs in both locales without fallback', () => {
	const flatten = (catalog: Record<string, unknown>, prefix = ''): Array<[string, unknown]> => Object.entries(catalog).flatMap<[string, unknown]>(([name, value]) => {
		const path = prefix ? `${prefix}.${name}` : name
		return value && typeof value === 'object' ? flatten(value as Record<string, unknown>, path) : [[path, value]]
	})
	const en = Object.fromEntries(flatten(i18n.getResource('en', 'translation', 'entryflows')))
	const es = Object.fromEntries(flatten(i18n.getResource('es', 'translation', 'entryflows')))
	expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort())
	expect(Object.keys(en).length).toBeGreaterThan(0)
	for (const key of Object.keys(en)) {
		expect(typeof en[key]).toBe('string'); expect(typeof es[key]).toBe('string')
		expect(String(en[key]).trim().length).toBeGreaterThan(0); expect(String(es[key]).trim().length).toBeGreaterThan(0)
		expect(en[key]).not.toBe(es[key]); expect(en[key]).not.toBe(`entryflows.${key}`); expect(es[key]).not.toBe(`entryflows.${key}`)
	}
})
