import type { GameView, GameViewQueryParameters } from '@/models/api/GameView'

export interface GameViewState {
	gameViews: GameView[]
	publicGameViews: GameView[]
	currentGameView: GameView | null
	loading: boolean
	error: string | null
	filters: GameViewQueryParameters
}
