import { useEffect, useState } from 'react'
import type { Game } from '@/models/api/Game'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { syncSteamGame } from '@/store/features/steam/steamSlice'
import { steamService, type SteamAchievement } from '@/services'
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

	useEffect(() => {
		loadAchievementsAndAutoSync()
	}, [game.id]) // eslint-disable-line react-hooks/exhaustive-deps

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

	const handleSync = async () => {
		try {
			await dispatch(syncSteamGame(game.id)).unwrap()
			setSyncMessage('Sincronización completada')
			await loadAchievements()
		} catch {
			setSyncMessage('Error durante la sincronización')
		}
		setTimeout(() => setSyncMessage(null), 3000)
	}

	const unlockedCount = achievements.filter((a) => a.achieved).length
	const totalCount = achievements.length
	const completionPercent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0

	const filteredAchievements = achievements.filter((a) => {
		if (filter === 'unlocked') return a.achieved
		if (filter === 'locked') return !a.achieved
		return true
	})

	const playtimeHours = game.steamPlaytimeForever ? Math.round(game.steamPlaytimeForever / 60) : null

	return (
		<div className='steam-tab'>
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
				</div>
				<button className='btn btn-secondary btn-sm' onClick={handleSync} disabled={syncLoading}>
					{syncLoading ? 'Sincronizando...' : '🔄 Sync'}
				</button>
			</div>

			{syncMessage && <p className='sync-message'>{syncMessage}</p>}
			{lastSyncResult && (
				<p className='sync-message'>
					Synced: {lastSyncResult.syncedGames} juegos, {lastSyncResult.syncedAchievements} logros
				</p>
			)}

			{totalCount > 0 && (
				<div className='achievement-summary'>
					<div className='achievement-progress-bar'>
						<div className='achievement-progress-fill' style={{ width: `${completionPercent}%` }} />
					</div>
					<p className='achievement-progress-label'>
						{unlockedCount} / {totalCount} logros ({completionPercent}%)
					</p>
				</div>
			)}

			{achievementsLoading ? (
				<p>Cargando logros...</p>
			) : totalCount > 0 ? (
				<>
					<div className='achievement-filter-tabs'>
						{(['all', 'unlocked', 'locked'] as AchievementFilter[]).map((f) => (
							<button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
								{f === 'all' ? 'Todos' : f === 'unlocked' ? 'Desbloqueados' : 'Bloqueados'}
							</button>
						))}
					</div>
					<div className='achievement-grid'>
						{filteredAchievements.map((a) => (
							<div key={a.apiName} className={`achievement-item ${a.achieved ? 'achieved' : 'locked'}`} title={a.description ?? a.displayName}>
								{a.iconUrl && <img src={a.achieved ? a.iconUrl : (a.iconGrayUrl ?? a.iconUrl)} alt={a.displayName} width={40} height={40} loading='lazy' />}
								<div className='achievement-info'>
									<span className='achievement-name'>{a.displayName}</span>
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
