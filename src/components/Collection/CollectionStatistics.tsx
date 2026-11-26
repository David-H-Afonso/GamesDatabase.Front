import { useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppSelector } from '@/store/hooks'
import { useCollectionResource } from '@/hooks/useCollectionResource'
import { getCollectionGames, getCollectionStatistics, getGotySelections, saveGotySelection } from '@/services/CollectionService/CollectionService'
import { getGameById, updateGame } from '@/services/GamesService/GamesService'
import { invalidateCollection, isCollectionConflict } from '@/services/CollectionService/collectionEvents'
import type { CollectionActivity, CollectionMetric, CollectionStatistics as Statistics } from '@/models/api/Collection'
import type { Game } from '@/models/api/Game'
import { CollectionGameDetails as GameDetails } from './CollectionGameDetailsLazy'
import { CollectionIcon } from './CollectionIcon'
import { CollectionSheet } from './CollectionSheet'
import { CollectionGamePicker, type CollectionPickerQuery } from './CollectionGamePicker'
import { GameArtwork } from './GameArtwork'
import { collectionMonth, effectivePlaytime, formatCollectionDate, formatCollectionNumber, playtimeSourceKey } from '@/utils/collectionFormatting'
import './CollectionStatistics.scss'
import { useCollectionDetails } from './collectionDetailsContext'

