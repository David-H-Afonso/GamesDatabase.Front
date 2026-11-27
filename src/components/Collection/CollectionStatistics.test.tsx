import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { createGame } from '@/test/factories'
import type { CollectionStatistics as Statistics } from '@/models/api/Collection'
import i18n from '@/i18n'
import CollectionStatistics from './CollectionStatistics'

const mocks = vi.hoisted(() => ({ statistics: vi.fn(), games: vi.fn(), goty: vi.fn(), saveGoty: vi.fn(), game: vi.fn(), update: vi.fn() }))
vi.mock('@/services/CollectionService/CollectionService', () => ({ getCollectionStatistics: mocks.statistics, getCollectionGames: mocks.games, getGotySelections: mocks.goty, saveGotySelection: mocks.saveGoty }))
vi.mock('@/services/GamesService/GamesService', () => ({ getGameById: mocks.game, updateGame: mocks.update }))
vi.mock('./CollectionGameDetailsLazy', () => ({ CollectionGameDetails: ({ game, closeDetails }: { game: { name: string }; closeDetails: () => void }) => <div role='dialog' aria-label={game.name}><button onClick={closeDetails}>Close detail fixture</button></div> }))
const auth = { user: { id: 1, username: 'Statistics fixture', role: 'Standard' }, token: 'fixture', refreshToken: null, isAuthenticated: true, loading: false, error: null } as const
const first = createGame({ id: 51, name: 'Fixture game', developer: 'Recorded studio', manualPlaytimeMinutes: 0, steamPlaytimeForever: 600, steamAchievementsUnlocked: 9, steamAchievementsTotal: 10 })
const second = createGame({ id: 52, name: 'Another fixture', manualPlaytimeMinutes: null, steamPlaytimeForever: 120, developer: null })
const record = { id: 'game-51', source: 'game' as const, recordId: 51, game: first, date: '2026-01-04', grade: 88, type: 'Game' }
const paged = { data: [first, second], page: 1, pageSize: 28, totalCount: 2, totalPages: 1 }
const fixture = (): Statistics => ({
	version: 1, year: 2026, dateKind: 'finished', timeBasis: 'accumulated-only', dateBasis: 'stored-records-not-sessions', years: [2025, 2026],
	totals: { totalGames: 2, effectiveMinutes: 120, steamMinutes: 720, manualMinutes: 0, timedGames: 2, missingTimeGames: 0, completedGames: 1, fullyCompletedGames: 0, closureGames: 1, missingFinishGames: 0, missingStoryGames: 2, achievementsUnlocked: 9, achievementsTotal: 10, achievementGames: 1, unknownAchievementDates: 1 },
	byStatus: [{ statusId: 1, name: 'Fixture backlog', color: '#647b91', count: 2 }],
	months: Array.from({ length: 12 }, (_, index) => ({ month: index + 1, records: index ? 0 : 1, games: index ? 0 : 1, mainRecords: index ? 0 : 1, replayRecords: 0, unlocks: index ? 0 : 8, artworkGame: index ? null : first })),
	records: [record], ranking: [record], distinctGames: 1, mainRecords: 1, replayRecords: 0, ratedGames: 1, average: 88, datedUnlocks: 8,
	unlocksByGame: [{ game: first, count: 8 }], progressBins: [{ minimum: 90, label: '90–99%', count: 1 }], nearComplete: [first], topPlaytime: [second, first], developers: [{ name: 'Recorded studio', count: 1, ratedCount: 1, average: 88, games: [first] }],
})
const renderStatistics = async (tab = 'overview') => {
	const view = renderWithProviders(<CollectionStatistics />, { preloadedState: { auth }, route: `/statistics?tab=${tab}&year=2026` })
	await waitFor(() => expect(view.container.querySelector('.gdb-statistics-page')).toHaveAttribute('aria-busy', 'false'))
	return view
}

