import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { useTranslation } from 'react-i18next'
import { fetchGameViews, fetchPublicGameViews } from '@/store/features/gameViews/thunk'
import { useCollectionResource } from '@/hooks/useCollectionResource'
import { changeTutorialSamples, createTutorialSamples, createTutorialViews, getOnboarding, saveOnboarding, startOnboarding } from '@/services/CollectionService/OnboardingService'
import { invalidateCollection, isCollectionConflict } from '@/services/CollectionService/collectionEvents'
import type { OnboardingState, OnboardingStep, TutorialSampleRequest } from '@/models/api/Onboarding'
import { OnboardingContext } from './onboardingContext'

/** One coordinator across routes and both app shells; state is always owned by the API account. */
export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
	const userId = useAppSelector(state => state.auth.isAuthenticated ? state.auth.user?.id : undefined)
	const dispatch = useAppDispatch(), { i18n } = useTranslation()
	const resource = useCollectionResource('onboarding', signal => getOnboarding(signal), Boolean(userId))
	const owner = useRef(userId), active = useRef<{ ownerId: number; controller: AbortController } | null>(null), autoShown = useRef<number | null>(null)
	owner.current = userId
	const [openFor, setOpenFor] = useState<number | null>(null), [busyFor, setBusyFor] = useState<number | null>(null)
	const [failure, setFailure] = useState<{ ownerId: number; kind: 'conflict' | 'request' } | null>(null)
	useEffect(() => {
		if (!userId) autoShown.current = null
		return () => { if (active.current && active.current.ownerId === userId) { active.current.controller.abort(); active.current = null } }
	}, [userId])
	useEffect(() => {
		if (userId && resource.data?.enabled && autoShown.current !== userId && !document.querySelector('dialog[open]')) {
			autoShown.current = userId; setOpenFor(userId)
		}
	}, [userId, resource.data, openFor])
	const run = async <T,>(operation: (data: OnboardingState | null, signal: AbortSignal) => Promise<{ state: OnboardingState; result: T }>, invalidate = false): Promise<T | null> => {
		const id = userId
		if (!id || owner.current !== id || active.current?.ownerId === id) return null
		active.current?.controller.abort()
		const controller = new AbortController(), request = { ownerId: id, controller }
		active.current = request; setBusyFor(id); setFailure(null)
		try {
			const answer = await operation(resource.data, controller.signal)
			if (controller.signal.aborted || owner.current !== id) return null
			resource.replaceData(answer.state)
			if (invalidate) { invalidateCollection(); void dispatch(fetchGameViews({})); void dispatch(fetchPublicGameViews()) }
			return answer.result
		} catch (error) {
			if (!controller.signal.aborted && owner.current === id) setFailure({ ownerId: id, kind: isCollectionConflict(error) ? 'conflict' : 'request' })
			return null
		} finally {
			if (active.current === request) { active.current = null; setBusyFor(null) }
		}
	}
	const reload = () => run(async (_, signal) => { const state = await getOnboarding(signal); return { state, result: state } })
	const openGuide = async (restart = false, targetStep?: OnboardingStep) => {
		if (!userId || owner.current !== userId || active.current?.ownerId === userId) return
		autoShown.current = userId; setOpenFor(userId)
		await run(async (current, signal) => {
			let state = current ?? await getOnboarding(signal)
			if (!state.enabled || restart || state.completedVersion) state = await startOnboarding(state.revision, restart, signal)
			if (targetStep && state.step !== targetStep) state = await saveOnboarding(state.revision, targetStep, true, false, signal)
			return { state, result: state }
		})
	}
	const saveStep = (step: OnboardingStep, complete = false) => run(async (current, signal) => {
		if (!current) throw new Error('Guide not loaded')
		const state = await saveOnboarding(current.revision, step, !complete, complete, signal)
		return { state, result: state }
	})
	const pause = async () => {
		if (!resource.data) { setOpenFor(null); return }
		const state = await run(async (current, signal) => { const saved = await saveOnboarding(current!.revision, current!.step, false, false, signal); return { state: saved, result: saved } })
		if (state && owner.current === userId) setOpenFor(null)
	}
	const createSamples = () => run(async (current, signal) => {
		if (!current) throw new Error('Guide not loaded')
		const state = await createTutorialSamples(current.revision, signal, i18n.resolvedLanguage ?? i18n.language)
		return { state, result: state }
	}, true)
	const createViews = () => run(async (current, signal) => {
		if (!current) throw new Error('Guide not loaded')
		const state = await createTutorialViews(current.revision, signal, i18n.resolvedLanguage ?? i18n.language)
		return { state, result: state }
	}, true)
	const changeSamples = (request: TutorialSampleRequest, remove: boolean) => run(async (_, signal) => { const result = await changeTutorialSamples(request, remove, signal); return { state: result.state, result } }, true)
	return <OnboardingContext.Provider value={{ data: resource.data, loading: resource.loading, busy: busyFor === userId, open: Boolean(userId && openFor === userId), error: failure && failure.ownerId === userId ? failure.kind : null, openGuide, hide: () => { if (owner.current === userId) setOpenFor(null) }, pause, saveStep, createSamples, createViews, changeSamples, reload }}>{children}</OnboardingContext.Provider>
}
