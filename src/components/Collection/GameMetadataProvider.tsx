import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useAppSelector } from '@/store/hooks'
import type { Game } from '@/models/api/Game'
import { GameMetadataContext } from './gameMetadataContext'

/** The metadata sheet survives replaced cards and cannot display another account's selection. */
export const GameMetadataProvider = ({ children }: { children: ReactNode }) => {
	const ownerId = useAppSelector(state => state.auth.isAuthenticated ? state.auth.user?.id : undefined)
	const owner = useRef(ownerId)
	owner.current = ownerId
	const [selection, setSelection] = useState<{ ownerId: number; game: Game } | null>(null)
	useEffect(() => { setSelection(null) }, [ownerId])
	const open = useCallback((game: Game) => { if (ownerId && owner.current === ownerId) setSelection({ ownerId, game }) }, [ownerId])
	const close = useCallback((expectedId?: number) => { if (owner.current === ownerId) setSelection(current => expectedId && current?.game.id !== expectedId ? current : null) }, [ownerId])
	return <GameMetadataContext.Provider value={{ game: selection && selection.ownerId === ownerId ? selection.game : null, open, close }}>{children}</GameMetadataContext.Provider>
}
