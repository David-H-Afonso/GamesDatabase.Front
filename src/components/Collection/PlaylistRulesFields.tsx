import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useGamePlatform, useGamePlayedStatus, useGameStatus } from '@/hooks'
import type { PlaylistPreview, PlaylistRules } from '@/models/api/Playlist'
import type { NameSearch } from '@/models/api/NameSearch'
import { previewPlaylist } from '@/services/PlaylistService/PlaylistService'
import { describePlaylistRules, playlistNameSearch } from '@/utils/playlistRules'
import { useAppSelector } from '@/store/hooks'
import { MultiSelectField } from './MultiSelectField'
import { NameSearchField, type NameSearchFieldHandle } from './NameSearchField'
import { CollectionIcon } from './CollectionIcon'
import { GameArtwork } from './GameArtwork'
import { localReleaseTimeZone } from '@/utils/collectionTemplates'

export interface PlaylistRulesFieldsHandle { getValue: () => PlaylistRules }
interface Props { rules: PlaylistRules; onChange: (rules: PlaylistRules) => void; maxLength?: number | null }
export const PlaylistRulesFields = forwardRef<PlaylistRulesFieldsHandle, Props>(function PlaylistRulesFields({ rules, onChange, maxLength = null }, ref) {
	const { t } = useTranslation(), { statuses, activeStatuses } = useGameStatus(), { platforms, activePlatforms } = useGamePlatform(), { playedStatuses, activePlayedStatuses } = useGamePlayedStatus()
	const storedGames = useAppSelector(state => state.games.games)
	const statusOptions = useMemo(() => [...new Map([...statuses, ...activeStatuses].map(value => [value.id, value])).values()], [statuses, activeStatuses])
	const platformOptions = platforms.length ? platforms : activePlatforms, playedOptions = playedStatuses.length ? playedStatuses : activePlayedStatuses
	const names = useRef<NameSearchFieldHandle>(null)
	const [effectiveSearch, setEffectiveSearch] = useState<NameSearch>(() => playlistNameSearch(rules))
	const [preview, setPreview] = useState<{ value: PlaylistPreview | null; loading: boolean; error: boolean }>({ value: null, loading: true, error: false })
	const effective = { ...rules, search: undefined, nameSearch: effectiveSearch }, signature = JSON.stringify(effective)
	useImperativeHandle(ref, () => ({ getValue: () => ({ ...rules, search: undefined, nameSearch: names.current?.getValue() ?? playlistNameSearch(rules) }) }), [rules])
	useEffect(() => {
		const controller = new AbortController()
		setPreview({ value: null, loading: true, error: false })
		const timer = setTimeout(() => { void previewPlaylist(JSON.parse(signature) as PlaylistRules, maxLength, 5, controller.signal).then(value => {
			if (!controller.signal.aborted) setPreview({ value, loading: false, error: false })
		}).catch(() => { if (!controller.signal.aborted) setPreview({ value: null, loading: false, error: true }) }) }, 180)
		return () => { clearTimeout(timer); controller.abort() }
	}, [signature, maxLength])
	const update = (patch: Partial<PlaylistRules>) => onChange({ ...rules, ...patch })
	const tri = (field: 'favorite' | 'hasSteam' | 'fullCompletion' | 'allAchievements', label: string) => <label>{label}<select value={rules[field] == null ? '' : String(rules[field])} onChange={event => update({ [field]: event.target.value === '' ? undefined : event.target.value === 'true' })}><option value=''>{t('gallery.rules.any')}</option><option value='true'>{t('gallery.rules.yes')}</option><option value='false'>{t('gallery.rules.no')}</option></select></label>
	const numberField = (field: 'minGrade' | 'maxGrade' | 'minCritic' | 'maxCritic' | 'minScore' | 'maxScore' | 'releasedFromYear' | 'releasedToYear' | 'limit', label: string, minimum: number, maximum?: number, step = 1) => <label>{label}<input type='number' min={minimum} max={maximum} step={step} value={rules[field] ?? ''} onChange={event => update({ [field]: event.target.value === '' ? undefined : Number(event.target.value) })} /></label>
	const priorities = rules.statusPriorityIds?.length ? rules.statusPriorityIds : rules.statusIds
	const move = (index: number, delta: number) => { const ids = [...priorities], next = index + delta; if (next >= 0 && next < ids.length) { [ids[index], ids[next]] = [ids[next], ids[index]]; update({ statusPriorityIds: ids }) } }
	return <div className='gdb-rules-fields'>
		<section className='gdb-rules-section'><div className='gdb-rules-section__heading'><h3>{t('gallery.rules.contentHeading')}</h3><span>{t('gallery.rules.allGroups')}</span></div>
			<div className='gdb-rules-name'><NameSearchField ref={names} value={playlistNameSearch(rules)} exact initiallyExpanded onChange={value => update({ nameSearch: value, search: undefined })} onEffectiveChange={setEffectiveSearch} /></div>
			<div className='gdb-rules-selectors'><MultiSelectField label={t('gallery.rules.statuses')} selected={rules.statusIds} options={statusOptions.map(value => ({ id: value.id, label: value.name }))} onChange={ids => update({ statusIds: ids })} /><MultiSelectField label={t('gallery.rules.platforms')} selected={rules.platformIds} options={platformOptions.map(value => ({ id: value.id, label: value.name }))} onChange={ids => update({ platformIds: ids })} /><MultiSelectField label={t('gallery.rules.playedStatuses')} selected={rules.playedStatusIds} options={playedOptions.map(value => ({ id: value.id, label: value.name }))} onChange={ids => update({ playedStatusIds: ids })} /></div>
			<div className='gdb-form-grid'>{tri('favorite', t('gallery.rules.favorite'))}{tri('hasSteam', t('gallery.rules.steam'))}{tri('fullCompletion', t('gallery.rules.completed'))}{tri('allAchievements', t('gallery.rules.strict'))}</div>
			<div className='gdb-rules-semantic'>
				<label className='gdb-check-label'><input type='checkbox' checked={rules.playingNow ?? false} onChange={event => update({ playingNow: event.target.checked })} />{t('gallery.rules.playingNow')}</label>
				<label className='gdb-check-label'><input type='checkbox' checked={rules.upcomingReleases ?? false} onChange={event => update({ upcomingReleases: event.target.checked, releaseTimeZone: event.target.checked ? rules.releaseTimeZone || localReleaseTimeZone() : undefined })} />{t('gallery.rules.upcoming')}</label>
				{rules.upcomingReleases && <p className='gdb-hint'>{t('gallery.rules.upcomingHelp', { timeZone: rules.releaseTimeZone })}</p>}
			</div>
			<details className='gdb-rules-advanced'><summary>{t('gallery.rules.bounds')}<CollectionIcon name='down' /></summary><div className='gdb-form-grid'>{numberField('minGrade', t('gallery.rules.minGrade'), 0, 100)}{numberField('maxGrade', t('gallery.rules.maxGrade'), 0, 100)}{numberField('minCritic', t('gallery.rules.minCritic'), 0, 100)}{numberField('maxCritic', t('gallery.rules.maxCritic'), 0, 100)}{numberField('minScore', t('gallery.rules.minScore'), 0, 10, .01)}{numberField('maxScore', t('gallery.rules.maxScore'), 0, 10, .01)}{numberField('releasedFromYear', t('gallery.rules.releasedIn'), 1970, 2100)}{numberField('releasedToYear', t('gallery.rules.releasedTo'), 1970, 2100)}</div></details>
		</section>
		<section className='gdb-rules-section'><h3>{t('gallery.rules.orderLimits')}</h3><div className='gdb-form-grid'><label>{t('gallery.rules.sortBy')}<select value={rules.sortBy} onChange={event => update({ sortBy: event.target.value as PlaylistRules['sortBy'] })}>{(['Name', 'Grade', 'Critic', 'Story', 'Score', 'Released', 'Updated', 'Position'] as const).map(value => <option key={value} value={value}>{t(`gallery.rules.sort${value}`)}</option>)}</select></label>{numberField('limit', t('gallery.rules.resultLimit'), 1)}</div>
			<label className='gdb-check-label'><input type='checkbox' checked={rules.sortDescending} onChange={event => update({ sortDescending: event.target.checked })} />{t('gallery.rules.descending')}</label><label className='gdb-check-label'><input type='checkbox' checked={rules.groupByStatus ?? false} onChange={event => update({ groupByStatus: event.target.checked, ...(event.target.checked && !priorities.length ? { statusPriorityIds: statusOptions.map(value => value.id) } : {}) })} />{t('gallery.rules.groupByStatus')}</label>
			<details className='gdb-rules-advanced'><summary>{t('gallery.rules.priorities')}<CollectionIcon name='down' /></summary><p className='gdb-hint'>{t('gallery.rules.prioritiesHelp')}</p><div className='gdb-status-priorities'>{priorities.map((id, index) => <div key={id}><span>{statusOptions.find(value => value.id === id)?.name ?? `#${id}`}</span><button type='button' className='gdb-icon-button' aria-label={t('gallery.home.moveUp')} disabled={!index} onClick={() => move(index, -1)}><CollectionIcon name='up' /></button><button type='button' className='gdb-icon-button' aria-label={t('gallery.home.moveDown')} disabled={index === priorities.length - 1} onClick={() => move(index, 1)}><CollectionIcon name='down' /></button></div>)}</div>
				{rules.orderedGameIds.length > 0 && <button type='button' className='gdb-text-button' onClick={() => update({ orderedGameIds: [] })}>{t('playlists.resetOrder')}</button>}
				<div className='gdb-rule-exclusions'>{rules.excludedGameIds?.length ? rules.excludedGameIds.map(id => <div key={id}><span>{storedGames.find(game => game.id === id)?.name ?? `#${id}`}</span><button type='button' className='gdb-text-button' onClick={() => update({ excludedGameIds: rules.excludedGameIds?.filter(value => value !== id) })}>{t('gallery.rules.restore')}</button></div>) : <p className='gdb-hint'>{t('gallery.rules.noExclusions')}</p>}</div>
			</details>
		</section>
		<section className='gdb-rule-preview' aria-live='polite' aria-busy={preview.loading}><span className='gdb-eyebrow'>{t('gallery.rules.preview')}</span>{preview.loading ? <p className='gdb-hint'>{t('gallery.common.loading')}</p> : preview.error || !preview.value ? <p className='gdb-error'>{t('gallery.rules.previewError')}</p> : <><strong>{t('gallery.rules.matching', { count: preview.value.totalMatches })}{preview.value.totalMatches !== preview.value.returnedCount ? ` · ${t('gallery.rules.afterLimits', { count: preview.value.returnedCount })}` : ''}</strong><p>{describePlaylistRules(effective, t, { statuses: statusOptions, platforms: platformOptions, playedStatuses: playedOptions })}</p><div className='gdb-rule-preview__games'>{preview.value.games.map(game => <span key={game.id}><span className='gdb-mini-cover'><GameArtwork game={game} width={100} /></span><b>{game.name}</b></span>)}</div></>}</section>
	</div>
})
