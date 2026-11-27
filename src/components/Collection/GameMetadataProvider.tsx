import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useAppSelector } from '@/store/hooks'
import type { Game } from '@/models/api/Game'
import { GameMetadataContext } from './gameMetadataContext'
import { useMetadataAutofillBatch } from '@/hooks/useMetadataAutofillBatch'
import type { MetadataArtworkField, MetadataAutofillTarget } from '@/services/GamesService/MetadataAutofillService'
import { useMetadataAutofillJob } from '@/hooks/useMetadataAutofillJob'
import { getGameById } from '@/services/GamesService/GamesService'

/** The metadata sheet survives replaced cards and cannot display another account's selection. */
export const GameMetadataProvider = ({ children }: { children: ReactNode }) => {
	const ownerId = useAppSelector(state => state.auth.isAuthenticated ? state.auth.user?.id : undefined)
	const owner = useRef(ownerId)
	owner.current = ownerId
	const [selection, setSelection] = useState<{ ownerId: number; game: Game; jobId?: string; reviewIds?: number[]; overwrite?: boolean } | null>(null)
	const manualReview = useRef<{ ownerId: number; gameId: number; jobId?: string } | null>(null)
	const reviewRequest = useRef<AbortController | null>(null)
	const observedRoute = useRef<string | null>(null)
	const [reviewLoad, setReviewLoad] = useState<{ ownerId: number; id?: number; error?: boolean } | null>(null)
	const autofill = useMetadataAutofillBatch(ownerId)
	const background = useMetadataAutofillJob(ownerId)
	useEffect(() => { manualReview.current = null; setSelection(null); setReviewLoad(null); return () => reviewRequest.current?.abort() }, [ownerId])
	const open = useCallback((game: Game) => { if (ownerId && owner.current === ownerId && !autofill.isRunning()) { reviewRequest.current?.abort(); setReviewLoad(null); background.hide(); manualReview.current = { ownerId, gameId: game.id }; setSelection({ ownerId, game }) } }, [ownerId, autofill.isRunning, background.hide])
	const close = useCallback((expectedId?: number) => {
		if (owner.current !== ownerId || expectedId && manualReview.current?.gameId !== expectedId) return
		const jobId = manualReview.current?.jobId
		reviewRequest.current?.abort(); setReviewLoad(null); manualReview.current = null; setSelection(null)
		if (jobId) background.show(jobId)
	}, [ownerId, background.show])
	const hideAll = useCallback(() => {
		if (owner.current !== ownerId) return
		reviewRequest.current?.abort(); manualReview.current = null; setSelection(null); setReviewLoad(null)
		background.hide(); autofill.close()
	}, [ownerId, background.hide, autofill.close])
	const hideJobPanel = useCallback(() => {
		if (owner.current !== ownerId) return
		reviewRequest.current?.abort(); setReviewLoad(null); background.hide()
	}, [ownerId, background.hide])
	const observeRoute = useCallback((route: string) => {
		if (!ownerId || owner.current !== ownerId) return
		const previous = observedRoute.current
		observedRoute.current = route
		// A history entry may be replaced/re-keyed without leaving this URL.
		// Keep this guard outside route shells so a Header reconnect cannot
		// dismiss reopened details during an unrelated progress update.
		if (previous !== null && previous !== route) hideAll()
	}, [ownerId, hideAll])
	const openBatch = useCallback((targets: readonly MetadataAutofillTarget[], options?: { overwrite?: boolean }) => {
		if (!ownerId || owner.current !== ownerId || manualReview.current?.ownerId === ownerId) return false
		return background.start(targets, options?.overwrite === true)
	}, [ownerId, background.start])
	const openArtworkBatch = useCallback((targets: readonly MetadataAutofillTarget[], field: MetadataArtworkField) => {
		if (!ownerId || owner.current !== ownerId || manualReview.current?.ownerId === ownerId) return false
		return autofill.startArtwork(targets, field)
	}, [ownerId, autofill.startArtwork])
	const loadReview = useCallback((id: number, jobId: string, reviewIds: number[], overwrite: boolean) => {
		if (!ownerId || owner.current !== ownerId || !reviewIds.includes(id)) return
		reviewRequest.current?.abort(); const controller = new AbortController(); reviewRequest.current = controller
		setReviewLoad({ ownerId, id })
		void getGameById(id, controller.signal).then(game => {
			if (controller.signal.aborted || owner.current !== ownerId || reviewRequest.current !== controller || game.id !== id) return
			manualReview.current = { ownerId, gameId: id, jobId }; background.hide()
			setSelection({ ownerId, game, jobId, reviewIds, overwrite }); setReviewLoad(null)
		}).catch(() => { if (!controller.signal.aborted && owner.current === ownerId && reviewRequest.current === controller) setReviewLoad({ ownerId, error: true }) })
	}, [ownerId, background.hide])
	const reviewJobItem = useCallback((id: number) => {
		const job = background.detail
		if (!job) return
		const reviewIds = job.items.filter(item => ['review', 'failed', 'partial'].includes(item.status)).map(item => item.gameId)
		loadReview(id, job.id, reviewIds, job.overwrite)
	}, [background.detail, loadReview])
	const chosen = selection?.ownerId === ownerId ? selection : null
	const position = chosen?.reviewIds?.indexOf(chosen.game.id) ?? -1
	const navigateReview = (offset: number) => { if (chosen?.jobId && chosen.reviewIds?.[position + offset]) loadReview(chosen.reviewIds[position + offset], chosen.jobId, chosen.reviewIds, chosen.overwrite === true) }
	return <GameMetadataContext.Provider value={{ game: chosen?.game ?? null, open, close, batch: autofill.batch, openBatch, openArtworkBatch, closeBatch: autofill.close, stopBatch: autofill.stop, retryBatch: autofill.retry,
		background: { ...background, hide: hideJobPanel }, hideAll, observeRoute, reviewJobItem, reviewLoadingId: reviewLoad && reviewLoad.ownerId === ownerId ? reviewLoad.id : null, reviewError: Boolean(reviewLoad && reviewLoad.ownerId === ownerId && reviewLoad.error === true),
		jobReview: chosen?.jobId && chosen.reviewIds ? { jobId: chosen.jobId, overwrite: chosen.overwrite === true, position: position + 1, total: chosen.reviewIds.length, previous: position > 0 ? () => navigateReview(-1) : undefined, next: position + 1 < chosen.reviewIds.length ? () => navigateReview(1) : undefined } : undefined,
	}}>{children}</GameMetadataContext.Provider>
}
