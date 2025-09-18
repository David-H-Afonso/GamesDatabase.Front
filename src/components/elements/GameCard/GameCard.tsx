import type { Game } from '@/models/api/Game'
import { useState, type FC } from 'react'
import { useAppSelector } from '@/store/hooks'
import { selectGameById } from '@/store/features/games'
import { useGames } from '@/hooks'
import './GameCardContainer.scss'
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

export const GameCard: FC<Props> = (props) => {
	const { game, variant = 'card', onDelete, isSelected = false, onSelect } = props
	const [selectedGame, setSelectedGame] = useState<Game | null>(null)
	const [isDetailsOpen, setIsDetailsOpen] = useState(false)
	const { editGame } = useGames()

	// Get entities from Redux store to access colors
	const { activeStatuses } = useAppSelector((state) => state.gameStatus)
	const { platforms: activePlatforms } = useAppSelector((state) => state.gamePlatform)
	const { playWithOptions: activePlayWithOptions } = useAppSelector((state) => state.gamePlayWith)
	const { playedStatuses: activePlayedStatuses } = useAppSelector((state) => state.gamePlayedStatus)

	// Get the most up-to-date version of the game from Redux store
	const updatedGame = useAppSelector(selectGameById(game.id)) || game

	// Find the entities to get their colors
	const gameStatus = activeStatuses.find((status) => status.id === updatedGame.statusId)
	const gamePlatform = activePlatforms.find((platform) => platform.id === updatedGame.platformId)
	const gamePlayWith = activePlayWithOptions.find((option) => option.id === updatedGame.playWithId)
	const gamePlayedStatus = activePlayedStatuses.find(
		(status) => status.id === updatedGame.playedStatusId
	)

	const handleFieldUpdate = async (gameId: number, field: string, value: number | undefined) => {
		try {
			const payload = typeof value === 'undefined' ? null : value
			await editGame(gameId, { [field]: payload } as any)
		} catch (error) {
			console.error(`Error updating ${field}:`, error)
			throw error
		}
	}

	const openDetails = (_game: Game) => {
		setSelectedGame(updatedGame) // Use the updated game
		setIsDetailsOpen(true)
	}

	return (
		<>
			{isDetailsOpen && selectedGame && (
				<GameDetails
					game={updatedGame} // Always use the most up-to-date version
					closeDetails={() => setIsDetailsOpen(false)}
					onDelete={onDelete}
				/>
			)}

			{variant === 'card' && (
				<div className='game-card' key={isSelected ? 'selected' : 'unselected'}>
					<CardView
						game={game}
						openDetails={openDetails}
						onFieldUpdate={handleFieldUpdate}
						playWithColor={gamePlayWith?.color || '#333'}
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
						playWithColor={gamePlayWith?.color || '#333'}
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
