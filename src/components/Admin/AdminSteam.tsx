import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchSteamProfile, unlinkSteam, syncAllSteam, clearSteamError } from '@/store/features/steam/steamSlice'
import { setSteamProfile } from '@/store/features/auth/authSlice'
import { steamService } from '@/services'
import './AdminSteam.scss'

export const AdminSteam = () => {
	const dispatch = useAppDispatch()
	const authUser = useAppSelector((state) => state.auth.user)
	const { profile, profileLoading, syncLoading, lastSyncResult, error } = useAppSelector((state) => state.steam)
	const [message, setMessage] = useState<string | null>(null)
	const [isSuccess, setIsSuccess] = useState(true)

	const isSteamLinked = !!authUser?.steamId

	useEffect(() => {
		if (isSteamLinked) {
			dispatch(fetchSteamProfile())
		}
	}, [dispatch, isSteamLinked])

	const handleConnectSteam = async () => {
		try {
			const { url } = await steamService.getLinkUrl()
			window.location.href = url
		} catch {
			setMessage('Error al iniciar la conexión con Steam')
			setIsSuccess(false)
		}
	}

	const handleUnlink = async () => {
		if (!confirm('¿Desconectar cuenta de Steam?')) return
		try {
			await dispatch(unlinkSteam()).unwrap()
			dispatch(setSteamProfile(null))
			setMessage('Cuenta de Steam desconectada')
			setIsSuccess(true)
		} catch {
			setMessage('Error al desconectar Steam')
			setIsSuccess(false)
		}
		setTimeout(() => setMessage(null), 3000)
	}

	const handleSyncAll = async () => {
		try {
			const result = await dispatch(syncAllSteam()).unwrap()
			setMessage(`Sync completado: ${result.syncedGames} juegos, ${result.syncedAchievements} logros`)
			setIsSuccess(true)
		} catch {
			setMessage('Error durante la sincronización')
			setIsSuccess(false)
		}
		setTimeout(() => setMessage(null), 5000)
	}

	const handleClearError = () => dispatch(clearSteamError())

	return (
		<div className='admin-steam'>
			<h1 className='admin-page-title'>Steam Integration</h1>

			{(error || message) && (
				<div className={`alert ${isSuccess && !error ? 'alert--success' : 'alert--error'}`} onClick={handleClearError}>
					{error || message}
				</div>
			)}

			{!isSteamLinked ? (
				<div className='steam-connect-section'>
					<p>Conecta tu cuenta de Steam para importar tu biblioteca, sincronizar tiempo de juego y logros.</p>
					<button className='btn btn-steam' onClick={handleConnectSteam}>
						<img src='https://store.steampowered.com/favicon.ico' alt='' width={16} height={16} />
						Conectar cuenta de Steam
					</button>
				</div>
			) : (
				<div className='steam-linked-section'>
					{profileLoading ? (
						<p>Cargando perfil de Steam...</p>
					) : profile ? (
						<div className='steam-profile'>
							{profile.steamAvatarUrl && <img src={profile.steamAvatarUrl} alt={profile.steamNickname} className='steam-avatar' />}
							<div className='steam-profile-info'>
								<h3>{profile.steamNickname}</h3>
								<p className='steam-id'>SteamID: {profile.steamId}</p>
								{profile.steamLinkedAt && <p className='steam-linked-date'>Vinculado: {new Date(profile.steamLinkedAt).toLocaleDateString()}</p>}
							</div>
						</div>
					) : null}

					<div className='steam-actions'>
						<button className='btn btn-primary' onClick={handleSyncAll} disabled={syncLoading}>
							{syncLoading ? 'Sincronizando...' : '🔄 Sincronizar todo'}
						</button>
						<button className='btn btn-danger' onClick={handleUnlink}>
							Desconectar Steam
						</button>
					</div>

					{lastSyncResult && (
						<div className='steam-sync-result'>
							<h4>Último resultado de sincronización</h4>
							<ul>
								<li>Juegos sincronizados: {lastSyncResult.syncedGames}</li>
								<li>Logros sincronizados: {lastSyncResult.syncedAchievements}</li>
								{lastSyncResult.errors?.length > 0 && <li className='sync-errors'>Errores: {lastSyncResult.errors.join(', ')}</li>}
							</ul>
						</div>
					)}
				</div>
			)}
		</div>
	)
}

export default AdminSteam
