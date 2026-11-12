import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { SteamSyncIssue } from '@/services/SteamService/SteamService'

interface Props {
	issues: SteamSyncIssue[]
	reasonCounts: Record<string, number>
	total: number
	truncated: boolean
}

export const SteamSyncIssues = ({ issues, reasonCounts, total, truncated }: Props) => {
	const { t } = useTranslation()
	const [severity, setSeverity] = useState('all')
	const [reason, setReason] = useState('all')
	const [query, setQuery] = useState('')
	const [limit, setLimit] = useState(50)
	const listRef = useRef<HTMLUListElement>(null)
	const resetResults = () => {
		setLimit(50)
		if (listRef.current) listRef.current.scrollTop = 0
	}
	const reasonKeys = [...new Set([...Object.keys(reasonCounts), ...issues.map(issue => issue.code)])].sort()
	const filtered = issues.filter(issue => (severity === 'all' || issue.severity === severity) &&
		(reason === 'all' || issue.code === reason) && issue.gameName.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
		.sort((left, right) => (left.severity === 'error' ? 0 : left.severity === 'warning' ? 1 : 2) - (right.severity === 'error' ? 0 : right.severity === 'warning' ? 1 : 2))
	const reasonLabel = (code: string) => t(`steamSync.reasonLabels.${code}`, { defaultValue: t('steamSync.reasonLabels.unknown') })
	return <details className='steam-sync-issues'>
		<summary>{t('steamSync.details')}</summary>
		<p className='steam-sync-panel__hint'>{t('steamSync.infoHint')}</p>
		<div className='steam-sync-issues__summary'>
			{reasonKeys.map(code => <span key={code}>{reasonLabel(code)}: <strong>{reasonCounts[code] ?? issues.filter(issue => issue.code === code).length}</strong></span>)}
		</div>
		<div className='steam-sync-issues__filters'>
			<label>{t('steamSync.filterSeverity')}<select value={severity} onChange={event => { setSeverity(event.target.value); resetResults() }}>
				{['all', 'error', 'warning', 'info'].map(value => <option key={value} value={value}>{t(`steamSync.severities.${value}`)}</option>)}
			</select></label>
			<label>{t('steamSync.filterReason')}<select value={reason} onChange={event => { setReason(event.target.value); resetResults() }}>
				<option value='all'>{t('steamSync.severities.all')}</option>{reasonKeys.map(code => <option key={code} value={code}>{reasonLabel(code)}</option>)}
			</select></label>
			<label>{t('steamSync.filterGame')}<input type='search' value={query} onChange={event => { setQuery(event.target.value); resetResults() }} /></label>
		</div>
		{truncated && <p className='steam-sync-panel__hint'>{t('steamSync.sampledDetails', { shown: issues.length, total })}</p>}
		{filtered.length === 0 ? <p role='status'>{t('steamSync.noMatchingIssues')}</p> : <ul ref={listRef} className='steam-sync-issues__list' aria-label={t('steamSync.gameResults')} tabIndex={0}>
			{filtered.slice(0, limit).map((issue, index) => <li key={`${issue.gameId}-${issue.code}-${index}`}>
				<div className='steam-sync-issues__row'><Link to={`/games/${issue.gameId}`}>{issue.gameName}</Link><span className='steam-sync-issues__severity' data-severity={issue.severity}>{t(`steamSync.severities.${issue.severity}`)}</span></div>
				<strong>{reasonLabel(issue.code)}</strong><p>{t(`steamSync.reasons.${issue.code}`, { defaultValue: t('steamSync.reasons.unknown') })}</p>
			</li>)}
		</ul>}
		{filtered.length > limit && <button type='button' className='btn btn-secondary' onClick={() => setLimit(current => current + 50)}>{t('steamSync.showMore')}</button>}
	</details>
}
