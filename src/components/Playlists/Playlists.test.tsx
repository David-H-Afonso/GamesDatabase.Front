import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { createGame } from '@/test/factories'
import type { Game } from '@/models/api/Game'
import type { Playlist } from '@/models/api/Playlist'
import { blankPlaylistRules } from '@/utils/playlistRules'
import i18n from '@/i18n'
import Playlists from './Playlists'

// Cards have independent tests; keep these journeys focused on real routes,
// Redux thunks, HTTP contracts, capacities and playlist mutations.
vi.mock('@/components/elements/GameCard/GameCard', () => ({ GameCard: ({ game, onGameUpdated }: { game: Game; onGameUpdated?: (game: Game) => void }) => <div data-testid='playlist-game-fixture'><strong>{game.name}</strong><button type='button' onClick={() => onGameUpdated?.({ ...game, comment: 'Explicit fixture update' })}>Update {game.name} fixture</button></div> }))
const API = 'https://localhost:7245/api'
const auth = { user: { id: 1, username: 'Playlist fixture', role: 'Standard' }, token: 'fixture', refreshToken: null, isAuthenticated: true, loading: false, error: null } as const
const first = createGame({ id: 51, name: 'First game', grade: 60, manualPlaytimeMinutes: 0, steamPlaytimeForever: 600 })
const second = createGame({ id: 52, name: 'Second game', grade: 90, manualPlaytimeMinutes: null, steamPlaytimeForever: 120 })
const outside = createGame({ id: 53, name: 'Outside game' })
const fixture = (values: Partial<Playlist> = {}): Playlist => ({ id: 7, name: 'Personal playlist', description: 'My stored description', isAutomatic: false, sortOrder: 0, gameCount: 2, maxLength: 4, createdAt: '2026-11-25T12:00:00Z', updatedAt: '2026-11-25T12:00:00Z', items: [first, second].map((game, index) => ({ id: 101 + index, gameId: game.id, position: index, game })), ...values })
let data: Playlist
let writes: Array<{ method: string; path: string; body?: unknown }>
const record = async (request: Request) => { const item = { method: request.method, path: new URL(request.url).pathname, body: request.method === 'DELETE' ? undefined : await request.json() }; writes.push(item); return item.body as Record<string, any> }
const renderPlaylist = async () => {
	const view = renderWithProviders(<Routes><Route path='/playlists/:id?' element={<Playlists />} /></Routes>, { preloadedState: { auth }, route: '/playlists/7' })
	await screen.findByRole('heading', { name: data.name }); await waitFor(() => expect(view.container.querySelector('.playlists-page')).toHaveAttribute('aria-busy', 'false'))
	return view
}
const openMenu = async () => { await userEvent.click(screen.getByRole('button', { name: i18n.t('playlists.options') })); return within(screen.getByRole('dialog', { name: i18n.t('playlists.options') })) }

