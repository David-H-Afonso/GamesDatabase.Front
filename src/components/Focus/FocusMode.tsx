import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePlaylists } from '@/hooks'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { refreshCurrentPlaylist } from '@/store/features/playlists/playlistSlice'
import { getPlaylistById } from '@/services/PlaylistService/PlaylistService'
import { getGames } from '@/services/GamesService/GamesService'
import { effectivePlaytime, formatCollectionNumber } from '@/utils/collectionFormatting'
import type { Game } from '@/models/api/Game'
import type { PlaylistItem } from '@/models/api/Playlist'
import { CollectionGameDetails as GameDetails } from '@/components/Collection/CollectionGameDetailsLazy'
import { steamService } from '@/services/SteamService/SteamService'
import type { Playlist, PlaylistSummary } from '@/models/api/Playlist'
import './GalleryFocus.scss'
import { GameArtwork } from '@/components/Collection/GameArtwork'
import { CollectionSheet } from '@/components/Collection/CollectionSheet'
import { CollectionIcon } from '@/components/Collection/CollectionIcon'
import { SampleBadge } from '@/components/Collection/SampleBadge'
import { isGameCompleted as isCompleted, isGameFullyCompleted, completionTitleKey } from '@/utils/gameCompletion'
import { FOCUS_PLAYLIST_NAME, FOCUS_GAME_LIMIT, getFocusStorageKey, readFocusPlaylistId, resolveFocusPlaylist } from '@/utils/focusPlaylist'
import { manualPlaylist, playlistSummaries } from '@/services/CollectionService/PlaylistCollectionService'

const SEARCH_DEBOUNCE_MS = 250
const focusHours = (hours: number | null | undefined, language: string) => hours == null ? '—' : `${formatCollectionNumber(hours, language)} h`

const FocusMark = () => (
	<svg viewBox='0 0 32 32' fill='none' aria-hidden='true'>
		<circle cx='16' cy='16' r='11.5' stroke='currentColor' strokeWidth='1.5' />
		<circle cx='16' cy='16' r='6.5' stroke='currentColor' strokeWidth='1.5' />
		<circle cx='16' cy='16' r='1.5' fill='currentColor' />
		<path d='M16 1.5v5M16 25.5v5M1.5 16h5M25.5 16h5' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
	</svg>
)

const SearchMark = () => (
	<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' aria-hidden='true'>
		<circle cx='10.8' cy='10.8' r='6.8' />
		<path d='m16 16 4.2 4.2' />
	</svg>
)

const FocusQueueCard = ({
	item,
	onMakeCurrent,
	onOpen,
	featured,
}: {
	item: PlaylistItem
	onMakeCurrent: () => void
	onOpen: () => void
	featured: boolean
}) => {
	const { t, i18n } = useTranslation()
	const game = item.game
	const [touchActions, setTouchActions] = useState(false)
	const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
	const held = useRef(false)
	const clearHold = () => { if (holdTimer.current) clearTimeout(holdTimer.current) }
	useEffect(() => clearHold, [])
	const minutes = effectivePlaytime(game)
	const time = focusHours(minutes == null ? null : minutes / 60, i18n.language)

	return (
		<article className={`focus-queue-card${featured ? ' is-featured' : ''}${touchActions ? ' is-touch-active' : ''}`}>
			<button type='button' className='focus-queue-card__main' onClick={() => { if (held.current) { held.current = false; return } onOpen() }} aria-label={t('focus.openGame', { name: game.name })}
				onPointerDown={event => { if (event.pointerType !== 'touch') return; held.current = false; clearHold(); holdTimer.current = setTimeout(() => { held.current = true; setTouchActions(true) }, 500) }}
				onPointerUp={clearHold} onPointerCancel={clearHold} onPointerMove={clearHold} onContextMenu={event => { if (touchActions) event.preventDefault() }}>
				<GameArtwork game={game} role='hero' decorative className='focus-queue-card__cover' />
				<span className='focus-queue-card__copy'>
					<strong>{game.name}</strong>
					<SampleBadge game={game} />
					<span className='focus-queue-card__metadata'>{game.platformName || t('focus.platformNotSet')}{minutes != null && <> · {time}</>}</span>
				</span>
			</button>
			<div className='focus-queue-card__actions'>
				<button type='button' className='focus-icon-button focus-feature-trigger' onClick={onMakeCurrent} aria-pressed={featured} aria-label={t('focus.makeCurrentFor', { name: game.name })} title={t('focus.makeCurrent')}>{featured ? <CollectionIcon name='check' /> : <CollectionIcon name='focus' />}</button>
			</div>
			{isCompleted(game) && <span className='focus-completed' aria-label={t(isGameFullyCompleted(game) ? 'focus.completed' : completionTitleKey(game))}>{isGameFullyCompleted(game) ? '100%' : '✓'}</span>}
		</article>
	)
}

