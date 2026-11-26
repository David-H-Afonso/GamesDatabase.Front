import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppDispatch } from '@/store/hooks'
import { invalidateCache, triggerGamesRefresh } from '@/store/features/games/gamesSlice'
import { steamService, isSteamSyncActive, type SteamSyncJob } from '@/services/SteamService/SteamService'
import { steamErrorKey } from '@/utils/steamErrors'
import { invalidateCollection } from '@/services/CollectionService/collectionEvents'

interface Session {
	controller: AbortController
	timer?: ReturnType<typeof setTimeout>
	sequence: number
	failures: number
	starting: boolean
	job: SteamSyncJob | null
	invalidated: number
	run: (id?: string) => Promise<void>
	adopt: (job: SteamSyncJob | null) => void
}

/** Observes only the current explicit job. No polling when idle, terminal or unmounted. */
export const useSteamSyncJob = (userId: number | undefined, linked: boolean) => {
	const dispatch = useAppDispatch()
	const [job, setJob] = useState<SteamSyncJob | null>(null)
	const [checking, setChecking] = useState(false)
	const [starting, setStarting] = useState(false)
	const [errorKey, setErrorKey] = useState<string | null>(null)
	const session = useRef<Session | null>(null)

	useEffect(() => {
		setJob(null)
		setErrorKey(null)
		setStarting(false)
		setChecking(Boolean(userId && linked))
		if (!userId || !linked) { session.current = null; return }
		const current: Session = { controller: new AbortController(), sequence: 0, failures: 0, starting: false, job: null, invalidated: 0, run: async () => undefined, adopt: () => undefined }
		session.current = current
		const valid = () => session.current === current && !current.controller.signal.aborted
		current.adopt = value => {
			if (value?.id !== current.job?.id) current.invalidated = 0
			if (value && value.processedGames > current.invalidated) {
				current.invalidated = value.processedGames
				dispatch(invalidateCache())
				dispatch(triggerGamesRefresh())
				invalidateCollection()
			}
			current.job = value
			setJob(value)
		}
		current.run = async id => {
			clearTimeout(current.timer)
			const sequence = ++current.sequence
			try {
				const value = id ? await steamService.getSyncJob(id, current.controller.signal) : await steamService.getCurrentSyncJob(current.controller.signal)
				if (!valid() || sequence !== current.sequence) return
				current.failures = 0
				current.adopt(value)
				setErrorKey(null)
				if (isSteamSyncActive(value)) current.timer = setTimeout(() => void current.run(value!.id), 2000)
			} catch (error) {
				if (!valid() || sequence !== current.sequence) return
				const key = steamErrorKey(error)
				setErrorKey(key)
				if (key === 'steamSync.errors.statusLost') {
					if (current.job) current.adopt({ ...current.job, state: 'interrupted', currentGameName: undefined, error: 'syncInterrupted' })
				} else if (++current.failures < 3) {
					current.timer = setTimeout(() => void current.run(id), 2000 * 2 ** current.failures)
				}
			} finally {
				if (valid() && sequence === current.sequence) setChecking(false)
			}
		}
		void current.run()
		return () => { current.controller.abort(); clearTimeout(current.timer) }
	}, [userId, linked, dispatch])

	const refresh = useCallback(async () => {
		const current = session.current
		if (!current || current.controller.signal.aborted || current.starting) return
		current.failures = 0
		setChecking(true)
		await current.run() // Recover the latest job; a restarted server may no longer know the old ID.
	}, [])

	const start = useCallback(async () => {
		const current = session.current
		if (!current || current.controller.signal.aborted || current.starting || isSteamSyncActive(current.job)) return
		clearTimeout(current.timer)
		++current.sequence // Ignore older GET responses racing with this explicit start.
		const previousId = current.job?.id
		current.starting = true
		setStarting(true)
		setErrorKey(null)
		try {
			const value = await steamService.startSyncJob(current.controller.signal)
			if (session.current !== current || current.controller.signal.aborted) return
			current.failures = 0
			current.adopt(value)
			setChecking(false)
			if (isSteamSyncActive(value)) current.timer = setTimeout(() => void current.run(value.id), 1000)
		} catch (error) {
			if (session.current !== current || current.controller.signal.aborted) return
			const key = steamErrorKey(error)
			// An ambiguous POST failure can still mean the server accepted the job.
			// Reconcile with a GET, never automatically send another POST.
			await current.run()
			if (session.current === current && !current.controller.signal.aborted &&
				(!current.job || (current.job.id === previousId && !isSteamSyncActive(current.job)))) setErrorKey(key)
		} finally {
			current.starting = false
			if (session.current === current && !current.controller.signal.aborted) setStarting(false)
		}
	}, [])

	return { job, checking, starting, errorKey, start, refresh, busy: checking || starting || isSteamSyncActive(job) }
}
