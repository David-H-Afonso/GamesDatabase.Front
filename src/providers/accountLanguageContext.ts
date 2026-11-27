import { createContext, useContext } from 'react'
import type { UserLanguage } from '@/models/api/User'

export interface AccountLanguageSettings {
	busy: boolean
	supportsPersistence: boolean
	error: 'load' | 'save' | null
	change: (language: UserLanguage) => Promise<boolean>
	refresh: () => Promise<boolean>
}
export const AccountLanguageContext = createContext<AccountLanguageSettings | null>(null)
export const useAccountLanguage = () => useContext(AccountLanguageContext)
