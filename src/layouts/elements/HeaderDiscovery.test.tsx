import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { createGame } from '@/test/factories'
import { DisplayedGamesContext, type DisplayedGamesScope } from '@/components/Collection/displayedGamesContext'
import i18n from '@/i18n'
import { Header } from './Header'

const calls = vi.hoisted(() => ({ fetch: vi.fn(), open: vi.fn() }))
vi.mock('@/services/CollectionService/DiscoveryService', () => ({ getRandomGame: calls.fetch }))
vi.mock('@/components/Collection/collectionDetailsContext', () => ({ useCollectionDetails: () => ({ open: calls.open }) }))
vi.mock('@/components/elements/CreateGame/CreateGame', async () => ({ default: (await import('react')).forwardRef(() => null) }))
vi.mock('@/components/elements/GameDataActions/GameDataActions', () => ({ default: () => null }))

const auth = { user: { id: 1, username: 'Dice fixture', role: 'Standard' }, token: 'fixture', refreshToken: null, isAuthenticated: true, loading: false, error: null } as const
const scope: DisplayedGamesScope = { ownerId: 1, route: '/library?page=2', signature: 'page-2:51,52', gameIds: [51, 52], loading: false }
const register = () => () => undefined
const Surface = ({ value }: { value: DisplayedGamesScope | null }) => <DisplayedGamesContext.Provider value={{ scope: value, register }}><Header /></DisplayedGamesContext.Provider>
const render = (value: DisplayedGamesScope | null = scope) => renderWithProviders(<Surface value={value} />, { preloadedState: { auth }, route: '/library?page=2' })
const open = async () => { await userEvent.click(screen.getByRole('button', { name: 'Pick a random game' })); return within(screen.getByRole('dialog', { name: 'Pick a random game' })) }

describe('random scope modal uses only the loaded owner/route/page registry', () => {
	beforeEach(async () => { calls.fetch.mockReset(); calls.open.mockReset(); await i18n.changeLanguage('en') })
	it('passes exactly the displayed IDs rather than the whole filtered result set', async () => {
		calls.fetch.mockResolvedValue(createGame({ id: 52 })); render(); const dialog = await open(); await userEvent.click(dialog.getByRole('button', { name: /Games shown/ }))
		await waitFor(() => expect(calls.open).toHaveBeenCalledWith(expect.objectContaining({ id: 52 }))); expect(calls.fetch).toHaveBeenCalledExactlyOnceWith(expect.any(AbortSignal), [51, 52])
	})
	it.each([null, { ...scope, ownerId: 2 }, { ...scope, route: '/playlists/2' }, { ...scope, loading: true }, { ...scope, gameIds: [] }, { ...scope, gameIds: Array.from({ length: 1001 }, (_, index) => index + 1) }])('disables an unavailable/foreign/loading/empty/oversized scope without disabling the whole library', async value => {
		render(value); const dialog = await open(); expect(dialog.getByRole('button', { name: /Games shown/ })).toBeDisabled(); expect(dialog.getByRole('button', { name: /Entire library/ })).toBeEnabled(); expect(calls.fetch).not.toHaveBeenCalled()
	})
	it.each([{ ...scope, loading: true }, { ...scope, signature: 'page-2:new-dataset', gameIds: [53] }])('aborts a pending pick when the page begins reloading or its dataset changes', async next => {
		let resolve!: (game: ReturnType<typeof createGame>) => void; calls.fetch.mockReturnValue(new Promise(yes => { resolve = yes })); const view = render(), dialog = await open()
		await userEvent.click(dialog.getByRole('button', { name: /Games shown/ })); const signal = calls.fetch.mock.calls[0][0] as AbortSignal
		view.rerender(<Surface value={next} />); expect(signal.aborted).toBe(true); await act(async () => { resolve(createGame({ id: 51 })) }); expect(calls.open).not.toHaveBeenCalled(); expect(screen.getByRole('dialog', { name: 'Pick a random game' })).toBeInTheDocument()
	})
	it('cancels when the scope dialog closes and cannot open the abandoned result', async () => {
		let resolve!: (game: ReturnType<typeof createGame>) => void; calls.fetch.mockReturnValue(new Promise(yes => { resolve = yes })); render(); const dialog = await open(); await userEvent.click(dialog.getByRole('button', { name: /Entire library/ })); const signal = calls.fetch.mock.calls[0][0] as AbortSignal
		await userEvent.click(dialog.getByRole('button', { name: 'Close' })); expect(signal.aborted).toBe(true); await act(async () => { resolve(createGame({ id: 51 })) }); expect(calls.open).not.toHaveBeenCalled()
	})
})
