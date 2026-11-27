import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useAppSelector } from '@/store/hooks'
import { collectionVersion, subscribeCollection } from '@/services/CollectionService/collectionEvents'

export const useCollectionResource = <T,>(key: string, loader: (signal: AbortSignal) => Promise<T>, enabled = true) => {
	const userId = useAppSelector(state => state.auth.user?.id)
	const version = useSyncExternalStore(subscribeCollection, collectionVersion, collectionVersion)
	const [refreshVersion, setRefreshVersion] = useState(0)
	const baseIdentity = `${userId ?? 'anonymous'}:${key}`
	const identity = `${baseIdentity}:${version}:${refreshVersion}`
	const loaderRef = useRef(loader)
	loaderRef.current = loader
	const activeIdentity = useRef({ identity, baseIdentity }), activeRequest = useRef<AbortController | null>(null)
	activeIdentity.current = { identity, baseIdentity }
	const [state, setState] = useState<{ identity: string; baseIdentity: string; data: T | null; loading: boolean; error: boolean }>({ identity: '', baseIdentity: '', data: null, loading: enabled, error: false })
	useEffect(() => {
		if (!enabled || !userId) return
		const controller = new AbortController()
		activeRequest.current = controller
		setState(previous => ({ identity, baseIdentity, data: previous.baseIdentity === baseIdentity ? previous.data : null, loading: true, error: false }))
		void loaderRef.current(controller.signal).then(data => {
			if (!controller.signal.aborted) setState({ identity, baseIdentity, data, loading: false, error: false })
		}).catch(() => {
			if (!controller.signal.aborted) setState(previous => ({ identity, baseIdentity, data: previous.baseIdentity === baseIdentity ? previous.data : null, loading: false, error: true }))
		})
		return () => { controller.abort(); if (activeRequest.current === controller) activeRequest.current = null }
	}, [identity, baseIdentity, enabled, userId])
	const replaceData = useCallback((update: T | ((current: T | null) => T)) => {
		if (!enabled || !userId || activeIdentity.current.baseIdentity !== baseIdentity) return
		activeRequest.current?.abort()
		setState(previous => {
			const current = activeIdentity.current
			if (current.baseIdentity !== baseIdentity) return previous
			const data = typeof update === 'function' ? (update as (value: T | null) => T)(previous.baseIdentity === baseIdentity ? previous.data : null) : update
			return { ...current, data, loading: false, error: false }
		})
	}, [baseIdentity, enabled, userId])
	const refresh = useCallback(() => { if (enabled && userId) setRefreshVersion(value => value + 1) }, [enabled, userId])
	return state.baseIdentity === baseIdentity && enabled ? { data: state.data, loading: state.identity !== identity || state.loading, error: state.identity === identity && state.error, replaceData, refresh } : { data: null, loading: enabled && Boolean(userId), error: false, replaceData, refresh }
}
