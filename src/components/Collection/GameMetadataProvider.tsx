import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useAppSelector } from '@/store/hooks'
import type { Game } from '@/models/api/Game'
import { GameMetadataContext } from './gameMetadataContext'
import { useMetadataAutofillBatch } from '@/hooks/useMetadataAutofillBatch'
import type { MetadataArtworkField, MetadataAutofillTarget } from '@/services/GamesService/MetadataAutofillService'

/** The metadata sheet survives replaced cards and cannot display another account's selection. */
export const GameMetadataProvider = ({ children }: { children: ReactNode }) => {
	const ownerId = useAppSelector(state => state.auth.isAuthenticated ? state.auth.user?.id : undefined)
	const owner = useRef(ownerId)
	owner.current = ownerId
	const [selection, setSelection] = useState<{ ownerId: number; game: Game } | null>(null)
	const manualReview = useRef<{ ownerId: number; gameId: number } | null>(null)
	const autofill = useMetadataAutofillBatch(ownerId)
	useEffect(() => { manualReview.current = null; setSelection(null) }, [ownerId])
	const open = useCallback((game: Game) => { if (ownerId && owner.current === ownerId && !autofill.isRunning()) { autofill.close(); manualReview.current = { ownerId, gameId: game.id }; setSelection({ ownerId, game }) } }, [ownerId, autofill.isRunning, autofill.close])
	const close = useCallback((expectedId?: number) => { if (owner.current === ownerId && (!expectedId || manualReview.current?.gameId === expectedId)) { manualReview.current = null; setSelection(null) } }, [ownerId])
	const openBatch = useCallback((targets: readonly MetadataAutofillTarget[], options?: { overwrite?: boolean }) => {
		if (!ownerId || owner.current !== ownerId || manualReview.current?.ownerId === ownerId) return false
		return autofill.start(targets, options?.overwrite === true)
	}, [ownerId, autofill.start])
	const openArtworkBatch = useCallback((targets: readonly MetadataAutofillTarget[], field: MetadataArtworkField) => {
		if (!ownerId || owner.current !== ownerId || manualReview.current?.ownerId === ownerId) return false
		return autofill.startArtwork(targets, field)
	}, [ownerId, autofill.startArtwork])
	return <GameMetadataContext.Provider value={{ game: selection && selection.ownerId === ownerId ? selection.game : null, open, close, batch: autofill.batch, openBatch, openArtworkBatch, closeBatch: autofill.close, stopBatch: autofill.stop, retryBatch: autofill.retry }}>{children}</GameMetadataContext.Provider>
}