const tabs = ['overview', 'year', 'achievements', 'completion', 'time', 'ranking', 'developers'] as const
type Tab = (typeof tabs)[number]
interface Picker {
	title: string
	note?: string
	query: CollectionPickerQuery
	mode?: 'goty' | 'developer'
}
const safeColor = (value: string) => (/^#[0-9a-f]{3,8}$/i.test(value) ? value : '#81958c')

export default function CollectionStatistics() {
	const { t, i18n } = useTranslation(),
		[params, setParams] = useSearchParams()
	const username = useAppSelector((state) => state.auth.user?.username)
	const tab = tabs.includes(params.get('tab') as Tab) ? (params.get('tab') as Tab) : 'overview'
	const rawYear = Number(params.get('year')),
		year = Number.isInteger(rawYear) && rawYear >= 1900 && rawYear <= 2100 ? rawYear : new Date().getUTCFullYear()
	const rawMonth = Number(params.get('month')),
		month = Number.isInteger(rawMonth) && rawMonth >= 1 && rawMonth <= 12 ? rawMonth : undefined
	const dateKind = params.get('dates') === 'started' ? 'started' : 'finished',
		allRanking = params.get('scope') === 'all'
	const criterion: 'completed' | 'strict' | 'closures' = params.get('criterion') === 'strict' ? 'strict' : params.get('criterion') === 'closures' ? 'closures' : 'completed'
	const [limit, setLimit] = useState(12),
		[picker, setPicker] = useState<Picker | null>(null),
		[game, setLocalGame] = useState<Game | null>(null),
		[studioGame, setStudioGame] = useState<Game | null>(null),
		[studio, setStudio] = useState(''),
		[saving, setSaving] = useState(false),
		[saveError, setSaveError] = useState(false),
		[completionPage, setCompletionPage] = useState(1)
	const studioForm = useRef<HTMLFormElement>(null)
	const details = useCollectionDetails()
	const setGame = (value: Game | null) => { if (value && details) details.open(value); else setLocalGame(value) }
	const [conflict, setConflict] = useState(false)
	const reloadChoice = () => {
		invalidateCollection()
		setSaveError(false)
		setConflict(false)
		setPicker(null)
	}
	const dataMonth = tab === 'overview' ? undefined : month,
		dataDateKind = tab === 'overview' ? 'finished' : dateKind,
		dataAllRanking = tab === 'ranking' && allRanking
	const resource = useCollectionResource(`statistics:${year}:${dataMonth ?? ''}:${dataDateKind}:${dataAllRanking}`, (signal) =>
		getCollectionStatistics({ year, month: dataMonth, dateKind: dataDateKind, allRanking: dataAllRanking }, signal)
	)
	const selections = useCollectionResource('personal-goty', (signal) => getGotySelections(signal))
	const gotyId = selections.data?.selections[year]
	const goty = useCollectionResource(`goty-game:${gotyId}`, (signal) => getGameById(gotyId!, signal), Boolean(gotyId))
	const completion = useCollectionResource(
		`completion:${criterion}:${completionPage}`,
		(signal) => getCollectionGames({ metric: criterion, page: completionPage, pageSize: 24 }, signal),
		tab === 'completion'
	)
	const data = resource.data
	const setQuery = (patch: Record<string, string | number | undefined>) => {
		setLimit(12)
		setCompletionPage(1)
		setParams((current) => {
			for (const [key, value] of Object.entries(patch)) {
				if (value == null || value === '') current.delete(key)
				else current.set(key, String(value))
			}
			return current
		})
	}
	const number = (value: number, precision = 1) => formatCollectionNumber(value, i18n.language, precision)
	const period = month ? `${collectionMonth(month, i18n.language)} ${year}` : String(year)
	const hours = (minutes: number | null) => (minutes == null ? '—' : t('gallery.common.hours', { value: number(minutes / 60) }))
	const metric = (key: CollectionMetric, label: string, value?: number, developer?: string) => setPicker({ title: label, query: { metric: key, year, month, value, developer } })
	const changeTab = (next: Tab) => setQuery({ tab: next })
	const chooseGoty = () => {
		setSaveError(false)
		setPicker({ title: t('gallery.statistics.goty', { year }), note: t('gallery.statistics.gotyHelp'), query: { metric: 'goty', year }, mode: 'goty' })
	}
	const saveChoice = async (choice: number | null) => {
		if (!selections.data || saving) return
		setSaving(true)
		setSaveError(false)
		setConflict(false)
		try {
			const saved = await saveGotySelection(year, choice, selections.data.revision)
			selections.replaceData((current) => (current && current.revision > saved.revision ? current : saved))
			setPicker(null)
		} catch (error) {
			setSaveError(true)
			setConflict(isCollectionConflict(error))
		} finally {
			setSaving(false)
		}
	}
	const chooseGame = (chosen: Game) => {
		if (picker?.mode === 'goty') {
			void saveChoice(chosen.id)
			return
		}
		if (picker?.mode === 'developer') {
			setStudioGame(chosen)
			setStudio(chosen.developer ?? '')
			setPicker(null)
			setSaveError(false)
			return
		}
		setPicker(null)
		setGame(chosen)
	}
	const saveStudio = async (event: FormEvent) => {
		event.preventDefault()
		event.stopPropagation()
		if (!studioGame || !studioForm.current?.reportValidity() || saving) return
		setSaving(true)
		setSaveError(false)
		setConflict(false)
		try {
			await updateGame(studioGame.id, { developer: studio.trim() || null })
			setStudioGame(null)
		} catch {
			setSaveError(true)
		} finally {
			setSaving(false)
		}
	}
	const gotyPanel = () => (
		<section className='gdb-personal-goty'>
			<span className='gdb-personal-goty__art'>{goty.data ? <GameArtwork game={goty.data} width={130} /> : <CollectionIcon name='trophy' />}</span>
			<div>
				<span className='gdb-eyebrow'>{t('gallery.statistics.yourChoice')}</span>
				<h3>{t('gallery.statistics.goty', { year })}</h3>
				{goty.data ? (
					<button type='button' className='gdb-goty-title' onClick={() => setGame(goty.data!)}>
						{goty.data.name}
						<CollectionIcon name='arrow' />
					</button>
				) : (
					<p>{t('gallery.statistics.gotyQuestion')}</p>
				)}
				<div>
					<button type='button' className='gdb-text-button' onClick={chooseGoty} disabled={!selections.data || saving}>
						<CollectionIcon name='trophy' />
						{t(gotyId ? 'gallery.statistics.changeGoty' : 'gallery.statistics.chooseGoty')}
					</button>
					{gotyId && (
						<button
							type='button'
							className='gdb-text-button'
							onClick={() => {
								void saveChoice(null)
							}}
							disabled={saving}>
							{t('gallery.statistics.removeGoty')}
						</button>
					)}
				</div>
			</div>
		</section>
	)
	const bars = (stats: Statistics, kind: 'records' | 'unlocks') => {
		const maximum = Math.max(1, ...stats.months.map((value) => value[kind]))
		return (
			<div className='gdb-activity-bars' role='group' aria-label={t(kind === 'unlocks' ? 'gallery.statistics.achievements' : 'gallery.statistics.monthChart')}>
				{stats.months.map((value) => (
					<button
						type='button'
						key={value.month}
						aria-pressed={month === value.month}
						aria-label={`${collectionMonth(value.month, i18n.language)}: ${value[kind]} ${t(kind === 'unlocks' ? 'gallery.statistics.unlocked' : 'gallery.statistics.recordCount', { count: value[kind] })}`}
						onClick={() => setQuery({ tab: kind === 'unlocks' ? 'achievements' : 'year', month: value.month, ...(kind === 'records' ? { dates: 'finished' } : {}) })}>
						<span className='gdb-activity-bars__value'>{value[kind]}</span>
						<span className='gdb-activity-bars__track'>
							<i style={{ '--bar-height': `${value[kind] ? Math.max(3, (value[kind] / maximum) * 100) : 0}%` } as CSSProperties} />
						</span>
						<span>{collectionMonth(value.month, i18n.language, true)}</span>
					</button>
				))}
			</div>
		)
	}
	const activityCard = (entry: CollectionActivity) => (
		<button type='button' className='gdb-period-game' key={entry.id} onClick={() => setGame(entry.game)}>
			<span className='gdb-period-game__cover'>
				<GameArtwork game={entry.game} width={84} />
			</span>
			<span className='gdb-period-game__info'>
				<time dateTime={entry.date}>{formatCollectionDate(entry.date, i18n.language)}</time>
				<strong>{entry.game.name}</strong>
				<span>{entry.source === 'replay' ? `${t('gallery.statistics.replayRecord')} · ${entry.type}` : t('gallery.statistics.gameRecord')}</span>
			</span>
			<span className='gdb-period-game__grade'>
				{entry.grade ?? '—'}
				<small>{entry.grade != null ? '/100' : t('gallery.statistics.notRated')}</small>
			</span>
		</button>
	)
	const more = (total: number) =>
		total > limit && (
			<button type='button' className='gdb-button gdb-stats-more' onClick={() => setLimit((current) => current + 12)}>
				<CollectionIcon name='plus' />
				{t('gallery.labels.loadMore')}
			</button>
		)
	const yearPanel = (stats: Statistics) => (
		<div className='gdb-year-panel'>
			<div className='gdb-period-controls'>
				<div>
					<button type='button' className='gdb-text-button' onClick={() => setQuery({ month: undefined })}>
						{year}
					</button>
					{month ? (
						<>
							<span>/</span>
							<strong>{collectionMonth(month, i18n.language)}</strong>
						</>
					) : (
						<span>{t('gallery.statCopy.yearStory')}</span>
					)}
				</div>
				<label>
					{t('gallery.statistics.dateKind')}
					<select value={dateKind} onChange={(event) => setQuery({ dates: event.target.value })}>
						<option value='finished'>{t('gallery.statCopy.finished')}</option>
						<option value='started'>{t('gallery.statCopy.started')}</option>
					</select>
				</label>
			</div>
			<div className='gdb-month-label'>
				<h3>{t('gallery.statCopy.chooseMonth')}</h3>
				<span>{t('gallery.statCopy.datesNotHours')}</span>
			</div>
			<div className='gdb-month-navigation' role='group' aria-label={String(year)}>
				{stats.months.map((value) => (
					<button
						type='button'
						key={value.month}
						className={value.records ? 'has-records' : 'is-empty'}
						aria-pressed={month === value.month}
						onClick={() => setQuery({ month: value.month })}>
						<strong>{collectionMonth(value.month, i18n.language)}</strong>
						<b>
							{value.records}
							<small>{t('gallery.statCopy.recordUnit', { count: value.records })}</small>
						</b>
						<span>{value.records ? t('gallery.statCopy.monthRecords', { main: value.mainRecords, replays: value.replayRecords }) : t('gallery.statCopy.noRecords')}</span>
						<span className='gdb-month-art' aria-hidden='true'>
							{value.artworkGame ? <GameArtwork game={value.artworkGame} width={90} decorative /> : '—'}
						</span>
					</button>
				))}
			</div>
			<div className='gdb-statistics-heading'>
				<span className='gdb-eyebrow'>{t(dateKind === 'started' ? 'gallery.statCopy.startedDates' : 'gallery.statCopy.finishedDates')}</span>
				<h2>
					{period}
					<span className='gdb-period'>.</span>
				</h2>
			</div>
			<div className='gdb-period-metrics gdb-period-metrics--year'>
				<div>
					<strong>{stats.distinctGames}</strong>
					<span>{t('gallery.statistics.distinctGames')}</span>
				</div>
				<div>
					<strong>
						{stats.mainRecords}
						<small> + {stats.replayRecords}</small>
					</strong>
					<span>{t('gallery.labels.recordKinds')}</span>
				</div>
				<div>
					<strong>
						{stats.average == null ? '—' : number(stats.average)}
						{stats.average != null && <small>/100</small>}
					</strong>
					<span>{t('gallery.statistics.average', { count: stats.ratedGames })}</span>
				</div>
			</div>
			<div className='gdb-year-awards'>
				<section className='gdb-statistics-panel'>
					<div className='gdb-section-heading'>
						<div>
							<span className='gdb-eyebrow'>{t('gallery.statistics.calculated')}</span>
							<h3>{t('gallery.statistics.topGrades')}</h3>
						</div>
						<button type='button' className='gdb-text-button' onClick={() => changeTab('ranking')}>
							{t('gallery.statistics.ranking')}
							<CollectionIcon name='arrow' />
						</button>
					</div>
					{stats.ranking.slice(0, 3).map(activityCard)}
				</section>
				{gotyPanel()}
			</div>
			<section className='gdb-period-records'>
				<div className='gdb-section-heading'>
					<div>
						<span className='gdb-eyebrow'>{t('gallery.statistics.recordCount', { count: stats.records.length })}</span>
						<h3>{t('gallery.statistics.periodGames')}</h3>
					</div>
				</div>
				<div className='gdb-period-game-grid'>{stats.records.slice(0, limit).map(activityCard)}</div>
				{!stats.records.length && (
					<div className='gdb-period-empty'>
						<h3>{t('gallery.statistics.emptyDates')}</h3>
						<p>{t('gallery.statistics.chooseAnotherPeriod')}</p>
					</div>
				)}
				{more(stats.records.length)}
			</section>
			<details className='gdb-metric-help'>
				<summary>{t('gallery.statistics.completionDefinitions')}</summary>
				<p>{t('gallery.statistics.dateHelp')}</p>
				<p>{t('gallery.statistics.gradeHelp')}</p>
			</details>
		</div>
	)
	const achievementsPanel = (stats: Statistics) => (
		<>
			<div className='gdb-statistics-heading'>
				<span className='gdb-eyebrow'>{t('gallery.statCopy.steamCurrent')}</span>
				<h2>
					{t('gallery.statCopy.achievementsHeading')}
					<span className='gdb-period'>.</span>
				</h2>
			</div>
			<div className='gdb-period-metrics'>
				<div>
					<strong>{number(stats.totals.achievementsUnlocked, 0)}</strong>
					<span>{t('gallery.statistics.achievementTotal', { unlocked: number(stats.totals.achievementsUnlocked, 0), total: number(stats.totals.achievementsTotal, 0) })}</span>
				</div>
				<div>
					<strong>{stats.totals.achievementGames}</strong>
					<span>{t('gallery.statistics.trackedGames')}</span>
				</div>
				<div>
					<strong>{number(stats.datedUnlocks, 0)}</strong>
					<span>{t('gallery.statistics.datedUnlocks', { period })}</span>
				</div>
			</div>
			<section className='gdb-statistics-panel'>
				<div className='gdb-section-heading'>
					<div>
						<span className='gdb-eyebrow'>
							{year} · {t('gallery.statistics.chartHelp')}
						</span>
						<h3>{t('gallery.statistics.achievementChart')}</h3>
					</div>
					{month && (
						<button type='button' className='gdb-text-button' onClick={() => setQuery({ month: undefined })}>
							{t('gallery.statistics.allYear')}
						</button>
					)}
				</div>
				{bars(stats, 'unlocks')}
				<p className='gdb-chart-caption'>
					{t('gallery.statistics.achievementDates')}
					{stats.totals.unknownAchievementDates > 0 ? ` · ${t('gallery.statistics.unknownDates', { count: stats.totals.unknownAchievementDates })}` : ''}
				</p>
			</section>
			<div className='gdb-statistics-two-columns'>
				<section className='gdb-statistics-panel'>
					<span className='gdb-eyebrow'>{t('gallery.statistics.currentState')}</span>
					<h3>{t('gallery.statistics.progress')}</h3>
					<div className='gdb-progress-distribution'>
						{stats.progressBins.map((bin) => (
							<button type='button' key={bin.minimum} onClick={() => metric('progress', `${t('gallery.statistics.progress')} · ${bin.label}`, bin.minimum)}>
								<span>{bin.label}</span>
								<i>
									<b style={{ width: `${stats.totals.achievementGames ? (bin.count / stats.totals.achievementGames) * 100 : 0}%` }} />
								</i>
								<strong>{bin.count}</strong>
								<CollectionIcon name='arrow' />
							</button>
						))}
					</div>
				</section>
				<section className='gdb-statistics-panel'>
					<span className='gdb-eyebrow'>{t('gallery.statCopy.withinReach')}</span>
					<h3>{t('gallery.statistics.nearComplete')}</h3>
					<div className='gdb-near-complete'>
						{stats.nearComplete.map((item) => (
							<button type='button' key={item.id} onClick={() => setGame(item)}>
								<span className='gdb-mini-cover'>
									<GameArtwork game={item} width={66} />
								</span>
								<span>
									<strong>{item.name}</strong>
									<small>{t('gallery.home.achievements', { unlocked: item.steamAchievementsUnlocked, total: item.steamAchievementsTotal })}</small>
								</span>
								<b>
									{number(((item.steamAchievementsUnlocked ?? 0) / item.steamAchievementsTotal!) * 100)}
									<small>%</small>
								</b>
							</button>
						))}
					</div>
				</section>
			</div>
			<section className='gdb-statistics-panel'>
				<div className='gdb-section-heading'>
					<div>
						<span className='gdb-eyebrow'>{period}</span>
						<h3>{t('gallery.statistics.gamesBehindUnlocks')}</h3>
					</div>
				</div>
				<div className='gdb-period-game-grid'>
					{stats.unlocksByGame.slice(0, limit).map((entry) => (
						<button type='button' className='gdb-period-game' key={entry.game.id} onClick={() => setGame(entry.game)}>
							<span className='gdb-period-game__cover'>
								<GameArtwork game={entry.game} width={84} />
							</span>
							<span className='gdb-period-game__info'>
								<strong>{entry.game.name}</strong>
								<span>{entry.game.platformName}</span>
							</span>
							<span className='gdb-period-game__grade'>
								+{entry.count}
								<small>{t('gallery.statistics.achievements')}</small>
							</span>
						</button>
					))}
				</div>
				{!stats.unlocksByGame.length && (
					<div className='gdb-period-empty'>
						<h3>{t('gallery.statistics.emptyUnlocks')}</h3>
						<p>{t('gallery.statistics.chooseAnotherPeriod')}</p>
					</div>
				)}
				{more(stats.unlocksByGame.length)}
			</section>
		</>
	)
	const completionPanel = (stats: Statistics) => (
		<>
			<div className='gdb-statistics-heading'>
				<span className='gdb-eyebrow'>{t('gallery.statistics.currentState')}</span>
				<h2>{t('gallery.statistics.completionHeading')}</h2>
			</div>
			<div className='gdb-completion-choices' role='group' aria-label={t('gallery.statistics.completion')}>
				{(
					[
						['completed', stats.totals.completedGames, 'gallery.statistics.completed'],
						['strict', stats.totals.fullyCompletedGames, 'gallery.statistics.strict'],
						['closures', stats.totals.closureGames, 'gallery.statistics.closures'],
					] as const
				).map(([key, count, label]) => (
					<button type='button' key={key} aria-pressed={criterion === key} onClick={() => setQuery({ criterion: key })}>
						<span>{t(label)}</span>
						<strong>{count ?? '—'}</strong>
						<CollectionIcon name='arrow' />
					</button>
				))}
			</div>
			<details className='gdb-metric-help'>
				<summary>{t('gallery.statistics.completionDefinitions')}</summary>
				<dl>
					{(
						[
							['gallery.statistics.completed', 'gallery.statistics.broadDefinition'],
							['gallery.statistics.strict', 'gallery.statistics.strictDefinition'],
							['gallery.statistics.closures', 'gallery.statistics.closureDefinition'],
						] as const
					).map(([label, help]) => (
						<div key={label}>
							<dt>{t(label)}</dt>
							<dd>{t(help)}</dd>
						</div>
					))}
				</dl>
			</details>
			{completion.error ? (
				<p className='gdb-error'>{t('gallery.common.loadError')}</p>
			) : completion.loading && !completion.data ? (
				<p role='status'>{t('gallery.common.loading')}</p>
			) : (
				<div className='gdb-completion-grid'>
					{completion.data?.data.map((item) => (
						<button type='button' key={item.id} onClick={() => setGame(item)}>
							<span className='gdb-completion-grid__art'>
								<GameArtwork game={item} />
								<b>{item.isFullyCompleted ? '100%' : t(criterion === 'closures' ? 'gallery.statistics.closures' : 'gallery.statistics.completed')}</b>
							</span>
							<strong>{item.name}</strong>
							<small>{item.platformName}</small>
						</button>
					))}
				</div>
			)}
			{completion.data && completion.data.totalPages > 1 && (
				<div className='gdb-pagination'>
					<span>{t('gallery.common.games', { count: completion.data.totalCount })}</span>
					<div>
						<button type='button' className='gdb-button' disabled={completionPage <= 1} onClick={() => setCompletionPage((current) => current - 1)}>
							{t('gallery.common.previous')}
						</button>
						<span>
							{completionPage} / {completion.data.totalPages}
						</span>
						<button type='button' className='gdb-button' disabled={completionPage >= completion.data.totalPages} onClick={() => setCompletionPage((current) => current + 1)}>
							{t('gallery.common.next')}
						</button>
					</div>
				</div>
			)}
		</>
	)
	const timePanel = (stats: Statistics) => {
		const maximum = Math.max(1, effectivePlaytime(stats.topPlaytime[0] ?? {}) ?? 0)
		return (
			<>
				<div className='gdb-statistics-heading'>
					<span className='gdb-eyebrow'>{t('gallery.statistics.accumulated')}</span>
					<h2>
						{t('gallery.statistics.timeHeading')}
						<span className='gdb-period'>.</span>
					</h2>
				</div>
				<div className='gdb-period-metrics'>
					<div>
						<strong>
							{number(stats.totals.effectiveMinutes / 60)}
							<small> h</small>
						</strong>
						<span>{t('gallery.statistics.effectiveHours')}</span>
					</div>
					<div>
						<strong>{stats.totals.timedGames}</strong>
						<span>{t('gallery.statistics.timedGames')}</span>
					</div>
					<div>
						<strong>{stats.totals.missingTimeGames}</strong>
						<span>{t('gallery.statistics.missingTime')}</span>
					</div>
				</div>
				<section className='gdb-statistics-panel'>
					<div className='gdb-section-heading'>
						<div><span className='gdb-eyebrow'>{t('gallery.statCopy.timeOverride')}</span><h3>{t('gallery.statistics.timeRanking')}</h3></div>
					</div>
					<div className='gdb-playtime-ranking'>
						{stats.topPlaytime.map((item) => (
							<button type='button' key={item.id} onClick={() => setGame(item)}>
								<span className='gdb-mini-cover'>
									<GameArtwork game={item} width={66} />
								</span>
								<span>
									<strong>{item.name}</strong>
									<small>{t(playtimeSourceKey(item))}</small>
									<i>
										<b style={{ width: `${((effectivePlaytime(item) ?? 0) / maximum) * 100}%` }} />
									</i>
								</span>
								<b>{hours(effectivePlaytime(item))}</b>
								<CollectionIcon name='arrow' />
							</button>
						))}
					</div>
				</section>
				<section className='gdb-monthly-time-state'>
					<CollectionIcon name='clock' />
					<div>
						<h3>{t('gallery.statistics.monthlyTime')}</h3>
						<p>{t('gallery.statistics.monthlyTimeHelp')}</p>
					</div>
					<button type='button' className='gdb-text-button' onClick={() => metric('timed', t('gallery.statistics.recorded'))}>
						{t('gallery.common.viewAll')}
						<CollectionIcon name='arrow' />
					</button>
				</section>
			</>
		)
	}
	const rankingPanel = (stats: Statistics) => (
		<>
			<div className='gdb-ranking-controls'>
				<div className='gdb-ranking-period'><button type='button' className='gdb-text-button' onClick={() => setQuery({ month: undefined })}>{year}</button><span>{month ? collectionMonth(month, i18n.language) : t('gallery.statCopy.yearStory')}</span></div>
				<label>
					{t('gallery.statistics.scope')}
					<select value={allRanking ? 'all' : 'period'} onChange={(event) => setQuery({ scope: event.target.value === 'all' ? 'all' : undefined })}>
						<option value='period'>{t('gallery.statistics.periodScope')}</option>
						<option value='all'>{t('gallery.statistics.allCollection')}</option>
					</select>
				</label>
				{!allRanking && (
					<label>{t('gallery.statistics.dateKind')}<select value={dateKind} onChange={event => setQuery({ dates: event.target.value })}><option value='finished'>{t('gallery.statCopy.finished')}</option><option value='started'>{t('gallery.statCopy.started')}</option></select></label>
				)}
				{!allRanking && (
					<label>
						{t('gallery.statistics.month')}
						<select value={month ?? ''} onChange={(event) => setQuery({ month: event.target.value || undefined })}>
							<option value=''>{t('gallery.statistics.allYear')}</option>
							{Array.from({ length: 12 }, (_, index) => (
								<option key={index} value={index + 1}>
									{collectionMonth(index + 1, i18n.language)}
								</option>
							))}
						</select>
					</label>
				)}
			</div>
			<div className='gdb-statistics-heading gdb-ranking-heading'>
				<span className='gdb-eyebrow'>{t('gallery.statCopy.ownRatings')}</span>
				<h2>
					{allRanking ? t('gallery.statistics.allCollection') : period}
					<span className='gdb-period'>.</span>
				</h2>
				<p>{t('gallery.statCopy.rankedGames', { count: stats.ranking.length })}. {t('gallery.statCopy.notGoty')}</p>
			</div>
			<div className='gdb-ranking-podium'>
				{stats.ranking.slice(0, 3).map((entry) => (
					<button type='button' key={entry.id} onClick={() => setGame(entry.game)}>
						<span className='gdb-ranking-podium__cover'>
							<GameArtwork game={entry.game} width={190} />
							<b>{String(stats.ranking.findIndex((value) => value.grade === entry.grade) + 1).padStart(2, '0')}</b>
						</span>
						<span>
							<strong>{entry.game.name}</strong>
							<small>{entry.source === 'replay' ? `${entry.type} · ${t('gallery.statistics.replayRecord')}` : t('gallery.statCopy.mainGrade')}</small>
							<b>
								{entry.grade}
								<small>/100</small>
							</b>
						</span>
					</button>
				))}
			</div>
			<div className='gdb-ranking-list'>
				{stats.ranking.slice(3, limit + 3).map((entry) => (
					<button type='button' key={entry.id} onClick={() => setGame(entry.game)}>
						<span className='gdb-ranking-number'>{String(stats.ranking.findIndex((value) => value.grade === entry.grade) + 1).padStart(2, '0')}</span>
						<span className='gdb-mini-cover'>
							<GameArtwork game={entry.game} width={66} />
						</span>
						<span>
							<strong>{entry.game.name}</strong>
							<small>{entry.source === 'replay' ? `${entry.type} · ${t('gallery.statistics.replayRecord')}` : entry.game.platformName}{entry.date ? ` · ${formatCollectionDate(entry.date, i18n.language)}` : ''}</small>
						</span>
						<b>
							{entry.grade}
							<small>/100</small>
						</b>
						<CollectionIcon name='arrow' />
					</button>
				))}
			</div>
			{more(stats.ranking.length - 3)}
			<p className='gdb-stats-honesty'>{t('gallery.statistics.gradeHelp')}</p>
		</>
	)
	const developersPanel = (stats: Statistics) => {
		const assigned = stats.developers.reduce<number>((sum, group) => sum + group.count, 0)
		return (
			<>
				<div className='gdb-statistics-heading gdb-developer-heading'>
					<span className='gdb-eyebrow'>{t('gallery.statistics.allCollection')}</span>
					<h2>
						{t('gallery.statistics.studiosHeading')}
						<span className='gdb-period'>.</span>
					</h2>
				</div>
				<div className='gdb-developer-coverage'>
					<span>{t('gallery.statistics.studioCoverage', { count: assigned, total: stats.totals.totalGames })}</span>
					<button
						type='button'
						className='gdb-button'
						onClick={() => {
							setSaveError(false)
							setPicker({ title: t('gallery.statistics.assignStudio'), query: { metric: 'all' }, mode: 'developer' })
						}}>
						<CollectionIcon name='plus' />
						{t('gallery.statistics.assignStudio')}
					</button>
				</div>
				{stats.developers.length ? (
					<div className='gdb-developer-groups'>
						{stats.developers.map((group) => (
							<section key={group.name}>
								<div className='gdb-developer-covers' aria-hidden='true'>
									{group.games.map((item) => (
										<span key={item.id}>
											<GameArtwork game={item} />
										</span>
									))}
								</div>
								<div>
									<h3>{group.name}</h3>
									<p>
										{t('gallery.statistics.studioGrade', { count: group.count, rated: group.ratedCount })}
										{group.average != null ? ` · ${number(group.average)}/100` : ''}
									</p>
									<button type='button' className='gdb-text-button' onClick={() => metric('developer', group.name, undefined, group.name)}>
										{t('gallery.common.viewAll')}
										<CollectionIcon name='arrow' />
									</button>
								</div>
							</section>
						))}
					</div>
				) : (
					<div className='gdb-developer-empty'>
						<CollectionIcon name='library' />
						<h3>{t('gallery.statistics.studioEmpty')}</h3>
						<p>{t('gallery.statistics.studioEmptyHelp')}</p>
						<button type='button' className='gdb-button gdb-button--primary' onClick={() => { setSaveError(false); setPicker({ title: t('gallery.statistics.assignStudio'), query: { metric: 'all' }, mode: 'developer' }) }}><CollectionIcon name='plus' />{t('gallery.statCopy.chooseGame')}</button>
					</div>
				)}
			</>
		)
	}
	const overviewPanel = (stats: Statistics) => (
		<>
			<div className='gdb-overview-metrics'>
				{(
					[
						['timed', 'gallery.statistics.recorded', number(stats.totals.effectiveMinutes / 60), 'h', 'gallery.statCopy.manualPriority'],
						['all', 'gallery.statistics.collection', number(stats.totals.totalGames, 0), t('command.games').toLocaleLowerCase(i18n.language), 'gallery.statCopy.viewCollection'],
						[
							'completed',
							'gallery.statistics.completed',
							number(stats.totals.completedGames, 0),
							t('command.games').toLocaleLowerCase(i18n.language),
							'gallery.statCopy.viewCriteria',
						],
					] as const
				).map(([key, label, value, unit, hint]) => (
					<button type='button' key={key} onClick={() => metric(key, t(label))}>
						<span>{t(label)}</span>
						<strong>
							{value}
							<small>{unit}</small>
						</strong>
						<small>
							{t(hint)}
							<CollectionIcon name='arrow' />
						</small>
					</button>
				))}
			</div>
			<div className='gdb-overview-charts'>
				<section className='gdb-statistics-panel'>
					<div className='gdb-section-heading'>
						<div>
							<span className='gdb-eyebrow'>{year} · {t('gallery.statCopy.storedDates')}</span>
							<h2>{t('gallery.statistics.monthChart')}</h2>
						</div>
						<button type='button' className='gdb-text-button' onClick={() => changeTab('year')}>
							{t('gallery.statCopy.explore')}
							<CollectionIcon name='arrow' />
						</button>
					</div>
					{bars(stats, 'records')}
				</section>
				<section className='gdb-statistics-panel gdb-achievements-overview'>
					<span className='gdb-eyebrow'>{t('gallery.statCopy.achievementCache')}</span>
					<h2>{t('gallery.statCopy.eachAchievement')}</h2>
					<strong>
						{number(stats.totals.achievementsUnlocked, 0)}
						<small> / {number(stats.totals.achievementsTotal, 0)}</small>
					</strong>
					<div
						className='gdb-achievement-track'
						role='progressbar'
						aria-label={t('gallery.statistics.unlocked')}
						aria-valuemin={0}
						aria-valuemax={100}
						aria-valuenow={stats.totals.achievementsTotal ? Math.round((stats.totals.achievementsUnlocked / stats.totals.achievementsTotal) * 100) : 0}>
						<span style={{ width: `${stats.totals.achievementsTotal ? (stats.totals.achievementsUnlocked / stats.totals.achievementsTotal) * 100 : 0}%` }} />
					</div>
					<p>{t('gallery.statCopy.trackedGames', { count: stats.totals.achievementGames })}</p>
					<button type='button' className='gdb-text-button' onClick={() => changeTab('achievements')}>
						{t('gallery.statCopy.viewAchievements')}
						<CollectionIcon name='arrow' />
					</button>
				</section>
			</div>
			<div className='gdb-overview-columns'>
				<div>
					<section className='gdb-year-preview'>
						<div>
							<span className='gdb-eyebrow'>{t('gallery.statCopy.yearInGames')}</span>
							<h2>
								{year}
								<span className='gdb-period'>.</span>
							</h2>
							<p>
								{t('gallery.common.games', { count: stats.distinctGames })} · {t('gallery.statistics.recordCount', { count: stats.records.length })}
							</p>
							<small>{t('gallery.statistics.records', { main: stats.mainRecords, replays: stats.replayRecords })}</small>
							<button type='button' className='gdb-button gdb-button--primary' onClick={() => changeTab('year')}>
								{t('gallery.common.viewAll')}
								<CollectionIcon name='arrow' />
							</button>
						</div>
						<div className='gdb-year-preview__covers' aria-hidden='true'>
							{stats.ranking.slice(0, 3).map((entry) => (
								<span key={entry.id}>
									<GameArtwork game={entry.game} />
								</span>
							))}
						</div>
					</section>
					{gotyPanel()}
				</div>
				<aside className='gdb-collection-breakdown'>
					<span className='gdb-eyebrow'>{t('gallery.statCopy.allYearsCurrent')}</span>
					<h2>{t('gallery.statCopy.libraryState')}</h2>
					<div className='gdb-status-distribution' role='img' aria-label={stats.byStatus.map((status) => `${status.name}: ${status.count}`).join('; ')}>
						{stats.byStatus.map((status) => (
							<span key={status.statusId} style={{ flex: status.count, background: safeColor(status.color) }} />
						))}
					</div>
					<div className='gdb-status-legend'>
						{stats.byStatus.slice(0, 5).map((status) => (
							<button type='button' key={status.statusId} onClick={() => metric('status', status.name, status.statusId)}>
								<i style={{ background: safeColor(status.color) }} />
								<span>{status.name}</span>
								<b>{status.count}</b>
								<CollectionIcon name='arrow' />
							</button>
						))}
						<details>
							<summary>{t('gallery.common.viewAll')}</summary>
							{stats.byStatus.slice(5).map((status) => (
								<button type='button' key={status.statusId} onClick={() => metric('status', status.name, status.statusId)}>
									<i style={{ background: safeColor(status.color) }} />
									<span>{status.name}</span>
									<b>{status.count}</b>
									<CollectionIcon name='arrow' />
								</button>
							))}
						</details>
					</div>
					<div className='gdb-steam-time'>
						<span>Steam</span>
						<strong>
							{number(stats.totals.steamMinutes / 60)}
							<small> h</small>
						</strong>
						<p>{t('gallery.statistics.monthlyTimeHelp')}</p>
					</div>
				</aside>
			</div>
			<div className='gdb-data-quality'>
				<h3>{t('gallery.statistics.qualityTitle')}</h3>
				{(
					[
						['missingFinish', stats.totals.missingFinishGames, 'gallery.statistics.missingFinish'],
						['missingStory', stats.totals.missingStoryGames, 'gallery.statistics.missingStory'],
						['missingTime', stats.totals.missingTimeGames, 'gallery.statistics.missingTimeLabel'],
					] as const
				).map(([key, count, label]) => (
					<button type='button' key={key} onClick={() => metric(key, t(label))}>
						<b>{count}</b>
						<span>{t(label)}</span>
						<CollectionIcon name='arrow' />
					</button>
				))}
			</div>
		</>
	)
	const dated = tab === 'overview' || tab === 'year' || tab === 'achievements' || (tab === 'ranking' && !allRanking)
	return (
		<section className='gdb-page gdb-statistics-page' aria-busy={resource.loading || (tab === 'completion' && completion.loading)}>
			<div className='gdb-page-heading'>
				<div className='gdb-page-title'>
					<h1>
						{t('gallery.statistics.title')}
						<span className='gdb-period'>.</span>
					</h1>
					<span className='gdb-count'>
						{username}
						{data ? ` · ${t('gallery.common.games', { count: data.totals.totalGames })}` : ''}
					</span>
				</div>
				{dated ? (
					<label className='gdb-year-select'>
						<span>{t('gallery.statistics.yearLabel')}</span>
						<select value={year} onChange={(event) => setQuery({ year: event.target.value, month: undefined })}>
							{[...new Set([year, ...(data?.years ?? [])])]
								.sort((a, b) => b - a)
								.map((value) => (
									<option key={value} value={value}>
										{value}
									</option>
								))}
						</select>
						<CollectionIcon name='down' />
					</label>
				) : (
					<span className='gdb-all-years'>{t('gallery.statistics.allYears')}</span>
				)}
			</div>
			<nav className='gdb-statistics-navigation' aria-label={t('gallery.statistics.title')}>
				{tabs.map((value) => (
					<button type='button' key={value} aria-current={tab === value ? 'page' : undefined} onClick={() => changeTab(value)}>
						{t(`gallery.statistics.${value}`)}
					</button>
				))}
			</nav>
			{saveError && (
				<div className='gdb-error' role='alert'>
					{t(conflict ? 'gallery.common.conflict' : 'gallery.common.saveError')}
					{conflict && (
						<button type='button' className='gdb-text-button' onClick={reloadChoice}>
							{t('gallery.common.reload')}
						</button>
					)}
				</div>
			)}
			{resource.error && data && (
				<p className='gdb-error' role='alert'>
					{t('gallery.common.loadError')}{' '}
					<button type='button' className='gdb-text-button' onClick={invalidateCollection}>
						{t('gallery.common.retry')}
					</button>
				</p>
			)}
			{resource.error && !data ? (
				<div className='gdb-empty'>
					<h2>{t('gallery.common.loadError')}</h2>
					<button type='button' className='gdb-button' onClick={invalidateCollection}>
						{t('gallery.common.retry')}
					</button>
				</div>
			) : !data ? (
				<div className='gdb-empty' role='status'>
					{t('gallery.common.loading')}
				</div>
			) : (
				{
					overview: overviewPanel,
					year: yearPanel,
					achievements: achievementsPanel,
					completion: completionPanel,
					time: timePanel,
					ranking: rankingPanel,
					developers: developersPanel,
				}[tab](data)
			)}
			{picker && (
				<CollectionGamePicker
					open
					onClose={() => setPicker(null)}
					title={picker.title}
					note={picker.note}
					query={picker.query}
					onChoose={chooseGame}
					busy={saving}
					error={saveError ? t(conflict ? 'gallery.common.conflict' : 'gallery.common.saveError') : undefined}
					onReload={conflict ? reloadChoice : undefined}
				/>
			)}
			<CollectionSheet
				open={Boolean(studioGame)}
				onClose={() => !saving && setStudioGame(null)}
				title={t('gallery.statistics.assignStudio')}
				subtitle={studioGame?.name}
				footer={
					<>
						<button type='button' className='gdb-button' disabled={saving} onClick={() => setStudioGame(null)}>
							{t('gallery.common.cancel')}
						</button>
						<button type='submit' form='gdb-studio-form' className='gdb-button gdb-button--primary' disabled={saving}>
							{t('gallery.common.save')}
							<CollectionIcon name='check' />
						</button>
					</>
				}>
				<form
					className='gdb-form'
					id='gdb-studio-form'
					ref={studioForm}
					onSubmit={(event) => {
						void saveStudio(event)
					}}>
					<label>
						{t('gallery.statistics.studioLabel')}
						<input maxLength={150} value={studio} onChange={(event) => setStudio(event.target.value)} />
					</label>
					<p className='gdb-hint'>{t('gallery.detail.developerHelp')}</p>
					{saveError && <p className='gdb-error'>{t('gallery.common.saveError')}</p>}
				</form>
			</CollectionSheet>
			{game && <GameDetails game={game} closeDetails={() => setGame(null)} />}
		</section>
	)
}