export default function FocusMode() {
	const ownerId = useAppSelector(state => state.auth.user?.id)
	return <OwnedFocusMode key={ownerId ?? 'anonymous'} />
}

/** Local selection, search and in-flight sync must never cross an account boundary. */
function OwnedFocusMode() {
	const { t, i18n } = useTranslation()
	const userId = useAppSelector(state => state.auth.user?.id)
	const dispatch = useAppDispatch()
	const { fetchAll, fetchById, create, addItem, removeItem, reorderItems } = usePlaylists()
	const [focusSummaries, setFocusSummaries] = useState<PlaylistSummary[]>([])
	const [managing, setManaging] = useState(false)
	const [featuredGameId, setFeaturedGameId] = useState<number | null>(null)
	const [focusPlaylistId, setFocusPlaylistId] = useState<number | null>(null)
	const [playlistsLoaded, setPlaylistsLoaded] = useState(false)
	const [playlistLoading, setPlaylistLoading] = useState(false)
	const [focusDetail, setFocusPlaylist] = useState<Playlist | null>(null)
	const focusPlaylist = focusDetail?.id === focusPlaylistId ? focusDetail : null
	const activeFocusId = useRef(focusPlaylistId)
	activeFocusId.current = focusPlaylistId
	const [creating, setCreating] = useState(false)
	const [query, setQuery] = useState('')
	const [searchResults, setSearchResults] = useState<Game[]>([])
	const [searching, setSearching] = useState(false)
	const [addingGameId, setAddingGameId] = useState<number | null>(null)
	const [busyItemId, setBusyItemId] = useState<number | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [searchError, setSearchError] = useState(false)
	const [detailGame, setDetailGame] = useState<Game | null>(null)
	const searchInputRef = useRef<HTMLInputElement>(null)
	const searchRequestRef = useRef(0)
	const syncedGamesRef = useRef(new Set<number>())
	const mountedRef = useRef(false)
	const [steamUpdating, setSteamUpdating] = useState(false)
	const [steamFailed, setSteamFailed] = useState(false)
	const [listFailed, setListFailed] = useState(false), [detailFailed, setDetailFailed] = useState(false), [loadRevision, setLoadRevision] = useState(0)
	const loadFailed = listFailed || detailFailed
	const displayError = loadFailed ? t('focus.loadError') : error
	const focusRevision = useRef(0), mutationActive = useRef(false)
	const invalidateFocusRefresh = useCallback(() => { setSteamUpdating(false); return ++focusRevision.current }, [])

	// The shared route cache can be replaced/refreshed by other playlist consumers.
	// Render only the independently loaded, validated Focus detail and its own writes.
	const allItems = focusPlaylist?.items ?? []
	const visibleItems = allItems.slice(0, FOCUS_GAME_LIMIT)
	const currentItem = visibleItems.find(item => item.gameId === featuredGameId) ?? visibleItems[0]
	const currentGame = currentItem?.game
	const focusCapacity = Math.min(focusPlaylist?.maxLength ?? FOCUS_GAME_LIMIT, FOCUS_GAME_LIMIT)
	const remainingCapacity = Math.max(0, focusCapacity - allItems.length)

	useEffect(() => {
		mountedRef.current = true
		return () => { mountedRef.current = false }
	}, [])

	useEffect(() => {
		let cancelled = false
		void fetchAll()
			.then(value => { const summaries = playlistSummaries(value as PlaylistSummary[]); if (!cancelled) { setFocusSummaries(summaries); setListFailed(false); setPlaylistsLoaded(true) } })
			.catch(() => {
				if (!cancelled) {
					setListFailed(true)
					setPlaylistsLoaded(true)
				}
			})
		return () => { cancelled = true }
	}, [fetchAll, t, loadRevision])

	useEffect(() => {
		if (!playlistsLoaded || listFailed || focusSummaries.some(list => list.id === focusPlaylistId && !list.isAutomatic)) return
		const found = resolveFocusPlaylist(focusSummaries, readFocusPlaylistId(userId))
		if ((found?.id ?? null) !== focusPlaylistId) { setError(null); setFocusPlaylistId(found?.id ?? null) }
	}, [focusPlaylistId, focusSummaries, playlistsLoaded, listFailed, userId])

	useEffect(() => {
		if (focusPlaylistId === null) { setFocusPlaylist(null); setPlaylistLoading(false); setDetailFailed(false); return }
		if (!playlistsLoaded || listFailed || !focusSummaries.some(list => list.id === focusPlaylistId && !list.isAutomatic)) return
		let cancelled = false
		const revision = invalidateFocusRefresh()
		setPlaylistLoading(true)
		setFocusPlaylist(null)
		setDetailFailed(false)
		void fetchById(focusPlaylistId)
			.then(value => { const detail = manualPlaylist(value as Playlist, focusPlaylistId); if (!cancelled && focusRevision.current === revision) setFocusPlaylist(detail) })
			.catch(() => { if (!cancelled && focusRevision.current === revision) setDetailFailed(true) })
			.finally(() => { if (!cancelled) setPlaylistLoading(false) })
		return () => { cancelled = true }
	}, [fetchById, focusPlaylistId, t, loadRevision, playlistsLoaded, listFailed, focusSummaries, invalidateFocusRefresh])

	useEffect(() => {
		if (!focusPlaylist || playlistLoading) return
		const steamGames = visibleItems.filter(item => item.game.steamAppId && !syncedGamesRef.current.has(item.gameId))
		if (!steamGames.length) return
		steamGames.forEach(item => syncedGamesRef.current.add(item.gameId))
		setSteamUpdating(true)
		setSteamFailed(false)
		const revision = focusRevision.current
		const current = () => mountedRef.current && activeFocusId.current === focusPlaylist.id && focusRevision.current === revision
		void (async () => {
			let failed = false
			for (const item of steamGames) {
				if (!current()) return
				try { const result = await steamService.syncGame(item.gameId); if (result.success === false || result.error || result.errors?.length) failed = true }
				catch { failed = true }
			}
			if (!current()) return
			try {
				const refreshed = manualPlaylist(await getPlaylistById(focusPlaylist.id), focusPlaylist.id)
				if (!current()) return
				setFocusPlaylist(refreshed)
				dispatch(refreshCurrentPlaylist(refreshed))
			} catch { failed = true }
			if (!current()) return
			setSteamFailed(failed)
			setSteamUpdating(false)
		})()
	}, [focusPlaylist, playlistLoading, dispatch, visibleItems])

	useEffect(() => {
		const term = query.trim()
		if (!term || !focusPlaylist || remainingCapacity === 0) {
			searchRequestRef.current++
			setSearchResults([])
			setSearching(false)
			setSearchError(false)
			return
		}

		setSearching(true)
		setSearchError(false)
		const requestId = ++searchRequestRef.current
		const controller = new AbortController()
		const timer = window.setTimeout(async () => {
			try {
				const result = await getGames({ search: term, page: 1, pageSize: 8 }, controller.signal)
				if (searchRequestRef.current === requestId) setSearchResults(result.data ?? [])
			} catch {
				if (searchRequestRef.current === requestId) {
					setSearchResults([])
					setSearchError(true)
				}
			} finally {
				if (searchRequestRef.current === requestId) setSearching(false)
			}
		}, SEARCH_DEBOUNCE_MS)
		return () => { controller.abort(); window.clearTimeout(timer); if (searchRequestRef.current === requestId) searchRequestRef.current++ }
	}, [remainingCapacity, focusPlaylist, query])

	const focusSearch = () => {
		setManaging(true)
	}

	const createFocusPlaylist = async () => {
		if (creating || mutationActive.current) return
		mutationActive.current = true
		setCreating(true)
		setError(null)
		try {
			const created = await create({
				name: FOCUS_PLAYLIST_NAME,
				maxLength: FOCUS_GAME_LIMIT,
				description: t('focus.playlistDescription'),
				isAutomatic: false,
			}) as Playlist
			if (!mountedRef.current) return
			setFocusSummaries(current => [...current.filter(list => list.id !== created.id), created])
			setFocusPlaylistId(created.id)
			try { window.localStorage.setItem(getFocusStorageKey(userId), String(created.id)) } catch { /* Optional, account-scoped preference for the explicitly created list. */ }
			setManaging(true)
		} catch {
			if (mountedRef.current) setError(t('focus.createError'))
		} finally {
			mutationActive.current = false
			if (mountedRef.current) setCreating(false)
		}
	}

	const addGame = async (game: Game) => {
		if (focusPlaylistId === null || remainingCapacity === 0 || addingGameId !== null || mutationActive.current) return
		if (allItems.some(item => item.gameId === game.id)) return
		mutationActive.current = true
		invalidateFocusRefresh()
		setAddingGameId(game.id)
		setError(null)
		try {
			const detail = manualPlaylist(await addItem(focusPlaylistId, game.id) as Playlist, focusPlaylistId)
			if (!mountedRef.current || activeFocusId.current !== focusPlaylistId) return
			setFocusPlaylist(detail)
			setQuery('')
			setSearchResults([])
		} catch {
			if (mountedRef.current) setError(t('focus.addError'))
		} finally {
			mutationActive.current = false
			if (mountedRef.current) setAddingGameId(null)
		}
	}

	const removeGame = async (item: PlaylistItem) => {
		if (focusPlaylistId === null || busyItemId !== null || mutationActive.current) return
		mutationActive.current = true
		invalidateFocusRefresh()
		setBusyItemId(item.id)
		setError(null)
		try {
			const detail = manualPlaylist(await removeItem(focusPlaylistId, item.id) as Playlist, focusPlaylistId)
			if (mountedRef.current && activeFocusId.current === focusPlaylistId) setFocusPlaylist(detail)
		} catch {
			if (mountedRef.current) setError(t('focus.removeError'))
		} finally {
			mutationActive.current = false
			if (mountedRef.current) setBusyItemId(null)
		}
	}

	const refreshAfterDetails = () => {
		setDetailGame(null)
		const revision = invalidateFocusRefresh()
		if (focusPlaylistId !== null) void fetchById(focusPlaylistId)
			.then(value => { const detail = manualPlaylist(value as Playlist, focusPlaylistId); if (mountedRef.current && activeFocusId.current === focusPlaylistId && focusRevision.current === revision) { setFocusPlaylist(detail); setDetailFailed(false) } })
			.catch(() => { if (mountedRef.current && focusRevision.current === revision) setDetailFailed(true) })
	}

	const moveGameUp = async (index: number) => {
		if (focusPlaylistId === null || index < 1 || busyItemId !== null || mutationActive.current) return
		const item = allItems[index]
		if (!item) return
		mutationActive.current = true
		invalidateFocusRefresh()
		const ids = allItems.map(value => value.id)
		;[ids[index - 1], ids[index]] = [ids[index], ids[index - 1]]
		if (currentGame) setFeaturedGameId(currentGame.id)
		setBusyItemId(item.id)
		setError(null)
		try {
			await reorderItems(focusPlaylistId, ids)
			if (mountedRef.current && activeFocusId.current === focusPlaylistId) setFocusPlaylist(current => current?.id === focusPlaylistId ? { ...current, items: ids.map((id, position) => ({ ...allItems.find(item => item.id === id)!, position })) } : current)
		}
		catch { if (mountedRef.current) setError(t('gallery.focusPage.orderError')) }
		finally { mutationActive.current = false; if (mountedRef.current) setBusyItemId(null) }
	}

	const minutes = currentGame ? effectivePlaytime(currentGame) : null
	const gameTime = focusHours(minutes == null ? null : minutes / 60, i18n.language)

	if (!playlistsLoaded || (focusPlaylistId !== null && playlistLoading && !focusPlaylist)) {
		return <div className='focus-mode focus-mode--loading' role='status'>{t('common.loading')}</div>
	}

	return (
		<div className='focus-mode gdb-page'>
			<div className='focus-mode__inner'>
				<header className='focus-heading'>
					<div className='focus-heading__copy'>
						<h1>{t('gallery.nav.focus')}<span className='gdb-period'>.</span></h1><span className='gdb-count'>{t('focus.capacityHint', { count: visibleItems.length, max: FOCUS_GAME_LIMIT })}</span>
						<span className='focus-sync-indicator-slot'>
							{(steamUpdating || steamFailed) && <span className={`focus-sync-indicator${steamFailed ? ' is-failed' : ''}`} role='status' title={t(steamFailed ? 'focus.steamSyncPartial' : 'focus.syncingSteam')}>
								{steamUpdating ? <svg viewBox='0 0 20 20' fill='none' aria-hidden='true'><circle cx='10' cy='10' r='7' stroke='currentColor' strokeWidth='1.5' opacity='.25' /><path d='M10 3a7 7 0 0 1 7 7' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' /></svg> : <svg viewBox='0 0 20 20' fill='none' aria-hidden='true'><circle cx='10' cy='10' r='7' stroke='currentColor' strokeWidth='1.5' /><path d='M10 6v5m0 2h.01' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' /></svg>}
								<span className='sr-only'>{t(steamFailed ? 'focus.steamSyncPartial' : 'focus.syncingSteam')}</span>
							</span>}
						</span>
					</div>
					{focusPlaylist && (
						<button type='button' className='focus-add-trigger' aria-haspopup='dialog' aria-expanded={managing} aria-controls='focus-management' onClick={() => setManaging(true)}>
							<CollectionIcon name='filter' />{t('gallery.focusPage.manage')}
						</button>
					)}
				</header>

				{displayError && !managing && <p className='focus-alert' role='alert'>{displayError}{loadFailed && <button type='button' className='gdb-text-button' onClick={() => { invalidateFocusRefresh(); setError(null); setListFailed(false); setDetailFailed(false); setPlaylistsLoaded(false); setLoadRevision(value => value + 1) }}>{t('gallery.common.retry')}</button>}</p>}

				{loadFailed && !focusPlaylist ? null : !focusPlaylistId ? (
					<section className='focus-setup' aria-labelledby='focus-setup-title'>
						<div className='focus-setup__mark'><FocusMark /></div>
						<p className='focus-setup__eyebrow'>{t('focus.setupEyebrow')}</p>
						<h2 id='focus-setup-title'>{t('focus.setupTitle')}</h2>
						<p className='focus-setup__description'>{t('focus.setupDescription')}</p>
						<button type='button' className='focus-primary-button' onClick={() => void createFocusPlaylist()} disabled={creating}>
							{creating ? t('focus.creating') : t('focus.createPlaylist')}
						</button>
					</section>
				) : (
					<>
						<section className='focus-stage' aria-label={t('focus.stageLabel')}>
							<article className={`focus-spotlight${currentGame ? '' : ' focus-spotlight--empty'}`}>
								{currentGame && <button type='button' className='focus-spotlight__open' aria-label={t('focus.openGame', { name: currentGame.name })} onClick={() => setDetailGame(currentGame)} />}
								{currentGame && isCompleted(currentGame) && <span className='focus-completed' aria-label={t(isGameFullyCompleted(currentGame) ? 'focus.completed' : completionTitleKey(currentGame))}>{isGameFullyCompleted(currentGame) ? '100%' : '✓'}</span>}
								{currentGame && <GameArtwork game={currentGame} role='hero' decorative eager width={1440} className='focus-spotlight__art' />}
								<div className='focus-spotlight__shade' aria-hidden='true' />
								<div className='focus-spotlight__content'>
									<p className='focus-spotlight__status'>{currentGame?.platformName || t('focus.platformNotSet')}</p>
									{currentGame ? (
										<>
											<h2>{currentGame.name}</h2>
											<SampleBadge game={currentGame} />
											<p className='focus-spotlight__metadata'>{currentGame.statusName || '—'}</p>
											{currentGame.comment && <p className='focus-spotlight__note'>{currentGame.comment}</p>}
											<div className='focus-spotlight__stats' aria-label={t('focus.gameHighlights')}>
												<span><small>{t('focus.timePlayed')}</small><strong>{gameTime}</strong></span>
												<span><small>{t('gallery.focusPage.story')}</small><strong>{focusHours(currentGame.story, i18n.language)}</strong></span>
												{currentGame.steamAchievementsTotal != null && currentGame.steamAchievementsTotal > 0
													? <span><small>{t('focus.achievements')}</small><strong>{currentGame.steamAchievementsUnlocked ?? 0}<small className='focus-spotlight__suffix'> / {currentGame.steamAchievementsTotal}</small></strong></span>
													: <span><small>{t('focus.yourRating')}</small><strong>{currentGame.grade ?? '—'}{currentGame.grade != null && <small className='focus-spotlight__suffix'> /100</small>}</strong></span>}
											</div>
											<div className='focus-spotlight__actions'>
												<button type='button' className='focus-primary-button' onClick={() => setDetailGame(currentGame)}>{t('gallery.detail.open')}<CollectionIcon name='arrow' /></button>
											</div>
										</>
									) : (
										<div className='focus-spotlight__empty-copy'>
											<h2>{t('focus.emptyCurrentTitle')}</h2>
											<p>{t('focus.emptyCurrentDescription')}</p>
											<button type='button' className='focus-primary-button focus-primary-button--light' onClick={focusSearch}>{t('focus.chooseFirst')}</button>
										</div>
									)}
								</div>
							</article>

							<aside className='focus-queue' aria-label={t('focus.queueTitle')}>
								<h2 className='sr-only'>{t('gallery.focusPage.shelf')}</h2>
								<ol className='focus-queue__items'>
										{visibleItems.map(item => (
										<li key={item.id}>
											<FocusQueueCard
												item={item}
												featured={item.gameId === currentGame?.id}
												onOpen={() => setDetailGame(item.game)}
												onMakeCurrent={() => setFeaturedGameId(item.gameId)}
											/>
										</li>
									))}
									{Array.from({ length: Math.max(0, FOCUS_GAME_LIMIT - visibleItems.length) }, (_, index) => (
										<li key={`empty-${index}`}>
											<button type='button' className='focus-queue-empty' onClick={focusSearch} disabled={remainingCapacity === 0}>
												<span className='focus-queue-empty__plus' aria-hidden='true'>+</span>
												<span><strong>{t('focus.openSlot')}</strong><small>{t('focus.openSlotHint')}</small></span>
											</button>
										</li>
									))}
								</ol>
							</aside>
						</section>

						<CollectionSheet open={managing} onClose={() => setManaging(false)} title={t('gallery.focusPage.managerTitle')} subtitle={t('gallery.focusPage.occupied', { count: allItems.length, max: focusCapacity })} className='focus-manager'
							footer={<button type='button' className='gdb-button gdb-button--primary' onClick={() => setManaging(false)}><CollectionIcon name='check' />{t('gallery.common.done')}</button>}>
							<section id='focus-management' className='focus-library' aria-labelledby='focus-library-title'>
							{displayError && <p className='focus-alert' role='alert'>{displayError}</p>}
							<ol className='focus-manage-list'>{allItems.map((item, index) => <li key={item.id}>
								<GameArtwork game={item.game} decorative className='focus-manage-cover' />
								<div className='focus-manage-copy'><strong>{item.game.name}</strong><span>{item.game.platformName || t('focus.platformNotSet')}</span></div>
								<button type='button' className='gdb-icon-button' onClick={() => void moveGameUp(index)} disabled={index === 0 || busyItemId !== null} aria-label={t('gallery.focusPage.moveUp', { name: item.game.name })}><CollectionIcon name='up' /></button>
								<button type='button' className='gdb-icon-button' onClick={() => void removeGame(item)} disabled={busyItemId !== null} aria-label={t('focus.removeGame', { name: item.game.name })}><CollectionIcon name='close' /></button>
							</li>)}</ol>
							<h3 id='focus-library-title'>{t('gallery.focusPage.addFromLibrary')}</h3>
							{remainingCapacity > 0 && <div className='focus-search'>
								<SearchMark />
								<input
									ref={searchInputRef}
									type='search'
									value={query}
									onChange={event => setQuery(event.target.value)}
									placeholder={t('focus.searchPlaceholder')}
									aria-label={t('focus.searchPlaceholder')}
									disabled={remainingCapacity === 0 || addingGameId !== null}
								/>
								<span className='focus-search__capacity'>{t('focus.capacityHint', { count: visibleItems.length, max: FOCUS_GAME_LIMIT })}</span>
							</div>}
							{remainingCapacity === 0 && <p className='focus-library__limit'>{t('gallery.focusPage.full')}</p>}
							{searchError && <p className='focus-library__message' role='alert'>{t('focus.searchError')}</p>}
							{searching && <p className='focus-library__message' role='status'>{t('focus.searching')}</p>}
							{!searching && query.trim() && !searchError && searchResults.length === 0 && <p className='focus-library__message'>{t('focus.noSearchResults')}</p>}
							{searchResults.length > 0 && (
								<ul className='focus-search-results' aria-label={t('focus.searchResults')}>
									{searchResults.map(game => {
										const alreadyAdded = allItems.some(item => item.gameId === game.id)
										const isAdding = addingGameId === game.id
										return (
											<li key={game.id}>
												<div className='focus-search-result'>
													<span className='focus-search-result__name'>{game.name}<small>{game.platformName || t('focus.platformNotSet')}</small></span>
													<button type='button' className='focus-search-result__add' aria-label={t(alreadyAdded ? 'gallery.focusPage.addedNamedGame' : isAdding ? 'gallery.focusPage.addingNamedGame' : 'gallery.focusPage.addNamedGame', { name: game.name })} aria-busy={isAdding} onClick={() => void addGame(game)} disabled={alreadyAdded || addingGameId !== null || remainingCapacity === 0}>
														<CollectionIcon name={alreadyAdded ? 'check' : isAdding ? 'refresh' : 'plus'} />
													</button>
												</div>
											</li>
										)
									})}
								</ul>
							)}
							<Link className='focus-list-link' to={`/playlists/${focusPlaylistId}`}>{t('focus.editFullPlaylist')}</Link>
							</section>
						</CollectionSheet>
					</>
				)}
			</div>

				{detailGame && (
					<GameDetails game={detailGame} closeDetails={refreshAfterDetails} />
				)}
		</div>
	)
}
