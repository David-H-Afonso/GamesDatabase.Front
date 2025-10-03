import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { RouterProvider } from 'react-router-dom'
import { store, persistor } from './store'
import { router } from '@/navigation/router'
import { ThemeProvider } from './providers'
import { restoreAuth } from './store/features/auth/authSlice'
import '@/assets/styles/index.scss'

// Remove preload class after styles are loaded to enable transitions
setTimeout(() => {
	document.documentElement.classList.remove('preload')
}, 0)

// Restore authentication state from localStorage on app startup
store.dispatch(restoreAuth())

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<Provider store={store}>
			<ThemeProvider>
				<PersistGate loading={<div>Loading...</div>} persistor={persistor}>
					<RouterProvider router={router} />
				</PersistGate>
			</ThemeProvider>
		</Provider>
	</StrictMode>
)
