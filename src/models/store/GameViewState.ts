import type { GameView, GameViewQueryParameters } from '@/models/api/GameView'

export interface GameViewState {
	pinRevision?: number
	viewsRead?: { requestId: string; pinRevision: number }
	publicViewsRead?: { requestId: string; pinRevision: number }
	gameViews: GameView[]
	publicGameViews: GameView[]
	currentGameView: GameView | null
	loading: boolean
	error: string | null
	filters: GameViewQueryParameters
}
