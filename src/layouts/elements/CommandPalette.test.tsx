import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { createGame } from '@/test/factories'
import i18n from '@/i18n'
import { CommandPalette } from './CommandPalette'

const mocks = vi.hoisted(() => ({ games: vi.fn(), lists: vi.fn(), groups: vi.fn(), views: vi.fn() }))
vi.mock('@/services/GamesService/GamesService', () => ({ getGames: mocks.games }))
vi.mock('@/services/PlaylistService/PlaylistService', () => ({ getPlaylists: mocks.lists }))
vi.mock('@/services/PlaylistService/PlaylistGroupService', () => ({ getPlaylistGroups: mocks.groups }))
vi.mock('@/services/GameViewService/GameViewService', () => ({ getGameViews: mocks.views }))
const game = createGame({ id: 501, name: 'Pokémon Test' })
const auth = { user: { id: 1, username: 'test', role: 'Admin' }, token: 'test', refreshToken: null, isAuthenticated: true, loading: false, error: null } as const

describe('Gallery global search', () => {
	beforeEach(async () => {
		vi.clearAllMocks(); await i18n.changeLanguage('en')
		Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { value: vi.fn(), configurable: true })
		mocks.games.mockResolvedValue({ data: [game], totalCount: 1, page: 1, pageSize: 8, totalPages: 1 })
		mocks.lists.mockResolvedValue([]); mocks.groups.mockResolvedValue([]); mocks.views.mockResolvedValue([])
	})
	it('closes on one Escape from an exclusion search input rather than only clearing the input', async () => {
		const close = vi.fn()
		renderWithProviders(<CommandPalette isOpen onClose={close} onOpenGame={vi.fn()} onCreateGame={vi.fn()} />, { preloadedState: { auth } })
		await userEvent.click(screen.getByText(i18n.t('gallery.search.advanced')))
		const excluded = screen.getByLabelText(i18n.t('gallery.search.excludedTerms'))
		await userEvent.type(excluded, 'Survive')
		fireEvent.keyDown(excluded, { key: 'Escape' })
		expect(close).toHaveBeenCalledOnce()
	})
	it('commits a typed phrase on Enter even if the pointer has highlighted a result', async () => {
		const open = vi.fn()
		renderWithProviders(<CommandPalette isOpen onClose={vi.fn()} onOpenGame={open} onCreateGame={vi.fn()} />, { preloadedState: { auth } })
		const input = screen.getByLabelText(i18n.t('gallery.search.globalLabel'))
		await userEvent.type(input, 'Pokémon')
		await waitFor(() => expect(mocks.games).toHaveBeenLastCalledWith(expect.objectContaining({ nameSearch: expect.objectContaining({ includeTerms: ['Pokémon'] }) }), expect.any(AbortSignal)))
		const result = await screen.findByRole('option', { name: /Pokémon Test/ })
		fireEvent.mouseMove(result)
		fireEvent.keyDown(input, { key: 'Enter' })
		expect(open).not.toHaveBeenCalled()
		expect(screen.getByRole('button', { name: i18n.t('gallery.search.removeTerm', { term: 'Pokémon' }) })).toBeInTheDocument()
	})
})
