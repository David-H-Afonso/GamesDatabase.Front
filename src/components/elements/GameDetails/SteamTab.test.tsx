import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { steamService, type SteamAchievementProgress } from '@/services'
import type { Game } from '@/models/api/Game'
import { SteamTab } from './SteamTab'

const game: Game = { id: 1, name: 'Game', statusId: 1, steamAppId: 620, playWithIds: [], playWithNames: [], favorite: false }
const progress: SteamAchievementProgress = {
	gameId: 1, source: 'sets', isCompleted: true, isFullyCompleted: false, completionPreserved: true,
	lastSynced: '2026-11-12T10:00:00Z', totalAchievements: 2, unlockedAchievements: 1, eligibleAchievementsTotal: 2, eligibleAchievementsUnlocked: 1,
	sets: [{ groupId: 0, displayName: 'Saved set', archived: false, isAchievable: true, isCompleted: true, totalAchievements: 2, unlockedAchievements: 1 }],
	achievements: [{ apiName: 'ONE', displayName: 'Saved achievement', achieved: true, hidden: false, groupId: 0 }],
}

beforeEach(() => {
	vi.spyOn(steamService, 'getDateSuggestions').mockResolvedValue([])
	vi.spyOn(steamService, 'getAchievementProgress').mockResolvedValue(progress)
	vi.spyOn(steamService, 'syncGame').mockResolvedValue({ success: true, achievementsSyncSucceeded: true })
})

afterEach(() => vi.restoreAllMocks())

describe('Steam tab synchronization', () => {
	it('treats a verified missing-player notice as information and does not auto-retry it on mount', async () => {
		vi.mocked(steamService.getAchievementProgress).mockResolvedValue({ ...progress, source: 'none', lastSynced: undefined, notice: 'noPlayerData', sets: [], achievements: [] })
		renderWithProviders(<SteamTab game={{ ...game, steamPlaytimeForever: 14351 }} />)
		await screen.findByText(/Steam no devuelve progreso verificable para este juego/)
		expect(screen.queryByRole('alert')).not.toBeInTheDocument()
		expect(steamService.syncGame).not.toHaveBeenCalled()
	})
	it('does not re-sync cached sets merely because the tab opens', async () => {
		renderWithProviders(<SteamTab game={game} />)
		await screen.findByText('Saved achievement')
		expect(steamService.syncGame).not.toHaveBeenCalled()
	})
	it('upgrades a cached legacy game to sets once and refreshes the game summary', async () => {
		vi.mocked(steamService.getAchievementProgress).mockResolvedValueOnce({ ...progress, source: 'legacy', lastSynced: undefined, sets: [] }).mockResolvedValue(progress)
		const { rerender } = renderWithProviders(<SteamTab game={game} />)
		await screen.findByText('Conjuntos completados: 1')
		expect(steamService.syncGame).toHaveBeenCalledExactlyOnceWith(1)
		rerender(<SteamTab game={{ ...game, name: 'Renamed' }} />)
		expect(steamService.syncGame).toHaveBeenCalledTimes(1)
	})
	it('does not repeatedly auto-sync confirmed empty games or private profiles', async () => {
		vi.mocked(steamService.getAchievementProgress).mockResolvedValue({ ...progress, source: 'none', lastSynced: undefined, lastError: 'profilePrivate', sets: [], achievements: [], totalAchievements: 0, unlockedAchievements: 0 })
		const { rerender } = renderWithProviders(<SteamTab game={game} />)
		await screen.findByRole('alert')
		expect(steamService.syncGame).not.toHaveBeenCalled()
		vi.mocked(steamService.getAchievementProgress).mockResolvedValue({ ...progress, gameId: 2, sets: [], achievements: [], totalAchievements: 0, unlockedAchievements: 0 })
		rerender(<SteamTab game={{ ...game, id: 2 }} />)
		await screen.findByText('Este juego no tiene logros disponibles.')
		expect(steamService.syncGame).not.toHaveBeenCalled()
	})
	it('reports a partial sync honestly while retaining cached achievements', async () => {
		const user = userEvent.setup()
		vi.mocked(steamService.syncGame).mockResolvedValue({ success: true, achievementsSyncSucceeded: false, warnings: ['profilePrivate'] })
		renderWithProviders(<SteamTab game={game} />)
		await screen.findByText('Saved achievement')
		await user.click(screen.getByRole('button', { name: 'Sincronizar' }))
		await screen.findByText(/Sincronización parcial/)
		expect(screen.getByText('Saved achievement')).toBeInTheDocument()
	})
	it('ignores a late response from the previously selected game', async () => {
		let finishOld: (value: SteamAchievementProgress) => void = () => undefined
		const old = new Promise<SteamAchievementProgress>(resolve => { finishOld = resolve })
		vi.mocked(steamService.getAchievementProgress).mockImplementation(id => id === 1 ? old : Promise.resolve({ ...progress, gameId: 2, achievements: [{ apiName: 'NEW', displayName: 'New game achievement', hidden: false, achieved: true, groupId: 0 }] }))
		const { rerender } = renderWithProviders(<SteamTab game={game} />)
		await waitFor(() => expect(steamService.getAchievementProgress).toHaveBeenCalledWith(1, expect.any(AbortSignal)))
		rerender(<SteamTab game={{ ...game, id: 2 }} />)
		await screen.findByText('New game achievement')
		await act(async () => { finishOld(progress); await old })
		expect(screen.getByText('New game achievement')).toBeInTheDocument()
		expect(screen.queryByText('Saved achievement')).not.toBeInTheDocument()
	})
})
