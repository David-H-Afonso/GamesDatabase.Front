import { useEffect, useState, useRef, lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, GameCard, GameCardSkeleton, ConfirmDialog, Toast } from '@/components/elements'
import { useGames, useGameViews } from '@/hooks'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { setCardStyle, setViewMode } from '@/store/features/theme/themeSlice'
import { setFilters as setGamesFilters, clearGamesRefresh } from '@/store/features/games/gamesSlice'
import { selectGamesFilters, selectNeedsRefresh } from '@/store/features/games/selector'
import type { GameQueryParameters } from '@/models/api/Game'
import { steamService } from '@/services'
import type { BulkEditData } from './BulkEditModal'
import GameFiltersChips from './GameFiltersChips'
import SelectiveExportModal from './SelectiveExportModal'
import './HomeComponent.scss'

const BulkEditModal = lazy(() => import('./BulkEditModal'))
type BulkImageField = 'logo' | 'hero' | 'cover'

const rowHeaderColumns = [
	{ className: 'gr-status', labelKey: 'home.columns.status', sortBy: 'status' },
	{ className: 'gr-name', labelKey: 'home.columns.name', sortBy: 'name' },
	{ className: 'gr-grade', labelKey: 'home.columns.grade', sortBy: 'grade' },
	{ className: 'gr-critic', labelKey: 'home.columns.critic', sortBy: 'critic' },
	{ className: 'gr-story', labelKey: 'home.columns.story', sortBy: 'storyDuration' },
	{ className: 'gr-completion', labelKey: 'home.columns.completion', sortBy: 'completionDuration' },
	{ className: 'gr-score', labelKey: 'home.columns.score', sortBy: 'score' },
	{ className: 'gr-platform', labelKey: 'home.columns.platform', sortBy: 'platform' },
	{ className: 'gr-released', labelKey: 'home.columns.released', sortBy: 'released' },
	{ className: 'gr-started', labelKey: 'home.columns.started', sortBy: 'started' },
	{ className: 'gr-finished', labelKey: 'home.columns.finished', sortBy: 'finished' },
	{ className: 'gr-play-status', labelKey: 'home.columns.playStatus', sortBy: 'playedStatus' },
	{ className: 'gr-comment', labelKey: 'home.columns.comment', sortBy: 'comment' },
	{ className: 'gr-play-with', labelKey: 'home.columns.playWith', sortBy: 'playWith' },
] as const

