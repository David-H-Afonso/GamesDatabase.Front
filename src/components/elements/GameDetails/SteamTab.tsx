import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Game } from '@/models/api/Game'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { syncSteamGame } from '@/store/features/steam/steamSlice'
import { fetchGameById } from '@/store/features/games'
import { steamService, type SteamAchievementProgress, type SteamDateSuggestion } from '@/services/SteamService/SteamService'
import { SteamAchievements } from './SteamAchievements'
import './SteamTab.scss'
import { steamErrorKey } from '@/utils/steamErrors'
import { formatCollectionNumber } from '@/utils/collectionFormatting'
import './GallerySteamTab.scss'

export const SteamTab = ({ game, gallery = false }: { game: Game; gallery?: boolean }) => {
	const { t, i18n } = useTranslation()
	const dispatch = useAppDispatch()
	const { syncLoading } = useAppSelector((state) => state.steam)
	const [progress, setProgress] = useState<SteamAchievementProgress | null>(null)
	const [loading, setLoading] = useState(true)
	const [loadError, setLoadError] = useState(false)
	const [syncMessage, setSyncMessage] = useState<string | null>(null)
	const [dateSuggestion, setDateSuggestion] = useState<SteamDateSuggestion | null>(null)
	const [dateSuggestionLoading, setDateSuggestionLoading] = useState(false)
	const [dateSuggestionBusy, setDateSuggestionBusy] = useState(false)
	const request = useRef<AbortController | null>(null)
	const locale = i18n.resolvedLanguage ?? i18n.language
	const formatDate = (date: string) => new Date(date).toLocaleDateString(locale)

	const loadDateSuggestion = useCallback(
		async (signal: AbortSignal) => {
			if (!game.steamAppId) return
			setDateSuggestionLoading(true)
			try {
				const suggestions = await steamService.getDateSuggestions({ gameId: game.id, includeStarted: false, signal })
				if (!signal.aborted) setDateSuggestion(suggestions.find((suggestion) => suggestion.gameId === game.id && suggestion.proposedFinished) ?? null)
			} catch {
				if (!signal.aborted) setDateSuggestion(null)
			} finally {
				if (!signal.aborted) setDateSuggestionLoading(false)
			}
		},
		[game.id, game.steamAppId]
	)

	useEffect(() => {
		const controller = new AbortController()
		request.current = controller
		setProgress(null)
		setLoadError(false)
		setLoading(true)
		setDateSuggestion(null)
		setDateSuggestionLoading(false)
		setDateSuggestionBusy(false)
		setSyncMessage(null)
		const load = async () => {
			try {
				let data = await steamService.getAchievementProgress(game.id, controller.signal)
				if (controller.signal.aborted) return
				setProgress(data)
				// One on-demand sync for an uncached game. Empty/private/failed games
				// are not repeatedly retried each time the tab is opened.
				if (!gallery && data.source !== 'sets' && game.steamAppId && !data.lastSynced && !data.lastError && !data.notice) {
					await dispatch(syncSteamGame(game.id)).unwrap()
					if (controller.signal.aborted) return
					data = await steamService.getAchievementProgress(game.id, controller.signal)
					if (controller.signal.aborted) return
					setProgress(data)
					await dispatch(fetchGameById(game.id)).unwrap()
				}
			} catch (error) {
				if (!controller.signal.aborted && steamErrorKey(error) !== 'steamSync.errors.busy') setLoadError(true)
			} finally {
				if (!controller.signal.aborted) setLoading(false)
			}
		}
		void load()
		if (!gallery) void loadDateSuggestion(controller.signal)
		return () => controller.abort()
	}, [game.id, game.steamAppId, dispatch, loadDateSuggestion, gallery])

	useEffect(() => {
		if (!syncMessage) return
		const timer = setTimeout(() => setSyncMessage(null), 5000)
		return () => clearTimeout(timer)
	}, [syncMessage])

	const handleSync = async () => {
		const signal = request.current?.signal
		if (!signal) return
		try {
			const result = await dispatch(syncSteamGame(game.id)).unwrap()
			if (signal.aborted) return
			setSyncMessage(t(result.achievementsSyncSucceeded === false ? 'steamAchievements.syncPartial' : 'steamAchievements.syncDone'))
			const data = await steamService.getAchievementProgress(game.id, signal)
			if (signal.aborted) return
			setProgress(data)
			setLoadError(false)
			await dispatch(fetchGameById(game.id)).unwrap()
			await loadDateSuggestion(signal)
		} catch (error) {
			if (!signal.aborted) setSyncMessage(t(steamErrorKey(error) === 'steamSync.errors.busy' ? 'steamSync.errors.busy' : 'steamAchievements.syncFailed'))
		}
	}

	const handleDateSuggestion = async (apply: boolean) => {
		if (!dateSuggestion?.proposedFinished) return
		const signal = request.current?.signal
		if (!signal) return
		setDateSuggestionBusy(true)
		try {
			const changes = [{ gameId: game.id, finished: dateSuggestion.proposedFinished }]
			if (apply) await steamService.applyDateSuggestions(changes)
			else await steamService.dismissDateSuggestions(changes)
			if (signal.aborted) return
			setSyncMessage(t(apply ? 'steamAchievements.dateApplied' : 'steamAchievements.dateDismissed'))
			setDateSuggestion(null)
			await dispatch(fetchGameById(game.id)).unwrap()
		} catch {
			if (!signal.aborted) setSyncMessage(t('steamAchievements.dateFailed'))
		} finally {
			if (!signal.aborted) setDateSuggestionBusy(false)
		}
	}

	const lastSynced = progress?.lastSynced
	const unlocked = progress?.unlockedAchievements ?? game.steamAchievementsUnlocked ?? 0,
		total = progress?.totalAchievements ?? game.steamAchievementsTotal ?? 0
	const cachedAt = lastSynced ?? game.steamLastSynced,
		percent = total > 0 ? Math.min(100, (unlocked / total) * 100) : 0
	const finishSourceLabel = game.steamFinishedSource === 'steam' ? 'Steam' : t(game.finished ? 'steamAchievements.manual' : 'steamAchievements.noDate')
	return (
		<div className={`steam-tab ${gallery ? 'gdb-gallery-steam' : ''} ${progress?.isFullyCompleted ? 'steam-tab--complete' : ''}`} aria-busy={loading}>
			{gallery && (
				<>
					<div className='gdb-steam-heading'>
						<img src={`${import.meta.env.BASE_URL}platform-icons/steam.png`} width={30} height={30} alt='' />
						<div>
							<h3>Steam</h3>
						</div>
						<button type='button' className='gdb-button' onClick={handleSync} disabled={syncLoading || loading || !game.steamAppId}>
							{t(syncLoading ? 'steamAchievements.syncing' : 'steamAchievements.sync')}
						</button>
					</div>
					<dl className='gdb-steam-playtime'>
						<div><dt>{t('steamAchievements.playtime')}</dt><dd>{game.steamPlaytimeForever == null ? '—' : `${formatCollectionNumber(game.steamPlaytimeForever / 60, locale)} h`}</dd></div>
						<div><dt>{t('steamAchievements.recentPlaytime')}</dt><dd>{game.steamPlaytime2Weeks == null ? '—' : `${formatCollectionNumber(game.steamPlaytime2Weeks / 60, locale)} h`}</dd></div>
						<div><dt>{t('steamAchievements.lastSync')}</dt><dd>{cachedAt ? new Date(cachedAt).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</dd></div>
					</dl>
					{total > 0 && (
						<section className='gdb-steam-cache-summary'>
							<span>{t('gallery.tabs.steamCurrent')}</span>
							<strong>
								{formatCollectionNumber(unlocked, locale, 0)}
								<small> / {formatCollectionNumber(total, locale, 0)}</small>
							</strong>
							<progress value={unlocked} max={total} aria-label={t('steamAchievements.totalProgress')} />
							<p>
								{formatCollectionNumber(percent, locale)}%
							</p>
						</section>
					)}
					<div className='gdb-steam-data-tools'>
						<button
							type='button'
							className='gdb-button'
							disabled={dateSuggestionLoading || syncLoading}
							onClick={() => {
								const signal = request.current?.signal
								if (signal) void loadDateSuggestion(signal)
							}}>
							{t('gallery.tabs.steamDateSearch')}
						</button>
					</div>
				</>
			)}
			{!gallery && (
				<div className='steam-tab-header'>
					<div className='steam-tab-stats'>
						{game.steamPlaytimeForever != null && (
							<div className='stat'>
								<span className='stat-label'>{t('steamAchievements.playtime')}</span>
								<span className='stat-value'>{t('steamAchievements.hours', { hours: Math.round(game.steamPlaytimeForever / 60) })}</span>
							</div>
						)}
						{game.steamPlaytime2Weeks != null && game.steamPlaytime2Weeks > 0 && (
							<div className='stat'>
								<span className='stat-label'>{t('steamAchievements.recentPlaytime')}</span>
								<span className='stat-value'>{t('steamAchievements.hours', { hours: Math.round(game.steamPlaytime2Weeks / 60) })}</span>
							</div>
						)}
						{lastSynced && (
							<div className='stat'>
								<span className='stat-label'>{t('steamAchievements.lastSync')}</span>
								<span className='stat-value'>{formatDate(lastSynced)}</span>
							</div>
						)}
						<div className='stat'>
							<span className='stat-label'>{t('steamAchievements.finishDate')}</span>
							<span className='stat-value'>{finishSourceLabel}</span>
						</div>
					</div>
					<button type='button' className='btn btn-secondary btn-sm' onClick={handleSync} disabled={syncLoading || loading || !game.steamAppId}>
						{t(syncLoading ? 'steamAchievements.syncing' : 'steamAchievements.sync')}
					</button>
				</div>
			)}
			{syncMessage && (
				<p className='sync-message' role='status'>
					{syncMessage}
				</p>
			)}
			{dateSuggestionLoading ? (
				<p className='sync-message'>{t('steamAchievements.dateLoading')}</p>
			) : dateSuggestion?.proposedFinished ? (
				<div className={`steam-date-suggestion ${dateSuggestion.isFinishedConflict ? 'steam-date-suggestion--conflict' : ''}`}>
					<div className='steam-date-suggestion__copy'>
						<span className='steam-date-suggestion__eyebrow'>{t(dateSuggestion.isFinishedConflict ? 'steamAchievements.dateConflict' : 'steamAchievements.dateSuggestion')}</span>
						<strong>{dateSuggestion.proposedFinished}</strong>
						<span>{t('steamAchievements.currentDate', { date: game.finished || t('steamAchievements.noDate'), source: finishSourceLabel })}</span>
					</div>
					<div className='steam-date-suggestion__actions'>
						<button type='button' className='btn btn-primary btn-sm' onClick={() => handleDateSuggestion(true)} disabled={dateSuggestionBusy}>
							{t('steamAchievements.useSteam')}
						</button>
						<button type='button' className='btn btn-secondary btn-sm' onClick={() => handleDateSuggestion(false)} disabled={dateSuggestionBusy}>
							{t('steamAchievements.dismissDate')}
						</button>
					</div>
				</div>
			) : null}
			{loadError && (
				<p className='steam-achievement-notice' role='alert'>
					{t('steamAchievements.loadFailed')}{' '}
					<button type='button' onClick={handleSync} disabled={syncLoading}>
						{t('steamAchievements.retry')}
					</button>
				</p>
			)}
			{loading && !progress ? <p role='status'>{t('steamAchievements.loading')}</p> : progress && <SteamAchievements key={game.id} progress={progress} hideSummary={gallery} />}
		</div>
	)
}

export default SteamTab
