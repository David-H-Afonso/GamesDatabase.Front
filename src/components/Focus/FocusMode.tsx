import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePlaylists } from '@/hooks'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { refreshCurrentPlaylist } from '@/store/features/playlists/playlistSlice'
import { getPlaylistById } from '@/services/PlaylistService/PlaylistService'
import { getGames } from '@/services/GamesService/GamesService'
import { formatPlaytime } from '@/utils/platformIcons/platformIcons'
import type { Game } from '@/models/api/Game'
import type { PlaylistItem } from '@/models/api/Playlist'
import { GameDetails } from '@/components/elements/GameDetails/GameDetails'
import OptimizedImage from '@/components/elements/OptimizedImage/OptimizedImage'
import { steamService } from '@/services/SteamService/SteamService'
import type { Playlist } from '@/models/api/Playlist'
import './FocusMode.scss'

const FOCUS_PLAYLIST_NAME = 'Focus'
const FOCUS_GAME_LIMIT = 4
const SEARCH_DEBOUNCE_MS = 250

const isCompleted = (game: Game) => Boolean(game.isManuallyCompleted) || Boolean(game.steamAchievementsTotal && game.steamAchievementsTotal > 0 && game.steamAchievementsUnlocked === game.steamAchievementsTotal)
const SpotlightMark = () => <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'><path d='M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5' /><circle cx='12' cy='12' r='3' /></svg>

const getFocusStorageKey = (userId?: number) => `gdb.focus-playlist.${userId ?? 'guest'}`

const readFocusPlaylistId = (userId?: number) => {
	try {
		const storedId = Number(window.localStorage.getItem(getFocusStorageKey(userId)))
		return Number.isInteger(storedId) && storedId > 0 ? storedId : null
	} catch {
		return null
	}
}

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

const RemoveMark = () => (
	<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' aria-hidden='true'>
		<path d='M5 12h14' />
	</svg>
)

const FocusQueueCard = ({
	item,
	onMakeCurrent,
	onRemove,
	onOpen,
	busy,
	managing,
}: {
	item: PlaylistItem
	onMakeCurrent: () => void
	onRemove: () => void
	onOpen: () => void
	busy: boolean
	managing: boolean
}) => {
	const { t } = useTranslation()
	const game = item.game
	const cover = game.hero || game.cover
	const [touchActions, setTouchActions] = useState(false)
	const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
	const held = useRef(false)
	const clearHold = () => { if (holdTimer.current) clearTimeout(holdTimer.current) }
	useEffect(() => clearHold, [])
	const time = formatPlaytime(game.manualPlaytimeMinutes ?? game.steamPlaytimeForever)

	return (
		<article className={`focus-queue-card${touchActions ? ' is-touch-active' : ''}`}>
			<button type='button' className='focus-queue-card__main' onClick={() => { if (held.current) { held.current = false; return } onOpen() }} aria-label={t('focus.openGame', { name: game.name })}
				onPointerDown={event => { if (event.pointerType !== 'touch') return; held.current = false; clearHold(); holdTimer.current = setTimeout(() => { held.current = true; setTouchActions(true) }, 500) }}
				onPointerUp={clearHold} onPointerCancel={clearHold} onPointerMove={clearHold} onContextMenu={event => { if (touchActions) event.preventDefault() }}>
				{cover ? (
					<OptimizedImage src={cover} alt='' width={720} height={360} quality='high' className='focus-queue-card__cover' />
				) : (
					<span className='focus-queue-card__cover focus-queue-card__cover--empty' aria-hidden='true'><FocusMark /></span>
				)}
				<span className='focus-queue-card__copy'>
					{game.playWithNames.length > 0 && <span className='focus-queue-card__position'>{game.playWithNames.join(' · ')}</span>}
					<strong>{game.name}</strong>
					<span className='focus-queue-card__platform'>{game.platformName || t('focus.platformNotSet')}</span>
					<span className='focus-queue-card__metadata'>{[game.statusName, time].filter(Boolean).join(' · ')}</span>
					{game.steamAchievementsTotal != null && game.steamAchievementsTotal > 0 && <span className='focus-queue-card__metadata'>{t('focus.achievementCount', { unlocked: game.steamAchievementsUnlocked ?? 0, total: game.steamAchievementsTotal })}</span>}
				</span>
			</button>
			<div className='focus-queue-card__actions'>
				<button type='button' className='focus-icon-button focus-feature-trigger' onClick={onMakeCurrent} aria-label={t('focus.makeCurrentFor', { name: game.name })} title={t('focus.makeCurrent')}><SpotlightMark /></button>
				{managing && <button type='button' className='focus-icon-button focus-icon-button--remove' onClick={onRemove} aria-label={t('focus.removeGame', { name: game.name })} title={t('focus.remove')} disabled={busy}><RemoveMark /></button>}
			</div>
			{isCompleted(game) && <span className='focus-completed' aria-label={t('focus.completed')}>100%</span>}
		</article>
	)
}

