import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { createGame } from '@/test/factories'
import type { Playlist } from '@/models/api/Playlist'
import i18n from '@/i18n'
import { CollectionFocusAction } from './CollectionFocusAction'

const mocks = vi.hoisted(() => ({ focus: vi.fn(), add: vi.fn(), remove: vi.fn(), reorder: vi.fn(), create: vi.fn(), get: vi.fn(), sync: vi.fn() }))
vi.mock('@/services/CollectionService/PlaylistCollectionService', async original => ({ ...await original<typeof import('@/services/CollectionService/PlaylistCollectionService')>(), getCollectionFocus: mocks.focus }))
vi.mock('@/services/PlaylistService/PlaylistService', () => ({ getPlaylists: vi.fn(), getPlaylistById: mocks.get, addPlaylistItem: mocks.add, createPlaylist: mocks.create, removePlaylistItem: mocks.remove, reorderPlaylistItems: mocks.reorder }))
vi.mock('@/services/SteamService/SteamService', () => ({ steamService: { syncGame: mocks.sync } }))
vi.mock('./CollectionGamePicker', () => ({ CollectionGamePicker: ({ open, onClose, onChoose, disabledGameIds, busy }: { open: boolean; onClose: () => void; onChoose: (game: ReturnType<typeof createGame>) => void; disabledGameIds: number[]; busy: boolean }) => open ? <div role='dialog' aria-label='Library picker'><button type='button' onClick={onClose}>Cancel picker</button><button type='button' disabled={busy || disabledGameIds.includes(99)} onClick={() => onChoose(createGame({ id: 99, name: 'Another game' }))}>Another game</button></div> : null }))

const game = createGame({ id: 501, name: 'Current game', steamAppId: 100 })
const auth = { user: { id: 1, username: 'test', role: 'Admin' }, token: 'test', refreshToken: null, isAuthenticated: true, loading: false, error: null } as const
const list = (ids: number[], maxLength: number | null = 4): Playlist => ({ id: 7, name: 'Focus', isAutomatic: false, sortOrder: 0, gameCount: ids.length, maxLength, updatedAt: '', createdAt: '', items: ids.map((id, index) => ({ id: 900 + id, gameId: id, position: index, game: id === game.id ? game : createGame({ id, name: `Game ${id}` }) })) })
const renderAction = (focus: Playlist | null) => { mocks.focus.mockResolvedValue(focus); return renderWithProviders(<CollectionFocusAction game={game} />, { preloadedState: { auth } }) }
const manager = () => within(screen.getByRole('dialog', { name: 'Your Focus' }))

