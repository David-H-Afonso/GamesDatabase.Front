import { useTranslation } from 'react-i18next'
import { isSteamSyncActive, type SteamSyncJob } from '@/services/SteamService/SteamService'
import './SteamSyncPanel.scss'
import { SteamSyncIssues } from './SteamSyncIssues'

interface Props {
	job: SteamSyncJob | null
	checking: boolean
	starting: boolean
	errorKey: string | null
	onStart: () => void
	onRefresh: () => void
}

export const SteamSyncPanel = ({ job, checking, starting, errorKey, onStart, onRefresh }: Props) => {
	const { t, i18n } = useTranslation()
	const active = isSteamSyncActive(job)
	const number = (value: number) => value.toLocaleString(i18n.resolvedLanguage ?? i18n.language)
	const partial = job?.state === 'completed' && (job.failedGames > 0 || job.warningCount > 0 || job.result?.achievementsSyncSucceeded === false)
	const status = partial ? 'partial' : job?.state ?? 'idle'
	return <section className='steam-sync-panel' aria-labelledby='steam-sync-title'>
		<div className='steam-sync-panel__heading'>
			<div><h3 id='steam-sync-title'>{t('steamSync.title')}</h3><p>{t('steamSync.description')}</p></div>
			<button type='button' className='btn btn-primary' disabled={checking || starting || active || Boolean(errorKey && !job)} onClick={onStart}>
				{t(starting ? 'steamSync.starting' : checking ? 'steamSync.checking' : active ? 'steamSync.inProgress' : 'admin.steam.account.syncAll')}
			</button>
		</div>
		{errorKey && <div className='steam-sync-panel__notice' role='alert'><p>{t(errorKey)}</p><p>{t('steamSync.connectionHint')}</p><button type='button' className='btn btn-secondary' disabled={checking || starting} onClick={onRefresh}>{t('steamSync.recover')}</button></div>}
		{job && <div className='steam-sync-panel__progress' data-state={status}>
			<div className='steam-sync-panel__status'><strong>{t(`steamSync.states.${status}`)}</strong><span role='status'>{t('steamSync.progress', { processed: number(job.processedGames), total: number(job.totalGames) })}</span></div>
			<progress max={Math.max(1, job.totalGames)} value={job.totalGames > 0 ? job.processedGames : active ? undefined : 0} aria-label={t('steamSync.progressLabel')} />
			{active && <p className='steam-sync-panel__current'>{job.currentGameName ? t('steamSync.currentGame', { name: job.currentGameName }) : t(job.state === 'queued' ? 'steamSync.waiting' : 'steamSync.preparing')}</p>}
			<dl className='steam-sync-panel__counts'>
				<div><dt>{t('steamSync.achievements')}</dt><dd>{number(job.achievementsUpdated)}</dd></div>
				<div><dt>{t('steamSync.gamesWithWarnings')}</dt><dd>{number(job.failedGames)}</dd></div>
				<div><dt>{t('steamSync.warnings')}</dt><dd>{number(job.warningCount)}</dd></div>
				<div><dt>{t('steamSync.information')}</dt><dd>{number(job.infoCount ?? 0)}</dd></div>
			</dl>
			{job.error && <p role='alert'>{t(`steamSync.jobErrors.${job.error}`, { defaultValue: t('steamSync.jobErrors.syncFailed') })}</p>}
			<p className='steam-sync-panel__hint'>{t(active ? 'steamSync.leaveHint' : 'steamSync.savedHint')}</p>
			{Boolean(job.issues?.length) && <SteamSyncIssues key={job.id} issues={job.issues!} reasonCounts={job.reasonCounts ?? {}} total={job.failedGames + job.warningCount + (job.infoCount ?? 0)} truncated={job.issuesTruncated ?? false} />}
		</div>}
	</section>
}
