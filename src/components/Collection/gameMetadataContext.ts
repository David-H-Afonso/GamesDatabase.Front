import { createContext, useContext } from 'react'
import type { Game } from '@/models/api/Game'
import type { MetadataAutofillBatch } from '@/hooks/useMetadataAutofillBatch'
import type { MetadataArtworkField, MetadataAutofillTarget } from '@/services/GamesService/MetadataAutofillService'
import type { useMetadataAutofillJob } from '@/hooks/useMetadataAutofillJob'

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
	background?: ReturnType<typeof useMetadataAutofillJob>
	hideAll?: () => void
	observeRoute?: (route: string) => void
	reviewJobItem?: (id: number) => void
	reviewLoadingId?: number | null
	reviewError?: boolean
	jobReview?: { jobId: string; overwrite: boolean; position: number; total: number; previous?: () => void; next?: () => void }
}
export const GameMetadataContext = createContext<GameMetadataContextValue | null>(null)
export const useGameMetadata = () => useContext(GameMetadataContext)
