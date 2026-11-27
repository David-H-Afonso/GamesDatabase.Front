import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import i18n from '@/i18n'
import { server } from '@/test/mocks/server'
import { createTestStore } from '@/test/utils/createTestStore'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { initCustomFetch } from '@/utils/customFetch'
import { forceLogout, setRefreshedTokens } from '@/store/features/auth/authSlice'
import type { Game } from '@/models/api/Game'
import GameDeepLink from './GameDeepLink'

const mockGame: Game = {
	id: 42,
	name: 'Deep Link Game',
	statusId: 1,
	playWithIds: [],
	playWithNames: [],
	favorite: false,
}

vi.mock('@/navigation/router', () => ({ router: { navigate: vi.fn() } }))
// Only the already-covered heavy detail child is stubbed. Route parsing,
// cancellation, Redux thunks, customFetch and the MSW HTTP boundary stay real.
vi.mock('@/components/elements', () => ({
	GameDetails: ({ game, closeDetails, onDelete }: { game: Game; closeDetails: () => void; onDelete: (game: Game) => void }) => <div data-testid='deep-link-details'>{game.name}<button onClick={closeDetails}>Close fixture details</button><button onClick={() => onDelete(game)}>Delete fixture game</button></div>,
}))

const BASE = 'https://localhost:7245/api'
const renderLink = (id = '42') => {
	const store = createTestStore({ auth: { isAuthenticated: true, user: { id: 7, username: 'Synthetic Player', role: 'Standard' }, token: 'synthetic-web-session', refreshToken: null, loading: false, error: null } } as any)
	initCustomFetch(store, { purge: vi.fn().mockResolvedValue(undefined) }, forceLogout, setRefreshedTokens)
	return renderWithProviders(<Routes><Route path='/games/:id' element={<GameDeepLink />} /><Route path='/' element={<output data-testid='deep-link-home'>Fixture home</output>} /></Routes>, { store, route: `/games/${id}` })
}

describe.each(['en', 'es'] as const)('GameDeepLink (%s)', language => {
	beforeEach(async () => { vi.clearAllMocks(); await i18n.changeLanguage(language) })

	it('loads the game from the hash-router route and reuses GameDetails', async () => {
		let reads = 0
		server.use(http.get(`${BASE}/games/42`, () => { reads++; return HttpResponse.json(mockGame) }))
		renderLink()
		await waitFor(() => expect(screen.getByTestId('deep-link-details')).toHaveTextContent('Deep Link Game'))
		expect(reads).toBe(1)
	})

	it('localizes loading without inventing a game before the actual read finishes', async () => {
		let release!: () => void
		const pending = new Promise<void>(resolve => { release = resolve })
		server.use(http.get(`${BASE}/games/42`, async () => { await pending; return HttpResponse.json(mockGame) }))
		renderLink()
		try { expect(screen.getByText(language === 'en' ? 'Loading…' : 'Cargando…')).toHaveAttribute('aria-live', 'polite'); expect(screen.queryByTestId('deep-link-details')).not.toBeInTheDocument() }
		finally { release() }
		await screen.findByTestId('deep-link-details')
	})

	it.each(['0', '-1', 'not-an-id', '1.5'])('blocks invalid ID %s before any HTTP request', async id => {
		let reads = 0
		server.use(http.get(`${BASE}/games/:id`, () => { reads++; return HttpResponse.json(mockGame) }))
		renderLink(id)
		expect(await screen.findByText('404')).toBeInTheDocument()
		expect(reads).toBe(0)
	})

	it.each([404, 403, 503])('retains the existing unavailable-game fallback for HTTP %s', async status => {
		server.use(http.get(`${BASE}/games/42`, () => HttpResponse.json({ message: 'Synthetic unavailable game' }, { status })))
		renderLink()
		expect(await screen.findByText('404')).toBeInTheDocument()
		expect(screen.queryByTestId('deep-link-details')).not.toBeInTheDocument()
	})

	it('closes to the existing home destination without mutating a game', async () => {
		let writes = 0
		server.use(http.get(`${BASE}/games/42`, () => HttpResponse.json(mockGame)), http.delete(`${BASE}/games/42`, () => { writes++; return new HttpResponse(null, { status: 204 }) }))
		renderLink(); await screen.findByTestId('deep-link-details'); await userEvent.click(screen.getByRole('button', { name: 'Close fixture details' }))
		expect(await screen.findByTestId('deep-link-home')).toBeInTheDocument(); expect(writes).toBe(0)
	})

	it('retains deletion and its final home navigation through the real service boundary', async () => {
		let writes = 0
		server.use(http.get(`${BASE}/games/42`, () => HttpResponse.json(mockGame)), http.delete(`${BASE}/games/42`, () => { writes++; return new HttpResponse(null, { status: 204 }) }))
		renderLink(); await screen.findByTestId('deep-link-details'); await userEvent.click(screen.getByRole('button', { name: 'Delete fixture game' }))
		expect(await screen.findByTestId('deep-link-home')).toBeInTheDocument(); expect(writes).toBe(1)
	})
})