const HomeComponent = () => {
	const { games, error, loading, pagination, fetchGamesList, refreshGames, deleteGameById, bulkUpdateGamesById, updateGameById } = useGames()
	const { publicGameViews, loadPublicGameViews } = useGameViews()

	const { t } = useTranslation()
	const dispatch = useAppDispatch()
	const cardStyle = useAppSelector((s) => s.theme.cardStyle ?? 'row')
	const token = useAppSelector((s) => s.auth.token)
	const filters = useAppSelector(selectGamesFilters)
	const needsRefresh = useAppSelector(selectNeedsRefresh)
	const viewMode = useAppSelector((s) => s.theme.viewMode ?? 'default')
	const setFilters = (next: GameQueryParameters) => dispatch(setGamesFilters(next))
	const [selectedGames, setSelectedGames] = useState<number[]>([])
	const [bulkEditOpen, setBulkEditOpen] = useState(false)
	const [exportModalOpen, setExportModalOpen] = useState(false)
	const [exportPreSelected, setExportPreSelected] = useState<Array<{ id: number; name: string }>>([])
	const [pendingDelete, setPendingDelete] = useState<{ kind: 'bulk' } | { kind: 'single'; id: number } | null>(null)
	const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
	const [bulkImageRefreshing, setBulkImageRefreshing] = useState(false)
	const filtersRef = useRef(filters)
	useEffect(() => {
		filtersRef.current = filters
	}, [filters])

	// Refresh games when the header Import button signals completion via Redux
	useEffect(() => {
		if (!needsRefresh) return
		dispatch(clearGamesRefresh())
		void refreshGames(viewMode === 'default' ? { ...filtersRef.current } : { ...filtersRef.current, viewName: viewMode })
	}, [needsRefresh, dispatch, refreshGames, viewMode])
	const [viewError, setViewError] = useState<string | null>(null)

	const prevViewModeRef = useRef<string>(viewMode)

	// Prevent infinite retry loops when view fails
	const retryCountRef = useRef<Map<string, number>>(new Map())
	const lastErrorTimeRef = useRef<Map<string, number>>(new Map())
	const MAX_RETRIES = 2
	const RETRY_RESET_TIME = 30000 // Reset retry count after 30 seconds

	// Load public GameViews on mount
	useEffect(() => {
		if (!token) return
		loadPublicGameViews()
	}, [loadPublicGameViews, token])

	// Force reload on component mount to handle page refresh (F5)
	const hasMountedRef = useRef(false)

	// Load current view data with error protection
	useEffect(() => {
		if (!token) return

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

				// Only reset to page 1 when the view actually changes, not on every filter/page update
				if (prevViewModeRef.current !== viewMode) {
					prevViewModeRef.current = viewMode
					if (((filters as any)?.page ?? 1) !== 1) {
						dispatch(setGamesFilters({ ...filters, page: 1 }))
						return
					}
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
	}, [viewMode, filters, refreshGames, fetchGamesList, dispatch, token])

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

	const handleBulkDelete = () => setPendingDelete({ kind: 'bulk' })

	const handleDeleteGame = (id: number) => setPendingDelete({ kind: 'single', id })

	const confirmDelete = async () => {
		if (!pendingDelete) return
		const target = pendingDelete
		setPendingDelete(null)
		try {
			if (target.kind === 'bulk') {
				await Promise.all(selectedGames.map((id) => deleteGameById(id)))
				setSelectedGames([])
			} else {
				await deleteGameById(target.id)
			}
			fetchGamesList(filters)
		} catch (err) {
			console.error('Error deleting games', err)
		}
	}

	const handlePageChange = (newPage: number) => setFilters({ ...filters, page: newPage })
	const handleSearchChange = (search: string) => setFilters({ ...filters, search, page: 1 })
	const handleSortChange = (sortBy: string, sortDescending: boolean) => setFilters({ ...filters, sortBy, sortDescending })
	const handleRowHeaderSort = (sortBy: string) => {
		const isCurrentSort = filters.sortBy === sortBy
		setFilters({ ...filters, sortBy, sortDescending: isCurrentSort ? !filters.sortDescending : false, page: 1 })
	}

	const renderRowHeaderColumn = (column: (typeof rowHeaderColumns)[number]) => {
		const label = t(column.labelKey)
		const isCurrentSort = filters.sortBy === column.sortBy
		const sortIndicator = filters.sortDescending ? '↓' : '↑'

		return (
			<p key={column.className} className={column.className}>
				<button
					type='button'
					className={`home-component-games-row-header-sort${isCurrentSort ? ' is-active' : ''}`}
					onClick={() => handleRowHeaderSort(column.sortBy)}
					aria-label={`${t('home.filters.sortBy')}: ${label}`}
					aria-pressed={isCurrentSort}
					title={`${t('home.filters.sortBy')}: ${label}`}>
					<span>{label}</span>
					{isCurrentSort && (
						<span className='home-component-games-row-header-sort__indicator' aria-hidden='true'>
							{sortIndicator}
						</span>
					)}
				</button>
			</p>
		)
	}

	const handleBulkEdit = async (updates: BulkEditData) => {
		try {
			const result = await bulkUpdateGamesById({
				gameIds: selectedGames,
				...updates,
			})

			// Type assertion since we know the shape of the result
			const bulkResult = result as { updatedCount: number; totalRequested: number }
			setToast({ message: t('home.bulkUpdateSuccess', { updated: bulkResult.updatedCount, total: bulkResult.totalRequested }), type: 'success' })
			setSelectedGames([])
			setBulkEditOpen(false)
			await refreshGames(filters)
		} catch (err) {
			console.error('Error bulk editing games', err)
			throw err
		}
	}

	const handleBulkRefreshImages = async (field: BulkImageField) => {
		if (bulkImageRefreshing) return
		const selectedSteamGames = games.filter((game: any) => selectedGames.includes(game.id) && game.steamAppId)
		if (selectedSteamGames.length === 0) {
			setToast({ message: t('home.bulkImageRefreshNoSteam'), type: 'error' })
			return
		}

		setBulkImageRefreshing(true)
		try {
			const results = await Promise.allSettled(
				selectedSteamGames.map(async (game: any) => {
					await updateGameById(game.id, { [field]: null } as any)
					await steamService.syncGame(game.id)
				})
			)
			const updated = results.filter((result) => result.status === 'fulfilled').length
			const failed = results.length - updated
			setToast({
				message: t(failed > 0 ? 'home.bulkImageRefreshPartial' : 'home.bulkImageRefreshSuccess', { updated, total: selectedSteamGames.length, field: t(`home.imageFields.${field}`) }),
				type: failed > 0 ? 'error' : 'success',
			})
			setSelectedGames([])
			await refreshGames(filters)
		} catch (err) {
			console.error('Error refreshing selected images', err)
			setToast({ message: t('home.bulkImageRefreshError'), type: 'error' })
		} finally {
			setBulkImageRefreshing(false)
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
						onBulkRefreshImages={handleBulkRefreshImages}
						bulkImagesDisabled={bulkImageRefreshing}
						onBulkExport={() => {
						const preSelected = games.filter((g: any) => selectedGames.includes(g.id)).map((g: any) => ({ id: g.id as number, name: g.name as string }))
						setExportPreSelected(preSelected)
						setExportModalOpen(true)
					}}
				/>

				<div className={`home-component-games-${cardStyle}`}>
					{cardStyle === 'row' && (
						<div className='home-component-games-row-header'>
							<p className='gr-select'></p>
							{rowHeaderColumns.map((column) => renderRowHeaderColumn(column))}
						</div>
					)}

					{(() => {
						const list = games
						if (loading && list.length === 0) {
							const skeletonCount = Math.min(pagination.pageSize || 12, 12)
							return Array.from({ length: skeletonCount }, (_, i) => (
								<GameCardSkeleton key={i} variant={cardStyle} index={i} />
							))
						}
						if (!list || list.length === 0) return <p className='home-component__no-games'>{t('home.noGames')}</p>
						return list.map((game: any, index: number) => (
							<GameCard
								key={game.id}
								game={game}
								isSelected={selectedGames.includes(game.id)}
								onSelect={toggleGameSelection}
								onDelete={() => handleDeleteGame(game.id)}
								deselectAll={() => setSelectedGames([])}
								variant={cardStyle}
								index={index}
							/>
						))
					})()}
				</div>

				<div className='pagination-controls'>
					<button className='pagination-btn' disabled={pagination.page <= 1} onClick={() => handlePageChange(pagination.page - 1)}>
						&lt;
					</button>
					<span className='pagination-info'>{t('home.pagination', { page: pagination.page, total: pagination.totalPages, count: pagination.totalCount })}</span>
					<button className='pagination-btn' disabled={pagination.page >= pagination.totalPages} onClick={() => handlePageChange(pagination.page + 1)}>
						&gt;
					</button>
				</div>
			</div>

			<Suspense fallback={null}>
				<BulkEditModal isOpen={bulkEditOpen} onClose={() => setBulkEditOpen(false)} selectedCount={selectedGames.length} onSave={handleBulkEdit} />
			</Suspense>
			<SelectiveExportModal isOpen={exportModalOpen} onClose={() => setExportModalOpen(false)} preSelectedGames={exportPreSelected} />

			<ConfirmDialog
				isOpen={pendingDelete !== null}
				title={t('common.confirmDeleteTitle')}
				message={pendingDelete?.kind === 'bulk' ? t('home.confirmDeleteSelected') : t('home.confirmDeleteGame')}
				variant='danger'
				confirmLabel={t('common.delete')}
				onConfirm={confirmDelete}
				onCancel={() => setPendingDelete(null)}
			/>
			<Toast isOpen={toast !== null} message={toast?.message ?? ''} type={toast?.type} onClose={() => setToast(null)} />
		</div>
	)
}

export default HomeComponent
