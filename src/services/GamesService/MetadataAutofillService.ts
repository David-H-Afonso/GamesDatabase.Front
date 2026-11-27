import type { MetadataCandidate, MetadataField, MetadataPreview } from '@/models/api/GameMetadata'
import { applyGameMetadata, previewGameMetadata } from './GameMetadataService'
import { getGameById } from './GamesService'
import { confirmedMetadataReceipt } from '@/utils/gameMetadataReceipts'

export interface MetadataAutofillTarget { id: number; name: string }
export type MetadataArtworkField = 'logo' | 'hero' | 'cover'
export type MetadataAutofillPhase = 'looking' | 'saving' | 'waiting'
export type MetadataAutofillStatus = 'pending' | MetadataAutofillPhase | 'updated' | 'unchanged' | 'partial' | 'review' | 'failed' | 'cancelled'
export interface MetadataAutofillResult extends MetadataAutofillTarget { status: MetadataAutofillStatus; appliedFields: MetadataField[]; notices: string[] }
export const metadataAutofillRetryable = (result: MetadataAutofillResult) => result.status === 'failed' || result.status === 'cancelled' || result.status === 'partial'
const unavailableSources = new Set(['steamUnavailable', 'wikidataUnavailable', 'durationSourceUnavailable', 'criticSourceUnavailable', 'catalogSourceUnavailable', 'artworkSourceUnavailable'])

const cancelled = () => new DOMException('Autofill stopped', 'AbortError')
const assertActive = (signal: AbortSignal) => { if (signal.aborted) throw cancelled() }
const waitForSourceWindow = (milliseconds: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
	if (signal.aborted) { reject(cancelled()); return }
	const abort = () => { clearTimeout(timer); signal.removeEventListener('abort', abort); reject(cancelled()) }
	const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve() }, milliseconds)
	signal.addEventListener('abort', abort, { once: true })
})

const checkedPreview = async (lookup: () => Promise<MetadataPreview>, signal: AbortSignal, onPhase: (phase: MetadataAutofillPhase) => void) => {
	onPhase('looking')
	try { return await lookup() }
	catch (error) {
		assertActive(signal)
		if ((error as { status?: number }).status !== 429) throw error
		const seconds = Number((error as { retryAfterSeconds?: number }).retryAfterSeconds)
		// A longer explicit cooldown is not permission to retry early. Leave it
		// unfinished rather than holding an interactive operation indefinitely.
		if (Number.isFinite(seconds) && seconds > 60) throw error
		onPhase('waiting')
		await waitForSourceWindow((Number.isFinite(seconds) ? Math.max(1, seconds) : 60) * 1000, signal)
		onPhase('looking'); return lookup()
	}
}

const applySelected = async (target: MetadataAutofillTarget, token: string, selected: MetadataCandidate[], signal: AbortSignal, onPhase: (phase: MetadataAutofillPhase) => void) => {
	onPhase('saving'); assertActive(signal)
	const fields = selected.map(field => field.field), receipt = await applyGameMetadata(target.id, token, fields, signal)
	assertActive(signal)
	if (!confirmedMetadataReceipt(receipt, target.id, selected)) throw new Error('Invalid autofill save receipt')
	return receipt
}

export const metadataAutofillTargets = (targets: readonly MetadataAutofillTarget[]): MetadataAutofillTarget[] => {
	if (!Array.isArray(targets) || !targets.length || targets.length > 1000 || targets.some(target => !target || !Number.isSafeInteger(target.id) || target.id <= 0 || typeof target.name !== 'string' || !target.name.trim() || target.name.length > 500) || new Set(targets.map(target => target.id)).size !== targets.length) throw new Error('Invalid autofill scope')
	return targets.map(({ id, name }) => ({ id, name }))
}

/** An explicit batch accepts all reliable proposals; never guesses a fuzzy identity,
 * imports a player or changes a Steam link. A retry is metadata-only, not creation. */
