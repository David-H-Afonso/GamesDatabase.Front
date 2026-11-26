import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import type { Game } from '@/models/api/Game'
import { useAppSelector } from '@/store/hooks'
import { CollectionDetailsContext } from './collectionDetailsContext'
import { CollectionGameDetails } from './CollectionGameDetailsLazy'

/** A query refresh may replace cards, but must not destroy an open editor. */
export const CollectionDetailsProvider = ({ children }: { children: ReactNode }) => {
	const ownerId = useAppSelector((state) => state.auth.user?.id)
	const { pathname } = useLocation()
	const [selection, setSelection] = useState<{ ownerId: number; game: Game; onDelete?: (game: Game) => void } | null>(null)
	const close = useCallback(() => setSelection(null), [])
	const open = useCallback(
		(game: Game, onDelete?: (game: Game) => void) => {
			if (ownerId) setSelection({ ownerId, game, onDelete })
		},
		[ownerId]
	)
	const value = useMemo(() => ({ open }), [open])
	useEffect(close, [pathname, ownerId, close])
	return (
		<CollectionDetailsContext.Provider value={value}>
			{children}
			{selection?.ownerId === ownerId && selection && (
				<CollectionGameDetails
					key={`${ownerId}:${selection.game.id}`}
					game={selection.game}
					onDelete={selection.onDelete}
					closeDetails={() => setSelection((current) => (current?.ownerId === selection.ownerId && current.game.id === selection.game.id ? null : current))}
				/>
			)}
		</CollectionDetailsContext.Provider>
	)
}
