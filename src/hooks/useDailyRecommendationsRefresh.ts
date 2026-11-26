import { useEffect } from 'react'
import { useAppSelector } from '@/store/hooks'
import type { HomeRowResult } from '@/models/api/Collection'
import { invalidateCollection } from '@/services/CollectionService/collectionEvents'

/** Page-scoped observation of the server boundary, not a scheduled server worker. */
export const useDailyRecommendationsRefresh = (rows: HomeRowResult[] | null) => {
	const owner = useAppSelector(state => state.auth.user?.id)
	const deadlines = JSON.stringify((rows ?? []).filter(row => row.refreshAt && row.serverTime).map(row => [row.refreshAt, row.serverTime]))
	useEffect(() => {
		if (!owner) return
		const values = JSON.parse(deadlines) as Array<[string, string]>
		const delays = values.map(([deadline, now]) => Date.parse(deadline) - Date.parse(now)).filter(Number.isFinite)
		if (!delays.length) return
		const duration = Math.max(0, Math.min(...delays)) + 300, started = performance.now()
		let fired = false
		const refresh = () => { if (!fired && document.visibilityState !== 'hidden') { fired = true; invalidateCollection() } }
		const timer = setTimeout(refresh, Math.min(duration, 2147483647))
		const visible = () => { if (performance.now() - started >= duration) refresh() }
		document.addEventListener('visibilitychange', visible)
		return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', visible) }
	}, [deadlines, owner])
}
