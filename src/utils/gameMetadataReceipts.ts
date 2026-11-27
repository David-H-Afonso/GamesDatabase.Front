import type { Game } from '@/models/api/Game'
import type { MetadataCandidate, MetadataField } from '@/models/api/GameMetadata'

/** A 2xx is not a save receipt: bind every requested field, game and critic
 * provider to the reviewed values before presenting a confirmed outcome. */
export const confirmedMetadataReceipt = (receipt: unknown, gameId: number, selected: readonly MetadataCandidate[]): boolean => {
	if (!receipt || typeof receipt !== 'object' || !selected.length) return false
	const value = receipt as { game?: Game; appliedFields?: MetadataField[]; unchangedFields?: MetadataField[] }
	const fields = selected.map(candidate => candidate.field)
	return value.game?.id === gameId && Array.isArray(value.appliedFields) && value.appliedFields.length === fields.length
		&& new Set(value.appliedFields).size === fields.length && value.appliedFields.every(field => fields.includes(field))
		&& (value.unchangedFields == null || Array.isArray(value.unchangedFields) && new Set(value.unchangedFields).size === value.unchangedFields.length && value.unchangedFields.every(field => fields.includes(field)))
		&& selected.every(candidate => value.game![candidate.field as keyof Game] === candidate.value && (candidate.field !== 'critic' || value.game!.criticProvider === (candidate.criticProvider ?? 'Metacritic')))
}