export default function FocusMode() {
	const { t } = useTranslation()
	const userId = useAppSelector(state => state.auth.user?.id)
	const dispatch = useAppDispatch()
	const { playlists, currentPlaylist, fetchAll, fetchById, create, addItem, removeItem } = usePlaylists()
	const [managing, setManaging] = useState(false)
	const [featuredGameId, setFeaturedGameId] = useState<number | null>(null)
	const [focusPlaylistId, setFocusPlaylistId] = useState<number | null>(null)
	const [playlistsLoaded, setPlaylistsLoaded] = useState(false)
	const [playlistLoading, setPlaylistLoading] = useState(false)
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

	const focusPlaylist = currentPlaylist?.id === focusPlaylistId ? currentPlaylist : null
	const allItems = focusPlaylist?.items ?? []
	const visibleItems = allItems.slice(0, FOCUS_GAME_LIMIT)
	const currentItem = visibleItems.find(item => item.gameId === featuredGameId) ?? visibleItems[0]
	const currentGame = currentItem?.game
	const queuedItems = visibleItems.filter(item => item.id !== currentItem?.id)
	const focusCapacity = Math.min(focusPlaylist?.maxLength ?? FOCUS_GAME_LIMIT, FOCUS_GAME_LIMIT)
	const remainingCapacity = Math.max(0, focusCapacity - allItems.length)

	useEffect(() => {
		mountedRef.current = true
		return () => { mountedRef.current = false }
	}, [])

	useEffect(() => {
		let cancelled = false
		void fetchAll()
			.then(() => { if (!cancelled) setPlaylistsLoaded(true) })
			.catch(() => {
				if (!cancelled) {
					setError(t('focus.loadError'))
					setPlaylistsLoaded(true)
				}
			})
		return () => { cancelled = true }
	}, [fetchAll, t])

	useEffect(() => {
		if (!playlistsLoaded || focusPlaylistId !== null) return

		const available = playlists.filter(playlist => !playlist.isAutomatic)
		const savedId = readFocusPlaylistId(userId)
		const savedPlaylist = savedId ? available.find(playlist => playlist.id === savedId) : undefined
		const namedPlaylist = available.find(playlist => playlist.name.trim().toLocaleLowerCase() === FOCUS_PLAYLIST_NAME.toLocaleLowerCase())
		const found = savedPlaylist ?? namedPlaylist
		if (found) setFocusPlaylistId(found.id)
	}, [focusPlaylistId, playlists, playlistsLoaded, userId])

	useEffect(() => {
		if (focusPlaylistId === null) return
		let cancelled = false
		setPlaylistLoading(true)
		void fetchById(focusPlaylistId)
			.catch(() => { if (!cancelled) setError(t('focus.loadError')) })
			.finally(() => { if (!cancelled) setPlaylistLoading(false) })
		return () => { cancelled = true }
	}, [fetchById, focusPlaylistId, t])

	useEffect(() => {
		if (!focusPlaylist || playlistLoading) return
		const steamGames = visibleItems.filter(item => item.game.steamAppId && !syncedGamesRef.current.has(item.gameId))
		if (!steamGames.length) return
		steamGames.forEach(item => syncedGamesRef.current.add(item.gameId))
		setSteamUpdating(true)
		setSteamFailed(false)
		void (async () => {
			let failed = false
			for (const item of steamGames) {
				if (!mountedRef.current) return
				try { const result = await steamService.syncGame(item.gameId); if (result.success === false || result.error || result.errors?.length) failed = true }
				catch { failed = true }
			}
			if (!mountedRef.current) return
			try {
				const refreshed = await getPlaylistById(focusPlaylist.id)
				if (!mountedRef.current) return
				dispatch(refreshCurrentPlaylist(refreshed))
			} catch { failed = true }
			if (!mountedRef.current) return
			setSteamFailed(failed)
			setSteamUpdating(false)
		})()
	}, [focusPlaylist, playlistLoading, dispatch, visibleItems])

	useEffect(() => {
		if (focusPlaylistId === null) return
		try {
			window.localStorage.setItem(getFocusStorageKey(userId), String(focusPlaylistId))
		} catch {
			// The playlist name remains a fallback when browser storage is unavailable.
		}
	}, [focusPlaylistId, userId])

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
		const timer = window.setTimeout(async () => {
			try {
				const result = await getGames({ search: term, page: 1, pageSize: 8 })
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
		return () => window.clearTimeout(timer)
	}, [remainingCapacity, focusPlaylist, query])

	const focusSearch = () => {
		setManaging(true)
		searchInputRef.current?.focus()
		const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
		searchInputRef.current?.scrollIntoView?.({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' })
	}

	const createFocusPlaylist = async () => {
		if (creating) return
		setCreating(true)
		setError(null)
		try {
			const created = await create({
				name: FOCUS_PLAYLIST_NAME,
				maxLength: FOCUS_GAME_LIMIT,
				description: t('focus.playlistDescription'),
				isAutomatic: false,
			}) as Playlist
			setFocusPlaylistId(created.id)
			setManaging(true)
		} catch {
			setError(t('focus.createError'))
		} finally {
			setCreating(false)
		}
	}

	const addGame = async (game: Game) => {
		if (focusPlaylistId === null || remainingCapacity === 0 || addingGameId !== null) return
		if (allItems.some(item => item.gameId === game.id)) return
		setAddingGameId(game.id)
		setError(null)
		try {
			await addItem(focusPlaylistId, game.id)
			setQuery('')
			setSearchResults([])
		} catch {
			setError(t('focus.addError'))
		} finally {
			setAddingGameId(null)
		}
	}

	const removeGame = async (item: PlaylistItem) => {
		if (focusPlaylistId === null || busyItemId !== null) return
		setBusyItemId(item.id)
		setError(null)
		try {
			await removeItem(focusPlaylistId, item.id)
		} catch {
			setError(t('focus.removeError'))
		} finally {
			setBusyItemId(null)
		}
	}

	const refreshAfterDetails = () => {
		setDetailGame(null)
		if (focusPlaylistId !== null) void fetchById(focusPlaylistId)
	}

	const gameTime = currentGame ? formatPlaytime(currentGame.manualPlaytimeMinutes ?? currentGame.steamPlaytimeForever) : ''

	if (!playlistsLoaded || (focusPlaylistId !== null && playlistLoading && !focusPlaylist)) {
		return <div className='focus-mode focus-mode--loading' role='status'>{t('common.loading')}</div>
	}

	return (
		<div className='focus-mode'>
			<div className='focus-mode__inner'>
				<header className='focus-heading'>
					<div className='focus-heading__copy'>
						<h1>{t('focus.title')}</h1>
						<span className='focus-sync-indicator-slot'>
							{(steamUpdating || steamFailed) && <span className={`focus-sync-indicator${steamFailed ? ' is-failed' : ''}`} role='status' title={t(steamFailed ? 'focus.steamSyncPartial' : 'focus.syncingSteam')}>
								{steamUpdating ? <svg viewBox='0 0 20 20' fill='none' aria-hidden='true'><circle cx='10' cy='10' r='7' stroke='currentColor' strokeWidth='1.5' opacity='.25' /><path d='M10 3a7 7 0 0 1 7 7' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' /></svg> : <svg viewBox='0 0 20 20' fill='none' aria-hidden='true'><circle cx='10' cy='10' r='7' stroke='currentColor' strokeWidth='1.5' /><path d='M10 6v5m0 2h.01' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' /></svg>}
								<span className='sr-only'>{t(steamFailed ? 'focus.steamSyncPartial' : 'focus.syncingSteam')}</span>
							</span>}
						</span>
					</div>
					{focusPlaylist && (
						<button type='button' className='focus-add-trigger' aria-expanded={managing} aria-controls='focus-management' onClick={() => setManaging(value => !value)}>
							{t(managing ? 'focus.doneManaging' : 'focus.managePlaylist')}
						</button>
					)}
				</header>

				{error && <p className='focus-alert' role='alert'>{error}</p>}

				{!focusPlaylistId ? (
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
								{currentGame && isCompleted(currentGame) && <span className='focus-completed' aria-label={t('focus.completed')}>100%</span>}
								{currentGame && (currentGame.hero || currentGame.cover) && (
									<OptimizedImage
										src={currentGame.hero || currentGame.cover!}
										alt=''
										width={1440}
										height={810}
										quality='high'
										loading='eager'
										fetchPriority='high'
										className='focus-spotlight__art'
									/>
								)}
								<div className='focus-spotlight__shade' aria-hidden='true' />
								<div className='focus-spotlight__content'>
									<p className='focus-spotlight__status'>{currentGame?.playWithNames.join(' · ') || t('focus.nowPlaying')}</p>
									{currentGame ? (
										<>
											<h2>{currentGame.name}</h2>
											<p className='focus-spotlight__metadata'>
												{[currentGame.platformName, currentGame.statusName].filter(Boolean).join(' · ')}
											</p>
											{currentGame.comment && <p className='focus-spotlight__note'><span>{t('focus.personalNote')}</span>{currentGame.comment}</p>}
											<div className='focus-spotlight__stats' aria-label={t('focus.gameHighlights')}>
												{currentGame.story != null && <span><small>{t('focus.storyTime')}</small><strong>{t('focus.durationHours', { value: currentGame.story })}</strong></span>}
												{currentGame.completion != null && <span><small>{t('focus.completion')}</small><strong>{t('focus.durationHours', { value: currentGame.completion })}</strong></span>}
												{currentGame.grade != null && <span><small>{t('focus.yourRating')}</small><strong>{currentGame.grade}<small className='focus-spotlight__suffix'>/100</small></strong></span>}
												{currentGame.critic != null && <span><small>{t('focus.criticScore')}</small><strong>{currentGame.critic}<small className='focus-spotlight__suffix'>/100</small></strong></span>}
												{gameTime && <span><small>{t('focus.timePlayed')}</small><strong>{gameTime}</strong></span>}
												{currentGame.steamAchievementsTotal != null && currentGame.steamAchievementsTotal > 0 && <span><small>{t('focus.achievements')}</small><strong>{currentGame.steamAchievementsUnlocked ?? 0}/{currentGame.steamAchievementsTotal}</strong></span>}
											</div>
											<div className='focus-spotlight__actions'>
												<button type='button' className='focus-primary-button focus-primary-button--light' onClick={() => setDetailGame(currentGame)}>{t('focus.viewDetails')}</button>
												{managing && currentItem && <button type='button' className='focus-spotlight__remove' onClick={() => void removeGame(currentItem)} disabled={busyItemId !== null}>{t('focus.removeFromFocus')}</button>}
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

							{(queuedItems.length > 0 || managing) && <aside className='focus-queue' aria-label={t('focus.queueTitle')}>
								<ol className='focus-queue__items'>
									{queuedItems.map(item => (
										<li key={item.id}>
											<FocusQueueCard
												item={item}
												managing={managing}
												busy={busyItemId !== null}
												onOpen={() => setDetailGame(item.game)}
												onMakeCurrent={() => setFeaturedGameId(item.gameId)}
												onRemove={() => void removeGame(item)}
											/>
										</li>
									))}
									{managing && Array.from({ length: Math.max(0, 3 - queuedItems.length) }, (_, index) => (
										<li key={`empty-${index}`}>
											<button type='button' className='focus-queue-empty' onClick={focusSearch} disabled={remainingCapacity === 0}>
												<span className='focus-queue-empty__plus' aria-hidden='true'>+</span>
												<span><strong>{t('focus.openSlot')}</strong><small>{t('focus.openSlotHint')}</small></span>
											</button>
										</li>
									))}
								</ol>
							</aside>}
						</section>

						{(managing || allItems.length === 0) && <section id='focus-management' className='focus-library' aria-labelledby='focus-library-title'>
							<div className='focus-library__heading'>
								<div><h2 id='focus-library-title'>{t('focus.libraryTitle')}</h2></div>
								<p>{t('focus.libraryDescription')}</p>
							</div>
							<div className='focus-search'>
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
							</div>
							{remainingCapacity === 0 && <p className='focus-library__limit'>{t('playlists.capacityHint')}</p>}
							{allItems.length > FOCUS_GAME_LIMIT && <ul className='focus-search-results'>{allItems.slice(FOCUS_GAME_LIMIT).map(item => <li key={item.id} className='focus-search-result'><span>{item.game.name}</span><button type='button' className='focus-search-result__add' disabled={busyItemId !== null} onClick={() => void removeGame(item)}>{t('focus.removeFromFocus')}</button></li>)}</ul>}
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
													<button type='button' className='focus-search-result__add' onClick={() => void addGame(game)} disabled={alreadyAdded || addingGameId !== null || remainingCapacity === 0}>
														{alreadyAdded ? t('focus.alreadyAdded') : isAdding ? t('focus.adding') : t('focus.add')}
													</button>
												</div>
											</li>
										)
									})}
								</ul>
							)}
							<Link className='focus-list-link' to={`/playlists/${focusPlaylistId}`}>{t('focus.editFullPlaylist')}</Link>
						</section>}
					</>
				)}
			</div>

				{detailGame && (
					<GameDetails game={detailGame} closeDetails={refreshAfterDetails} />
				)}
		</div>
	)
}
