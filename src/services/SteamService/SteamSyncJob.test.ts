import { customFetch } from '@/utils/customFetch/customFetch'
import { steamService, type SteamSyncJob } from './SteamService'

vi.mock('@/utils/customFetch/customFetch', () => ({ customFetch: vi.fn() }))
const job: SteamSyncJob = { id: '00000000-0000-4000-8000-000000000001', state: 'queued', createdAt: '2026-11-12T12:00:00Z', totalGames: 0, processedGames: 0, gamesUpdated: 0, achievementsUpdated: 0, failedGames: 0, warningCount: 0 }
afterEach(() => vi.clearAllMocks())

describe('Steam sync job contract', () => {
	it('starts via the short job endpoint, not the legacy long-running route', async () => {
		vi.mocked(customFetch).mockResolvedValue(job)
		const signal = new AbortController().signal
		expect(await steamService.startSyncJob(signal)).toEqual(job)
		expect(customFetch).toHaveBeenCalledWith('/steam/sync/jobs', { method: 'POST', signal, timeout: 15000 })
	})
	it('accepts an idle current-job envelope without starting work', async () => {
		vi.mocked(customFetch).mockResolvedValue({})
		expect(await steamService.getCurrentSyncJob()).toBeNull()
		expect(customFetch).toHaveBeenCalledWith('/steam/sync/jobs/current', { signal: undefined, timeout: 15000 })
	})
	it('reads a job by its encoded identifier and preserves the cancellation signal', async () => {
		vi.mocked(customFetch).mockResolvedValue(job)
		const signal = new AbortController().signal
		await steamService.getSyncJob('unsafe/id', signal)
		expect(customFetch).toHaveBeenCalledWith('/steam/sync/jobs/unsafe%2Fid', { signal, timeout: 15000 })
	})
	it.each(['<html>PRIVATE_DETAIL</html>', { ...job, processedGames: 10 }, { ...job, state: 'unknown' }])('rejects malformed or inconsistent success payloads', async invalid => {
		vi.mocked(customFetch).mockResolvedValue(invalid)
		await expect(steamService.startSyncJob()).rejects.toThrow('Invalid Steam sync status response')
	})
})
