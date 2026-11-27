import { useCallback, useEffect, useRef, useState } from 'react'
import { autofillGameMetadata, metadataAutofillRetryable, metadataAutofillTargets, refreshGameMetadataArtwork, type MetadataArtworkField, type MetadataAutofillPhase, type MetadataAutofillResult, type MetadataAutofillTarget } from '@/services/GamesService/MetadataAutofillService'
import { gameArtworkRefreshed, invalidateCollection } from '@/services/CollectionService/collectionEvents'

export interface MetadataAutofillBatch {
	ownerId: number
	targets: MetadataAutofillTarget[]
	results: MetadataAutofillResult[]
	overwrite: boolean
	busy: boolean
	currentId: number | null
	phase: MetadataAutofillPhase | null
	artworkField?: MetadataArtworkField
}

/** One explicit owner-scoped operation. No persisted queue, background restart or
 * automatic mutation retry; account change/unmount aborts all remaining work. */
export const useMetadataAutofillBatch = (ownerId: number | undefined) => {
	const owner = useRef(ownerId); owner.current = ownerId
	const active = useRef<{ ownerId: number; controller: AbortController; phase: MetadataAutofillPhase | null; closeAfterCurrent: boolean } | null>(null)
	const [batch, setBatch] = useState<MetadataAutofillBatch | null>(null)
	useEffect(() => {
		setBatch(null)
		return () => { const job = active.current; if (job && job.ownerId === ownerId) { job.controller.abort(); active.current = null } }
	}, [ownerId])
	const run = useCallback((targets: readonly MetadataAutofillTarget[], overwrite: boolean, previous?: MetadataAutofillBatch, artworkField?: MetadataArtworkField) => {
		if (!ownerId || owner.current !== ownerId || active.current) return false
		let scope: MetadataAutofillTarget[]
		try { scope = metadataAutofillTargets(targets) } catch { return false }
		const job = { ownerId, controller: new AbortController(), phase: null as MetadataAutofillPhase | null, closeAfterCurrent: false }
		active.current = job
		const current = () => active.current === job && owner.current === ownerId
		const pending = new Set(scope.map(target => target.id))
		const original = previous?.targets ?? scope
		const results = original.map(target => pending.has(target.id) ? { ...target, status: 'pending' as const, appliedFields: [], notices: [] } : previous!.results.find(result => result.id === target.id)!)
		setBatch({ ownerId, targets: original, results, overwrite, busy: true, phase: null, currentId: null, artworkField })
		void (async () => {
			const update = (result: MetadataAutofillResult) => { const index = results.findIndex(entry => entry.id === result.id); if (index >= 0) results[index] = result; if (current()) setBatch(value => value?.ownerId === ownerId ? { ...value, results: [...results] } : value) }
			try {
				for (const target of scope) {
					if (!current() || job.controller.signal.aborted) break
					try {
						const onPhase = (phase: MetadataAutofillPhase) => {
							if (!current() || job.controller.signal.aborted) return
							job.phase = phase; update({ ...target, status: phase, appliedFields: [], notices: [] })
							setBatch(value => value?.ownerId === ownerId ? { ...value, phase, currentId: target.id } : value)
						}
						const result = artworkField ? await refreshGameMetadataArtwork(target, artworkField, job.controller.signal, onPhase) : await autofillGameMetadata(target, overwrite, job.controller.signal, onPhase)
						if (!current() || job.controller.signal.aborted) break
						update(result); if (result.appliedFields.length) invalidateCollection()
						if (artworkField && result.appliedFields.length) gameArtworkRefreshed(target.id)
					} catch {
						if (!current() || job.controller.signal.aborted) break
						update({ ...target, status: 'failed', appliedFields: [], notices: [] })
					}
					if (job.closeAfterCurrent) break
				}
			} finally {
				if (current()) {
					active.current = null
					setBatch(value => job.closeAfterCurrent ? null : value?.ownerId === ownerId ? { ...value, busy: false, phase: null, currentId: null, results: results.map(result => ['pending', 'looking', 'waiting', 'saving'].includes(result.status) ? { ...result, status: 'cancelled' } : result) } : value)
				}
			}
		})()
		return true
	}, [ownerId])
	const stop = useCallback(() => { const job = active.current; if (job && job.ownerId === ownerId && job.phase !== 'saving') job.controller.abort() }, [ownerId])
	const close = useCallback(() => {
		if (owner.current !== ownerId) return
		const job = active.current
		if (job && job.ownerId === ownerId && job.phase === 'saving') { job.closeAfterCurrent = true; return }
		if (job && job.ownerId === ownerId) job.controller.abort()
		setBatch(null)
	}, [ownerId])
	const retry = useCallback(() => {
		if (!batch || batch.ownerId !== ownerId || batch.busy) return false
		return run(batch.results.filter(metadataAutofillRetryable), batch.overwrite, batch, batch.artworkField)
	}, [batch, ownerId, run])
	const startArtwork = useCallback((targets: readonly MetadataAutofillTarget[], field: MetadataArtworkField) => run(targets, true, undefined, field), [run])
	const isRunning = useCallback(() => Boolean(active.current), [])
	return { batch: batch?.ownerId === ownerId ? batch : null, start: run, startArtwork, stop, close, retry, isRunning }
}