describe('playlist journeys with isolated HTTP fixtures and real Redux state', () => {
	beforeEach(async () => {
		await i18n.changeLanguage('en'); data = fixture(); writes = []
		vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
		Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() })
		server.use(
			http.get(`${API}/playlists/groups`, () => HttpResponse.json([{ id: 1, name: 'Fixture folder', sortOrder: 1 }])),
			http.get(`${API}/playlists`, () => HttpResponse.json([{ ...data, items: undefined }])),
			http.get(`${API}/playlists/:id`, () => HttpResponse.json(data)),
			http.post(`${API}/playlists/:id/items`, async ({ request }) => { const body = await record(request); const game = [first, second, outside].find(game => game.id === body.gameId)!; data = { ...data, items: [...data.items, { id: 110, gameId: game.id, position: data.items.length, game }], gameCount: data.gameCount + 1 }; return HttpResponse.json(data) }),
			http.delete(`${API}/playlists/:id/items/:itemId`, async ({ request, params }) => { await record(request); data = { ...data, items: data.items.filter(item => item.id !== Number(params.itemId)).map((item, index) => ({ ...item, position: index })), gameCount: data.gameCount - 1 }; return HttpResponse.json(data) }),
			http.post(`${API}/playlists/:id/items/reorder`, async ({ request }) => { await record(request); return new HttpResponse(null, { status: 204 }) }),
			http.get(`${API}/games`, () => HttpResponse.json({ data: [first, outside], page: 1, pageSize: 12, totalCount: 2, totalPages: 1 })),
			http.post(`${API}/playlists`, async ({ request }) => { const body = await record(request); data = fixture({ ...body, id: 19, items: [], gameCount: 0 }); return HttpResponse.json(data) }),
			http.put(`${API}/playlists/:id`, async ({ request }) => { const body = await record(request); data = { ...data, ...body }; return HttpResponse.json(data) }),
			http.post(`${API}/playlists/:id/move`, async ({ request }) => { const body = await record(request); data = { ...data, groupId: body.groupId }; return new HttpResponse(null, { status: 204 }) }),
			http.post(`${API}/playlists/import`, async ({ request }) => { const body = await record(request); return HttpResponse.json(fixture({ name: body.name, id: 20 })) }),
		)
	})
	afterEach(() => { vi.unstubAllGlobals(); delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollIntoView })
	it('renders the canonical playlist without automatically adding games or changing their status', async () => {
		await renderPlaylist(); expect(screen.getByText('First game', { selector: 'strong' })).toBeInTheDocument(); expect(screen.getByText('Second game', { selector: 'strong' })).toBeInTheDocument(); expect(writes).toEqual([])
	})
	it('changes presentation and view-only sort without writing playlist order', async () => {
		const { container, store } = await renderPlaylist(); const user = userEvent.setup()
		await user.selectOptions(screen.getByRole('combobox', { name: i18n.t('gallery.library.order') }), 'grade')
		expect([...container.querySelectorAll('[data-testid="playlist-game-fixture"] strong')].map(node => node.textContent)).toEqual(['Second game', 'First game'])
		await user.click(screen.getByRole('button', { name: i18n.t('playlists.views.row') })); expect(store.getState().theme.cardStyle).toBe('row'); expect(writes).toEqual([])
	})
	it('adds a searched outside game explicitly and disables existing games', async () => {
		await renderPlaylist(); const user = userEvent.setup(); await user.click(screen.getByRole('button', { name: i18n.t('playlists.add') }))
		const sheet = within(screen.getByRole('dialog', { name: i18n.t('playlists.addPlaceholder') })); await user.type(sheet.getByRole('textbox'), 'Outside')
		expect(await sheet.findByRole('button', { name: /First game/ })).toBeDisabled(); await user.click(await sheet.findByRole('button', { name: /Outside game/ }))
		await waitFor(() => expect(writes).toContainEqual({ method: 'POST', path: '/api/playlists/7/items', body: { gameId: 53 } })); expect(writes).toHaveLength(1)
	})
	it('does not exceed the real saved capacity', async () => {
		data = fixture({ maxLength: 2 }); await renderPlaylist(); expect(screen.getByRole('button', { name: i18n.t('playlists.add') })).toBeDisabled(); expect(writes).toEqual([])
	})
	it('requires an explicit eligible status before adding to an automatic playlist', async () => {
		data = fixture({ isAutomatic: true, rules: { ...blankPlaylistRules(), statusIds: [1] } })
		const { store } = await renderPlaylist(); act(() => store.dispatch({ type: 'gameStatus/setActiveStatuses', payload: [{ id: 1, name: 'Eligible backlog', color: '#647b91', isActive: true }] }))
		const user = userEvent.setup(); await user.click(screen.getByRole('button', { name: i18n.t('playlists.add') })); const sheet = within(screen.getByRole('dialog', { name: i18n.t('playlists.addPlaceholder') }))
		await user.type(sheet.getByRole('textbox'), 'Outside'); await user.click(await sheet.findByRole('button', { name: /Outside game/ })); expect(writes).toEqual([])
		const confirm = within(screen.getByRole('dialog', { name: i18n.t('playlists.addAutomaticTitle') })); await user.click(confirm.getByRole('radio', { name: 'Eligible backlog' })); await user.click(confirm.getByRole('button', { name: i18n.t('playlists.confirmAdd') }))
		await waitFor(() => expect(writes[0]).toMatchObject({ body: { gameId: 53, statusId: 1 } }))
	})
	it('reorders item IDs through the accessible controls and removes only playlist membership', async () => {
		const { store } = await renderPlaylist(); const user = userEvent.setup()
		const label = `${i18n.t('gallery.playlist.itemOptions')}: Second game`
		await user.click(screen.getByRole('button', { name: label })); await user.click(within(screen.getByRole('dialog', { name: label })).getByRole('button', { name: 'Move up' }))
		await waitFor(() => expect(writes).toContainEqual({ method: 'POST', path: '/api/playlists/7/items/reorder', body: { orderedIds: [102, 101] } })); expect(store.getState().playlists.currentPlaylist?.items[0].id).toBe(102)
		await user.click(screen.getByRole('button', { name: label })); await user.click(within(screen.getByRole('dialog', { name: label })).getByRole('button', { name: i18n.t('playlists.removeGame') })); await waitFor(() => expect(writes.at(-1)?.path).toBe('/api/playlists/7/items/102'))
		expect(writes.some(write => write.path.startsWith('/api/games/'))).toBe(false)
	})
	it('restores the previous canonical order after a failed reorder', async () => {
		server.use(http.post(`${API}/playlists/:id/items/reorder`, async ({ request }) => { await record(request); return HttpResponse.json({ message: 'Fixture reorder failure' }, { status: 409 }) }))
		const { store } = await renderPlaylist(); const user = userEvent.setup(); const label = `${i18n.t('gallery.playlist.itemOptions')}: Second game`; await user.click(screen.getByRole('button', { name: label })); await user.click(within(screen.getByRole('dialog', { name: label })).getByRole('button', { name: 'Move up' }))
		await waitFor(() => expect(store.getState().playlists.error).not.toBeNull()); expect(store.getState().playlists.currentPlaylist?.items.map(item => item.id)).toEqual([101, 102]); expect(screen.getByRole('alert')).toBeInTheDocument()
	})
	it('keeps membership and exposes the error instead of rejecting an unhandled remove promise', async () => {
		server.use(http.delete(`${API}/playlists/:id/items/:itemId`, async ({ request }) => { await record(request); return HttpResponse.json({ message: 'Fixture remove failed' }, { status: 409 }) }))
		const { store } = await renderPlaylist(); const user = userEvent.setup(); const label = `${i18n.t('gallery.playlist.itemOptions')}: First game`; await user.click(screen.getByRole('button', { name: label })); await user.click(within(screen.getByRole('dialog', { name: label })).getByRole('button', { name: i18n.t('playlists.removeGame') }))
		expect(await screen.findByRole('alert')).toHaveTextContent(i18n.t('gallery.common.saveError')); expect(store.getState().playlists.currentPlaylist?.items).toHaveLength(2)
	})
	it('keeps a failed playlist deletion review open and prevents same-tick duplicate requests', async () => {
		let release!: () => void; const pending = new Promise<void>(resolve => { release = resolve })
		server.use(http.delete(`${API}/playlists/7`, async ({ request }) => { await record(request); await pending; return HttpResponse.json({ message: 'Fixture delete failed' }, { status: 409 }) }))
		const { store } = await renderPlaylist(); const user = userEvent.setup(); const menu = await openMenu(); await user.click(menu.getByRole('button', { name: 'Delete' }))
		const confirm = within(screen.getByRole('alertdialog')); const button = confirm.getByRole('button', { name: 'Delete' }); fireEvent.click(button); fireEvent.click(button)
		await waitFor(() => expect(writes.filter(write => write.method === 'DELETE')).toHaveLength(1)); await act(async () => { release(); await pending })
		await waitFor(() => expect(store.getState().playlists.error).not.toBeNull()); expect(screen.getByRole('alertdialog')).toBeInTheDocument(); expect(confirm.getByRole('alert')).toHaveTextContent(i18n.t('gallery.common.saveError')); expect(store.getState().playlists.currentPlaylist?.id).toBe(7)
	})
	it('edits a playlist through the shared form but Cancel performs no write', async () => {
		await renderPlaylist(); const user = userEvent.setup(); await user.click(screen.getByRole('button', { name: i18n.t('gallery.playlist.edit') }))
		let sheet = within(screen.getByRole('dialog', { name: i18n.t('gallery.rules.editorTitle') })); await user.type(sheet.getByLabelText(i18n.t('playlists.name')), ' changed'); await user.click(sheet.getByRole('button', { name: 'Cancel' })); expect(writes).toEqual([])
		await user.click(screen.getByRole('button', { name: i18n.t('gallery.playlist.edit') })); sheet = within(screen.getByRole('dialog', { name: i18n.t('gallery.rules.editorTitle') })); await user.clear(sheet.getByLabelText(i18n.t('playlists.name'))); await user.type(sheet.getByLabelText(i18n.t('playlists.name')), 'Edited playlist'); await user.click(sheet.getByRole('button', { name: i18n.t('gallery.rules.savePlaylist') }))
		await screen.findByRole('heading', { name: 'Edited playlist' }); expect(writes[0]).toMatchObject({ method: 'PUT', path: '/api/playlists/7', body: { name: 'Edited playlist', isAutomatic: false } })
	})
	it('does not create a duplicate playlist when its subsequent folder move fails', async () => {
		let attempts = 0; server.use(http.post(`${API}/playlists/:id/move`, async ({ request }) => { const body = await record(request); if (++attempts === 1) return HttpResponse.json({ message: 'Fixture move failed' }, { status: 409 }); data = { ...data, groupId: body.groupId }; return new HttpResponse(null, { status: 204 }) }))
		await renderPlaylist(); const user = userEvent.setup(); await user.click(screen.getByRole('button', { name: i18n.t('playlists.new') })); const sheet = within(screen.getByRole('dialog', { name: i18n.t('gallery.rules.newTitle') }))
		await user.click(sheet.getByRole('button', { name: i18n.t('gallery.templates.playlistCustom') })); await user.type(sheet.getByLabelText(i18n.t('playlists.name')), 'Created playlist'); await user.selectOptions(sheet.getByLabelText(i18n.t('gallery.rules.folder')), '1')
		await user.click(sheet.getByRole('button', { name: i18n.t('gallery.rules.savePlaylist') })); expect(await sheet.findByRole('alert')).toBeInTheDocument(); await user.click(sheet.getByRole('button', { name: i18n.t('gallery.rules.savePlaylist') }))
		await waitFor(() => expect(screen.queryByRole('dialog', { name: i18n.t('gallery.rules.newTitle') })).not.toBeInTheDocument()); expect(writes.filter(write => write.method === 'POST' && write.path === '/api/playlists')).toHaveLength(1); expect(writes.some(write => write.method === 'PUT' && write.path === '/api/playlists/19')).toBe(true)
	})
	it('validates a pasted playlist import before issuing any request and imports only explicit valid JSON', async () => {
		await renderPlaylist(); const user = userEvent.setup(); const menu = await openMenu(); await user.click(menu.getByRole('button', { name: i18n.t('playlists.import') })); const dialog = within(screen.getByRole('dialog', { name: i18n.t('playlists.import') }))
		fireEvent.change(dialog.getByRole('textbox'), { target: { value: '{"version":1}' } }); await user.click(dialog.getByRole('button', { name: i18n.t('playlists.import') })); expect(writes).toEqual([])
		const transfer = { format: 'games-database-playlist', version: 1, name: 'Imported fixture', games: [{ gameId: 51 }] }; fireEvent.change(dialog.getByRole('textbox'), { target: { value: JSON.stringify(transfer) } }); await user.click(dialog.getByRole('button', { name: i18n.t('playlists.import') }))
		await waitFor(() => expect(writes).toContainEqual({ method: 'POST', path: '/api/playlists/import', body: transfer })); await waitFor(() => expect(screen.queryByRole('dialog', { name: i18n.t('playlists.import') })).not.toBeInTheDocument())
	})
	it('closes the option menu with Escape and keeps a failed detail read visibly retryable', async () => {
		const view = await renderPlaylist(); await openMenu(); await userEvent.keyboard('{Escape}'); expect(screen.queryByRole('dialog', { name: i18n.t('playlists.options') })).not.toBeInTheDocument(); expect(screen.getByRole('button', { name: i18n.t('playlists.options') })).toHaveFocus(); view.unmount()
		server.use(http.get(`${API}/playlists/7`, () => HttpResponse.json({ message: 'Fixture unavailable' }, { status: 404 })))
		renderWithProviders(<Routes><Route path='/playlists/:id?' element={<Playlists />} /></Routes>, { preloadedState: { auth }, route: '/playlists/7' })
		expect(await screen.findByRole('alert')).toHaveTextContent(i18n.t('gallery.common.loadError')); expect(screen.getByRole('button', { name: i18n.t('gallery.common.retry') })).toBeInTheDocument(); expect(writes).toEqual([])
	})
})
