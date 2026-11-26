import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { createGame } from '@/test/factories'
import type { Playlist } from '@/models/api/Playlist'
import i18n from '@/i18n'
import CollectionShelves from './CollectionShelves'

const mocks = vi.hoisted(() => ({ read: vi.fn(), open: vi.fn() }))
vi.mock('@/services/CollectionService/PlaylistCollectionService', () => ({ getManualPlaylistShelves: mocks.read }))
vi.mock('./collectionDetailsContext', async original => ({ ...await original<typeof import('./collectionDetailsContext')>(), useCollectionDetails: () => ({ open: mocks.open }) }))
vi.mock('./CollectionGameDetailsLazy', () => ({ CollectionGameDetails: () => null }))
const auth = { user: { id: 1, username: 'test', role: 'Admin' }, token: 'test', refreshToken: null, isAuthenticated: true, loading: false, error: null } as const
const game = createGame({ id: 25, name: 'Real game', platformName: 'Steam' })
const playlist: Playlist = { id: 7, name: 'Manual list', isAutomatic: false, gameCount: 1, sortOrder: 1, updatedAt: '', createdAt: '', items: [{ id: 1, gameId: 25, position: 0, game }] }

describe('manual playlist shelves', () => {
	beforeEach(async () => { mocks.read.mockReset(); mocks.open.mockReset(); await i18n.changeLanguage('en') })
	it('shows the real list, game and count without inventing an independent catalogue', async () => {
		mocks.read.mockResolvedValue([{ playlist, data: playlist, state: 'ready' }]); renderWithProviders(<CollectionShelves />, { preloadedState: { auth } })
		expect(await screen.findByRole('heading', { name: 'Manual list' })).toBeInTheDocument()
		expect(screen.getByRole('region', { name: 'Games in Manual list' })).toBeInTheDocument(); expect(screen.getByRole('link', { name: 'Open Manual list playlist' })).toHaveAttribute('href', '/playlists/7')
		await userEvent.click(screen.getByRole('button', { name: 'Real game' })); expect(mocks.open).toHaveBeenCalledWith(game)
	})
	it('retains an empty manual list with a path to add games', async () => {
		mocks.read.mockResolvedValue([{ playlist, data: { ...playlist, items: [] }, state: 'ready' }]); renderWithProviders(<CollectionShelves />, { preloadedState: { auth } })
		expect(await screen.findByRole('link', { name: 'Add games to this list' })).toHaveAttribute('href', '/playlists/7')
	})
	it('has an actionable empty state rather than creating lists or modifying Home on read', async () => {
		mocks.read.mockResolvedValue([]); renderWithProviders(<CollectionShelves />, { preloadedState: { auth } })
		expect(await screen.findByRole('heading', { name: 'Start your shelves with a playlist' })).toBeInTheDocument()
		expect(screen.getAllByRole('link', { name: 'View lists' }).every(link => link.getAttribute('href') === '/playlists')).toBe(true)
	})
	it('preserves healthy shelves during a per-list error and recovers on an explicit retry', async () => {
		mocks.read.mockResolvedValueOnce([{ playlist, data: null, state: 'error' }]).mockResolvedValueOnce([{ playlist, data: playlist, state: 'ready' }])
		renderWithProviders(<CollectionShelves />, { preloadedState: { auth } }); await screen.findByRole('alert')
		expect(screen.getByRole('heading', { name: 'Manual list' })).toBeInTheDocument(); await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
		await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument()); expect(screen.getByRole('button', { name: 'Real game' })).toBeInTheDocument()
	})
	it('keeps a full load failure visible and offers a retry instead of showing a fake empty collection', async () => {
		mocks.read.mockRejectedValue(new Error('offline')); renderWithProviders(<CollectionShelves />, { preloadedState: { auth } })
		expect(await screen.findByRole('alert')).toBeInTheDocument(); expect(screen.queryByRole('heading', { name: 'Start your shelves with a playlist' })).not.toBeInTheDocument()
	})
})
