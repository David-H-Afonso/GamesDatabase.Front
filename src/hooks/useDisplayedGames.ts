import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAppSelector } from '@/store/hooks'
import { useDisplayedGamesScope } from '@/components/Collection/displayedGamesContext'
import type { Game } from '@/models/api/Game'

export const useDisplayedGames = (games: Pick<Game, 'id'>[], query: string, loading = false) => {
	const ownerId = useAppSelector(state => state.auth.isAuthenticated ? state.auth.user?.id : undefined)
	const { pathname, search } = useLocation(), register = useDisplayedGamesScope()?.register
	const ids = JSON.stringify(games.map(game => game.id)), route = pathname + search
	useEffect(() => {
		if (!ownerId || !register) return
		return register({ ownerId, route, signature: `${route}:${query}:${ids}`, gameIds: JSON.parse(ids), loading })
	}, [ownerId, register, route, query, ids, loading])
}
