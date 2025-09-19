import { useEffect, useState } from 'react'
import { Button, GameCard } from '@/components/elements'
import { useGames } from '@/hooks'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { setCardStyle } from '@/store/features/theme/themeSlice'
import type { GameQueryParameters } from '@/models/api/Game'
import './HomeComponent.scss'

const HomeComponent = () => {
	const { games, error, pagination, fetchGamesList, deleteGameById } = useGames()
	const dispatch = useAppDispatch()
	const cardStyle = useAppSelector((s) => s.theme.cardStyle ?? 'row')

	const [filters, setFilters] = useState<GameQueryParameters>({
		page: 1,
		pageSize: 200,
		search: '',
		sortBy: 'name',
		sortDescending: false,
	})

	const [selectedGames, setSelectedGames] = useState<number[]>([])

	const toggleGameSelection = (gameId: number, isSelected: boolean) => {
		setSelectedGames((prev) =>
			isSelected ? [...prev, gameId] : prev.filter((id) => id !== gameId)
		)
	}

	const handleSelectAll = () => {
		if (selectedGames.length === games.length) {
			setSelectedGames([])
		} else {
			setSelectedGames(games.map((game) => game.id))
		}
	}

	const handleBulkDelete = async () => {
		if (!window.confirm('Are you sure you want to delete the selected games?')) return
		try {
			await Promise.all(selectedGames.map((gameId) => deleteGameById(gameId)))
			setSelectedGames([])
			fetchGamesList(filters)
		} catch (error) {
			console.error('Error deleting games:', error)
		}
	}

	// Load games on component mount and when filters change
	useEffect(() => {
		fetchGamesList(filters)
	}, [filters, fetchGamesList])

	const handlePageChange = (newPage: number) => {
		setFilters((prev) => ({ ...prev, page: newPage }))
	}

	const handleSearchChange = (search: string) => {
		setFilters((prev) => ({ ...prev, search, page: 1 }))
	}

	const handleSortChange = (sortBy: string, sortDescending: boolean) => {
		setFilters((prev) => ({ ...prev, sortBy, sortDescending }))
	}

	const handleDeleteGame = async (gameId: number) => {
		if (!window.confirm('Are you sure you want to delete this game?')) return
		try {
			await deleteGameById(gameId)
			fetchGamesList(filters)
		} catch (error) {
			console.error('Error deleting game:', error)
		}
	}

	return (
		<div className='home-component'>
			{error && (
				<div className='home-component' style={{ padding: '1rem' }}>
					<h1>Error: {error}</h1>
					<Button title='Retry' onPress={() => fetchGamesList(filters)} />
				</div>
			)}

			{/* Search and Filters */}
			<div className='home-component__main'>
				<div className='admin-controls'>
					<div className='search-controls'>
						<input
							type='text'
							placeholder='Buscar juegos...'
							value={filters.search || ''}
							onChange={(e) => handleSearchChange(e.target.value)}
							className='search-input'
						/>
					</div>
					<div>
						{games.length > 0 && (
							<>
								{selectedGames.length > 0 && selectedGames.length !== games.length && (
									<button
										className='home-component__deselect-selected-button'
										onClick={() => setSelectedGames([])}>
										Deselect Selected
									</button>
								)}

								<button className='home-component__select-all-button' onClick={handleSelectAll}>
									{selectedGames.length === games.length ? 'Deselect All' : 'Select All'}
								</button>

								{selectedGames.length > 0 && (
									<button className='home-component__bulk-delete-button' onClick={handleBulkDelete}>
										Delete Selected
									</button>
								)}
							</>
						)}
					</div>
					<div className='sort-controls'>
						<label>Ordenar por:</label>
						<select
							value={filters.sortBy || 'name'}
							onChange={(e) => handleSortChange(e.target.value, filters.sortDescending || false)}>
							<option value='name'>Nombre</option>
							<option value='grade'>Calificación</option>
							<option value='critic'>Puntuación Crítica</option>
							<option value='released'>Fecha de Lanzamiento</option>
							<option value='started'>Fecha de Inicio</option>
						</select>
						<button
							className='sort-direction-btn'
							onClick={() => handleSortChange(filters.sortBy || 'name', !filters.sortDescending)}>
							{filters.sortDescending ? '↓' : '↑'}
						</button>
						<select
							className='search-input'
							value={cardStyle}
							onChange={(e) => dispatch(setCardStyle(e.target.value as 'card' | 'row' | 'tile'))}
							style={{
								textTransform: 'capitalize',
								padding: '8px 12px',
								borderRadius: '6px',
								marginLeft: 8,
							}}>
							<option value='card'>Card</option>
							<option value='row'>Row</option>
							<option value='tile'>Tile</option>
						</select>
					</div>
				</div>

				{/* Games Grid */}
				<div className={`home-component-games-${cardStyle}`}>
					{cardStyle === 'row' && (
						<div className='home-component-games-row-header'>
							<p className='gr-select'></p>
							<p className='gr-status'>Status</p>
							<p className='gr-name'>Name</p>
							<p className='gr-grade'>Grade</p>
							<p className='gr-critic'>Critic</p>
							<p className='gr-story'>Story</p>
							<p className='gr-completion'>100%</p>
							<p className='gr-score'>Score</p>
							<p className='gr-platform'>Platform</p>
							<p className='gr-released'>Released</p>
							<p className='gr-started'>Started</p>
							<p className='gr-finished'>Finished</p>
							<p className='gr-play-status'>Play Status</p>
							<p className='gr-comment'>Comment</p>
							<p className='gr-play-with'>Play With</p>
						</div>
					)}
					{games.length > 0 ? (
						games.map((game) => (
							<GameCard
								key={game.id}
								game={game}
								isSelected={selectedGames.includes(game.id)}
								onSelect={toggleGameSelection}
								onDelete={() => handleDeleteGame(game.id)}
								deselectAll={() => setSelectedGames([])}
								variant={cardStyle}
							/>
						))
					) : (
						<p className='home-component__no-games'>No games found.</p>
					)}
				</div>
				{/* Pagination */}
				<div className='pagination-controls'>
					<button
						className='pagination-btn'
						disabled={pagination.page <= 1}
						onClick={() => handlePageChange(pagination.page - 1)}>
						&lt;
					</button>
					<span className='pagination-info'>
						Página {pagination.page} de {pagination.totalPages} ({pagination.totalCount} elementos)
					</span>
					<button
						className='pagination-btn'
						disabled={pagination.page >= pagination.totalPages}
						onClick={() => handlePageChange(pagination.page + 1)}>
						&gt;
					</button>
				</div>
			</div>
		</div>
	)
}

export default HomeComponent
