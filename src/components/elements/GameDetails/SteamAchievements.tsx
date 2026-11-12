import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SteamAchievement, SteamAchievementProgress } from '@/services'

type UnlockFilter = 'all' | 'unlocked' | 'locked' | 'archived'

const AchievementItem = ({ achievement, showGlobal }: { achievement: SteamAchievement; showGlobal: boolean }) => {
	const { t, i18n } = useTranslation()
	const [revealed, setRevealed] = useState(false)
	const spoiler = achievement.hidden && !achievement.achieved && !revealed
	const name = spoiler ? t('steamAchievements.spoiler') : achievement.displayName
	const locale = i18n.resolvedLanguage ?? i18n.language
	const max = achievement.progressMax
	const min = achievement.progressMin ?? 0
	const current = achievement.progressCurrent
	const hasProgress = !spoiler && !achievement.achieved && !achievement.archived && max != null && current != null && max > min
	return (
		<article className={`achievement-item ${achievement.achieved ? 'achieved' : 'locked'}`}>
			{!spoiler && achievement.iconUrl && <img src={achievement.achieved ? achievement.iconUrl : (achievement.iconGrayUrl ?? achievement.iconUrl)} alt='' width={40} height={40} loading='lazy' />}
			<div className='achievement-info'>
				<span className='achievement-name'>{name}</span>
				{spoiler ? <button type='button' className='achievement-reveal' onClick={() => setRevealed(true)}>{t('steamAchievements.reveal')}</button> : achievement.description && <span className='achievement-description'>{achievement.description}</span>}
				{achievement.archived && <span className='achievement-tag'>{t('steamAchievements.archived')}</span>}
				{!spoiler && achievement.unlockTime && <time className='achievement-date' dateTime={achievement.unlockTime}>{new Date(achievement.unlockTime).toLocaleDateString(locale)}</time>}
				{hasProgress && <div className='achievement-partial-progress'><progress value={Math.max(0, Math.min(current - min, max - min))} max={max - min} aria-label={t('steamAchievements.progressFor', { name })} /><span>{current.toLocaleString(locale)} / {max.toLocaleString(locale)}</span></div>}
				{!spoiler && showGlobal && achievement.globalPercent != null && <span className='achievement-global-rate'>{t('steamAchievements.globalRate', { percent: achievement.globalPercent.toLocaleString(locale, { maximumFractionDigits: 1 }) })}</span>}
			</div>
		</article>
	)
}

