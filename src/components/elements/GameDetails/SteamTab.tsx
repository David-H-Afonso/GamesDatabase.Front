import { useEffect, useState } from 'react'
import type { Game } from '@/models/api/Game'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { syncSteamGame } from '@/store/features/steam/steamSlice'
import { fetchGameById } from '@/store/features/games'
import { steamService, type SteamAchievement, type SteamDateSuggestion } from '@/services'
import './SteamTab.scss'

interface Props {
	game: Game
}

type AchievementFilter = 'all' | 'unlocked' | 'locked'

export const SteamTab = ({ game }: Props) => {
	const dispatch = useAppDispatch()
	const { syncLoading, lastSyncResult } = useAppSelector((state) => state.steam)
	const [achievements, setAchievements] = useState<SteamAchievement[]>([])
	const [achievementsLoading, setAchievementsLoading] = useState(false)
	const [filter, setFilter] = useState<AchievementFilter>('all')
	const [syncMessage, setSyncMessage] = useState<string | null>(null)
	const [dateSuggestion, setDateSuggestion] = useState<SteamDateSuggestion | null>(null)
	const [dateSuggestionLoading, setDateSuggestionLoading] = useState(false)
	const [dateSuggestionBusy, setDateSuggestionBusy] = useState(false)

	useEffect(() => {
		const controller = new AbortController()
		loadAchievementsAndAutoSync()
		loadDateSuggestion(controller.signal)
		return () => controller.abort()
	}, [game.id])

	const loadAchievementsAndAutoSync = async () => {
		setAchievementsLoading(true)
		try {
			const data = await steamService.getAchievements(game.id)
			setAchievements(data)
			// Auto-sync if game has steamAppId but no cached achievements yet
			if (data.length === 0 && game.steamAppId) {
				await dispatch(syncSteamGame(game.id)).unwrap()
				const fresh = await steamService.getAchievements(game.id)
				setAchievements(fresh)
			}
		} catch {
			// No achievements or private profile
		} finally {
			setAchievementsLoading(false)
		}
	}

	const loadAchievements = async () => {
		try {
			const data = await steamService.getAchievements(game.id)
			setAchievements(data)
		} catch {
			// No achievements or private profile
		}
	}

	const loadDateSuggestion = async (signal?: AbortSignal) => {
		if (!game.steamAppId) {
			setDateSuggestion(null)
			return
		}

		setDateSuggestionLoading(true)
		try {
			const suggestions = await steamService.getDateSuggestions({ gameId: game.id, includeStarted: false, signal })
			setDateSuggestion(suggestions.find((suggestion) => suggestion.gameId === game.id && suggestion.proposedFinished) ?? null)
		} catch (error) {
			if (error instanceof Error && error.message.includes('Request cancelled')) return
			setDateSuggestion(null)
		} finally {
			if (!signal?.aborted) setDateSuggestionLoading(false)
		}
	}

	const handleSync = async () => {
		try {
			await dispatch(syncSteamGame(game.id)).unwrap()
			setSyncMessage('Sincronización completada')
			await loadAchievements()
			await dispatch(fetchGameById(game.id)).unwrap()
			await loadDateSuggestion()
		} catch {
			setSyncMessage('Error durante la sincronización')
		}
		setTimeout(() => setSyncMessage(null), 3000)
	}

	const handleApplyFinishedSuggestion = async () => {
		if (!dateSuggestion?.proposedFinished) return

		setDateSuggestionBusy(true)
		try {
			await steamService.applyDateSuggestions([{ gameId: game.id, finished: dateSuggestion.proposedFinished }])
			setSyncMessage('Fecha de fin sincronizada con Steam')
			setDateSuggestion(null)
			await dispatch(fetchGameById(game.id)).unwrap()
		} catch {
			setSyncMessage('Error aplicando la fecha de Steam')
		} finally {
			setDateSuggestionBusy(false)
			setTimeout(() => setSyncMessage(null), 3000)
		}
	}

	const handleDismissFinishedSuggestion = async () => {
		if (!dateSuggestion?.proposedFinished) return

		setDateSuggestionBusy(true)
		try {
			await steamService.dismissDateSuggestions([{ gameId: game.id, finished: dateSuggestion.proposedFinished }])
			setSyncMessage('Sugerencia descartada')
			setDateSuggestion(null)
			await dispatch(fetchGameById(game.id)).unwrap()
		} catch {
			setSyncMessage('Error descartando la sugerencia')
		} finally {
			setDateSuggestionBusy(false)
			setTimeout(() => setSyncMessage(null), 3000)
		}
	}

	const unlockedCount = achievements.filter((a) => a.achieved).length
	const totalCount = achievements.length
	const completionPercent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0
	const isAchievementComplete = totalCount > 0 && unlockedCount === totalCount

	const filteredAchievements = achievements.filter((a) => {
		if (filter === 'unlocked') return a.achieved
		if (filter === 'locked') return !a.achieved
		return true
	})

	const playtimeHours = game.steamPlaytimeForever ? Math.round(game.steamPlaytimeForever / 60) : null
	const finishSourceLabel = game.steamFinishedSource === 'steam' ? 'Steam' : game.finished ? 'Manual' : 'Sin fecha'
	const syncedGames = lastSyncResult?.gamesUpdated ?? lastSyncResult?.syncedGames ?? 0
	const syncedAchievements = lastSyncResult?.achievementsUpdated ?? lastSyncResult?.syncedAchievements ?? 0
	const filterOptions: Array<{ value: AchievementFilter; label: string; count: number }> = [
		{ value: 'all', label: 'Todos', count: totalCount },
		{ value: 'unlocked', label: 'Desbloqueados', count: unlockedCount },
		{ value: 'locked', label: 'Bloqueados', count: totalCount - unlockedCount },
	]

	return (
		<div className={`steam-tab ${isAchievementComplete ? 'steam-tab--complete' : ''}`}>
			<div className='steam-tab-header'>
				<div className='steam-tab-stats'>
					{playtimeHours !== null && (
						<div className='stat'>
							<span className='stat-label'>Tiempo de juego</span>
							<span className='stat-value'>{playtimeHours}h</span>
						</div>
					)}
					{game.steamPlaytime2Weeks != null && game.steamPlaytime2Weeks > 0 && (
						<div className='stat'>
							<span className='stat-label'>Últimas 2 semanas</span>
							<span className='stat-value'>{Math.round(game.steamPlaytime2Weeks / 60)}h</span>
						</div>
					)}
					{game.steamLastSynced && (
						<div className='stat'>
							<span className='stat-label'>Última sync</span>
							<span className='stat-value'>{new Date(game.steamLastSynced).toLocaleDateString()}</span>
						</div>
					)}
					<div className='stat'>
						<span className='stat-label'>Fecha fin</span>
						<span className='stat-value'>{finishSourceLabel}</span>
					</div>
				</div>
				<button className='btn btn-secondary btn-sm' onClick={handleSync} disabled={syncLoading}>
					{syncLoading ? 'Sincronizando...' : 'Sync'}
				</button>
			</div>

			{syncMessage && <p className='sync-message'>{syncMessage}</p>}
			{lastSyncResult && (
				<p className='sync-message'>
					Synced: {syncedGames} juegos, {syncedAchievements} logros
				</p>
			)}

			{dateSuggestionLoading ? (
				<p className='sync-message'>Buscando fecha de fin en Steam...</p>
			) : dateSuggestion?.proposedFinished ? (
				<div className={`steam-date-suggestion ${dateSuggestion.isFinishedConflict ? 'steam-date-suggestion--conflict' : ''}`}>
					<div className='steam-date-suggestion__copy'>
						<span className='steam-date-suggestion__eyebrow'>{dateSuggestion.isFinishedConflict ? 'Steam propone otra fecha de fin' : 'Steam tiene fecha de fin'}</span>
						<strong>{dateSuggestion.proposedFinished}</strong>
						<span>
							Actual: {game.finished || 'sin fecha'} · Origen actual: {finishSourceLabel}
						</span>
					</div>
					<div className='steam-date-suggestion__actions'>
						<button className='btn btn-primary btn-sm' onClick={handleApplyFinishedSuggestion} disabled={dateSuggestionBusy}>
							Usar Steam
						</button>
						<button className='btn btn-secondary btn-sm' onClick={handleDismissFinishedSuggestion} disabled={dateSuggestionBusy}>
							No mostrar más
						</button>
					</div>
				</div>
			) : game.steamFinishedSource === 'steam' && game.steamFinishedSyncedAt ? (
				<p className='sync-message'>Fecha de fin gestionada por Steam desde {new Date(game.steamFinishedSyncedAt).toLocaleDateString()}.</p>
			) : null}

			{totalCount > 0 && (
				<div className='achievement-summary'>
					<div className='achievement-summary__topline'>
						<p className='achievement-progress-label'>
							{unlockedCount} / {totalCount} logros
						</p>
						<span className='achievement-progress-percent'>{completionPercent}%</span>
					</div>
					<div className='achievement-progress-bar' aria-label={`${completionPercent}%`}>
						<div className='achievement-progress-fill' style={{ width: `${completionPercent}%` }} />
					</div>
					{isAchievementComplete && <p className='achievement-perfect-message'>Todos los logros completados</p>}
				</div>
			)}

			{achievementsLoading ? (
				<p>Cargando logros...</p>
			) : totalCount > 0 ? (
				<>
					<div className='achievement-filter-tabs'>
						{filterOptions.map((option) => (
							<button key={option.value} className={filter === option.value ? 'active' : ''} onClick={() => setFilter(option.value)}>
								<span>{option.label}</span>
								<small>{option.count}</small>
							</button>
						))}
					</div>
					<div className='achievement-grid'>
						{filteredAchievements.map((a) => (
							<div key={a.apiName} className={`achievement-item ${a.achieved ? 'achieved' : 'locked'}`} title={a.description ?? a.displayName}>
								{a.iconUrl && <img src={a.achieved ? a.iconUrl : (a.iconGrayUrl ?? a.iconUrl)} alt={a.displayName} width={40} height={40} loading='lazy' />}
								<div className='achievement-info'>
									<span className='achievement-name'>{a.displayName}</span>
									{a.description && <span className='achievement-description'>{a.description}</span>}
									{a.unlockTime && <span className='achievement-date'>{new Date(a.unlockTime).toLocaleDateString()}</span>}
								</div>
							</div>
						))}
					</div>
				</>
			) : (
				<p className='no-achievements'>No hay datos de logros disponibles.</p>
			)}
		</div>
	)
}

export default SteamTab
