import { environment } from '@/environments'
import { customFetch } from '@/utils/customFetch'
import type { Game } from '@/models/api/Game'
import type { MetadataCandidate, MetadataField, MetadataLookup, MetadataPreview } from '@/models/api/GameMetadata'
import { metadataCriticUrl } from '@/utils/gameMetadataLinks'

const fields = new Set<MetadataField>(['name', 'released', 'developer', 'critic', 'logo', 'hero', 'cover', 'story', 'completion'])
const scalar = (value: unknown) => value === null || typeof value === 'string' || typeof value === 'number' && Number.isFinite(value)
const sources = ['steam', 'wikidata', 'dekudeals']
const criticProviders = ['Metacritic', 'OpenCritic', 'SteamDB']
const criticEvidence = (candidate: MetadataCandidate, reviewVersion?: number) => {
	if (candidate.field !== 'critic') return true
	const provider = candidate.criticProvider ?? (candidate.source === 'steam' && reviewVersion !== 2 ? 'Metacritic' : undefined)
	return Number.isSafeInteger(candidate.value) && Number(candidate.value) >= 0 && Number(candidate.value) <= 100
		&& (provider === 'Metacritic' || provider === 'OpenCritic') && candidate.source !== 'wikidata'
		&& (candidate.source !== 'steam' || provider === 'Metacritic')
		&& (candidate.source !== 'dekudeals' || metadataCriticUrl(provider, candidate.criticUrl))
		&& (candidate.criticUrl == null || metadataCriticUrl(provider, candidate.criticUrl))
		&& (candidate.currentCriticProvider == null || criticProviders.includes(candidate.currentCriticProvider))
		&& (candidate.criticScope == null || ['steam-edition', 'listed-platform'].includes(candidate.criticScope))
		&& (reviewVersion !== 2 || candidate.criticProvider != null && candidate.criticScope === (candidate.source === 'steam' ? 'steam-edition' : 'listed-platform'))
		&& (candidate.source !== 'dekudeals' || reviewVersion === 2)
		&& (!candidate.unchanged || reviewVersion !== 2 || candidate.currentCriticProvider === provider)
}

export const previewGameMetadata = async (id: number, lookup: MetadataLookup, signal?: AbortSignal) => {
	const data = await customFetch<MetadataPreview>(environment.apiRoutes.games.metadataPreview(id), { method: 'POST', body: lookup, signal, timeout: 30000 })
	if (!data || data.overwrite !== lookup.overwrite || data.reviewVersion != null && ![1, 2].includes(data.reviewVersion) || !Array.isArray(data.fields) || !Array.isArray(data.matches) || !Array.isArray(data.notices) || data.fields.length > 9 || data.matches.length > 12
		|| data.fields.some(candidate => !candidate || !fields.has(candidate.field) || candidate.value === null || !scalar(candidate.value) || !scalar(candidate.current) || !sources.includes(candidate.source) || typeof candidate.url !== 'string'
			|| !criticEvidence(candidate, data.reviewVersion) || candidate.unchanged != null && typeof candidate.unchanged !== 'boolean' || candidate.unchanged === true && candidate.current !== candidate.value
			|| candidate.sourceHours != null && (typeof candidate.sourceHours !== 'number' || !Number.isFinite(candidate.sourceHours) || candidate.sourceHours <= 0 || candidate.sourceHours > 100000)
			|| ['story', 'completion'].includes(candidate.field) && (candidate.source !== 'dekudeals' || !Number.isSafeInteger(candidate.value) || Number(candidate.value) <= 0 || candidate.sourceHours == null))
		|| new Set(data.fields.map(candidate => candidate.field)).size !== data.fields.length
		|| data.matches.some(identity => !identity || typeof identity.name !== 'string' || typeof identity.url !== 'string' || !sources.includes(identity.source)
			|| identity.source === 'dekudeals' && (typeof identity.dekuDealsSlug !== 'string' || identity.dekuDealsSlug.length > 160 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(identity.dekuDealsSlug) || identity.url !== `https://www.dekudeals.com/items/${identity.dekuDealsSlug}`))
		|| data.notices.some(notice => typeof notice !== 'string')) throw new Error('Invalid metadata preview')
	// Older APIs may ignore newly added scope switches. Never reselect a group
	// that the user explicitly unchecked, even if a legacy response includes it.
	const selected = data.fields.filter(candidate => !(candidate.field === 'critic' && lookup.includeCritic === false || ['story', 'completion'].includes(candidate.field) && lookup.includeDurations === false || ['logo', 'hero', 'cover'].includes(candidate.field) && !lookup.includeArtwork))
	return selected.length === data.fields.length ? data : { ...data, fields: selected }
}
export const applyGameMetadata = (id: number, token: string, fields: MetadataField[], signal?: AbortSignal) => customFetch<{ game: Game; appliedFields: MetadataField[]; unchangedFields?: MetadataField[] }>(environment.apiRoutes.games.metadataApply(id), { method: 'POST', body: { token, fields }, signal, timeout: 30000 })
