import type { Game } from '@/models/api/Game'
import { useState, memo, type FC } from 'react'
import { useAppSelector } from '@/store/hooks'
import { selectGameById } from '@/store/features/games'
import {
	useGamePlatform,
	useGamePlayedStatus,
	useGamePlayWith,
	useGames,
	useGameStatus,
} from '@/hooks'
import { GameDetails } from '@/components/elements'
import CardView from './CardView/CardView'
import RowView from './RowView/RowView'

interface Props {
	game: Game
	onDelete?: (game: Game) => void
	variant?: 'card' | 'row' | 'tile'
	isSelected?: boolean
	onSelect?: (gameId: number, isSelected: boolean) => void
	deselectAll?: () => void
}

const GameCardComponent: FC<Props> = (props) => {
	const { game: initialGame, variant = 'card', onDelete, isSelected = false, onSelect } = props
	const [selectedGame, setSelectedGame] = useState<Game | null>(null)
	const [isDetailsOpen, setIsDetailsOpen] = useState(false)
	const { updateGameById } = useGames()

	// Always use the game from Redux to get the latest updates
	const game = useAppSelector(selectGameById(initialGame.id)) || initialGame

	// Get entities from Redux store to access colors
	const { activeStatuses } = useGameStatus()
	const { platforms: activePlatforms } = useGamePlatform()
	const { activePlayWiths } = useGamePlayWith()
	const { playedStatuses: activePlayedStatuses } = useGamePlayedStatus()

	// Find the entities to get their colors
	const gameStatus = activeStatuses.find((status) => status.id === game.statusId)
	const gamePlatform = activePlatforms.find((platform) => platform.id === game.platformId)
	const gamePlayWiths = activePlayWiths.filter((option) => game.playWithIds?.includes(option.id))
	const gamePlayedStatus = activePlayedStatuses.find((status) => status.id === game.playedStatusId)

	// Get array of colors for PlayWith options
	const playWithColors = gamePlayWiths.map((pw) => pw.color)

	const handleFieldUpdate = async (
		gameId: number,
		field: string,
		value: number | number[] | undefined
	) => {
		try {
			const payload = typeof value === 'undefined' ? null : value
			await updateGameById(gameId, { [field]: payload } as any)
		} catch (error) {
			console.error(`Error updating ${field}:`, error)
			throw error
		}
	}

	const openDetails = (_game: Game) => {
		setSelectedGame(game)
		setIsDetailsOpen(true)
	}

	return (
		<>
			{isDetailsOpen && selectedGame && (
				<GameDetails game={game} closeDetails={() => setIsDetailsOpen(false)} onDelete={onDelete} />
			)}

			{variant === 'card' && (
				<div className='game-card' key={isSelected ? 'selected' : 'unselected'}>
					<CardView
						game={game}
						openDetails={openDetails}
						onFieldUpdate={handleFieldUpdate}
						playWithColors={playWithColors}
						gameStatusColor={gameStatus?.color || '#333'}
						platformColor={gamePlatform?.color || '#333'}
						onSelect={onSelect}
						isSelected={isSelected}
						deselectAll={props.deselectAll}
					/>
				</div>
			)}

			{variant === 'row' && (
				<div className='game-card' key={isSelected ? 'selected' : 'unselected'}>
					<RowView
						game={game}
						openDetails={openDetails}
						onFieldUpdate={handleFieldUpdate}
						playWithColors={playWithColors}
						gameStatusColor={gameStatus?.color || '#333'}
						platformColor={gamePlatform?.color || '#333'}
						playedStatusColor={gamePlayedStatus?.color || '#333'}
						onSelect={onSelect}
						isSelected={isSelected}
						deselectAll={props.deselectAll}
					/>
				</div>
			)}
		</>
	)
}

// Memoize GameCard to prevent unnecessary re-renders when props don't change
// Note: We use game from Redux inside the component, so we only need to check
// if the game ID, selection state, or variant changed. The component will
// automatically get updates from Redux when the game data changes.
export const GameCard = memo(GameCardComponent, (prevProps, nextProps) => {
	return (
		prevProps.game.id === nextProps.game.id &&
		prevProps.isSelected === nextProps.isSelected &&
		prevProps.variant === nextProps.variant
	)
})