export const autofillGameMetadata = async (target: MetadataAutofillTarget, overwrite: boolean, signal: AbortSignal, onPhase: (phase: MetadataAutofillPhase) => void): Promise<MetadataAutofillResult> => {
	assertActive(signal)
	const lookup = () => previewGameMetadata(target.id, { overwrite, includeArtwork: true, includeDurations: true, includeCritic: true, reviewVersion: 2 }, signal)
	// Preview is read-only. Only a bounded 429 read retry is allowed; writes and
	// creation/import are never blindly repeated.
	const preview = await checkedPreview(lookup, signal, onPhase)
	assertActive(signal)
	const notices = [...preview.notices]
	// Deku's Metacritic badge does not prove a platform match. The interactive
	// review may accept it deliberately; unattended accept-all leaves it for review.
	const selected = preview.fields.filter(field => !(field.field === 'critic' && field.criticProvider === 'Metacritic' && field.criticScope === 'listed-platform' && !field.unchanged))
	const needsReview = selected.length !== preview.fields.length || notices.some(notice => ['chooseIdentity', 'chooseDurationIdentity', 'chooseArtworkIdentity', 'editionMismatch'].includes(notice))
	if (selected.length !== preview.fields.length) notices.push('criticPlatformScope')
	const base = { ...target, appliedFields: [] as MetadataField[], notices }
	const sourceFailed = notices.some(notice => unavailableSources.has(notice))
	if (!selected.length) return { ...base, status: needsReview ? 'review' : sourceFailed ? 'failed' : 'unchanged' }
	if (!preview.token) throw new Error('Missing reviewed autofill plan')
	const fields = selected.map(field => field.field)
	const receipt = await applySelected(target, preview.token, selected, signal, onPhase)
	return { ...base, appliedFields: fields, status: needsReview ? 'review' : sourceFailed ? 'partial' : receipt.unchangedFields?.length === fields.length ? 'unchanged' : 'updated' }
}

const verifyArtwork = (url: string, signal: AbortSignal) => new Promise<boolean>((resolve, reject) => {
	assertActive(signal)
	const image = new Image()
	const finish = (valid: boolean) => { clearTimeout(timer); signal.removeEventListener('abort', abort); image.onload = null; image.onerror = null; resolve(valid) }
	const abort = () => { clearTimeout(timer); image.onload = null; image.onerror = null; image.removeAttribute('src'); signal.removeEventListener('abort', abort); reject(cancelled()) }
	const timer = setTimeout(() => { image.removeAttribute('src'); finish(false) }, 10000)
	image.onload = () => finish(image.naturalWidth > 0 && image.naturalHeight > 0 && image.naturalWidth * image.naturalHeight <= 40_000_000)
	image.onerror = () => finish(false)
	signal.addEventListener('abort', abort, { once: true }); image.src = url
})

/** Refresh one exact Steam role without clear-then-sync, progress changes or URL rollback. */
export const refreshGameMetadataArtwork = async (target: MetadataAutofillTarget, field: MetadataArtworkField, signal: AbortSignal, onPhase: (phase: MetadataAutofillPhase) => void): Promise<MetadataAutofillResult> => {
	assertActive(signal); onPhase('looking')
	const game = await getGameById(target.id, signal); assertActive(signal)
	if (game.id !== target.id || !Number.isSafeInteger(game.steamAppId) || Number(game.steamAppId) <= 0) throw new Error('Missing owned Steam artwork identity')
	const preview = await checkedPreview(() => previewGameMetadata(target.id, { overwrite: true, includeArtwork: true, includeDurations: false, includeCritic: false, reviewVersion: 2, steamAppId: game.steamAppId }, signal), signal, onPhase)
	assertActive(signal)
	const proposed = preview.fields.find(candidate => candidate.field === field && candidate.source === 'steam')
	if (!preview.token || !proposed || typeof proposed.value !== 'string' || !preview.matches.some(identity => identity.source === 'steam' && identity.steamAppId === game.steamAppId) || !await verifyArtwork(proposed.value, signal)) return { ...target, status: 'failed', appliedFields: [], notices: ['artworkUnavailable'] }
	const receipt = await applySelected(target, preview.token, [proposed], signal, onPhase)
	return { ...target, status: receipt.unchangedFields?.includes(field) ? 'unchanged' : 'updated', appliedFields: [field], notices: [] }
}
