import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { useMetadataAutofillJob } from '@/hooks/useMetadataAutofillJob'
import type { MetadataAutofillJob } from '@/models/api/MetadataAutofillJob'
import { CollectionIcon } from './CollectionIcon'
import { CollectionSheet } from './CollectionSheet'
import { ConfirmDialog } from '@/components/elements/ConfirmDialog/ConfirmDialog'
import './MetadataAutofillJobPanel.scss'

export type MetadataJobObserver = ReturnType<typeof useMetadataAutofillJob>
const progressValues = (job: MetadataAutofillJob) => ({ done: job.processedGames, total: job.totalGames })

/** Global normal-flow notice. Dismissal/navigation never means server cancellation. */
export const MetadataAutofillJobBanner = ({ observer }: { observer: MetadataJobObserver }) => {
	const { t } = useTranslation()
	const job = observer.starting ? null : observer.job
	if (!job && !observer.busy && !observer.error) return null
	if (!job && observer.error === 'unsupported') return null // Account activity exposes the upgrade message on demand.
	return <section className='gdb-metadata-job-notice' aria-label={t('metadata.jobs.activity')} data-state={job?.state ?? 'starting'}>
		<CollectionIcon name={job?.active ? 'auto' : job ? 'check' : 'clock'} />
		<div className='gdb-metadata-job-notice__copy'>
			<p role='status' aria-live='polite' aria-atomic='true'><strong>{t('metadata.jobs.activity')}</strong><span>{job ? t(`metadata.jobs.states.${job.state}`) : t(observer.starting ? 'metadata.jobs.starting' : 'metadata.jobs.statusUnknown')}</span>{job && <b>{t('metadata.jobs.progress', progressValues(job))}</b>}</p>
			<small>{observer.error && observer.error !== 'unsupported' ? t('metadata.jobs.connectionHint') : job?.state === 'cancelling' ? t('metadata.jobs.cancellingHelp') : job?.active ? t('metadata.jobs.backgroundHelp') : t('metadata.jobs.finishedHelp')}</small>
			{job && <progress max={job.totalGames} value={job.processedGames} aria-label={t('metadata.jobs.progress', progressValues(job))} />}
		</div>
		<div className='gdb-metadata-job-notice__actions'>
			<button type='button' className='gdb-text-button' onClick={event => { event.currentTarget.focus(); observer.show() }}>{t('metadata.jobs.details')}<CollectionIcon name='arrow' /></button>
			{job?.active && <button type='button' className='gdb-text-button' disabled={observer.busy || job.state === 'cancelling'} onClick={() => { void observer.change('cancel', job.id) }}>{t(job.state === 'cancelling' ? 'metadata.jobs.states.cancelling' : 'metadata.jobs.cancel')}</button>}
			{job && !job.active && job.reviewGames === 0 && <button type='button' className='gdb-icon-button' aria-label={t('metadata.jobs.dismiss')} disabled={observer.busy} onClick={() => { void observer.change('dismiss', job.id) }}><CollectionIcon name='close' /></button>}
		</div>
	</section>
}

