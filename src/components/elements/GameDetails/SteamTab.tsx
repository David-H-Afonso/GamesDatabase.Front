import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Game } from '@/models/api/Game'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { syncSteamGame } from '@/store/features/steam/steamSlice'
import { fetchGameById } from '@/store/features/games'
import { steamService, type SteamAchievementProgress, type SteamDateSuggestion } from '@/services'
import { SteamAchievements } from './SteamAchievements'
import './SteamTab.scss'

export const SteamTab = ({ game }: { game: Game }) => {
	const { t, i18n } = useTranslation()
	const dispatch = useAppDispatch()
	const { syncLoading } = useAppSelector(state => state.steam)
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

	const loadDateSuggestion = useCallback(async (signal: AbortSignal) => {
		if (!game.steamAppId) return
		setDateSuggestionLoading(true)
		try {
			const suggestions = await steamService.getDateSuggestions({ gameId: game.id, includeStarted: false, signal })
			if (!signal.aborted) setDateSuggestion(suggestions.find(suggestion => suggestion.gameId === game.id && suggestion.proposedFinished) ?? null)
		} catch {
			if (!signal.aborted) setDateSuggestion(null)
		} finally {
			if (!signal.aborted) setDateSuggestionLoading(false)
		}
	}, [game.id, game.steamAppId])

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
				if (data.source !== 'sets' && game.steamAppId && !data.lastSynced && !data.lastError) {
					await dispatch(syncSteamGame(game.id)).unwrap()
					if (controller.signal.aborted) return
					data = await steamService.getAchievementProgress(game.id, controller.signal)
					if (controller.signal.aborted) return
					setProgress(data)
					await dispatch(fetchGameById(game.id)).unwrap()
				}
			} catch {
				if (!controller.signal.aborted) setLoadError(true)
			} finally {
				if (!controller.signal.aborted) setLoading(false)
			}
		}
		void load()
		void loadDateSuggestion(controller.signal)
		return () => controller.abort()
	}, [game.id, game.steamAppId, dispatch, loadDateSuggestion])

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
		} catch {
			if (!signal.aborted) setSyncMessage(t('steamAchievements.syncFailed'))
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
	const finishSourceLabel = game.steamFinishedSource === 'steam' ? 'Steam' : t(game.finished ? 'steamAchievements.manual' : 'steamAchievements.noDate')
	return (
		<div className={`steam-tab ${progress?.isFullyCompleted ? 'steam-tab--complete' : ''}`}>
			<div className='steam-tab-header'>
				<div className='steam-tab-stats'>
					{game.steamPlaytimeForever != null && <div className='stat'><span className='stat-label'>{t('steamAchievements.playtime')}</span><span className='stat-value'>{t('steamAchievements.hours', { hours: Math.round(game.steamPlaytimeForever / 60) })}</span></div>}
					{game.steamPlaytime2Weeks != null && game.steamPlaytime2Weeks > 0 && <div className='stat'><span className='stat-label'>{t('steamAchievements.recentPlaytime')}</span><span className='stat-value'>{t('steamAchievements.hours', { hours: Math.round(game.steamPlaytime2Weeks / 60) })}</span></div>}
					{lastSynced && <div className='stat'><span className='stat-label'>{t('steamAchievements.lastSync')}</span><span className='stat-value'>{formatDate(lastSynced)}</span></div>}
					<div className='stat'><span className='stat-label'>{t('steamAchievements.finishDate')}</span><span className='stat-value'>{finishSourceLabel}</span></div>
				</div>
				<button type='button' className='btn btn-secondary btn-sm' onClick={handleSync} disabled={syncLoading || loading || !game.steamAppId}>{t(syncLoading ? 'steamAchievements.syncing' : 'steamAchievements.sync')}</button>
			</div>
			{syncMessage && <p className='sync-message' role='status'>{syncMessage}</p>}
			{dateSuggestionLoading ? <p className='sync-message'>{t('steamAchievements.dateLoading')}</p> : dateSuggestion?.proposedFinished ? (
				<div className={`steam-date-suggestion ${dateSuggestion.isFinishedConflict ? 'steam-date-suggestion--conflict' : ''}`}>
					<div className='steam-date-suggestion__copy'><span className='steam-date-suggestion__eyebrow'>{t(dateSuggestion.isFinishedConflict ? 'steamAchievements.dateConflict' : 'steamAchievements.dateSuggestion')}</span><strong>{dateSuggestion.proposedFinished}</strong><span>{t('steamAchievements.currentDate', { date: game.finished || t('steamAchievements.noDate'), source: finishSourceLabel })}</span></div>
					<div className='steam-date-suggestion__actions'><button type='button' className='btn btn-primary btn-sm' onClick={() => handleDateSuggestion(true)} disabled={dateSuggestionBusy}>{t('steamAchievements.useSteam')}</button><button type='button' className='btn btn-secondary btn-sm' onClick={() => handleDateSuggestion(false)} disabled={dateSuggestionBusy}>{t('steamAchievements.dismissDate')}</button></div>
				</div>
			) : null}
			{loadError && <p className='steam-achievement-notice' role='alert'>{t('steamAchievements.loadFailed')} <button type='button' onClick={handleSync} disabled={syncLoading}>{t('steamAchievements.retry')}</button></p>}
			{loading && !progress ? <p role='status'>{t('steamAchievements.loading')}</p> : progress && <SteamAchievements key={game.id} progress={progress} />}
		</div>
	)
}

export default SteamTab
