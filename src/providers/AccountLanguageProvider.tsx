import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { forceLogout, logoutUser, setUserPreferences } from '@/store/features/auth/authSlice'
import { userService } from '@/services/UserService'
import type { User, UserLanguage } from '@/models/api/User'
import { AccountLanguageContext } from './accountLanguageContext'
import './AccountLanguageProvider.scss'

interface Session { ownerId: number; closed: boolean; controller: AbortController | null; supports: boolean; read: () => Promise<boolean>; save: (language: UserLanguage) => Promise<boolean> }
interface State { ownerId: number; ready: boolean; busy: boolean; supports: boolean; error: 'load' | 'save' | null }

/** Load the account's choice before mounting the guide. Never upload a cached device language. */
export const AccountLanguageProvider = ({ children }: { children: ReactNode }) => {
	const { t, i18n } = useTranslation(), dispatch = useAppDispatch()
	const authenticated = useAppSelector(state => state.auth.isAuthenticated)
	const userId = useAppSelector(state => state.auth.user?.id), token = useAppSelector(state => state.auth.token)
	const ownerId = authenticated && token ? userId : undefined
	const owner = useRef(ownerId); owner.current = ownerId
	const session = useRef<Session | null>(null)
	const [state, setState] = useState<State | null>(null)
	useEffect(() => {
		if (authenticated && (!userId || !token)) dispatch(forceLogout())
	}, [authenticated, userId, token, dispatch])
	useEffect(() => {
		if (!ownerId) { session.current = null; setState(null); return }
		const current: Session = { ownerId, closed: false, controller: null, supports: false, read: async () => false, save: async () => false }
		session.current = current
		setState({ ownerId, ready: false, busy: true, supports: false, error: null })
		const valid = () => !current.closed && session.current === current && owner.current === ownerId
		const adopt = async (profile: User) => {
			if (profile?.id !== ownerId || ![undefined, null, 'en', 'es'].includes(profile.preferredLanguage)) throw new Error('Invalid account profile')
			if (!valid()) return false
			if (profile.preferredLanguage) await i18n.changeLanguage(profile.preferredLanguage)
			if (!valid()) return false
			current.supports = Object.hasOwn(profile, 'preferredLanguage')
			dispatch(setUserPreferences({ useScoreColors: profile.useScoreColors, scoreProvider: profile.scoreProvider, showPriceComparisonIcon: profile.showPriceComparisonIcon }))
			setState({ ownerId, ready: true, busy: false, supports: current.supports, error: null })
			return true
		}
		current.read = async () => {
			if (!valid() || current.controller) return false
			const controller = new AbortController(); current.controller = controller
			setState(old => old?.ownerId === ownerId ? { ...old, busy: true } : old)
			try { return await adopt(await userService.getUserById(ownerId, controller.signal)) }
			catch { if (valid()) setState(old => old?.ownerId === ownerId ? { ...old, error: 'load' } : old); return false }
			finally { if (current.controller === controller) current.controller = null; if (valid()) setState(old => old?.ownerId === ownerId ? { ...old, busy: false } : old) }
		}
		current.save = async language => {
			if (!valid() || current.controller || !['en', 'es'].includes(language)) return false
			if (!current.supports) { await i18n.changeLanguage(language); return valid() }
			const controller = new AbortController(); current.controller = controller
			setState(old => old?.ownerId === ownerId ? { ...old, busy: true, error: null } : old)
			try {
				await userService.updateUser(ownerId, { preferredLanguage: language }, controller.signal)
				if (!valid()) return false
				await i18n.changeLanguage(language)
				if (!valid()) return false
				// The write is confirmed even if the following profile read fails.
				try { await adopt(await userService.getUserById(ownerId, controller.signal)) }
				catch { if (valid()) setState(old => old?.ownerId === ownerId ? { ...old, error: 'load' } : old) }
				return valid()
			} catch { if (valid()) setState(old => old?.ownerId === ownerId ? { ...old, error: 'save' } : old); return false }
			finally { if (current.controller === controller) current.controller = null; if (valid()) setState(old => old?.ownerId === ownerId ? { ...old, busy: false } : old) }
		}
		const refresh = () => { if (document.visibilityState !== 'hidden') void current.read() }
		window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh)
		void current.read()
		return () => { current.closed = true; current.controller?.abort(); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh) }
	}, [ownerId, dispatch, i18n])
	const refresh = useCallback(async () => { const current = session.current; return current && current.ownerId === owner.current && !current.closed ? current.read() : false }, [])
	const change = useCallback(async (language: UserLanguage) => { const current = session.current; return current && current.ownerId === owner.current && !current.closed ? current.save(language) : false }, [])
	const visible = state?.ownerId === ownerId ? state : null
	if (authenticated && !visible?.ready) return <div className='gdb-account-language' role={visible?.error ? 'alert' : 'status'}>
		<strong>Games Database</strong><p>{t(visible?.error ? 'accountLanguage.loadError' : 'accountLanguage.loading')}</p>
		{visible?.error && <div><button type='button' className='gdb-button' disabled={visible.busy} onClick={() => { void refresh() }}>{t('gallery.common.retry')}</button><button type='button' className='gdb-text-button' onClick={() => { void dispatch(logoutUser()) }}>{t('nav.logout')}</button></div>}
	</div>
	return <AccountLanguageContext.Provider value={{ busy: visible?.busy ?? false, supportsPersistence: visible?.supports ?? false, error: visible?.error ?? null, change, refresh }}>{children}</AccountLanguageContext.Provider>
}
