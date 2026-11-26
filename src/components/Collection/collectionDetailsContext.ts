import { createContext, useContext } from 'react'
import type { Game } from '@/models/api/Game'

export const CollectionDetailsContext = createContext<{
	open: (game: Game, onDelete?: (game: Game) => void) => void
} | null>(null)

export const useCollectionDetails = () => useContext(CollectionDetailsContext)
