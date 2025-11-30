import { useEffect, useState, useRef } from 'react'
import { Button, GameCard } from '@/components/elements'
import { useGames, useGameViews } from '@/hooks'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { setCardStyle, setViewMode } from '@/store/features/theme/themeSlice'
import {
	setFilters as setGamesFilters,
	resetFilters as resetGamesFilters,
} from '@/store/features/games/gamesSlice'
import { selectGamesFilters } from '@/store/features/games/selector'
import type { GameQueryParameters } from '@/models/api/Game'
import GamesFilters from './GamesFilters'
import BulkEditModal, { type BulkEditData } from './BulkEditModal'
import './HomeComponent.scss'

const HomeComponent = () => {
	const {
		games,
		error,
		pagination,
		fetchGamesList,
		refreshGames,
		deleteGameById,
		bulkUpdateGamesById,
	} = useGames()
	const { publicGameViews, loadPublicGameViews } = useGameViews()

	const dispatch = useAppDispatch()
	const cardStyle = useAppSelector((s) => s.theme.cardStyle ?? 'row')
	const filters = useAppSelector(selectGamesFilters)
	const setFilters = (next: GameQueryParameters) => dispatch(setGamesFilters(next))
	const [selectedGames, setSelectedGames] = useState<number[]>([])
	const [filtersOpen, setFiltersOpen] = useState(false)
	const [bulkEditOpen, setBulkEditOpen] = useState(false)
	const viewMode = useAppSelector((s) => s.theme.viewMode ?? 'default')
	const [viewError, setViewError] = useState<string | null>(null)

	// Prevent infinite retry loops when view fails
	const retryCountRef = useRef<Map<string, number>>(new Map())
	const lastErrorTimeRef = useRef<Map<string, number>>(new Map())
	const MAX_RETRIES = 2
	const RETRY_RESET_TIME = 30000 // Reset retry count after 30 seconds

	// Load public GameViews on mount
	useEffect(() => {
		loadPublicGameViews()
	}, [loadPublicGameViews])

	// Always reload data when Home component mounts (from any route)
	useEffect(() => {
		// Reload current view
		if (viewMode === 'default') {
			void refreshGames(filters)
		} else {
			void fetchGamesList({ ...filters, viewName: viewMode })
		}
	}, []) // Empty deps = only run on mount

	// Load current view data with error protection
	useEffect(() => {
		const load = async () => {
			try {
				if (viewMode === 'default') {
					await refreshGames(filters)
					setViewError(null)
					return
				}

				if (((filters as any)?.page ?? 1) !== 1) {
					dispatch(setGamesFilters({ ...filters, page: 1 }))
					return
				}

				// Check retry count for this view
				const currentTime = Date.now()
				const lastErrorTime = lastErrorTimeRef.current.get(viewMode) || 0
				const retryCount = retryCountRef.current.get(viewMode) || 0

				// Reset retry count if enough time has passed
				if (currentTime - lastErrorTime > RETRY_RESET_TIME) {
					retryCountRef.current.set(viewMode, 0)
				}

				// If we've exceeded max retries, fallback to default view
				if (retryCount >= MAX_RETRIES) {
					console.error(
						`View "${viewMode}" failed ${MAX_RETRIES} times. Falling back to default view.`
					)
					setViewError(`Failed to load view "${viewMode}". Switched to default view.`)
					dispatch(setViewMode('default'))
					retryCountRef.current.delete(viewMode)
					lastErrorTimeRef.current.delete(viewMode)
					return
				}

				// Use the new GameView system
				await fetchGamesList({ ...filters, viewName: viewMode })

				// Success - reset retry count
				retryCountRef.current.set(viewMode, 0)
				setViewError(null)
			} catch (e) {
				console.error('Error loading view data', e)

				// Increment retry count
				const currentRetries = retryCountRef.current.get(viewMode) || 0
				retryCountRef.current.set(viewMode, currentRetries + 1)
				lastErrorTimeRef.current.set(viewMode, Date.now())

				// If this was the last retry, the next effect run will trigger fallback
				if (currentRetries + 1 >= MAX_RETRIES) {
					setViewError(`View "${viewMode}" failed to load. Switching to default view...`)
					// Use setTimeout to avoid state update during render
					setTimeout(() => {
						dispatch(setViewMode('default'))
					}, 100)
				}
			}
		}
		void load()
	}, [viewMode, filters, refreshGames, fetchGamesList, dispatch])

	// Auto-dismiss error after 5 seconds
	useEffect(() => {
		if (viewError) {
			const timer = setTimeout(() => {
				setViewError(null)
			}, 5000)
			return () => clearTimeout(timer)
		}
	}, [viewError])

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

	const handleBulkEdit = async (updates: BulkEditData) => {
		try {
			const result = await bulkUpdateGamesById({
				gameIds: selectedGames,
				...updates,
			})

			// Type assertion since we know the shape of the result
			const bulkResult = result as { updatedCount: number; totalRequested: number }
			alert(`Successfully updated ${bulkResult.updatedCount} of ${bulkResult.totalRequested} games`)
			setSelectedGames([])
			setBulkEditOpen(false)
			await refreshGames(filters)
		} catch (err) {
			console.error('Error bulk editing games', err)
			throw err
		}
	}

	return (
		<div className='home-component'>
			{viewError && (
				<div className='home-component__alert home-component__alert--warning'>
					<span>{viewError}</span>
					<button
						className='home-component__alert-close'
						onClick={() => setViewError(null)}
						aria-label='Close alert'>
						×
					</button>
				</div>
			)}

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

								{selectedGames.length > 0 && (
									<button
										className='home-component__bulk-edit-button'
										onClick={() => setBulkEditOpen(true)}>
										Edit Selected ({selectedGames.length})
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
								<option value='score'>Score</option>
								<option value='storyDuration'>Story</option>
								<option value='completionDuration'>Completion</option>
								<option value='status'>Status</option>
								<option value='createdat'>Fecha de Creación</option>
								<option value='updatedat'>Última Modificación</option>
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
							{publicGameViews.map((view) => (
								<option key={view.id} value={view.name}>
									{view.name}
								</option>
							))}
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

			<BulkEditModal
				isOpen={bulkEditOpen}
				onClose={() => setBulkEditOpen(false)}
				selectedCount={selectedGames.length}
				onSave={handleBulkEdit}
			/>
		</div>
	)
}

export default HomeComponent
