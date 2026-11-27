import { customFetch } from '@/utils/customFetch/customFetch'
import { steamService, isSteamReferenceDate, steamDateReviewTimeZone, type SteamDateSelection } from './SteamService'

vi.mock('@/utils/customFetch/customFetch', () => ({ customFetch: vi.fn() }))
const fetch = vi.mocked(customFetch)
const selection: SteamDateSelection[] = [{ gameId: 1, started: '2026-01-04', expectedUpdatedAt: '2026-11-26T17:00:00Z' }]
const receipt = () => ({ updated: 1, errors: [], skipped: [], applied: [{ gameId: 1, started: '2026-01-04', updatedAt: '2026-11-26T17:01:00Z' }] })
describe('Steam date reference wire validation', () => {
	beforeEach(() => { vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-26T18:00:00Z')) })
	afterEach(() => vi.useRealTimers())
	it.each(['1970-01-01', '2000-01-01', '2099-01-01', '2026-02-30', 'not-a-date', '2026-1-4'])('rejects invalid/sentinel/future reference %s', date => expect(isSteamReferenceDate(date)).toBe(false))
	it('uses the review timezone rather than the server UTC day at a new-year boundary', () => {
		vi.setSystemTime(new Date('2026-12-31T12:30:00Z')); expect(isSteamReferenceDate('2027-01-01', 'Pacific/Kiritimati')).toBe(true); expect(isSteamReferenceDate('2027-01-01', 'UTC')).toBe(false); expect(isSteamReferenceDate('2026-12-31', 'America/Los_Angeles')).toBe(true)
	})
	it('keeps a valid UTC calendar date and sends the explicit review capability', async () => {
		expect(isSteamReferenceDate('2026-01-04')).toBe(true); fetch.mockResolvedValue([]); const controller = new AbortController(); await steamService.getDateSuggestions({ gameId: 1, includeStarted: true, signal: controller.signal })
		expect(fetch).toHaveBeenCalledWith(expect.stringContaining('date-suggestions'), { params: { gameId: 1, includeStarted: true, reviewVersion: 2, timeZone: steamDateReviewTimeZone() }, signal: controller.signal })
	})
	it('rejects foreign/malformed returned references before rendering them', async () => {
		fetch.mockResolvedValue([{ gameId: 2, gameName: 'Foreign', steamName: 'Foreign', proposedStarted: '2026-01-04', notes: [] }]); await expect(steamService.getDateSuggestions({ gameId: 1 })).rejects.toThrow('Invalid date review response')
		fetch.mockResolvedValue([{ gameId: 1, gameName: 'Fixture', steamName: 'Fixture', proposedStarted: '1970-01-01', notes: [] }]); await expect(steamService.getDateSuggestions()).rejects.toThrow('Invalid date review response')
	})
	it('sends only reviewed fields with cancellation and accepts exact save receipts', async () => {
		fetch.mockResolvedValue(receipt()); const controller = new AbortController(); expect((await steamService.applyDateSuggestions(selection, controller.signal)).updated).toBe(1)
		expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/apply'), { method: 'POST', body: { suggestions: selection, timeZone: steamDateReviewTimeZone() }, signal: controller.signal })
	})
	it.each([{ updated: 1, errors: [] }, { ...receipt(), applied: [] }, { ...receipt(), applied: [{ ...receipt().applied[0], gameId: 2 }] }, { ...receipt(), applied: [{ ...receipt().applied[0], started: '2026-01-05' }] }, { ...receipt(), skipped: [{ gameId: 1, reason: 'changed' }] }])('rejects a missing, contradictory or foreign save receipt %#', async answer => {
		fetch.mockResolvedValue(answer); await expect(steamService.applyDateSuggestions(selection)).rejects.toThrow('Invalid date save receipt')
	})
	it('rejects incomplete or duplicate review selections before sending writes', async () => {
		await expect(steamService.applyDateSuggestions([{ ...selection[0], expectedUpdatedAt: '' }])).rejects.toThrow('Invalid date review selection'); await expect(steamService.applyDateSuggestions([...selection, ...selection])).rejects.toThrow('Invalid date review selection'); expect(fetch).not.toHaveBeenCalled()
	})
})
