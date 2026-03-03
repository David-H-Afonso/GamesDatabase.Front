import type { Game } from '@/models/api/Game'

// OptimizedImage requests width * 2 for HiDPI, so these are already doubled
const COVER_WIDTHS = [700, 1200] as const // CardView (350), GameDetails (600)
const LOGO_WIDTHS = [100, 64, 160] as const // CardView (50), RowView (32), GameDetails (80)

export interface CacheEntry {
	url: string
	gameId: number
	gameName: string
}

export interface WarmResult {
	total: number
	completed: number
	errors: number
}

export type ProgressCallback = (completed: number, total: number, errors: number) => void

function buildProxyUrl(src: string, w: number): string {
	try {
		const url = new URL(src, window.location.origin)
		url.searchParams.set('w', String(w))
		return url.toString()
	} catch {
		return ''
	}
}

export function buildAllCacheEntries(games: Game[]): CacheEntry[] {
	const entries: CacheEntry[] = []

	for (const game of games) {
		if (game.cover?.includes('/game-images/')) {
			for (const w of COVER_WIDTHS) {
				const url = buildProxyUrl(game.cover, w)
				if (url) entries.push({ url, gameId: game.id, gameName: game.name })
			}
		}
		if (game.logo?.includes('/game-images/')) {
			for (const w of LOGO_WIDTHS) {
				const url = buildProxyUrl(game.logo, w)
				if (url) entries.push({ url, gameId: game.id, gameName: game.name })
			}
		}
	}

	return entries
}

export async function warmImageCache(entries: CacheEntry[], onProgress: ProgressCallback, signal: AbortSignal, concurrency = 8): Promise<WarmResult> {
	const total = entries.length
	let completed = 0
	let errors = 0
	let index = 0

	async function fetchOne(entry: CacheEntry): Promise<void> {
		try {
			const response = await fetch(entry.url, { signal })
			if (response.ok) {
				await response.blob() // drain so the browser HTTP cache stores it
			} else {
				errors++
				await response.body?.cancel()
			}
		} catch (err) {
			if ((err as DOMException).name !== 'AbortError') errors++
		} finally {
			completed++
			onProgress(completed, total, errors)
		}
	}

	async function worker(): Promise<void> {
		while (!signal.aborted) {
			const current = index++
			if (current >= total) break
			await fetchOne(entries[current])
		}
	}

	const workers = Array.from({ length: Math.min(concurrency, total) }, () => worker())
	await Promise.all(workers)

	return { total, completed, errors }
}
