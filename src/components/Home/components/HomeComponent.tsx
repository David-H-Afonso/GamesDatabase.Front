import { useEffect, useState, useRef } from 'react'
import { Button, GameCard } from '@/components/elements'
import { useGames, useGameViews } from '@/hooks'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { setCardStyle, setViewMode } from '@/store/features/theme/themeSlice'
import { setFilters as setGamesFilters } from '@/store/features/games/gamesSlice'
import { selectGamesFilters } from '@/store/features/games/selector'
import type { GameQueryParameters } from '@/models/api/Game'
import GameFiltersChips from './GameFiltersChips'
import BulkEditModal, { type BulkEditData } from './BulkEditModal'
import './HomeComponent.scss'

const HomeComponent = () => {
	const { games, error, pagination, fetchGamesList, refreshGames, deleteGameById, bulkUpdateGamesById } = useGames()
	const { publicGameViews, loadPublicGameViews } = useGameViews()

	const dispatch = useAppDispatch()
	const cardStyle = useAppSelector((s) => s.theme.cardStyle ?? 'row')
	const filters = useAppSelector(selectGamesFilters)
	const setFilters = (next: GameQueryParameters) => dispatch(setGamesFilters(next))
	const [selectedGames, setSelectedGames] = useState<number[]>([])
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

	// Force reload on component mount to handle page refresh (F5)
	const hasMountedRef = useRef(false)

	// Load current view data with error protection
	useEffect(() => {
		const load = async () => {
			const isFirstMount = !hasMountedRef.current
			// Mark as mounted after first check
			if (isFirstMount) {
				hasMountedRef.current = true
			}

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
					console.error(`View "${viewMode}" failed ${MAX_RETRIES} times. Falling back to default view.`)
					setViewError(`Failed to load view "${viewMode}". Switched to default view.`)
					dispatch(setViewMode('default'))
					retryCountRef.current.delete(viewMode)
					lastErrorTimeRef.current.delete(viewMode)
					return
				}

				// Force refresh on first mount to handle F5 reload, otherwise use cache
				if (isFirstMount) {
					await refreshGames({ ...filters, viewName: viewMode })
				} else {
					await fetchGamesList({ ...filters, viewName: viewMode })
				}
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

	const toggleGameSelection = (gameId: number, isSelected: boolean) => {
		setSelectedGames((prev) => (isSelected ? [...prev, gameId] : prev.filter((id) => id !== gameId)))
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
	const handleSortChange = (sortBy: string, sortDescending: boolean) => setFilters({ ...filters, sortBy, sortDescending })

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
					<button className='home-component__alert-close' onClick={() => setViewError(null)} aria-label='Close alert'>
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
				<GameFiltersChips
					filters={filters}
					onFiltersChange={(patch) => setFilters({ ...filters, ...patch })}
					onSearchChange={handleSearchChange}
					onSortChange={handleSortChange}
					viewMode={cardStyle}
					onViewModeChange={(mode) => dispatch(setCardStyle(mode))}
					publicGameViews={publicGameViews}
					currentView={viewMode}
					onViewChange={(viewName) => dispatch(setViewMode(viewName as any))}
					selectedCount={selectedGames.length}
					onSelectAll={handleSelectAll}
					onDeselectAll={() => setSelectedGames([])}
					onBulkDelete={handleBulkDelete}
					onBulkEdit={() => setBulkEditOpen(true)}
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
						if (!list || list.length === 0) return <p className='home-component__no-games'>No games found.</p>
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
					<button className='pagination-btn' disabled={pagination.page <= 1} onClick={() => handlePageChange(pagination.page - 1)}>
						&lt;
					</button>
					<span className='pagination-info'>
						Página {pagination.page} de {pagination.totalPages} ({pagination.totalCount} juegos)
					</span>
					<button className='pagination-btn' disabled={pagination.page >= pagination.totalPages} onClick={() => handlePageChange(pagination.page + 1)}>
						&gt;
					</button>
				</div>
			</div>

			<BulkEditModal isOpen={bulkEditOpen} onClose={() => setBulkEditOpen(false)} selectedCount={selectedGames.length} onSave={handleBulkEdit} />
		</div>
	)
}

export default HomeComponent
