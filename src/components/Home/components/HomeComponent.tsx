import { useEffect, useMemo, useRef, useState, useSyncExternalStore, lazy, Suspense } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { GameCard, GameCardSkeleton, ConfirmDialog, Toast } from '@/components/elements'
import { useGames, useGameViews } from '@/hooks'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { setCardStyle, setViewMode } from '@/store/features/theme/themeSlice'
import { setFilters as setGamesFilters, clearGamesRefresh } from '@/store/features/games/gamesSlice'
import { selectGamesFilters, selectNeedsRefresh } from '@/store/features/games/selector'
import type { GameQueryParameters } from '@/models/api/Game'
import type { GameView } from '@/models/api/GameView'
import type { BulkEditData } from './BulkEditModal'
import GameFiltersChips from './GameFiltersChips'
import SelectiveExportModal from './SelectiveExportModal'
import { CollectionIcon } from '@/components/Collection/CollectionIcon'
import { createNameSearch } from '@/utils/nameSearch'
import { collectionVersion, subscribeCollection } from '@/services/CollectionService/collectionEvents'
import { getGamesSummary } from '@/services/GamesService/GamesService'
import { useCollectionResource } from '@/hooks/useCollectionResource'
import { useDisplayedGames } from '@/hooks/useDisplayedGames'
import { recentGameViews } from '@/utils/recentGameViews'
import { recordGameViewUse, setGameViewPinned } from '@/services/GameViewService/GameViewService'
import { recordViewUsage, applyViewPins } from '@/store/features/gameViews/gameViewSlice'
import { GALLERY_PAGE_SIZE } from '@/utils/constants'
import './HomeComponent.scss'
import './GalleryLibrary.scss'
import { areFiltersEqual } from '@/utils/filterUtils/filterUtils'
import { useGameMetadata } from '@/components/Collection/gameMetadataContext'

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
	const { games, error, loading, lastAppliedFilters, pagination, refreshGames, deleteGameById, bulkUpdateGamesById } = useGames()
	const { publicGameViews, loadPublicGameViews } = useGameViews()

	const { t } = useTranslation()
	const [searchParams, setSearchParams] = useSearchParams()
	const collectionRevision = useSyncExternalStore(subscribeCollection, collectionVersion, collectionVersion)
	const dispatch = useAppDispatch()
	const cardStyle = useAppSelector((s) => s.theme.cardStyle ?? 'row')
	const token = useAppSelector((s) => s.auth.token)
	const ownerId = useAppSelector((s) => s.auth.user?.id)
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
	const metadata = useGameMetadata()
	const bulkImageRefreshing = Boolean(metadata?.batch?.busy && metadata.batch.artworkField)
	const bulkAutofillBusy = Boolean(metadata?.batch?.busy)
	const [selecting, setSelecting] = useState(false), [advancedColumns, setAdvancedColumns] = useState(false)
	const rawViewId = searchParams.get('viewId'), routeViewId = rawViewId ? Number(rawViewId) : undefined
	const invalidView = rawViewId !== null && (!Number.isSafeInteger(routeViewId) || Number(routeViewId) <= 0)
	const savedView = Boolean(rawViewId !== null || viewMode !== 'default')
	const summary = useCollectionResource('collection-summary', getGamesSummary)
	const query = useMemo<GameQueryParameters>(() => savedView ? { page: filters.page ?? 1, pageSize: filters.pageSize ?? GALLERY_PAGE_SIZE, ...(routeViewId ? { viewId: routeViewId } : { viewName: viewMode }) } : { ...filters, pageSize: filters.pageSize ?? GALLERY_PAGE_SIZE, viewId: undefined, viewName: undefined }, [filters, savedView, routeViewId, viewMode])
	const [viewError, setViewError] = useState<string | null>(null)
	const [readRevision, setReadRevision] = useState(0)
	const readFailed = Boolean(invalidView || viewError || error)
	const quickViews = recentGameViews(publicGameViews)
	const pinningSupported = publicGameViews.length > 0 && publicGameViews.every(view => Object.hasOwn(view, 'pinnedSlot'))
	const [pinBusy, setPinBusy] = useState<number | null>(null), [pinError, setPinError] = useState<'limit' | 'request' | null>(null)
	const pinRequest = useRef<AbortController | null>(null), pinOwner = useRef(ownerId)
	pinOwner.current = ownerId
	useEffect(() => {
		setPinBusy(null); setPinError(null)
		return () => { pinRequest.current?.abort(); pinRequest.current = null }
	}, [ownerId])
	const pinView = async (view: GameView) => {
		if (!ownerId || pinRequest.current || !pinningSupported) return
		const controller = new AbortController(), expectedOwner = ownerId
		pinRequest.current = controller; setPinBusy(view.id); setPinError(null)
		try {
			const index = quickViews.findIndex(candidate => candidate.id === view.id)
			const views = await setGameViewPinned(view.id, view.pinnedSlot == null, index >= 0 ? index + 1 : undefined, controller.signal)
			if (!controller.signal.aborted && pinOwner.current === expectedOwner) { dispatch(applyViewPins(views)); void loadPublicGameViews().catch(() => {}) }
		} catch (reason) { if (!controller.signal.aborted && pinOwner.current === expectedOwner) setPinError((reason as { status?: number }).status === 409 ? 'limit' : 'request') }
		finally { if (pinRequest.current === controller) { pinRequest.current = null; setPinBusy(null) } }
	}
	const pinControl = (view: GameView, current = false) => pinningSupported ? <button type='button' className={`gdb-view-pin${current && quickViews.some(candidate => candidate.id === view.id) ? ' gdb-view-pin--current' : ''}`} aria-label={t('gallery.library.pinView', { name: view.name })} title={t(view.pinnedSlot == null ? 'gallery.library.pinView' : 'gallery.library.unpinView', { name: view.name })} aria-pressed={view.pinnedSlot != null} aria-busy={pinBusy === view.id} disabled={pinBusy !== null} onClick={() => { void pinView(view) }}><CollectionIcon name={pinBusy === view.id ? 'refresh' : 'pin'} /></button> : null
	const selectedPublicView = publicGameViews.find(view => routeViewId ? view.id === routeViewId : savedView && view.name === viewMode)
	const [usageError, setUsageError] = useState(false)
	const usedViewId = savedView && !invalidView ? publicGameViews.find(view => routeViewId ? view.id === routeViewId : view.name === viewMode)?.id : undefined
	useDisplayedGames(invalidView || viewError || error ? [] : games, JSON.stringify(query), loading || !areFiltersEqual(query, lastAppliedFilters ?? null))
	useEffect(() => {
		if (!token || !usedViewId) return
		const controller = new AbortController(); setUsageError(false)
		void recordGameViewUse(usedViewId, controller.signal).then(views => { if (!controller.signal.aborted) dispatch(recordViewUsage(views)) }).catch(() => { if (!controller.signal.aborted) setUsageError(true) })
		return () => controller.abort()
	}, [usedViewId, dispatch, token])

	// Load public GameViews on mount
	useEffect(() => {
		if (!token) return
		loadPublicGameViews()
	}, [loadPublicGameViews, token])

	// An unavailable saved view stays unavailable; never silently show the whole library.
	useEffect(() => {
		if (!token || invalidView) return
		const controller = new AbortController()
		setViewError(null)
		void refreshGames(query, controller.signal).catch(() => { if (!controller.signal.aborted) setViewError(t('gallery.common.loadError')) })
		return () => controller.abort()
	}, [query, refreshGames, token, invalidView, t, collectionRevision, readRevision])
	useEffect(() => {
		if (!needsRefresh || invalidView) return
		dispatch(clearGamesRefresh()); void refreshGames(query).catch(() => setViewError(t('gallery.common.loadError')))
	}, [needsRefresh, dispatch, refreshGames, query, invalidView, t])
	const chooseView = (name: string) => {
		dispatch(setViewMode(name)); setFilters({ ...filters, page: 1 }); setSelectedGames([])
		const view = publicGameViews.find(value => value.name === name)
		setSearchParams(current => { if (view) current.set('viewId', String(view.id)); else current.delete('viewId'); return current })
	}

	const toggleGameSelection = (gameId: number, isSelected: boolean) => {
		setSelecting(true)
		setSelectedGames((prev) => (isSelected ? [...new Set([...prev, gameId])] : prev.filter((id) => id !== gameId)))
	}
	const selectionScope = JSON.stringify(query)
	useEffect(() => { setSelectedGames([]) }, [selectionScope, ownerId])
	const visibleSelectionIds = JSON.stringify(games.map(game => game.id))
	useEffect(() => {
		if (loading) return
		const visible = new Set<number>(JSON.parse(visibleSelectionIds))
		setSelectedGames(current => current.every(id => visible.has(id)) ? current : current.filter(id => visible.has(id)))
	}, [visibleSelectionIds, loading])

	const handleSelectAll = () => {
		if (selectedGames.length === games.length) setSelectedGames([])
		else { setSelecting(true); setSelectedGames([...new Set(games.map((g) => g.id))]) }
	}

	const handleBulkDelete = () => setPendingDelete({ kind: 'bulk' })

	const handleDeleteGame = (id: number) => setPendingDelete({ kind: 'single', id })

	const confirmDelete = async () => {
		if (!pendingDelete) return
		const target = pendingDelete
		setPendingDelete(null)
		let deleteError: unknown = null
		try {
			if (target.kind === 'bulk') {
				// SQLite serializes writes. Delete selected games one at a time so a
				// history write cannot make the next DELETE fail with a database lock.
				for (const id of selectedGames) {
					try {
						await deleteGameById(id)
					} catch (err) {
						deleteError = err
						console.error(`Error deleting game ${id}`, err)
					}
				}
				setSelectedGames([])
			} else {
				await deleteGameById(target.id)
			}
			await refreshGames(query)
		} catch (err) {
			deleteError = err
			console.error('Error deleting games', err)
		}
		if (deleteError) setToast({ message: t('home.bulkDeleteError'), type: 'error' })
	}

	const handlePageChange = (newPage: number) => setFilters({ ...filters, page: newPage })
	const handleSearchChange = (search: string) => setFilters({ ...filters, search: undefined, searchMetadata: false, nameSearch: search.trim() ? createNameSearch({ includeTerms: [search] }) : undefined, page: 1 })
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
			await refreshGames(query)
		} catch (err) {
			console.error('Error bulk editing games', err)
			throw err
		}
	}

	const handleBulkRefreshImages = (field: BulkImageField) => {
		if (bulkAutofillBusy) return
		const selectedSteamGames = games.filter((game: any) => selectedGames.includes(game.id) && game.steamAppId)
		if (selectedSteamGames.length === 0) {
			setToast({ message: t('home.bulkImageRefreshNoSteam'), type: 'error' })
			return
		}

		if (!metadata?.openArtworkBatch(selectedSteamGames.map(game => ({ id: game.id, name: game.name })), field)) setToast({ message: t('metadata.batch.startFailed'), type: 'error' })
	}
	const handleBulkAutofill = (options: { overwrite: boolean }) => {
		if (bulkAutofillBusy) return
		const selected = games.filter(game => selectedGames.includes(game.id)).map(game => ({ id: game.id, name: game.name }))
		if (!metadata?.openBatch(selected, options)) setToast({ message: t('metadata.batch.startFailed'), type: 'error' })
	}

	return (
		<div className='home-component gdb-page gdb-library' aria-busy={loading}>
			<div className='gdb-page-heading'>
				<div className='gdb-page-title'><h1 className='sr-only'>{t('gallery.library.title')}</h1><button type='button' className='gdb-count gdb-count-select' aria-label={`${t('gallery.common.games', { count: pagination.totalCount })} · ${t(selecting ? 'gallery.library.finishSelection' : 'gallery.library.select')}`} title={t(selecting ? 'gallery.library.finishSelection' : 'gallery.library.select')} aria-pressed={selecting} onClick={() => { setSelecting(value => !value); setSelectedGames([]) }}>{summary.data && pagination.totalCount !== summary.data.totalGames ? t('gallery.library.filteredCount', { count: pagination.totalCount, total: summary.data.totalGames }) : t('gallery.common.games', { count: pagination.totalCount })}</button></div>
				<div className='gdb-saved-views'>
					<div><button type='button' aria-pressed={!savedView} onClick={() => chooseView('default')}>{t('gallery.library.allGames')}</button>{quickViews.map(view => <span className='gdb-quick-view' key={view.id} data-active={routeViewId === view.id || !routeViewId && viewMode === view.name} data-pinned={view.pinnedSlot != null}><button type='button' className='gdb-quick-view__choose' aria-pressed={routeViewId === view.id || !routeViewId && viewMode === view.name} onClick={() => chooseView(view.name)} title={view.name}>{view.name}</button>{pinControl(view)}</span>)}</div>
					<label><span className='sr-only'>{t('home.view')}</span><select value={routeViewId ? publicGameViews.find(value => value.id === routeViewId)?.name ?? '__unlisted' : viewMode} onChange={event => chooseView(event.target.value)}><option value='default'>{t('gallery.library.allGames')}</option>{routeViewId && !publicGameViews.some(value => value.id === routeViewId) && <option value='__unlisted'>{t('gallery.home.view')}</option>}{publicGameViews.map(view => <option key={view.id} value={view.name}>{view.name}</option>)}</select></label>
					{selectedPublicView && pinControl(selectedPublicView, true)}
				</div>
			</div>
			{usageError && <p className='gdb-hint' role='status'>{t('gallery.library.recentFailed')}</p>}
			{pinError && <p className='gdb-hint' role='status'>{t(pinError === 'limit' ? 'gallery.library.pinLimit' : 'gallery.library.pinFailed')}</p>}
			{readFailed && <div className='gdb-error gdb-library-error' role='alert'><p>{t(invalidView ? 'gallery.library.viewUnavailable' : 'gallery.common.loadError')}</p>{!invalidView && <button type='button' className='gdb-button' disabled={loading} onClick={() => setReadRevision(value => value + 1)}>{t('gallery.common.retry')}</button>}</div>}

			<div className='home-component__main'>
				<GameFiltersChips
					filters={filters}
					onFiltersChange={(patch) => setFilters({ ...filters, ...patch })}
					onSearchChange={handleSearchChange}
					onSortChange={handleSortChange}
					viewMode={cardStyle}
					locked={savedView}
					appliedFilterCount={savedView ? publicGameViews.find(view => view.id === routeViewId || view.name === viewMode)?.filterCount ?? 0 : undefined}
					selecting={selecting || selectedGames.length > 0}
					onToggleSelection={() => { setSelecting(value => !value); setSelectedGames([]) }}
					onToggleColumns={cardStyle === 'row' ? () => setAdvancedColumns(value => !value) : undefined}
					onViewModeChange={(mode) => dispatch(setCardStyle(mode))}
					selectedCount={selectedGames.length}
					totalCount={games.length}
					resultCount={pagination.totalCount}
					onSelectAll={handleSelectAll}
					onDeselectAll={() => setSelectedGames([])}
					onBulkDelete={handleBulkDelete}
					onBulkEdit={() => setBulkEditOpen(true)}
					onBulkRefreshImages={handleBulkRefreshImages}
					bulkImagesDisabled={bulkImageRefreshing}
					onBulkAutofill={handleBulkAutofill}
					bulkAutofillBusy={bulkAutofillBusy}
					selectionKey={`${ownerId ?? 'anonymous'}:${JSON.stringify(query)}:${[...selectedGames].sort((a, b) => a - b).join(',')}`}
					onBulkExport={() => {
						const preSelected = games.filter((g: any) => selectedGames.includes(g.id)).map((g: any) => ({ id: g.id as number, name: g.name as string }))
						setExportPreSelected(preSelected)
						setExportModalOpen(true)
					}}
				/>
				{savedView && <p className='gdb-view-explanation'><CollectionIcon name='bookmark' />{t('gallery.library.savedViewHelp')}<button type='button' className='gdb-text-button' onClick={() => chooseView('default')}>{t('gallery.library.backToAll')}</button></p>}

				{cardStyle === 'row' && advancedColumns && <button type='button' className='gdb-text-button gdb-columns-toggle' aria-pressed onClick={() => setAdvancedColumns(false)}><CollectionIcon name='filter' />{t('gallery.library.advancedColumns')}</button>}
				<div className={`gdb-library-results ${advancedColumns ? 'gdb-library-results--extended' : ''}`}>
				{cardStyle === 'row' && !advancedColumns && !readFailed && <div className='gdb-row-heading'><span aria-hidden='true'>{t('gallery.library.rowGame')}</span><span aria-hidden='true'>{t('gallery.library.rowStory')}</span><span aria-hidden='true'>{t('gallery.library.rowPlaytime')}</span><span aria-hidden='true'>{t('gallery.library.rowGrade')}</span><span aria-hidden='true'>{t('home.columns.critic')}</span><span aria-hidden='true'>{t('home.columns.score')}</span><button type='button' className='gdb-icon-button' aria-label={t('gallery.library.advancedColumns')} aria-pressed={false} onClick={() => setAdvancedColumns(true)}><CollectionIcon name='filter' /></button></div>}
				<div className={`home-component-games-${cardStyle}`}>
					{cardStyle === 'row' && advancedColumns && !readFailed && (
						<div className='home-component-games-row-header'>
							<p className='gr-select'></p>
							{rowHeaderColumns.map((column) => renderRowHeaderColumn(column))}
						</div>
					)}

					{(() => {
						if (readFailed) return null
						const list = games
						if (loading && list.length === 0) {
							const skeletonCount = Math.min(pagination.pageSize || 12, 12)
							return Array.from({ length: skeletonCount }, (_, i) => <GameCardSkeleton key={i} variant={cardStyle} index={i} />)
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
								selecting={selecting || selectedGames.length > 0}
								rowExpanded={advancedColumns}
								index={index}
							/>
						))
					})()}
				</div>
				</div>

				{!readFailed && <div className='pagination-controls'>
					<button className='pagination-btn' aria-label={t('gallery.common.previous')} disabled={loading || pagination.page <= 1} onClick={() => handlePageChange(pagination.page - 1)}>
						&lt;
					</button>
					<span className='pagination-info'>{t('home.pagination', { page: pagination.page, total: pagination.totalPages, count: pagination.totalCount })}</span>
					<button className='pagination-btn' aria-label={t('gallery.common.next')} disabled={loading || pagination.page >= pagination.totalPages} onClick={() => handlePageChange(pagination.page + 1)}>
						&gt;
					</button>
				</div>}
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
