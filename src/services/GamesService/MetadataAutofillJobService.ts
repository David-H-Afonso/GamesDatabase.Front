import { environment } from '@/environments'
import { customFetch } from '@/utils/customFetch'
import type { Game } from '@/models/api/Game'
import type { MetadataField } from '@/models/api/GameMetadata'
import type { MetadataAutofillJob, MetadataJobStart } from '@/models/api/MetadataAutofillJob'

const routes = environment.apiRoutes.metadataJobs
const fields = new Set(['name', 'released', 'developer', 'critic', 'logo', 'hero', 'cover', 'story', 'completion'])
const states = ['queued', 'running', 'waiting', 'cancelling', 'completed', 'cancelled']
const statuses = ['pending', 'looking', 'waiting', 'updated', 'unchanged', 'review', 'failed', 'partial', 'cancelled']
const uuid = (value: unknown) => typeof value === 'string' && value !== '00000000-0000-0000-0000-000000000000' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value)
const boundedCount = (value: unknown, maximum: number) => Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= maximum
const validFields = (values: unknown) => Array.isArray(values) && values.length <= 9 && new Set(values).size === values.length && values.every(value => fields.has(value))

export const checkedMetadataJob = (job: MetadataAutofillJob): MetadataAutofillJob => {
	if (!job || !uuid(job.id) || !uuid(job.clientRequestId) || !states.includes(job.state) || typeof job.active !== 'boolean'
		|| job.active !== ['queued', 'running', 'waiting', 'cancelling'].includes(job.state) || typeof job.overwrite !== 'boolean' || typeof job.acceptListedPlatformCritic !== 'boolean' || typeof job.dismissed !== 'boolean'
		|| !Number.isSafeInteger(job.revision) || job.revision < 0 || !Number.isSafeInteger(job.totalGames) || job.totalGames < 1 || job.totalGames > 1000
		|| ['processedGames', 'updatedGames', 'unchangedGames', 'reviewGames', 'failedGames', 'partialGames', 'cancelledGames'].some(key => !boundedCount(job[key as keyof MetadataAutofillJob], job.totalGames))
		|| job.updatedGames + job.unchangedGames + job.reviewGames + job.failedGames + job.partialGames !== job.processedGames || job.processedGames + job.cancelledGames > job.totalGames || !job.active && job.processedGames + job.cancelledGames !== job.totalGames
		|| typeof job.createdAt !== 'string' || !Number.isFinite(Date.parse(job.createdAt)) || typeof job.updatedAt !== 'string' || !Number.isFinite(Date.parse(job.updatedAt))
		|| job.nextAttemptAt != null && !Number.isFinite(Date.parse(job.nextAttemptAt)) || job.currentGameName != null && (typeof job.currentGameName !== 'string' || job.currentGameName.length > 500)
		|| !Array.isArray(job.items) || job.items.length > job.totalGames || new Set(job.items.map(item => item?.gameId)).size !== job.items.length
		|| job.items.some(item => !item || !Number.isSafeInteger(item.gameId) || item.gameId <= 0 || typeof item.name !== 'string' || item.name.length > 500 || !statuses.includes(item.status)
			|| !validFields(item.appliedFields) || !validFields(item.unchangedFields) || !Array.isArray(item.notices) || item.notices.length > 20 || item.notices.some(notice => typeof notice !== 'string' || !/^[a-zA-Z][a-zA-Z0-9]{0,80}$/.test(notice))
			|| !Array.isArray(item.matches) || item.matches.length > 12)) throw new Error('Invalid metadata job response')
	return job
}

export const getCurrentMetadataJob = async (includeItems = false, signal?: AbortSignal) => {
	const value = await customFetch<MetadataAutofillJob | null>(`${routes.current}?includeItems=${includeItems}`, { signal })
	return value === null ? null : checkedMetadataJob(value)
}
export const getMetadataJob = async (id: string, signal?: AbortSignal) => checkedMetadataJob(await customFetch<MetadataAutofillJob>(routes.byId(id), { signal }))
export const getMetadataJobHistory = async (skip = 0, signal?: AbortSignal) => {
	const values = await customFetch<MetadataAutofillJob[]>(`${routes.base}?skip=${skip}&take=10`, { signal })
	if (!Array.isArray(values) || values.length > 10) throw new Error('Invalid metadata job history')
	return values.map(checkedMetadataJob)
}
export const startMetadataJob = async (request: MetadataJobStart, signal?: AbortSignal) => {
	if (!uuid(request.clientRequestId) || !Array.isArray(request.gameIds) || !request.gameIds.length || request.gameIds.length > 1000 || request.gameIds.some(id => !Number.isSafeInteger(id) || id <= 0) || new Set(request.gameIds).size !== request.gameIds.length) throw new Error('Invalid metadata job scope')
	const job = checkedMetadataJob(await customFetch<MetadataAutofillJob>(routes.base, { method: 'POST', body: request, signal, timeout: 30000 }))
	if (job.clientRequestId !== request.clientRequestId || job.overwrite !== request.overwrite || job.acceptListedPlatformCritic !== request.acceptListedPlatformCritic || job.totalGames !== request.gameIds.length || job.items.length && (job.items.length !== request.gameIds.length || job.items.some((item, index) => item.gameId !== request.gameIds[index]))) throw new Error('Metadata job does not match the requested scope')
	return job
}
export const changeMetadataJob = async (id: string, action: 'cancel' | 'retry' | 'dismiss' | 'accept-listed-critics', signal?: AbortSignal) => {
	const job = checkedMetadataJob(await customFetch<MetadataAutofillJob>(routes.action(id, action), { method: 'POST', body: {}, signal, timeout: 30000 }))
	if (job.id !== id) throw new Error('Metadata action returned a different job')
	return job
}
export const applyMetadataJobReview = (id: string, gameId: number, token: string, selected: MetadataField[], signal?: AbortSignal) => customFetch<{ game: Game; appliedFields: MetadataField[]; unchangedFields?: MetadataField[] }>(routes.review(id, gameId), { method: 'POST', body: { token, fields: selected }, signal, timeout: 30000 })