interface Props { observer: MetadataJobObserver; onReview: (gameId: number) => void; reviewLoadingId?: number | null; reviewError?: boolean }
export const MetadataAutofillJobPanel = ({ observer, onReview, reviewLoadingId, reviewError }: Props) => {
	const { t, i18n } = useTranslation()
	const job = observer.starting ? null : observer.detail ?? observer.job
	const [filter, setFilter] = useState('all'), [limit, setLimit] = useState(30)
	const [confirmCritics, setConfirmCritics] = useState(false)
	const list = useRef<HTMLUListElement>(null), scroll = useRef(0), returnTo = useRef<number | null>(null)
	const previousJob = useRef(job?.id)
	useEffect(() => {
		if (job?.id !== previousJob.current) { previousJob.current = job?.id; setFilter('all'); setLimit(30); scroll.current = 0; returnTo.current = null }
	}, [job?.id])
	useEffect(() => {
		if (!observer.open) return
		const frame = requestAnimationFrame(() => {
			const body = list.current?.closest('.gdb-sheet__body')
			if (body) body.scrollTop = scroll.current
			if (returnTo.current !== null) list.current?.querySelector<HTMLButtonElement>(`button[data-review-game-id="${returnTo.current}"]`)?.focus({ preventScroll: true })
		})
		return () => cancelAnimationFrame(frame)
	}, [observer.open, job?.id])
	const remember = () => { scroll.current = list.current?.closest('.gdb-sheet__body')?.scrollTop ?? 0 }
	const hide = () => { remember(); observer.hide() }
	const items = job?.items ?? []
	const filtered = items.filter(item => filter === 'all' || filter === 'review' && item.status === 'review' || filter === 'issues' && ['failed', 'partial', 'cancelled'].includes(item.status) || filter === 'saved' && item.appliedFields.length > 0)
	const canAcceptCritics = items.some(item => item.status === 'review' && item.notices.includes('criticPlatformScope') && !item.notices.some(notice => ['chooseIdentity', 'chooseDurationIdentity', 'gameChanged'].includes(notice)))
	const formatJob = (entry: MetadataAutofillJob) => `${new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(entry.createdAt))} · ${entry.totalGames} · ${t(entry.overwrite ? 'metadata.jobs.replace' : 'metadata.jobs.fill')}`
	const notice = (code: string) => t(`metadata.jobs.notices.${code}`, { defaultValue: t(`metadata.${code}`, { defaultValue: t('metadata.jobs.otherNotice') }) })
	return <>
		<CollectionSheet open={observer.open} onClose={hide} title={t('metadata.batch.title')} subtitle={job ? t(job.overwrite ? 'metadata.jobs.replace' : 'metadata.jobs.fill') : t('metadata.jobs.activity')} wide className='gdb-metadata-job-sheet' bodyLabel={t('metadata.batch.resultsLabel')} footer={<>
			<button type='button' className='gdb-button' onClick={hide}>{t(job?.active ? 'metadata.jobs.continueBackground' : 'metadata.jobs.closeDetails')}</button>
			{job?.active && <button type='button' className='gdb-text-button' disabled={observer.busy || job.state === 'cancelling'} onClick={() => { void observer.change('cancel', job.id) }}>{t('metadata.jobs.cancel')}</button>}
			{job && !job.active && job.failedGames + job.partialGames + job.cancelledGames > 0 && <button type='button' className='gdb-button gdb-button--primary' disabled={observer.busy} onClick={() => { void observer.change('retry', job.id) }}>{t('metadata.batch.retry')}</button>}
		</>}>
			<p className='gdb-metadata-job-sheet__help'>{t('metadata.jobs.backgroundHelp')}</p>
			{observer.history.length > 0 && <div className='gdb-metadata-job-history'><label>{t('metadata.jobs.history')}<select value={job?.id ?? ''} disabled={observer.busy || Boolean(reviewLoadingId)} onChange={event => { observer.show(event.target.value) }}><option value='' disabled>{t('metadata.jobs.chooseBatch')}</option>{observer.history.map(entry => <option key={entry.id} value={entry.id}>{formatJob(entry)}</option>)}</select></label>{observer.hasMoreHistory && <button type='button' className='gdb-text-button' onClick={() => { void observer.moreHistory() }}>{t('metadata.jobs.older')}</button>}</div>}
			{observer.error && <div role='alert' className='gdb-error'><p>{t(`metadata.jobs.errors.${observer.error}`)}</p>{observer.error !== 'unsupported' && <button type='button' className='gdb-text-button' disabled={observer.busy} onClick={observer.error === 'start' && !job?.active ? observer.retryStart : observer.refresh}>{t(observer.error === 'start' && !job?.active ? 'metadata.jobs.retryStart' : 'metadata.jobs.refresh')}</button>}</div>}
			{reviewError && <p className='gdb-error' role='alert'>{t('metadata.jobs.reviewLoadFailed')}</p>}
			{!job && !observer.error && <p role='status'>{t(observer.busy ? 'metadata.jobs.starting' : 'metadata.jobs.noJobs')}</p>}
			{job && <>
				<div className='gdb-metadata-job-summary'>
					<div><strong>{t('metadata.jobs.progress', progressValues(job))}</strong><span>{t(`metadata.jobs.states.${job.state}`)}</span></div>
					<progress max={job.totalGames} value={job.processedGames} aria-label={t('metadata.jobs.progress', progressValues(job))} />
					<dl>{(['updatedGames', 'unchangedGames', 'reviewGames', 'partialGames', 'failedGames', 'cancelledGames'] as const).map(key => <div key={key}><dt>{t(`metadata.jobs.counts.${key}`)}</dt><dd>{job[key]}</dd></div>)}</dl>
					{job.currentGameName && <p>{t(job.state === 'cancelling' ? 'metadata.jobs.cancellingHelp' : 'metadata.batch.looking')} · {job.currentGameName}</p>}
					{job.state === 'waiting' && <p>{t('metadata.jobs.waitingHelp')}</p>}
				</div>
				<p className='gdb-metadata-job-sheet__help'>{t(job.acceptListedPlatformCritic ? 'metadata.jobs.bestMatchWithCritic' : 'metadata.jobs.bestMatch')}</p>
				{canAcceptCritics && <div className='gdb-metadata-job-choice'><p>{t('metadata.jobs.acceptCriticsHelp')}</p><button type='button' className='gdb-button' disabled={observer.busy || job.state === 'cancelling'} onClick={() => setConfirmCritics(true)}>{t('metadata.jobs.acceptCritics')}</button></div>}
				<label className='gdb-metadata-job-filter'>{t('metadata.jobs.filter')}<select value={filter} onChange={event => { setFilter(event.target.value); setLimit(30) }}>{['all', 'review', 'issues', 'saved'].map(value => <option key={value} value={value}>{t(`metadata.jobs.filters.${value}`)}</option>)}</select></label>
				{items.length !== job.totalGames ? <p role='status'>{t('gallery.common.loading')}</p> : filtered.length === 0 ? <p>{t('metadata.jobs.noResults')}</p> : <ul ref={list} className='gdb-metadata-job-results'>{filtered.slice(0, limit).map(item => <li key={item.gameId} data-state={item.status}>
					<div><strong>{item.name}</strong><span>{t(`metadata.jobs.items.${item.status}`)}</span>
						{item.appliedFields.length > 0 && <p className='gdb-metadata-job-results__saved'>{t('metadata.jobs.savedFields', { fields: item.appliedFields.map(field => t(`metadata.fields.${field}`)).join(', ') })}</p>}
						{item.notices.length > 0 && <ul>{item.notices.map(code => <li key={code}>{notice(code)}</li>)}</ul>}
					</div>
					{['review', 'failed', 'partial'].includes(item.status) && <button type='button' className='gdb-text-button' data-review-game-id={item.gameId} disabled={observer.busy || Boolean(reviewLoadingId)} aria-label={t('metadata.batch.reviewGameNamed', { name: item.name })} onClick={() => { remember(); returnTo.current = item.gameId; onReview(item.gameId) }}>{t(reviewLoadingId === item.gameId ? 'gallery.common.loading' : 'metadata.jobs.resolve')}<CollectionIcon name='arrow' /></button>}
				</li>)}</ul>}
				{filtered.length > limit && <button type='button' className='gdb-text-button' onClick={() => setLimit(value => value + 30)}>{t('metadata.batch.more')}</button>}
			</>}
		</CollectionSheet>
		<ConfirmDialog isOpen={confirmCritics && observer.open} variant='primary' title={t('metadata.jobs.acceptCritics')} message={t('metadata.jobs.acceptCriticsConfirm')} confirmLabel={t('metadata.jobs.acceptCritics')} onConfirm={() => { setConfirmCritics(false); if (job) void observer.change('accept-listed-critics', job.id) }} onCancel={() => setConfirmCritics(false)} />
	</>
}
