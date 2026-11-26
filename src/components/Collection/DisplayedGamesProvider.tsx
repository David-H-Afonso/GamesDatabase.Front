import { useCallback, useRef, useState, type ReactNode } from 'react'
import { useAppSelector } from '@/store/hooks'
import { DisplayedGamesContext, type DisplayedGamesScope } from './displayedGamesContext'

/** Registers exactly a visible page, never a global search result or all filter matches. */
export const DisplayedGamesProvider = ({ children }: { children: ReactNode }) => {
	const ownerId = useAppSelector(state => state.auth.isAuthenticated ? state.auth.user?.id : undefined), owner = useRef(ownerId)
	owner.current = ownerId
	const [entry, setEntry] = useState<{ token: object; scope: DisplayedGamesScope } | null>(null)
	const register = useCallback((scope: DisplayedGamesScope) => {
		const token = {}
		if (scope.ownerId === owner.current) setEntry({ token, scope: { ...scope, gameIds: [...new Set(scope.gameIds)].filter(id => Number.isSafeInteger(id) && id > 0) } })
		return () => setEntry(current => current?.token === token ? null : current)
	}, [])
	return <DisplayedGamesContext.Provider value={{ scope: entry && entry.scope.ownerId === ownerId ? entry.scope : null, register }}>{children}</DisplayedGamesContext.Provider>
}
