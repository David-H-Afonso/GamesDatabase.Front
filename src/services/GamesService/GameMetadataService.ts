import { environment } from '@/environments'
import { customFetch } from '@/utils/customFetch'
import type { Game } from '@/models/api/Game'
import type { MetadataField, MetadataLookup, MetadataPreview } from '@/models/api/GameMetadata'

const fields = new Set<MetadataField>(['name', 'released', 'developer', 'critic', 'logo', 'hero', 'cover'])
const scalar = (value: unknown) => value === null || typeof value === 'string' || typeof value === 'number' && Number.isFinite(value)

export const previewGameMetadata = async (id: number, lookup: MetadataLookup, signal?: AbortSignal) => {
	const data = await customFetch<MetadataPreview>(environment.apiRoutes.games.metadataPreview(id), { method: 'POST', body: lookup, signal, timeout: 30000 })
	if (!data || typeof data.overwrite !== 'boolean' || !Array.isArray(data.fields) || !Array.isArray(data.matches) || !Array.isArray(data.notices) || data.fields.length > 7 || data.matches.length > 12
		|| data.fields.some(candidate => !candidate || !fields.has(candidate.field) || candidate.value === null || !scalar(candidate.value) || !scalar(candidate.current) || !['steam', 'wikidata'].includes(candidate.source) || typeof candidate.url !== 'string')
		|| new Set(data.fields.map(candidate => candidate.field)).size !== data.fields.length
		|| data.matches.some(identity => !identity || typeof identity.name !== 'string' || typeof identity.url !== 'string' || !['steam', 'wikidata'].includes(identity.source))
		|| data.notices.some(notice => typeof notice !== 'string')) throw new Error('Invalid metadata preview')
	return data
}
export const applyGameMetadata = (id: number, token: string, fields: MetadataField[], signal?: AbortSignal) => customFetch<{ game: Game; appliedFields: MetadataField[] }>(environment.apiRoutes.games.metadataApply(id), { method: 'POST', body: { token, fields }, signal })