describe('Focus from a game detail — explicit real-list operations', () => {
	beforeEach(async () => { vi.clearAllMocks(); localStorage.clear(); await i18n.changeLanguage('en') })
	it('opens a detail without creating a playlist, adding a game or syncing Steam', async () => {
		renderAction(list([1])); await waitFor(() => expect(screen.getByRole('button', { name: 'Add to Focus' })).toBeEnabled())
		expect(mocks.add).not.toHaveBeenCalled(); expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.sync).not.toHaveBeenCalled()
	})
	it('adds only this game on an explicit click and then offers management', async () => {
		mocks.add.mockResolvedValue(list([1, 501])); renderAction(list([1]))
		await waitFor(() => expect(screen.getByRole('button', { name: 'Add to Focus' })).toBeEnabled())
		await userEvent.click(screen.getByRole('button', { name: 'Add to Focus' }))
		await waitFor(() => expect(mocks.add).toHaveBeenCalledExactlyOnceWith(7, 501))
		expect(screen.getByRole('button', { name: 'Manage this game in Focus' })).toBeInTheDocument(); expect(mocks.sync).not.toHaveBeenCalled()
	})
	it('opens management for a game already present instead of adding it again', async () => {
		renderAction(list([501, 1])); const trigger = await screen.findByRole('button', { name: 'Manage this game in Focus' }); await userEvent.click(trigger)
		expect(manager().getByText('Current game', { selector: 'strong' })).toBeInTheDocument(); expect(mocks.add).not.toHaveBeenCalled()
		await userEvent.click(manager().getByRole('button', { name: 'Done' })); expect(trigger).toHaveFocus()
	})
	it('does not exceed a full Focus, including a user-selected list with a smaller capacity', async () => {
		renderAction(list([1], 1)); await waitFor(() => expect(screen.getByRole('button', { name: 'Add to Focus' })).toBeEnabled())
		await userEvent.click(screen.getByRole('button', { name: 'Add to Focus' }))
		expect(manager().getByRole('button', { name: 'Add Current game to Focus' })).toBeDisabled()
		expect(manager().getByText(/All slots are occupied/)).toBeInTheDocument(); expect(mocks.add).not.toHaveBeenCalled()
	})
	it('removes an item only through its explicit control and keeps the game in the library', async () => {
		mocks.remove.mockResolvedValue(list([1])); renderAction(list([501, 1])); await userEvent.click(await screen.findByRole('button', { name: 'Manage this game in Focus' }))
		await userEvent.click(manager().getByRole('button', { name: /Remove Current game/ }))
		await waitFor(() => expect(mocks.remove).toHaveBeenCalledExactlyOnceWith(7, 1401)); expect(mocks.sync).not.toHaveBeenCalled()
		expect(screen.getByRole('button', { name: 'Add to Focus' })).toBeInTheDocument()
	})
	it('reorders item IDs and reloads the canonical playlist rather than changing the spotlight', async () => {
		mocks.reorder.mockResolvedValue(undefined); mocks.get.mockResolvedValue(list([1, 501])); renderAction(list([501, 1]))
		await userEvent.click(await screen.findByRole('button', { name: 'Manage this game in Focus' }))
		await userEvent.click(manager().getByRole('button', { name: 'Move Game 1 up' }))
		await waitFor(() => expect(mocks.reorder).toHaveBeenCalledExactlyOnceWith(7, [901, 1401])); expect(mocks.get).toHaveBeenCalledWith(7)
	})
	it('has no automatic setup and retains an explicitly created list if adding fails', async () => {
		mocks.create.mockResolvedValue(list([])); mocks.add.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(list([501]))
		renderAction(null); await waitFor(() => expect(screen.getByRole('button', { name: 'Add to Focus' })).toBeEnabled())
		await userEvent.click(screen.getByRole('button', { name: 'Add to Focus' })); expect(mocks.create).not.toHaveBeenCalled()
		await userEvent.click(manager().getByRole('button', { name: 'Create Focus and add Current game' })); await screen.findByRole('alert')
		expect(mocks.create).toHaveBeenCalledOnce(); expect(manager().getByRole('button', { name: 'Add Current game to Focus' })).toBeEnabled()
		await userEvent.click(manager().getByRole('button', { name: 'Add Current game to Focus' })); await waitFor(() => expect(mocks.add).toHaveBeenCalledTimes(2)); expect(mocks.create).toHaveBeenCalledOnce()
	})
	it('preserves the list and exposes a retryable error when an add fails', async () => {
		mocks.add.mockRejectedValue(new Error('offline')); renderAction(list([1])); await waitFor(() => expect(screen.getByRole('button', { name: 'Add to Focus' })).toBeEnabled())
		await userEvent.click(screen.getByRole('button', { name: 'Add to Focus' })); expect(await screen.findByRole('alert')).toBeInTheDocument()
		expect(manager().getByText('Game 1', { selector: 'strong' })).toBeInTheDocument(); expect(mocks.create).not.toHaveBeenCalled()
	})
	it('guards duplicate same-tick clicks while adding and never starts a Steam sync', async () => {
		let resolve!: (value: Playlist) => void; mocks.add.mockReturnValue(new Promise<Playlist>(done => { resolve = done }))
		renderAction(list([])); const trigger = screen.getByRole('button', { name: 'Add to Focus' }); await waitFor(() => expect(trigger).toBeEnabled())
		fireEvent.click(trigger); fireEvent.click(trigger); expect(mocks.add).toHaveBeenCalledOnce()
		await act(async () => resolve(list([501]))); expect(mocks.sync).not.toHaveBeenCalled()
	})
})