describe('statistics use stored records and explicit personal choices', () => {
	beforeEach(async () => {
		vi.clearAllMocks(); await i18n.changeLanguage('en')
		mocks.statistics.mockImplementation(async options => ({ ...fixture(), ...options })); mocks.games.mockResolvedValue(paged)
		mocks.goty.mockResolvedValue({ revision: 7, selections: {} }); mocks.saveGoty.mockImplementation(async (year, id, revision) => ({ revision: revision + 1, selections: id ? { [year]: id } : {} }))
		mocks.game.mockResolvedValue(first); mocks.update.mockResolvedValue(first)
	})
	it.each(['overview', 'year', 'achievements', 'completion', 'time', 'ranking', 'developers'])('renders the %s surface from the collection contract without a data write', async tab => {
		await renderStatistics(tab)
		expect(within(screen.getByRole('navigation', { name: 'Statistics' })).getByRole('button', { name: i18n.t(`gallery.statistics.${tab}`) })).toHaveAttribute('aria-current', 'page')
		expect(mocks.statistics).toHaveBeenCalledWith(expect.objectContaining({ year: 2026, dateKind: 'finished', allRanking: false }), expect.any(AbortSignal))
		expect(mocks.saveGoty).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled()
	})
	it('explores a stored month and start dates without distributing accumulated hours into months', async () => {
		await renderStatistics(); const user = userEvent.setup()
		await user.click(within(screen.getByRole('group', { name: i18n.t('gallery.statistics.monthChart') })).getByRole('button', { name: /^January:/ }))
		await waitFor(() => expect(mocks.statistics).toHaveBeenCalledWith(expect.objectContaining({ month: 1, dateKind: 'finished' }), expect.any(AbortSignal)))
		await user.click(screen.getByRole('radio', { name: i18n.t('gallery.statCopy.started') }))
		await waitFor(() => expect(mocks.statistics).toHaveBeenCalledWith(expect.objectContaining({ month: 1, dateKind: 'started' }), expect.any(AbortSignal)))
		expect(screen.getByText(i18n.t('gallery.statCopy.datesNotHours'))).toBeInTheDocument(); expect(mocks.update).not.toHaveBeenCalled()
	})
	it('uses Steam for a legacy manual zero and keeps the monthly-data limitation explicit', async () => {
		const { container } = await renderStatistics('time')
		const zero = within(container.querySelector('.gdb-playtime-ranking')!).getByRole('button', { name: /Fixture game/ })
		expect(zero).toHaveTextContent('Steam'); expect(zero).toHaveTextContent('10 h'); expect(zero).not.toHaveTextContent('Manual time')
		expect(screen.getByText(i18n.t('gallery.statistics.monthlyTimeHelp'))).toBeInTheDocument()
	})
	it('lets Overview choose start dates and retains that basis when opening a month', async () => {
		await renderStatistics(); const user = userEvent.setup(); await user.click(screen.getByRole('radio', { name: i18n.t('gallery.statCopy.started') }))
		await waitFor(() => expect(mocks.statistics).toHaveBeenCalledWith(expect.objectContaining({ dateKind: 'started' }), expect.any(AbortSignal))); expect(screen.getByText(i18n.t('gallery.statistics.startedBasisHelp'))).toBeInTheDocument()
		await user.click(within(screen.getByRole('group', { name: i18n.t('gallery.statistics.monthChart') })).getByRole('button', { name: /^January:/ }))
		await waitFor(() => expect(mocks.statistics).toHaveBeenCalledWith(expect.objectContaining({ dateKind: 'started', month: 1 }), expect.any(AbortSignal))); expect(screen.getByRole('radio', { name: i18n.t('gallery.statCopy.started') })).toBeChecked(); expect(mocks.update).not.toHaveBeenCalled()
	})
	it('loads the selected completion criterion and its next page rather than changing game completion', async () => {
		mocks.games.mockResolvedValue({ ...paged, totalPages: 2, totalCount: 25 }); await renderStatistics('completion'); const user = userEvent.setup()
		await user.click(within(screen.getByRole('group', { name: i18n.t('gallery.statistics.completion') })).getByRole('button', { name: /Current 100%/ }))
		await waitFor(() => expect(mocks.games).toHaveBeenCalledWith({ metric: 'strict', page: 1, pageSize: 24 }, expect.any(AbortSignal)))
		await user.click(screen.getByRole('button', { name: 'Next' })); await waitFor(() => expect(mocks.games).toHaveBeenCalledWith({ metric: 'strict', page: 2, pageSize: 24 }, expect.any(AbortSignal)))
		expect(mocks.update).not.toHaveBeenCalled()
	})
	it('saves and removes GOTY only after a real eligible game is explicitly chosen', async () => {
		await renderStatistics(); const user = userEvent.setup(); expect(mocks.saveGoty).not.toHaveBeenCalled()
		await user.click(screen.getByRole('button', { name: 'Choose my GOTY' })); const picker = within(await screen.findByRole('dialog', { name: 'Your GOTY 2026' }))
		await user.click(await picker.findByText('Fixture game', { selector: 'strong' }))
		await waitFor(() => expect(mocks.saveGoty).toHaveBeenCalledExactlyOnceWith(2026, 51, 7)); await screen.findByRole('button', { name: 'Remove choice' })
		await user.click(screen.getByRole('button', { name: 'Remove choice' })); await waitFor(() => expect(mocks.saveGoty).toHaveBeenLastCalledWith(2026, null, 8))
		expect(mocks.update).not.toHaveBeenCalled()
	})
	it('keeps a conflicting GOTY review visible and reloads rather than forcing an overwrite', async () => {
		mocks.saveGoty.mockRejectedValue(Object.assign(new Error('Fixture conflict'), { status: 409 })); await renderStatistics(); const user = userEvent.setup()
		await user.click(screen.getByRole('button', { name: 'Choose my GOTY' })); const picker = within(await screen.findByRole('dialog', { name: 'Your GOTY 2026' }))
		await user.click(await picker.findByText('Fixture game', { selector: 'strong' })); await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThan(0))
		expect(screen.getByRole('dialog', { name: 'Your GOTY 2026' })).toBeInTheDocument()
		await user.click(screen.getAllByRole('button', { name: i18n.t('gallery.common.reload') })[0]); await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Your GOTY 2026' })).not.toBeInTheDocument())
		expect(mocks.saveGoty).toHaveBeenCalledOnce()
	})
	it('assigns only the explicit developer field and retains the editor after a failed save', async () => {
		await renderStatistics('developers'); const user = userEvent.setup()
		await user.click(screen.getByRole('button', { name: 'Assign a studio' })); let dialog = within(await screen.findByRole('dialog', { name: 'Assign a studio' }))
		await user.click(await dialog.findByText('Another fixture', { selector: 'strong' })); dialog = within(screen.getByRole('dialog', { name: 'Assign a studio' }))
		await user.type(dialog.getByLabelText('Developer / studio'), '  User-provided studio  '); mocks.update.mockRejectedValueOnce(new Error('Fixture offline'))
		await user.click(dialog.getByRole('button', { name: i18n.t('gallery.common.save') })); await waitFor(() => expect(mocks.update).toHaveBeenCalledWith(52, { developer: 'User-provided studio' }))
		expect(screen.getByRole('dialog', { name: 'Assign a studio' })).toBeInTheDocument()
		await user.clear(dialog.getByLabelText('Developer / studio')); await user.click(dialog.getByRole('button', { name: i18n.t('gallery.common.save') }))
		await waitFor(() => expect(mocks.update).toHaveBeenLastCalledWith(52, { developer: null })); await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
	})
	it('opens a game from the stored metric results without changing its dates or time', async () => {
		await renderStatistics('achievements'); const user = userEvent.setup()
		await user.click(screen.getByRole('button', { name: /90–99%/ })); const picker = within(await screen.findByRole('dialog', { name: /90–99%/ }))
		await user.click(await picker.findByText('Fixture game', { selector: 'strong' })); expect(screen.getByRole('dialog', { name: 'Fixture game' })).toBeInTheDocument()
		await user.click(screen.getByRole('button', { name: 'Close detail fixture' })); expect(mocks.update).not.toHaveBeenCalled()
	})
	it('does not invent developers or dated records for an empty result', async () => {
		mocks.statistics.mockResolvedValue({ ...fixture(), developers: [], records: [], ranking: [], unlocksByGame: [], average: null }); await renderStatistics('developers')
		expect(screen.getByText('Add your first studio')).toBeInTheDocument(); expect(mocks.update).not.toHaveBeenCalled()
		await userEvent.click(within(screen.getByRole('navigation', { name: 'Statistics' })).getByRole('button', { name: i18n.t('gallery.statistics.year') }))
		expect(await screen.findByText('No stored dates in this period')).toBeInTheDocument()
	})
	it('does not expose an unnamed empty status graphic or a dead View all disclosure', async () => {
		mocks.statistics.mockResolvedValue({ ...fixture(), byStatus: [] })
		const { container } = await renderStatistics()
		expect(container.querySelector('.gdb-status-distribution[role="img"]')).not.toBeInTheDocument()
		expect(container.querySelector('.gdb-status-legend details')).not.toBeInTheDocument()
	})
	it('exposes failed and loading reads, and retries only through the visible control', async () => {
		mocks.statistics.mockRejectedValueOnce(new Error('Fixture offline')); const view = renderWithProviders(<CollectionStatistics />, { preloadedState: { auth } })
		await userEvent.click(await screen.findByRole('button', { name: i18n.t('gallery.common.retry') })); await waitFor(() => expect(view.container.querySelector('.gdb-overview-metrics')).toBeInTheDocument())
		view.unmount(); let resolve!: (value: Statistics) => void; const pending = new Promise<Statistics>(yes => { resolve = yes }); mocks.statistics.mockReturnValueOnce(pending)
		renderWithProviders(<CollectionStatistics />, { preloadedState: { auth } }); expect(screen.getByRole('status')).toBeInTheDocument()
		await act(async () => { resolve(fixture()); await pending }); expect(screen.queryByRole('status')).not.toBeInTheDocument()
	})
	it('keeps ranking scope independent from monthly dates and expands stored entries on demand', async () => {
		const ranking = Array.from({ length: 18 }, (_, index) => ({ ...record, id: `game-${index + 1}`, recordId: index + 1, game: createGame({ id: index + 1, name: `Ranking fixture ${index + 1}` }) }))
		mocks.statistics.mockResolvedValue({ ...fixture(), ranking }); await renderStatistics('ranking'); const user = userEvent.setup()
		await user.selectOptions(screen.getByLabelText('Scope'), 'all'); await waitFor(() => expect(mocks.statistics).toHaveBeenCalledWith(expect.objectContaining({ allRanking: true }), expect.any(AbortSignal)))
		expect(screen.queryByRole('group', { name: 'Dates from' })).not.toBeInTheDocument(); await user.click(screen.getByRole('button', { name: i18n.t('gallery.labels.loadMore') }))
		expect(screen.getByText('Ranking fixture 18', { selector: 'strong' })).toBeInTheDocument(); expect(mocks.saveGoty).not.toHaveBeenCalled()
		fireEvent.change(screen.getByRole('combobox', { name: 'Scope' }), { target: { value: 'period' } }); expect(await screen.findByRole('group', { name: 'Dates from' })).toBeInTheDocument()
	})
})
