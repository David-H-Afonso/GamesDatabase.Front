import { createContext, useContext } from 'react'
import type { Game } from '@/models/api/Game'
import type { MetadataAutofillBatch } from '@/hooks/useMetadataAutofillBatch'
import type { MetadataArtworkField, MetadataAutofillTarget } from '@/services/GamesService/MetadataAutofillService'

export interface GameMetadataContextValue {
	game: Game | null
	open: (game: Game) => void
	close: (expectedId?: number) => void
	batch: MetadataAutofillBatch | null
	openBatch: (targets: readonly MetadataAutofillTarget[], options?: { overwrite?: boolean }) => boolean
	openArtworkBatch: (targets: readonly MetadataAutofillTarget[], field: MetadataArtworkField) => boolean
	closeBatch: () => void
	stopBatch: () => void
	retryBatch: () => boolean
}
export const GameMetadataContext = createContext<GameMetadataContextValue | null>(null)
export const useGameMetadata = () => useContext(GameMetadataContext)
