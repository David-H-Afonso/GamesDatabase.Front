import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppSelector } from '@/store/hooks'
import { useCollectionResource } from '@/hooks/useCollectionResource'
import { steamService, steamDateReviewTimeZone, type SteamDateSelection, type SteamDateSuggestion } from '@/services/SteamService/SteamService'
import { CollectionIcon } from './CollectionIcon'
import { formatCollectionDate } from '@/utils/collectionFormatting'
import './SteamDateReview.scss'

interface Props { gameId?: number; onApplied?: () => Promise<unknown> }
const fields = ['started', 'finished'] as const
type Field = (typeof fields)[number]
const candidate = (row: SteamDateSuggestion, field: Field) => field === 'started' ? row.proposedStarted : row.proposedFinished
const current = (row: SteamDateSuggestion, field: Field) => field === 'started' ? row.currentStarted : row.currentFinished
const key = (id: number, field: Field) => `${id}:${field}`

/** Shared explicit date review for one game's detail and the account-wide admin tool. */
export const SteamDateReview = ({ gameId, onApplied }: Props) => {
	const { t, i18n } = useTranslation(), titleId = useId(), ownerId = useAppSelector(state => state.auth.user?.id)
	const [timeZone] = useState(steamDateReviewTimeZone)
	const [revision, setRevision] = useState(0), [search, setSearch] = useState(''), [page, setPage] = useState(1), [selected, setSelected] = useState<Map<string, { date: string; stamp: string }>>(new Map())
	const [busy, setBusy] = useState(false), [needsReload, setNeedsReload] = useState(false), [message, setMessage] = useState<{ kind: 'saved' | 'dismissed' | 'partial' | 'failed' | 'savedRefreshFailed'; count?: number } | null>(null)
	const owner = useRef(ownerId), active = useRef<AbortController | null>(null)
	owner.current = ownerId
	const scope = `${ownerId}:${gameId ?? 'all'}`
	useEffect(() => {
		setSelected(new Map()); setSearch(''); setPage(1); setBusy(false); setNeedsReload(false); setMessage(null)
		return () => { active.current?.abort(); active.current = null }
	}, [scope])
	const resource = useCollectionResource(`steam-date-review:${gameId ?? 'all'}:${timeZone}:${revision}`, signal => steamService.getDateSuggestions({ gameId, includeStarted: true, timeZone, signal }))
	const rows = resource.data ?? [], phrase = search.trim().toLocaleLowerCase(i18n.language), filtered = rows.filter(row => row.gameName.toLocaleLowerCase(i18n.language).includes(phrase) || row.steamName.toLocaleLowerCase(i18n.language).includes(phrase))
	const pages = Math.max(1, Math.ceil(filtered.length / 40)), currentPage = Math.min(page, pages), visible = filtered.slice((currentPage - 1) * 40, currentPage * 40)
	const supported = rows.every(row => row.reviewVersion === 2 && row.reviewTimeZone === timeZone && typeof row.updatedAt === 'string' && Number.isFinite(Date.parse(row.updatedAt)))
	const availableKeys = visible.flatMap(row => fields.filter(field => candidate(row, field)).map(field => key(row.gameId, field)))
	const isSelected = (row: SteamDateSuggestion, field: Field) => { const snapshot = selected.get(key(row.gameId, field)); return Boolean(snapshot && snapshot.date === candidate(row, field) && snapshot.stamp === row.updatedAt) }
	const validKeys = new Set(rows.flatMap(row => fields.filter(field => isSelected(row, field)).map(field => key(row.gameId, field))))
	const selectedKeys = availableKeys.filter(value => validKeys.has(value)), allSelected = availableKeys.length > 0 && selectedKeys.length === availableKeys.length
	const changedSelections = [...selected.keys()].some(value => !validKeys.has(value))
	const disabled = busy || resource.loading || needsReload || !supported
	const reload = (clearMessage = true) => { if (active.current) return; setSelected(new Map()); setNeedsReload(false); if (clearMessage) setMessage(null); setRevision(value => value + 1) }
	const change = (row: SteamDateSuggestion, field: Field, checked: boolean) => { const date = candidate(row, field); if (!date || !row.updatedAt) return; setSelected(previous => { const next = new Map(previous), value = key(row.gameId, field); if (checked) next.set(value, { date, stamp: row.updatedAt! }); else next.delete(value); return next }) }
	const mutate = async (dismiss: boolean) => {
		if (!ownerId || owner.current !== ownerId || active.current || disabled || !selectedKeys.length) return
		const selections: SteamDateSelection[] = visible.flatMap(row => {
			const started = isSelected(row, 'started') ? row.proposedStarted : undefined, finished = isSelected(row, 'finished') ? row.proposedFinished : undefined
			return started || finished ? [{ gameId: row.gameId, ...(started ? { started } : {}), ...(finished ? { finished } : {}), expectedUpdatedAt: row.updatedAt! }] : []
		})
		const controller = new AbortController(), expectedOwner = ownerId
		active.current = controller; setBusy(true); setMessage(null)
		try {
			if (dismiss) {
				const result = await steamService.dismissDateSuggestions(selections, controller.signal, timeZone)
				if (controller.signal.aborted || owner.current !== expectedOwner) return
				if (!Number.isSafeInteger(result.dismissed) || result.dismissed !== selections.length) { setNeedsReload(true); setMessage({ kind: 'partial' }); return }
				setMessage({ kind: 'dismissed', count: selectedKeys.length }); setSelected(new Map()); setRevision(value => value + 1)
			} else {
				const result = await steamService.applyDateSuggestions(selections, controller.signal, timeZone)
				if (controller.signal.aborted || owner.current !== expectedOwner) return
				const applied = new Map(result.applied.map(row => [row.gameId, row]))
				resource.replaceData(previous => (previous ?? []).map(row => {
					const receipt = applied.get(row.gameId)
					return receipt ? { ...row, ...(receipt.started ? { currentStarted: receipt.started, proposedStarted: undefined } : {}), ...(receipt.finished ? { currentFinished: receipt.finished, proposedFinished: undefined } : {}), updatedAt: receipt.updatedAt } : row
				}).filter(row => row.proposedStarted || row.proposedFinished))
				setSelected(new Map()); setNeedsReload(result.skipped.length > 0); setMessage({ kind: result.skipped.length ? 'partial' : 'saved', count: result.updated })
				if (result.updated && onApplied) try { await onApplied() } catch { if (!controller.signal.aborted && owner.current === expectedOwner) { setNeedsReload(true); setMessage({ kind: 'savedRefreshFailed', count: result.updated }) } }
			}
		} catch { if (!controller.signal.aborted && owner.current === expectedOwner) { setNeedsReload(true); setMessage({ kind: 'failed' }) } }
		finally { if (active.current === controller) { active.current = null; setBusy(false) } }
	}
	const source = (row: SteamDateSuggestion, field: Field) => field === 'started' ? 'firstAchievement' : row.finishedSource === 'lastPlayed' ? 'lastPlayed' : 'lastAchievement'
	const actions = <div className='gdb-date-actions'><label><input type='checkbox' checked={allSelected} disabled={disabled || !availableKeys.length} onChange={event => { for (const row of visible) for (const field of fields) change(row, field, event.target.checked) }} />{t('gallery.dates.selectVisible')}</label><span>{t('gallery.dates.selected', { count: selectedKeys.length })}</span><button type='button' className='gdb-button gdb-button--primary' disabled={disabled || !selectedKeys.length} onClick={() => { void mutate(false) }}>{t('gallery.dates.apply')}</button><button type='button' className='gdb-button' disabled={disabled || !selectedKeys.length} onClick={() => { void mutate(true) }}>{t('gallery.dates.dismiss')}</button></div>
	return <section className={`gdb-steam-dates${gameId ? ' is-single' : ''}`} aria-labelledby={titleId} aria-busy={resource.loading || busy}>
		<div className='gdb-section-heading'><h3 id={titleId}>{t('gallery.dates.title')}</h3><button type='button' className='gdb-icon-button' aria-label={t('gallery.dates.reload')} title={t('gallery.dates.reload')} disabled={busy || resource.loading} onClick={() => reload()}><CollectionIcon name='refresh' /></button></div>
		<p className='gdb-hint'>{t('gallery.dates.help')}</p>
		<details className='gdb-date-evidence'><summary>{t('gallery.dates.explain')}<span>{timeZone}</span><CollectionIcon name='down' /></summary><div><p className='gdb-hint'>{t('gallery.dates.timeZone', { value: timeZone })}</p>{rows.some(row => row.notes.includes('noLastPlayed')) && <p className='gdb-hint'>{t('gallery.dates.missingLastPlayed')}</p>}</div></details>
		{!supported && <p className='gdb-error' role='alert'>{t('gallery.dates.unsupported')}</p>}
		{resource.error && <p className='gdb-error' role='alert'>{t('gallery.dates.loadFailed')}</p>}
		{changedSelections && !resource.loading && !resource.error && <p className='gdb-hint' role='status'>{t('gallery.dates.changedReferences')}</p>}
		{message && <p className={['partial', 'failed', 'savedRefreshFailed'].includes(message.kind) ? 'gdb-error' : 'gdb-hint'} role='status'>{t(`gallery.dates.${message.kind}`, { count: message.count })}</p>}
		{resource.loading && !resource.data && <p role='status'>{t('gallery.common.loading')}</p>}
		{resource.data && !resource.loading && !rows.length && <p className='gdb-date-empty' role='status'>{t('gallery.dates.empty')}</p>}
		{rows.length > 0 && <>
			{!gameId && <label className='gdb-date-search'><CollectionIcon name='search' /><input type='search' value={search} disabled={busy} onChange={event => { setSearch(event.target.value); setPage(1) }} placeholder={t('gallery.dates.search')} aria-label={t('gallery.dates.search')} /></label>}
			{!gameId && actions}
			<div className='gdb-date-reviews'>{visible.map(row => <fieldset className='gdb-date-review' key={row.gameId} disabled={disabled}>
				<legend>{row.gameName}</legend><div className='gdb-date-review__fields'>{fields.map(field => {
					const proposed = candidate(row, field), saved = current(row, field)
					return proposed ? <label className='gdb-date-choice' key={field}><input type='checkbox' checked={isSelected(row, field)} onChange={event => change(row, field, event.target.checked)} aria-label={t(field === 'started' ? 'gallery.dates.chooseStarted' : 'gallery.dates.chooseFinished', { name: row.gameName, date: proposed })} /><span><b>{t(`gallery.dates.${field}`)}</b><strong><time dateTime={proposed}>{formatCollectionDate(proposed, i18n.language)}</time></strong><small>{t('gallery.dates.current', { date: saved || '—' })}</small><small>{t(`gallery.dates.${source(row, field)}`)}</small></span></label> : <div className='gdb-date-kept' key={field}><b>{t(`gallery.dates.${field}`)}</b><strong>{saved ? formatCollectionDate(saved, i18n.language) : '—'}</strong><small>{t(saved ? 'gallery.dates.kept' : 'gallery.dates.noEvidence')}</small></div>
			})}</div>
			</fieldset>)}</div>
			{gameId && actions}
			{!filtered.length && <p className='gdb-date-empty'>{t('gallery.dates.noMatches')}</p>}
			{pages > 1 && <div className='gdb-date-pagination'><button type='button' className='gdb-button' disabled={busy || currentPage <= 1} onClick={() => setPage(currentPage - 1)}>{t('gallery.common.previous')}</button><span>{t('gallery.dates.page', { page: currentPage, pages })}</span><button type='button' className='gdb-button' disabled={busy || currentPage >= pages} onClick={() => setPage(currentPage + 1)}>{t('gallery.common.next')}</button></div>}
		</>}
	</section>
}
