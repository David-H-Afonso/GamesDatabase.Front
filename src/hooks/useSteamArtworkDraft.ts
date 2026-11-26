import { useCallback, useEffect, useRef, useState } from 'react'
import { steamService } from '@/services/SteamService/SteamService'
import { preloadArtwork, safeArtworkUrl } from '@/utils/artworkImage'
import type { GameEditorDraft } from '@/utils/gameEditor'
import type { GameArtworkRole, SteamArtwork } from '@/models/api/SteamArtwork'

/** Explicit single-flight reads; candidates stay local until the editor saves. */
export const useSteamArtworkDraft = (draft: GameEditorDraft, onCandidate: (role: GameArtworkRole, url: string) => void) => {
	const latest = useRef({ draft, onCandidate }), request = useRef<AbortController | null>(null)
	latest.current = { draft, onCandidate }
	const [loading, setLoading] = useState<GameArtworkRole | null>(null), [failed, setFailed] = useState<GameArtworkRole | null>(null)
	useEffect(() => {
		setLoading(null); setFailed(null)
		return () => { request.current?.abort(); request.current = null }
	}, [draft.steamAppId])
	const refresh = useCallback(async (role: GameArtworkRole) => {
		const before = latest.current.draft, appId = Number(before.steamAppId)
		if (request.current || !Number.isSafeInteger(appId) || appId <= 0 || appId > 2147483647) return
		const controller = new AbortController()
		request.current = controller; setLoading(role); setFailed(null)
		try {
			for (let attempt = 0; attempt < (role === 'logo' ? 3 : 1); attempt++) {
				if (controller.signal.aborted) return
				try {
					const assets = await steamService.getAppArtwork(appId, controller.signal)
					if (controller.signal.aborted || request.current !== controller || latest.current.draft.steamAppId !== before.steamAppId || latest.current.draft[role] !== before[role]) return
					const candidate = safeArtworkUrl(assets[`${role}Url` as keyof SteamArtwork])
					if (candidate && await preloadArtwork(candidate, controller.signal)) {
						const current = latest.current
						if (!controller.signal.aborted && request.current === controller && current.draft.steamAppId === before.steamAppId && current.draft[role] === before[role]) current.onCandidate(role, candidate)
						return
					}
				} catch { if (controller.signal.aborted) return }
			}
			if (!controller.signal.aborted && request.current === controller) setFailed(role)
		} finally {
			if (request.current === controller) { request.current = null; setLoading(null) }
		}
	}, [])
	return { loading, failed, refresh }
}
