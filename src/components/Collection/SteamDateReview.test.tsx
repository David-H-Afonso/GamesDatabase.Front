import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { steamService, steamDateReviewTimeZone, type SteamDateSuggestion, type SteamApplyDateSuggestionsResult } from '@/services/SteamService/SteamService'
import i18n from '@/i18n'
import { invalidateCollection } from '@/services/CollectionService/collectionEvents'
import { SteamDateReview } from './SteamDateReview'

const stamp = '2026-11-26T17:00:00Z', later = '2026-11-26T17:01:00Z'
const alpha: SteamDateSuggestion = { gameId: 101, gameName: 'Alpha', steamAppId: 620, steamName: 'Alpha', reviewVersion: 2, reviewTimeZone: steamDateReviewTimeZone(), updatedAt: stamp, proposedStarted: '2026-01-04', proposedFinished: '2026-06-02', startedSource: 'firstAchievement', finishedSource: 'lastAchievement', isFinishedConflict: false, isFinishedSteamManaged: false, notes: ['noLastPlayed', 'lastAchievementFallback'] }
const beta: SteamDateSuggestion = { ...alpha, gameId: 102, gameName: 'Beta', steamName: 'Beta', currentStarted: '2025-01-01', proposedStarted: undefined, finishedSource: 'lastPlayed', notes: [] }
const auth = { user: { id: 1, username: 'Date fixture', role: 'Standard' }, token: 'fixture', refreshToken: null, isAuthenticated: true, loading: false, error: null } as const
let rows: SteamDateSuggestion[]
const renderReview = (gameId?: number, onApplied?: () => Promise<unknown>) => renderWithProviders(<SteamDateReview gameId={gameId} onApplied={onApplied} />, { preloadedState: { auth } })
const start = () => screen.getByRole('checkbox', { name: 'Use 2026-01-04 as start for Alpha' }), finish = () => screen.getByRole('checkbox', { name: 'Use 2026-06-02 as finish for Alpha' })
const apply = () => screen.getByRole('button', { name: 'Save selected dates' })

