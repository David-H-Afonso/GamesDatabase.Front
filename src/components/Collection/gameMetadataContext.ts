import { createContext, useContext } from 'react'
import type { Game } from '@/models/api/Game'

export interface GameMetadataContextValue { game: Game | null; open: (game: Game) => void; close: (expectedId?: number) => void }
export const GameMetadataContext = createContext<GameMetadataContextValue | null>(null)
export const useGameMetadata = () => useContext(GameMetadataContext)
