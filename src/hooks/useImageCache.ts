import { useCallback, useMemo, useRef, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { selectGames } from '@/store/features/games/selector'
import { buildAllCacheEntries, warmImageCache } from '@/services/ImageCacheService'

export type CacheStatus = 'idle' | 'running' | 'done' | 'cancelled' | 'error'

interface ImageCacheState {
	status: CacheStatus
	completed: number
	total: number
	errors: number
}

export interface UseImageCacheReturn extends ImageCacheState {
	urlCount: number
	gamesWithImages: number
	percent: number
	start: () => Promise<void>
	cancel: () => void
	reset: () => void
}

export function useImageCache(): UseImageCacheReturn {
	const games = useAppSelector(selectGames)
	const abortRef = useRef<AbortController | null>(null)

	const [state, setState] = useState<ImageCacheState>({
		status: 'idle',
		completed: 0,
		total: 0,
		errors: 0,
	})

	const entries = useMemo(() => buildAllCacheEntries(games), [games])

	const gamesWithImages = useMemo(() => games.filter((g) => g.cover?.includes('/game-images/') || g.logo?.includes('/game-images/')).length, [games])

	const start = useCallback(async () => {
		abortRef.current?.abort()
		const controller = new AbortController()
		abortRef.current = controller

		setState({ status: 'running', completed: 0, total: entries.length, errors: 0 })

		try {
			const result = await warmImageCache(entries, (completed, total, errors) => setState((prev) => ({ ...prev, completed, total, errors })), controller.signal)

			if (controller.signal.aborted) {
				setState((prev) => ({ ...prev, status: 'cancelled' }))
			} else {
				setState((prev) => ({ ...prev, status: result.errors > 0 ? 'error' : 'done', ...result }))
			}
		} catch {
			setState((prev) => ({ ...prev, status: 'cancelled' }))
		}
	}, [entries])

	const cancel = useCallback(() => {
		abortRef.current?.abort()
		setState((prev) => ({ ...prev, status: 'cancelled' }))
	}, [])

	const reset = useCallback(() => {
		setState({ status: 'idle', completed: 0, total: 0, errors: 0 })
	}, [])

	const percent = state.total > 0 ? Math.min(100, Math.round((state.completed / state.total) * 100)) : 0

	return { ...state, urlCount: entries.length, gamesWithImages, percent, start, cancel, reset }
}
