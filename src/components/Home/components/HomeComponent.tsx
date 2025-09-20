import { useEffect, useState } from 'react'
import { Button, GameCard } from '@/components/elements'
import { useGames } from '@/hooks'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { setCardStyle, setViewMode } from '@/store/features/theme/themeSlice'
import {
	setFilters as setGamesFilters,
	resetFilters as resetGamesFilters,
} from '@/store/features/games/gamesSlice'
import { selectGamesFilters } from '@/store/features/games/selector'
import type { GameQueryParameters } from '@/models/api/Game'
import GamesFilters from './GamesFilters'
import './HomeComponent.scss'

const HomeComponent = () => {
	const {
		games,
		error,
		pagination,
		fetchGamesList,
		refreshGames,
		deleteGameById,
		fetchReleasedAndStartedList,
		fetchStartedOrStatusList,
		fetchNoStartedByScoreList,
	} = useGames()

	const dispatch = useAppDispatch()
	const cardStyle = useAppSelector((s) => s.theme.cardStyle ?? 'row')
	const filters = useAppSelector(selectGamesFilters)
	const setFilters = (next: GameQueryParameters) => dispatch(setGamesFilters(next))
	const [selectedGames, setSelectedGames] = useState<number[]>([])
	const [filtersOpen, setFiltersOpen] = useState(false)
	const viewMode = useAppSelector((s) => s.theme.viewMode ?? 'default')

	// Load current view data
	useEffect(() => {
		const load = async () => {
			try {
				if (viewMode === 'default') {
					await refreshGames(filters)
					return
				}

				if (((filters as any)?.page ?? 1) !== 1) {
					dispatch(setGamesFilters({ ...filters, page: 1 }))
					return
				}

				if (viewMode === 'goty2025') {
					await fetchReleasedAndStartedList({ ...filters, year: 2025 })
					return
				}

				if (viewMode === 'goal2025') {
					await fetchStartedOrStatusList({ ...filters, year: 2025, status: 'Goal 2025' })
					return
				}

				if (viewMode === 'noStartedByScore') {
					await fetchNoStartedByScoreList({ ...filters })
					return
				}
			} catch (e) {
				console.error('Error loading view data', e)
			}
		}
		void load()
	}, [
		viewMode,
		fetchReleasedAndStartedList,
		fetchStartedOrStatusList,
		fetchNoStartedByScoreList,
		filters,
		refreshGames,
		dispatch,
	])

	// Default list loads only when in default view
	useEffect(() => {
		if (viewMode === 'default') void fetchGamesList(filters)
	}, [filters, fetchGamesList, viewMode])

	const hasActiveFilters = (f: GameQueryParameters) => {
		if (!f) return false
		const ignore = ['page', 'pageSize', 'sortBy', 'sortDescending']
		return Object.keys(f).some((k) => {
			if (ignore.includes(k)) return false
			const val = (f as any)[k]
			return val !== undefined && val !== null && val !== ''
		})
	}

	const toggleGameSelection = (gameId: number, isSelected: boolean) => {
		setSelectedGames((prev) =>
			isSelected ? [...prev, gameId] : prev.filter((id) => id !== gameId)
		)
	}

	const handleSelectAll = () => {
		if (selectedGames.length === games.length) setSelectedGames([])
		else setSelectedGames(games.map((g) => g.id))
	}

	const handleBulkDelete = async () => {
		if (!window.confirm('Are you sure you want to delete the selected games?')) return
		try {
			await Promise.all(selectedGames.map((id) => deleteGameById(id)))
			setSelectedGames([])
			fetchGamesList(filters)
		} catch (err) {
			console.error('Error deleting games', err)
		}
	}

	const handlePageChange = (newPage: number) => setFilters({ ...filters, page: newPage })
	const handleSearchChange = (search: string) => setFilters({ ...filters, search, page: 1 })
	const handleSortChange = (sortBy: string, sortDescending: boolean) =>
		setFilters({ ...filters, sortBy, sortDescending })

	const handleDeleteGame = async (id: number) => {
		if (!window.confirm('Are you sure you want to delete this game?')) return
		try {
			await deleteGameById(id)
			fetchGamesList(filters)
		} catch (err) {
			console.error('Error deleting game', err)
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

			<div className='home-component__main'>
				<div className='admin-controls'>
					<div className='controls-left'>
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

					<div className='controls-right'>
						<div className='search-controls'>
							<input
								type='text'
								placeholder='Buscar juegos...'
								value={filters.search || ''}
								onChange={(e) => handleSearchChange((e.target as HTMLInputElement).value)}
								className='controls-input'
							/>
						</div>

						<div className='sort-controls'>
							<label>Ordenar por:</label>
							<select
								value={filters.sortBy || 'name'}
								onChange={(e) =>
									handleSortChange(
										(e.target as HTMLSelectElement).value,
										filters.sortDescending || false
									)
								}>
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
						</div>

						<button className='controls-button' onClick={() => setFiltersOpen((s) => !s)}>
							{filtersOpen
								? 'Hide filters'
								: `Show filters${hasActiveFilters(filters) ? ' *' : ''}`}
						</button>

						<select
							className='controls-input'
							style={{ marginLeft: 8 }}
							value={viewMode}
							onChange={(e) => dispatch(setViewMode(e.target.value as any))}>
							<option value='default'>Default</option>
							<option value='goty2025'>GOTY 2025</option>
							<option value='goal2025'>Goal 2025</option>
							<option value='noStartedByScore'>Next up</option>
						</select>

						<select
							className='controls-input'
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

				<GamesFilters
					value={filters}
					onChange={(patch) => setFilters({ ...filters, ...patch })}
					onClear={() => {
						dispatch(resetGamesFilters())
						fetchGamesList({})
					}}
					isOpen={filtersOpen}
				/>

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

					{(() => {
						const list = games
						if (!list || list.length === 0)
							return <p className='home-component__no-games'>No games found.</p>
						return list.map((game: any) => (
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
					})()}
				</div>

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
