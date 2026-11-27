import '@/i18n'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { RouterProvider } from 'react-router-dom'
import { store, persistor } from './store'
import { router } from '@/navigation/router'
import { ThemeProvider } from './providers'
import { restoreAuth, forceLogout, setRefreshedTokens } from './store/features/auth/authSlice'
import { initCustomFetch } from '@/utils/customFetch'
import '@/assets/styles/index.scss'
import '@/assets/styles/gallery-experience.scss'
import { OnboardingProvider } from '@/components/Onboarding/OnboardingProvider'
import { GameMetadataProvider } from '@/components/Collection/GameMetadataProvider'
import { DisplayedGamesProvider } from '@/components/Collection/DisplayedGamesProvider'
import { AccountLanguageProvider } from '@/providers/AccountLanguageProvider'

initCustomFetch(store, persistor, forceLogout, setRefreshedTokens)

if (import.meta.hot) {
	import.meta.hot.accept('@/utils/customFetch', () => initCustomFetch(store, persistor, forceLogout, setRefreshedTokens))
}

// Remove preload class after styles are loaded to enable transitions
setTimeout(() => {
	document.documentElement.classList.remove('preload')
}, 0)

// Restore authentication state from localStorage on app startup
store.dispatch(restoreAuth())

// Flush redux-persist immediately when the app is hidden/closed.
// Android PWAs and mobile browsers don't reliably fire beforeunload, so the
// 1-second write throttle can drop state changes made just before closing.
// visibilitychange(hidden) + pagehide cover all browsers / PWA scenarios.
const flushPersistor = () => {
	void persistor.flush()
}
document.addEventListener('visibilitychange', () => {
	if (document.visibilityState === 'hidden') flushPersistor()
})
window.addEventListener('pagehide', flushPersistor)

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<Provider store={store}>
			<PersistGate loading={null} persistor={persistor}>
				<ThemeProvider>
					<AccountLanguageProvider><OnboardingProvider><GameMetadataProvider><DisplayedGamesProvider><RouterProvider router={router} /></DisplayedGamesProvider></GameMetadataProvider></OnboardingProvider></AccountLanguageProvider>
				</ThemeProvider>
			</PersistGate>
		</Provider>
	</StrictMode>
)
