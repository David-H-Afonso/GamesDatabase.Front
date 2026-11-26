import { useEffect, useRef, useState } from 'react'
import type { Game } from '@/models/api/Game'
import { getRandomGame } from '@/services/CollectionService/DiscoveryService'

export const useRandomGame = (ownerId: number | undefined, routeKey: string, onOpen: (game: Game) => void) => {
	const identity = `${ownerId ?? 'anonymous'}:${routeKey}`, current = useRef(identity), open = useRef(onOpen)
	current.current = identity; open.current = onOpen
	const active = useRef<{ identity: string; controller: AbortController } | null>(null)
	const [state, setState] = useState<{ identity: string; loading: boolean; error: 'empty' | 'failed' | null }>({ identity: '', loading: false, error: null })
	useEffect(() => () => { if (active.current?.identity === identity) { active.current.controller.abort(); active.current = null } }, [identity])
	const pick = async (gameIds?: number[]) => {
		if (!ownerId || current.current !== identity || active.current?.identity === identity) return
		active.current?.controller.abort()
		const request = { identity, controller: new AbortController() }
		const requestedIds = gameIds ? [...gameIds] : undefined
		active.current = request; setState({ identity, loading: true, error: null })
		try {
			const game = await getRandomGame(request.controller.signal, requestedIds)
			if (!Number.isSafeInteger(game?.id) || game.id <= 0 || typeof game.name !== 'string') throw new Error('Invalid random-game result')
			if (requestedIds && !requestedIds.includes(game.id)) throw new Error('Random game is outside the displayed page')
			if (!request.controller.signal.aborted && current.current === identity) open.current(game)
		} catch (error) {
			const failure = error as { status?: number; code?: string }
			if (!request.controller.signal.aborted && current.current === identity) setState({ identity, loading: false, error: failure.status === 404 && ['emptyLibrary', 'emptySelection'].includes(failure.code ?? '') ? 'empty' : 'failed' })
		} finally {
			if (active.current === request) { active.current = null; setState(previous => previous.identity === identity ? { ...previous, loading: false } : previous) }
		}
	}
	const cancel = () => { if (active.current?.identity === identity) { active.current.controller.abort(); active.current = null }; if (current.current === identity) setState({ identity, loading: false, error: null }) }
	return { pick, cancel, loading: state.identity === identity && state.loading, error: state.identity === identity ? state.error : null, clearError: () => setState({ identity, loading: false, error: null }) }
}