export const SteamAchievements = ({ progress }: { progress: SteamAchievementProgress }) => {
	const { t, i18n } = useTranslation()
	const [filter, setFilter] = useState<UnlockFilter>('all')
	const [group, setGroup] = useState<number | 'all'>('all')
	const [search, setSearch] = useState('')
	const [showGlobal, setShowGlobal] = useState(false)
	const locale = i18n.resolvedLanguage ?? i18n.language
	const total = progress.totalAchievements
	const unlocked = progress.unlockedAchievements
	const percent = total > 0 ? Math.min(100, unlocked / total * 100) : 0
	const completedSets = progress.sets.filter(set => set.isCompleted).length
	const selectedGroup = progress.sets.some(set => set.groupId === group) ? group : 'all'
	const groupAchievements = progress.achievements.filter(achievement => selectedGroup === 'all' || achievement.groupId === selectedGroup)
	const counts = {
		all: groupAchievements.length,
		unlocked: groupAchievements.filter(achievement => achievement.achieved).length,
		locked: groupAchievements.filter(achievement => !achievement.achieved && !achievement.archived).length,
		archived: groupAchievements.filter(achievement => achievement.archived).length,
	}
	const query = search.trim().toLocaleLowerCase(locale)
	const filtered = groupAchievements.filter(achievement => {
		if (filter === 'unlocked' && !achievement.achieved) return false
		if (filter === 'locked' && (achievement.achieved || achievement.archived)) return false
		if (filter === 'archived' && !achievement.archived) return false
		// Searching must not reveal hidden achievement names or descriptions.
		const text = achievement.hidden && !achievement.achieved ? t('steamAchievements.spoiler') : `${achievement.displayName} ${achievement.description ?? ''}`
		return !query || text.toLocaleLowerCase(locale).includes(query)
	})
	const groups = progress.sets.length > 0 ? progress.sets.filter(set => selectedGroup === 'all' || set.groupId === selectedGroup) : [{ groupId: 0, displayName: '', dlcAppId: undefined, archived: false }]

	return (
		<div className='steam-achievements'>
			{total === 0 && progress.isCompleted && <p className='achievement-set-message'>{t('steamAchievements.historicalCompletion')}</p>}
			{progress.lastError && <p className='steam-achievement-notice' role={progress.lastError === 'setsUnavailable' ? 'status' : 'alert'}>{t(`steamAchievements.errors.${progress.lastError}`, { defaultValue: t('steamAchievements.errors.steamUnavailable') })}</p>}
			{total > 0 && <div className='achievement-summary'>
				<div className='achievement-summary__topline'><p className='achievement-progress-label'>{t('steamAchievements.count', { unlocked, total })}</p><span className='achievement-progress-percent'>{percent.toLocaleString(locale, { maximumFractionDigits: 1 })}%</span></div>
				<progress className='achievement-progress-bar' value={unlocked} max={total} aria-label={t('steamAchievements.totalProgress')} />
				{progress.isFullyCompleted ? <p className='achievement-perfect-message'>{t('steamAchievements.fullyCompleted')}</p> : completedSets > 0 ? <p className='achievement-set-message'>{t('steamAchievements.completedSets', { count: completedSets })}</p> : progress.isCompleted && <p className='achievement-set-message'>{t('steamAchievements.historicalCompletion')}</p>}
				{progress.isCompleted && !progress.isFullyCompleted && <p className='achievement-summary__hint'>{t('steamAchievements.preservedHint')}</p>}
				{progress.source === 'sets' && progress.eligibleAchievementsTotal !== total && <p className='achievement-summary__hint'>{t('steamAchievements.eligibleCount', { unlocked: progress.eligibleAchievementsUnlocked, total: progress.eligibleAchievementsTotal })}</p>}
			</div>}
			{progress.sets.length > 0 && <div className='achievement-sets' aria-label={t('steamAchievements.sets')}>
				{progress.sets.map(set => <button key={set.groupId} type='button' className={`achievement-set ${set.dlcAppId ? 'achievement-set--dlc' : ''}`} aria-pressed={selectedGroup === set.groupId} onClick={() => setGroup(selectedGroup === set.groupId ? 'all' : set.groupId)}>
					<span className='achievement-set__kind'>{t(set.dlcAppId ? 'steamAchievements.dlc' : 'steamAchievements.baseGame')}{set.archived && ` · ${t('steamAchievements.archived')}`}</span>
					<strong>{set.displayName || t('steamAchievements.baseGame')}</strong>
					<span className='achievement-set__status'><span>{set.unlockedAchievements} / {set.totalAchievements}</span>{set.isCompleted && <span className='achievement-set__trophy'>✓ {t('steamAchievements.completed')}</span>}</span>
					{set.isAchievable === false && !set.archived && <span className='achievement-set__hint'>{t('steamAchievements.noAccess')}</span>}
				</button>)}
			</div>}
			{progress.achievements.length > 0 ? <>
				<div className='achievement-search-controls'>
					<label>{t('steamAchievements.search')}<input type='search' value={search} onChange={event => setSearch(event.target.value)} placeholder={t('steamAchievements.searchPlaceholder')} /></label>
					{progress.sets.length > 0 && <label>{t('steamAchievements.set')}<select value={selectedGroup} onChange={event => setGroup(event.target.value === 'all' ? 'all' : Number(event.target.value))}><option value='all'>{t('steamAchievements.allSets')}</option>{progress.sets.map(set => <option key={set.groupId} value={set.groupId}>{set.displayName || t('steamAchievements.baseGame')}</option>)}</select></label>}
				</div>
				<div className='achievement-filter-tabs' aria-label={t('steamAchievements.unlockFilter')}>
					{(['all', 'unlocked', 'locked', 'archived'] as UnlockFilter[]).filter(value => value !== 'archived' || counts.archived > 0).map(value => <button key={value} type='button' className={filter === value ? 'active' : ''} aria-pressed={filter === value} onClick={() => setFilter(value)}><span>{t(`steamAchievements.${value}`)}</span><small>{counts[value]}</small></button>)}
				</div>
				<label className='achievement-global-toggle'><input type='checkbox' checked={showGlobal} onChange={event => setShowGlobal(event.target.checked)} />{t('steamAchievements.showGlobal')}</label>
				{filtered.length === 0 ? <p className='no-achievements' role='status'>{t('steamAchievements.noMatches')}</p> : groups.map(set => {
					const achievements = filtered.filter(achievement => (achievement.groupId ?? 0) === set.groupId)
					if (achievements.length === 0) return null
					return <section className='achievement-group' key={set.groupId} aria-labelledby={`achievement-group-${progress.gameId}-${set.groupId}`}>
						<h3 id={`achievement-group-${progress.gameId}-${set.groupId}`}>{set.displayName || t('steamAchievements.baseGame')}{set.dlcAppId && <span className='achievement-tag'>DLC</span>}</h3>
						<div className='achievement-grid'>{achievements.map(achievement => <AchievementItem key={achievement.apiName} achievement={achievement} showGlobal={showGlobal} />)}</div>
					</section>
				})}
			</> : <p className='no-achievements'>{t(progress.source === 'none' ? 'steamAchievements.noData' : 'steamAchievements.noAchievements')}</p>}
		</div>
	)
}
