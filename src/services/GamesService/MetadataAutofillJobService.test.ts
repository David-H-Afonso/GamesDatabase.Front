import { beforeEach, describe, expect, it, vi } from 'vitest'
import { metadataJob, metadataJobItem } from '@/test/factories/metadataJob'
import { checkedMetadataJob, getCurrentMetadataJob, getMetadataJobHistory, startMetadataJob, changeMetadataJob, applyMetadataJobReview } from './MetadataAutofillJobService'

const calls = vi.hoisted(() => ({ fetch: vi.fn() }))
vi.mock('@/utils/customFetch', () => ({ customFetch: calls.fetch }))
beforeEach(() => calls.fetch.mockReset())
describe('owned durable metadata job contracts', () => {
	it('distinguishes no current job from a malformed or unknown job', async () => {
		calls.fetch.mockResolvedValueOnce(null).mockResolvedValueOnce(undefined)
		expect(await getCurrentMetadataJob()).toBeNull()
		await expect(getCurrentMetadataJob()).rejects.toThrow('Invalid metadata job')
	})
	it('submits exactly frozen IDs and one client request key, without titles or personal data', async () => {
		const job = metadataJob({ overwrite: true, acceptListedPlatformCritic: true }); calls.fetch.mockResolvedValue(job)
		const request = { clientRequestId: job.clientRequestId, gameIds: [11, 12], overwrite: true, acceptListedPlatformCritic: true }
		expect(await startMetadataJob(request)).toEqual(job)
		expect(calls.fetch).toHaveBeenCalledExactlyOnceWith('/metadata-autofill/jobs', expect.objectContaining({ method: 'POST', body: request }))
	})
	it.each([
		{ totalGames: 1001 }, { processedGames: 3 }, { updatedGames: 1 }, { active: false }, { state: 'unexpected' },
		{ items: [metadataJobItem(), metadataJobItem()] }, { items: [metadataJobItem({ gameId: -1 })] },
		{ items: [metadataJobItem({ appliedFields: ['comment' as never] })] }, { nextAttemptAt: 'not a date' },
		{ items: [metadataJobItem({ notices: ['<img src=x onerror=alert()>'] })] },
	])('rejects malformed or contradictory result %#', override => {
		expect(() => checkedMetadataJob({ ...metadataJob(), ...override } as never)).toThrow('Invalid metadata job')
	})
	it('rejects a start receipt for a different scope or critic policy', async () => {
		const job = metadataJob(); calls.fetch.mockResolvedValue(job)
		await expect(startMetadataJob({ clientRequestId: job.clientRequestId, gameIds: [12, 11], overwrite: false, acceptListedPlatformCritic: false })).rejects.toThrow('requested scope')
		await expect(startMetadataJob({ clientRequestId: job.clientRequestId, gameIds: [11, 12], overwrite: false, acceptListedPlatformCritic: true })).rejects.toThrow('requested scope')
	})
	it('rejects invalid IDs before sending work and checks the result of an explicit action', async () => {
		await expect(startMetadataJob({ clientRequestId: metadataJob().clientRequestId, gameIds: [11, 11], overwrite: false, acceptListedPlatformCritic: false })).rejects.toThrow('Invalid metadata job scope')
		expect(calls.fetch).not.toHaveBeenCalled(); calls.fetch.mockResolvedValue(metadataJob())
		await expect(changeMetadataJob('33333333-3333-4333-8333-333333333333', 'cancel')).rejects.toThrow('different job')
	})
	it('bounds retained history and sends manual signed review to the exact job/game', async () => {
		calls.fetch.mockResolvedValueOnce([metadataJob()]).mockResolvedValueOnce({ game: { id: 11 }, appliedFields: ['story'] })
		expect(await getMetadataJobHistory()).toHaveLength(1)
		await applyMetadataJobReview(metadataJob().id, 11, 'synthetic-signed-plan', ['story'])
		expect(calls.fetch.mock.calls[1]).toEqual([`/metadata-autofill/jobs/${metadataJob().id}/items/11/review`, expect.objectContaining({ method: 'POST', body: { token: 'synthetic-signed-plan', fields: ['story'] } })])
	})
})