describe('shared explicit Steam date review', () => {
	beforeEach(async () => {
		await i18n.changeLanguage('en'); rows = structuredClone([alpha, beta])
		vi.spyOn(steamService, 'getDateSuggestions').mockImplementation(async options => structuredClone(rows.filter(row => !options?.gameId || row.gameId === options.gameId)))
		vi.spyOn(steamService, 'applyDateSuggestions').mockImplementation(async selections => ({ updated: selections.length, errors: [], skipped: [], applied: selections.map(row => ({ gameId: row.gameId, started: row.started, finished: row.finished, updatedAt: later })) }))
		vi.spyOn(steamService, 'dismissDateSuggestions').mockImplementation(async selections => { rows = rows.filter(row => !selections.some(selection => selection.gameId === row.gameId)); return { dismissed: selections.length } })
	})
	afterEach(() => vi.restoreAllMocks())
	it('loads both date references read-only and selects nothing automatically', async () => {
		renderReview(); await screen.findByText('Alpha', { selector: 'legend' }); expect(start()).not.toBeChecked(); expect(finish()).not.toBeChecked(); expect(apply()).toBeDisabled()
		expect(screen.getByText(/Steam activity is not a confirmed story-finish date/)).toBeInTheDocument(); expect(screen.getByText(/Steam may omit last played/)).toBeInTheDocument()
		expect(steamService.getDateSuggestions).toHaveBeenCalledWith({ gameId: undefined, includeStarted: true, timeZone: steamDateReviewTimeZone(), signal: expect.any(AbortSignal) }); expect(steamService.applyDateSuggestions).not.toHaveBeenCalled(); expect(steamService.dismissDateSuggestions).not.toHaveBeenCalled()
	})
	it('saves only the checked start with its reviewed timestamp and leaves the finish available', async () => {
		renderReview(101); await screen.findByText('Alpha', { selector: 'legend' }); await userEvent.click(start()); await userEvent.click(apply())
		expect(steamService.applyDateSuggestions).toHaveBeenCalledExactlyOnceWith([{ gameId: 101, started: '2026-01-04', expectedUpdatedAt: stamp }], expect.any(AbortSignal), steamDateReviewTimeZone())
		expect(await screen.findByText('Reviewed dates saved for 1 game.')).toBeInTheDocument(); expect(screen.queryByRole('checkbox', { name: /as start for Alpha/ })).not.toBeInTheDocument(); expect(finish()).not.toBeChecked()
	})
	it('renders a start-only response instead of silently discarding it', async () => {
		rows = [{ ...alpha, proposedFinished: undefined }]; renderReview(101); expect(await screen.findByRole('checkbox', { name: /as start for Alpha/ })).toBeVisible(); expect(screen.getByText('No reliable reference is available.')).toBeInTheDocument()
	})
	it('keeps stale or failed reviews visible, blocks blind resubmission and reloads only on request', async () => {
		vi.mocked(steamService.applyDateSuggestions).mockResolvedValueOnce({ updated: 0, applied: [], skipped: [{ gameId: 101, reason: 'changed' }], errors: ['changed:101'] })
		renderReview(101); await screen.findByText('Alpha', { selector: 'legend' }); await userEvent.click(start()); await userEvent.click(apply()); await screen.findByText(/Some selected games changed/)
		expect(start()).toBeDisabled(); expect(apply()).toBeDisabled(); expect(steamService.applyDateSuggestions).toHaveBeenCalledOnce(); await userEvent.click(screen.getByRole('button', { name: 'Reload references' })); await waitFor(() => expect(start()).toBeEnabled())
		vi.mocked(steamService.applyDateSuggestions).mockRejectedValueOnce(new Error('PRIVATE_FIXTURE_SECRET_URL')); await userEvent.click(start()); await userEvent.click(apply()); await screen.findByText('The changes could not be confirmed. Reload before trying again.')
		expect(start()).toBeChecked(); expect(screen.queryByText(/PRIVATE_FIXTURE/)).not.toBeInTheDocument(); expect(steamService.applyDateSuggestions).toHaveBeenCalledTimes(2)
	})
	it('does not save selected references hidden by the current search', async () => {
		renderReview(); await screen.findByText('Alpha', { selector: 'legend' }); await userEvent.click(start()); await userEvent.type(screen.getByRole('searchbox'), 'Beta'); expect(apply()).toBeDisabled()
		await userEvent.click(screen.getByRole('checkbox', { name: 'Select visible references' })); await userEvent.click(apply()); expect(steamService.applyDateSuggestions).toHaveBeenCalledExactlyOnceWith([{ gameId: 102, finished: '2026-06-02', expectedUpdatedAt: stamp }], expect.any(AbortSignal), steamDateReviewTimeZone())
	})
	it('ignores selected references explicitly and refreshes the owned read without applying dates', async () => {
		renderReview(101); await screen.findByText('Alpha', { selector: 'legend' }); await userEvent.click(start()); await userEvent.click(screen.getByRole('button', { name: 'Ignore selected references' }))
		expect(await screen.findByText('The selected references have been ignored.')).toBeInTheDocument(); expect(steamService.dismissDateSuggestions).toHaveBeenCalledExactlyOnceWith([{ gameId: 101, started: '2026-01-04', expectedUpdatedAt: stamp }], expect.any(AbortSignal), steamDateReviewTimeZone()); expect(steamService.applyDateSuggestions).not.toHaveBeenCalled(); await waitFor(() => expect(steamService.getDateSuggestions).toHaveBeenCalledTimes(2))
	})
	it('never calls the old unsafe save contract when the API lacks review capability', async () => {
		rows = [{ ...alpha, reviewVersion: undefined, updatedAt: undefined }]; renderReview(101); expect(await screen.findByRole('alert')).toHaveTextContent('Update the API'); expect(start()).toBeDisabled(); expect(apply()).toBeDisabled()
	})
	it('aborts a pending write on account change and ignores its late receipt', async () => {
		let resolve!: (value: SteamApplyDateSuggestionsResult) => void; vi.mocked(steamService.applyDateSuggestions).mockReturnValueOnce(new Promise(yes => { resolve = yes })); const { store } = renderReview(101)
		await screen.findByText('Alpha', { selector: 'legend' }); await userEvent.click(start()); fireEvent.click(apply()); fireEvent.click(apply()); expect(steamService.applyDateSuggestions).toHaveBeenCalledOnce(); const signal = vi.mocked(steamService.applyDateSuggestions).mock.calls[0][1]!
		rows = []; act(() => store.dispatch({ type: 'auth/login/fulfilled', payload: { userId: 2, username: 'Other fixture', role: 'Standard', token: 'other-fixture', refreshToken: null } })); expect(signal.aborted).toBe(true)
		await act(async () => { resolve({ updated: 1, errors: [], skipped: [], applied: [{ gameId: 101, started: '2026-01-04', updatedAt: later }] }) }); expect(screen.queryByText('Reviewed dates saved for 1 game.')).not.toBeInTheDocument(); expect(screen.queryByText('Alpha', { selector: 'legend' })).not.toBeInTheDocument()
	})
	it('reports confirmed saves separately from a subsequent detail-refresh failure', async () => {
		const refresh = vi.fn().mockRejectedValue(new Error('Private fixture reload failure')); renderReview(101, refresh); await screen.findByText('Alpha', { selector: 'legend' }); await userEvent.click(start()); await userEvent.click(apply())
		expect(await screen.findByText(/Dates were saved, but the game could not be refreshed/)).toBeInTheDocument(); expect(steamService.applyDateSuggestions).toHaveBeenCalledOnce(); expect(refresh).toHaveBeenCalledOnce()
	})
	it('does not silently move a checked choice onto a refreshed candidate or timestamp', async () => {
		renderReview(101); await screen.findByText('Alpha', { selector: 'legend' }); await userEvent.click(start()); expect(start()).toBeChecked()
		rows = [{ ...alpha, proposedStarted: '2026-01-05', updatedAt: later }]; act(invalidateCollection)
		const changed = await screen.findByRole('checkbox', { name: 'Use 2026-01-05 as start for Alpha' }); expect(changed).not.toBeChecked(); expect(apply()).toBeDisabled(); expect(screen.getByText(/Some references changed during your review/)).toBeInTheDocument(); expect(steamService.applyDateSuggestions).not.toHaveBeenCalled()
	})
})
