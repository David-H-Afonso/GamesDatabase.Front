import type { Game } from '@/models/api/Game'
import { useState, memo, type FC, type ReactNode } from 'react'
import { useAppSelector } from '@/store/hooks'
import { selectGameById } from '@/store/features/games'
import { useGamePlatform, useGamePlayedStatus, useGamePlayWith, useGames, useGameStatus } from '@/hooks'
import { GameDetails } from '@/components/elements'
import CardView from './CardView/CardView'
import CoverView from './CoverView/CoverView'
import RowView from './RowView/RowView'
import './GalleryCards.scss'
import { useCollectionDetails } from '@/components/Collection/collectionDetailsContext'
import { useGameMetadata } from '@/components/Collection/gameMetadataContext'
import { useTranslation } from 'react-i18next'

interface Props {
	game: Game
	onDelete?: (game: Game) => void
	variant?: 'card' | 'row' | 'cover'
	isSelected?: boolean
	onSelect?: (gameId: number, isSelected: boolean) => void
	deselectAll?: () => void
	index?: number
	playlistControls?: ReactNode
	onGameUpdated?: (game: Game) => void
	hideSelection?: boolean
	selecting?: boolean
	rowExpanded?: boolean
}

const GameCardComponent: FC<Props> = (props) => {
	const { game: initialGame, variant = 'card', onDelete, isSelected = false, onSelect, onGameUpdated } = props
	const { t } = useTranslation()
	const [selectedGame, setSelectedGame] = useState<Game | null>(null)
	const [isDetailsOpen, setIsDetailsOpen] = useState(false)
	const details = useCollectionDetails()
	const metadata = useGameMetadata()
	const { updateGameById, updateGameStatusById } = useGames()

	// Always use the game from Redux to get the latest updates
	const cachedGame = useAppSelector(selectGameById(initialGame.id))
	const game = cachedGame && (!initialGame.updatedAt || Date.parse(cachedGame.updatedAt ?? '') > Date.parse(initialGame.updatedAt)) ? cachedGame : initialGame

	// Get entities from Redux store to access colors
	const { activeStatuses } = useGameStatus()
	const { platforms, activePlatforms } = useGamePlatform()
	const { activePlayWiths } = useGamePlayWith()
	const { playedStatuses: activePlayedStatuses } = useGamePlayedStatus()
	const platformOptions = platforms.length > 0 ? platforms : activePlatforms

	// Find the entities to get their colors
	const gameStatus = activeStatuses.find((status) => status.id === game.statusId)
	const gamePlatform = platformOptions.find((platform) => platform.id === game.platformId)
	const gamePlayWiths = activePlayWiths.filter((option) => game.playWithIds?.includes(option.id))
	const gamePlayedStatus = activePlayedStatuses.find((status) => status.id === game.playedStatusId)

	// Get array of colors for PlayWith options
	const playWithColors = gamePlayWiths.map((pw) => pw.color)

	const handleFieldUpdate = async (gameId: number, field: string, value: number | number[] | boolean | undefined) => {
		try {
			if (field === 'statusId' && typeof value === 'number') {
				const updated = await updateGameStatusById(gameId, value)
				onGameUpdated?.(updated as Game)
				return
			}
			const payload = typeof value === 'undefined' ? null : value
			const updated = await updateGameById(gameId, { [field]: payload } as any)
			onGameUpdated?.(updated as Game)
		} catch (error) {
			console.error(`Error updating ${field}:`, error)
			throw error
		}
	}

	const openDetails = (_game: Game) => {
		if (props.selecting && onSelect) { onSelect(game.id, !isSelected); return }
		if (details) { details.open(game, onDelete); return }
		setSelectedGame(game)
		setIsDetailsOpen(true)
	}
	const selecting = Boolean(props.selecting && onSelect)
	const selection = selecting && <label className='gdb-game-select-target'><input type='checkbox' checked={isSelected} onChange={event => onSelect?.(game.id, event.target.checked)} aria-label={t('game.card.selectGame', { name: game.name })} /></label>

	return (
		<>
			{isDetailsOpen && selectedGame && <GameDetails game={game} closeDetails={() => setIsDetailsOpen(false)} onDelete={onDelete} />}

			<div className={`game-card${selecting ? ' is-selecting' : ''}${isSelected ? ' is-selected' : ''}`}>
				<div className='game-card__content' inert={selecting || undefined}>
			{variant === 'card' && (
					<CardView
						game={game}
						openDetails={openDetails}
						onAutoFill={metadata ? () => metadata.open(game) : undefined}
						onFieldUpdate={handleFieldUpdate}
						playWithColors={playWithColors}
						gameStatusColor={gameStatus?.color || '#333'}
						platformColor={gamePlatform?.color || '#333'}
						onSelect={onSelect}
						isSelected={isSelected}
						deselectAll={props.deselectAll}
						index={props.index}
						playlistControls={props.playlistControls}
						hideSelection={props.hideSelection || props.selecting !== undefined}
					/>
			)}

			{variant === 'row' && (
					<RowView
						game={game}
						openDetails={openDetails}
						onAutoFill={metadata ? () => metadata.open(game) : undefined}
						onFieldUpdate={handleFieldUpdate}
						playWithColors={playWithColors}
						gameStatusColor={gameStatus?.color || '#333'}
						platformColor={gamePlatform?.color || '#333'}
						playedStatusColor={gamePlayedStatus?.color || '#333'}
						onSelect={onSelect}
						isSelected={isSelected}
						deselectAll={props.selecting ? undefined : props.deselectAll}
						index={props.index}
						expanded={props.rowExpanded ?? false}
						hideSelection={props.hideSelection || props.selecting !== undefined}
					/>
			)}

			{variant === 'cover' && (
					<CoverView
						game={game}
						openDetails={openDetails}
						onAutoFill={metadata ? () => metadata.open(game) : undefined}
						onSelect={onSelect}
						isSelected={isSelected}
						index={props.index}
						gameStatusColor={gameStatus?.color}
						playWithColors={playWithColors}
						onFieldUpdate={handleFieldUpdate}
						hideSelection={props.hideSelection || props.selecting !== undefined}
					/>
			)}
				</div>{selection}
			</div>
		</>
	)
}

// Memoize GameCard to prevent unnecessary re-renders when props don't change
// Note: We use game from Redux inside the component, so we only need to check
// if the game ID, selection state, or variant changed. The component will
// automatically get updates from Redux when the game data changes.
export const GameCard = memo(GameCardComponent)
