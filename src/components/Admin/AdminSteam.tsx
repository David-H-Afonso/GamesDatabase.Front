import { useEffect, useState, type FormEvent } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchSteamProfile, unlinkSteam, syncAllSteam, clearSteamError } from '@/store/features/steam/steamSlice'
import { setSteamProfile } from '@/store/features/auth/authSlice'
import { steamService } from '@/services/SteamService/SteamService'
import './AdminSteam.scss'

export const AdminSteam = () => {
	const dispatch = useAppDispatch()
	const authUser = useAppSelector((state) => state.auth.user)
	const { profile, profileLoading, syncLoading, lastSyncResult, error } = useAppSelector((state) => state.steam)
	const [message, setMessage] = useState<string | null>(null)
	const [isSuccess, setIsSuccess] = useState(true)
	const [manualSteamId, setManualSteamId] = useState('')
	const [manualLinkLoading, setManualLinkLoading] = useState(false)

	const isSteamLinked = !!authUser?.steamId

	useEffect(() => {
		if (isSteamLinked) {
			dispatch(fetchSteamProfile())
		}
	}, [dispatch, isSteamLinked])

	const handleConnectSteam = async () => {
		try {
			const { url } = await steamService.getLinkUrl()
			if (window.electronAPI?.isElectron) {
				await window.electronAPI.openExternal(url)
			} else {
				window.location.href = url
			}
		} catch {
			setMessage('Error al iniciar la conexión con Steam')
			setIsSuccess(false)
		}
	}

	const handleManualLink = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		const steamId = manualSteamId.trim()
		if (!steamId) {
			setMessage('Introduce un SteamID64')
			setIsSuccess(false)
			return
		}

		setManualLinkLoading(true)
		try {
			const linkedProfile = await steamService.linkManually(steamId)
			dispatch(
				setSteamProfile({
					steamId: linkedProfile.steamId,
					steamNickname: linkedProfile.steamNickname,
					steamAvatarUrl: linkedProfile.steamAvatarUrl,
				})
			)
			setManualSteamId('')
			setMessage('Cuenta de Steam vinculada')
			setIsSuccess(true)
		} catch {
			setMessage('No se pudo vincular ese SteamID')
			setIsSuccess(false)
		} finally {
			setManualLinkLoading(false)
			setTimeout(() => setMessage(null), 4000)
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
					<div className='steam-connect-card'>
						<h2>Conectar con Steam</h2>
						<p>Vincula la cuenta con Steam OpenID cuando la app se use desde navegador.</p>
						<button className='btn btn-steam' onClick={handleConnectSteam}>
							<img src='https://store.steampowered.com/favicon.ico' alt='' width={16} height={16} />
							Conectar cuenta de Steam
						</button>
					</div>

					<form className='steam-connect-card steam-manual-form' onSubmit={handleManualLink}>
						<h2>SteamID64 manual</h2>
						<label htmlFor='manual-steam-id'>SteamID64 o URL de perfil</label>
						<div className='steam-manual-row'>
							<input
								id='manual-steam-id'
								type='text'
								value={manualSteamId}
								onChange={(event) => setManualSteamId(event.target.value)}
								placeholder='7656119...'
								autoComplete='off'
							/>
							<button className='btn btn-primary' type='submit' disabled={manualLinkLoading}>
								{manualLinkLoading ? 'Guardando...' : 'Guardar'}
							</button>
						</div>
						<p>Úsalo en la app desktop si el navegador no puede volver automáticamente al ejecutable.</p>
					</form>
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
