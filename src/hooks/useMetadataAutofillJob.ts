import { useCallback, useEffect, useRef, useState } from 'react'
import type { MetadataAutofillJob, MetadataJobStart } from '@/models/api/MetadataAutofillJob'
import { changeMetadataJob, getCurrentMetadataJob, getMetadataJob, getMetadataJobHistory, startMetadataJob } from '@/services/GamesService/MetadataAutofillJobService'
import { metadataAutofillTargets, type MetadataAutofillTarget } from '@/services/GamesService/MetadataAutofillService'
import { invalidateCollection } from '@/services/CollectionService/collectionEvents'
import { creationRequestId } from '@/utils/creationRequestId'

type JobError = 'status' | 'start' | 'action' | 'unsupported' | null
interface Session {
	ownerId: number
	controller: AbortController
	sequence: number
	failures: number
	timer?: ReturnType<typeof setTimeout>
	job: MetadataAutofillJob | null
	detail: MetadataAutofillJob | null
	detailId?: string
	open: boolean
	mutating: boolean
	intent?: MetadataJobStart
	adopt: (job: MetadataAutofillJob | null) => void
	run: () => Promise<void>
	history: () => Promise<void>
}

/** Observes durable server work. Unmount/logout abort HTTP observation, NEVER cancel a job. */
export const useMetadataAutofillJob = (ownerId: number | undefined) => {
	const owner = useRef(ownerId); owner.current = ownerId
	const session = useRef<Session | null>(null)
	const [state, setState] = useState<{ ownerId: number; job: MetadataAutofillJob | null; detail: MetadataAutofillJob | null; open: boolean; busy: boolean; starting: boolean; error: JobError; history: MetadataAutofillJob[]; more: boolean } | null>(null)
	useEffect(() => {
		setState(null)
		if (!ownerId) { session.current = null; return }
		const current: Session = { ownerId, controller: new AbortController(), sequence: 0, failures: 0, job: null, detail: null, open: false, mutating: false, adopt: () => undefined, run: async () => undefined, history: async () => undefined }
		session.current = current
		const valid = () => session.current === current && owner.current === ownerId && !current.controller.signal.aborted
		setState({ ownerId, job: null, detail: null, open: false, busy: false, starting: false, error: null, history: [], more: false })
		current.adopt = value => {
			if (value?.id === current.job?.id && value && current.job && value.revision < current.job.revision) return
			const previous = current.job
			if (!value && !previous) return
			if (value && `${value.id}:${value.processedGames}:${value.updatedGames}:${value.reviewGames}:${value.partialGames}` !== `${previous?.id}:${previous?.processedGames}:${previous?.updatedGames}:${previous?.reviewGames}:${previous?.partialGames}` && value.processedGames > 0) invalidateCollection()
			current.job = value?.dismissed && !value.active ? null : value
			if (value && (!current.detailId || current.detailId === value.id)) {
				current.detail = value.items.length ? value : current.detail?.id === value.id ? { ...value, items: current.detail.items } : value
			}
			setState(old => old?.ownerId === ownerId ? { ...old, job: current.job, detail: current.detail } : old)
		}
		current.history = async () => {
			try {
				const values = await getMetadataJobHistory(0, current.controller.signal)
				if (valid()) setState(old => old?.ownerId === ownerId ? { ...old, history: values, more: values.length === 10 } : old)
			} catch { /* Status has its own recovery UI; a failed history read never stops a server job. */ }
		}
		current.run = async () => {
			clearTimeout(current.timer)
			if (!valid() || current.mutating) return
			const sequence = ++current.sequence
			try {
				const value = await getCurrentMetadataJob(current.open && (!current.detailId || current.detailId === current.job?.id), current.controller.signal)
				if (!valid() || sequence !== current.sequence) return
				const reconciledStart = Boolean(current.intent && value?.clientRequestId === current.intent.clientRequestId)
				if (reconciledStart) { current.intent = undefined; current.detailId = value!.id }
				current.adopt(value); current.failures = 0
				if (current.open && current.detailId && current.detailId !== value?.id) {
					const detail = await getMetadataJob(current.detailId, current.controller.signal)
					if (!valid() || sequence !== current.sequence || current.detailId !== detail.id) return
					current.detail = detail; setState(old => old?.ownerId === ownerId ? { ...old, detail } : old)
				}
				setState(old => old?.ownerId === ownerId && (reconciledStart || old.error === 'status' || old.error === 'unsupported') ? { ...old, error: null } : old)
				if (value?.active) current.timer = setTimeout(() => { void current.run() }, 5000)
			} catch (error) {
				if (!valid() || sequence !== current.sequence) return
				const unsupported = (error as { status?: number }).status === 404
				setState(old => old?.ownerId === ownerId ? { ...old, error: unsupported ? 'unsupported' : 'status' } : old)
				if (!unsupported && ++current.failures < 3) current.timer = setTimeout(() => { void current.run() }, 5000 * current.failures)
			}
		}
		const recover = () => { if (document.visibilityState !== 'hidden') { current.failures = 0; void current.run() } }
		window.addEventListener('focus', recover); document.addEventListener('visibilitychange', recover)
		void current.run()
		return () => { current.controller.abort(); clearTimeout(current.timer); window.removeEventListener('focus', recover); document.removeEventListener('visibilitychange', recover) }
	}, [ownerId])
	const validSession = useCallback(() => {
		const current = session.current
		return current && current.ownerId === ownerId && current.ownerId === owner.current && !current.controller.signal.aborted ? current : null
	}, [ownerId])
	const show = useCallback((id?: string) => {
		const current = validSession(); if (!current) return
		current.open = true; current.detailId = id ?? current.job?.id; current.failures = 0
		setState(old => old?.ownerId === current.ownerId ? { ...old, open: true } : old)
		void current.run(); void current.history()
	}, [validSession])
	const hide = useCallback(() => {
		const current = validSession(); if (!current) return
		current.open = false
		setState(old => old?.ownerId === current.ownerId ? { ...old, open: false } : old)
	}, [validSession])
	const submit = useCallback(async (current: Session, request: MetadataJobStart) => {
		current.mutating = true; clearTimeout(current.timer); ++current.sequence
		setState(old => old?.ownerId === current.ownerId ? { ...old, busy: true, starting: true, error: null } : old)
		try {
			const value = await startMetadataJob(request, current.controller.signal)
			if (validSession() !== current) return
			current.detailId = value.id; current.intent = undefined; current.adopt(value)
		} catch (error) {
			if (validSession() !== current) return
			// An uncertain POST is reconciled only by GET. Explicit retry reuses
			// this exact persisted client request ID; no blind mutation retry.
			try {
				const recovered = await getCurrentMetadataJob(true, current.controller.signal)
				if (validSession() !== current) return
				if (recovered?.clientRequestId === request.clientRequestId) { current.detailId = recovered.id; current.intent = undefined; current.adopt(recovered); return }
				if (recovered?.active) current.adopt(recovered)
			} catch { /* Retain the original explicit intent for a manual same-key retry. */ }
			setState(old => old?.ownerId === current.ownerId ? { ...old, error: (error as { status?: number }).status === 404 ? 'unsupported' : 'start' } : old)
		} finally {
			if (validSession() === current) {
				current.mutating = false
				setState(old => old?.ownerId === current.ownerId ? { ...old, busy: false, starting: false } : old)
				if (current.job?.active) current.timer = setTimeout(() => { void current.run() }, 1000)
				void current.history()
			}
		}
	}, [validSession])
	const start = useCallback((targets: readonly MetadataAutofillTarget[], overwrite: boolean) => {
		const current = validSession(); if (!current || current.mutating || current.job?.active) { if (current?.job) show(); return false }
		let frozen: MetadataAutofillTarget[]
		try { frozen = metadataAutofillTargets(targets) } catch { return false }
		const request: MetadataJobStart = { clientRequestId: creationRequestId(), gameIds: frozen.map(target => target.id), overwrite, acceptListedPlatformCritic: overwrite }
		current.intent = request; current.detailId = undefined; current.detail = null; current.open = true
		setState(old => old?.ownerId === current.ownerId ? { ...old, open: true, detail: null } : old)
		void submit(current, request)
		return true
	}, [validSession, show, submit])
	const change = useCallback(async (action: 'cancel' | 'retry' | 'dismiss' | 'accept-listed-critics', id?: string) => {
		const current = validSession(), selected = id ?? current?.detailId ?? current?.job?.id
		if (!current || !selected || current.mutating) return false
		current.mutating = true; clearTimeout(current.timer); ++current.sequence
		setState(old => old?.ownerId === current.ownerId ? { ...old, busy: true, error: null } : old)
		try {
			const value = await changeMetadataJob(selected, action, current.controller.signal)
			if (validSession() !== current) return false
			if (current.detailId === selected) { current.detail = value; setState(old => old?.ownerId === current.ownerId ? { ...old, detail: value } : old) }
			if (value.active || current.job?.id === selected) current.adopt(value)
			return true
		} catch {
			if (validSession() === current) setState(old => old?.ownerId === current.ownerId ? { ...old, error: 'action' } : old)
			return false
		} finally {
			if (validSession() === current) {
				current.mutating = false; setState(old => old?.ownerId === current.ownerId ? { ...old, busy: false } : old)
				void current.run(); void current.history()
			}
		}
	}, [validSession])
	const refresh = useCallback(() => { const current = validSession(); if (current) { current.failures = 0; setState(old => old?.ownerId === current.ownerId ? { ...old, error: null } : old); void current.run() } }, [validSession])
	const retryStart = useCallback(() => { const current = validSession(); if (current?.intent && !current.mutating) void submit(current, current.intent) }, [validSession, submit])
	const moreHistory = useCallback(async () => {
		const current = validSession(); if (!current || state?.ownerId !== current.ownerId) return
		try {
			const values = await getMetadataJobHistory(state.history.length, current.controller.signal)
			if (validSession() === current) setState(old => old?.ownerId === current.ownerId ? { ...old, history: [...old.history, ...values.filter(value => !old.history.some(existing => existing.id === value.id))], more: values.length === 10 } : old)
		} catch { /* Existing results remain usable. */ }
	}, [validSession, state?.ownerId, state?.history])
	const visible = state?.ownerId === ownerId ? state : null
	return { job: visible?.job ?? null, detail: visible?.detail ?? null, open: visible?.open ?? false, busy: visible?.busy ?? false, starting: visible?.starting ?? false, error: visible?.error ?? null, history: visible?.history ?? [], hasMoreHistory: visible?.more ?? false, start, show, hide, change, refresh, retryStart, moreHistory }
}
