import type { MetadataAutofillJob, MetadataJobItem } from '@/models/api/MetadataAutofillJob'

export const metadataJobItem = (overrides: Partial<MetadataJobItem> = {}): MetadataJobItem => ({ gameId: 11, name: 'Public fixture', status: 'pending', appliedFields: [], unchangedFields: [], notices: [], matches: [], ...overrides })
export const metadataJob = (overrides: Partial<MetadataAutofillJob> = {}): MetadataAutofillJob => {
	const items = overrides.items ?? [metadataJobItem(), metadataJobItem({ gameId: 12, name: 'Second public fixture' })]
	return {
		id: '11111111-1111-4111-8111-111111111111', clientRequestId: '22222222-2222-4222-8222-222222222222', state: 'queued', active: true,
		overwrite: false, acceptListedPlatformCritic: false, dismissed: false, revision: 1,
		createdAt: '2026-11-27T12:00:00Z', updatedAt: '2026-11-27T12:00:00Z', totalGames: items.length,
		processedGames: items.filter(item => !['pending', 'looking', 'waiting', 'cancelled'].includes(item.status)).length,
		updatedGames: items.filter(item => item.status === 'updated').length, unchangedGames: items.filter(item => item.status === 'unchanged').length,
		reviewGames: items.filter(item => item.status === 'review').length, failedGames: items.filter(item => item.status === 'failed').length,
		partialGames: items.filter(item => item.status === 'partial').length, cancelledGames: items.filter(item => item.status === 'cancelled').length,
		items, ...overrides,
	}
}
