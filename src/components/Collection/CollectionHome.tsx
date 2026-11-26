import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCollectionResource } from '@/hooks/useCollectionResource'
import { getHomeConfig, resolveHomeRows, saveHomeConfig } from '@/services/CollectionService/CollectionService'
import { getPlaylists } from '@/services/PlaylistService/PlaylistService'
import { getGameViews } from '@/services/GameViewService/GameViewService'
import { invalidateCollection, isCollectionConflict } from '@/services/CollectionService/collectionEvents'
import type { CollectionTotals, HomeConfig, HomeRow, HomeRowResult, HomeSource } from '@/models/api/Collection'
import type { Game } from '@/models/api/Game'
import type { PlaylistRules } from '@/models/api/Playlist'
import { CollectionGameDetails as GameDetails } from './CollectionGameDetailsLazy'
import { CollectionIcon } from './CollectionIcon'
import { CollectionSheet } from './CollectionSheet'
import { GameArtwork } from './GameArtwork'
import { GameTitle } from './GameTitle'
import { PlaylistRulesFields, type PlaylistRulesFieldsHandle } from './PlaylistRulesFields'
import { blankPlaylistRules, describePlaylistRules } from '@/utils/playlistRules'
import { effectivePlaytime, formatCollectionNumber } from '@/utils/collectionFormatting'
import './CollectionHome.scss'
import { useCollectionDetails } from './collectionDetailsContext'
import { CollectionTemplatePicker } from './CollectionTemplatePicker'
import { homeRowFromTemplate } from '@/utils/collectionTemplates'
import { PlayingNowSpotlight } from './PlayingNowSpotlight'
import { RecommendationFiltersFields } from './RecommendationFiltersFields'
import { useDailyRecommendationsRefresh } from '@/hooks/useDailyRecommendationsRefresh'
import { SampleBadge } from './SampleBadge'
import { CollectionRail } from './CollectionRail'

const moveRow = (rows: HomeRow[], id: string, delta: number) => {
	const result = [...rows], index = result.findIndex(row => row.id === id), next = index + delta
	if (index >= 0 && next >= 0 && next < result.length) [result[index], result[next]] = [result[next], result[index]]
	return result
}

export default function CollectionHome() {
	const { t, i18n } = useTranslation(), navigate = useNavigate(), [params, setParams] = useSearchParams()
	const config = useCollectionResource('home-config', signal => getHomeConfig(signal))
	const rowsKey = JSON.stringify(config.data?.rows ?? [])
	const resolved = useCollectionResource(`home-rows:${rowsKey}`, signal => resolveHomeRows(config.data!.rows, signal), Boolean(config.data))
	const results = new Map((resolved.data ?? []).map(result => [result.rowId, result]))
	useDailyRecommendationsRefresh(resolved.data)
	const [draft, setDraft] = useState<HomeConfig | null>(null), [rowDraft, setRowDraft] = useState<HomeRow | null>(null), [filterDraft, setFilterDraft] = useState<PlaylistRules | null>(null)
	const [saving, setSaving] = useState(false), [saveError, setSaveError] = useState(false), [game, setLocalGame] = useState<Game | null>(null)
	const details = useCollectionDetails()
	const setGame = (value: Game | null) => { if (value && details) details.open(value); else setLocalGame(value) }
	const [conflict, setConflict] = useState(false)
	const [spotlights, setSpotlights] = useState<Record<string, number>>({})
	const [choosingTemplate, setChoosingTemplate] = useState(false)
	const filterFields = useRef<PlaylistRulesFieldsHandle>(null), rowForm = useRef<HTMLFormElement>(null), filterForm = useRef<HTMLFormElement>(null)
	const sources = useCollectionResource('home-sources', signal => Promise.all([getPlaylists(signal), getGameViews(undefined, signal)]).then(([lists, views]) => ({ lists, views })), Boolean(draft))
	const previewKey = JSON.stringify(draft?.rows ?? [])
	const draftResolved = useCollectionResource(`home-editing:${previewKey}`, signal => resolveHomeRows(draft!.rows.map(row => ({ ...row, enabled: true })), signal), Boolean(draft))
	const draftResults = new Map((draftResolved.data ?? []).map(result => [result.rowId, result]))
	const lists = sources.data?.lists ?? [], views = sources.data?.views ?? []
	const sourceName = (row: HomeRow, result?: HomeRowResult) => {
		const source = row.source
		return result?.sourceName || (source.kind === 'playlist' ? lists.find(list => list.id === source.playlistId)?.name : source.kind === 'view' ? views.find(view => view.id === source.viewId)?.name : undefined) || t(({ playingNow: 'gallery.home.playingNow', playlist: 'gallery.home.playlist', view: 'gallery.home.view', filter: 'gallery.home.filtered', summary: 'gallery.home.statistics', recommendations: 'gallery.discovery.recommendations' } as const)[source.kind])
	}
	const title = (row: HomeRow, result?: HomeRowResult) => row.title?.trim() || sourceName(row, result)
	const customize = () => { if (config.data) { setDraft(structuredClone(config.data)); setSaveError(false) } }
	const requestedCustomization = params.get('customize') === 'home'
	useEffect(() => {
		if (requestedCustomization && config.data) {
			setDraft(structuredClone(config.data)); setSaveError(false)
			setParams(current => { current.delete('customize'); return current }, { replace: true })
		}
	}, [requestedCustomization, config.data, setParams])
	const viewAll = (row: HomeRow) => {
		if (row.source.kind === 'playlist') navigate(`/playlists/${row.source.playlistId}`)
		else if (row.source.kind === 'view') navigate(`/library?viewId=${row.source.viewId}`)
		else if (row.source.kind === 'summary') navigate('/statistics')
		else navigate(`/library/rows/${encodeURIComponent(row.id)}`)
	}
	const save = async () => {
		if (!draft || saving) return
		setSaving(true); setSaveError(false)
		try { const saved = await saveHomeConfig(draft); config.replaceData(current => current && current.revision > saved.revision ? current : saved); setDraft(null) } catch (error) { setSaveError(true); setConflict(isCollectionConflict(error)) } finally { setSaving(false) }
	}
	const customRow = () => { setChoosingTemplate(false); setRowDraft({ id: `row-${crypto.randomUUID()}`, enabled: true, source: lists[0] ? { kind: 'playlist', playlistId: lists[0].id } : { kind: 'filter', rules: blankPlaylistRules() }, presentation: 'covers', previewCount: 12, highlightFirst: true }) }
	const editRow = (row?: HomeRow) => { if (row) setRowDraft(structuredClone(row)); else setChoosingTemplate(true) }
	const changeSource = (kind: HomeSource['kind']) => {
		if (!rowDraft) return
		const source: HomeSource = kind === 'playlist' ? { kind, playlistId: lists[0]?.id ?? 0 } : kind === 'view' ? { kind, viewId: views[0]?.id ?? 0 } : kind === 'filter' ? { kind, rules: blankPlaylistRules() } : kind === 'recommendations' ? { kind, recommendations: { includedStatusIds: [], excludedStatusIds: [] } } : { kind }
		setRowDraft({ ...rowDraft, source })
	}
	const saveRow = (event: FormEvent) => {
		event.preventDefault(); event.stopPropagation()
		if (!draft || !rowDraft || !rowForm.current?.reportValidity()) return
		const index = draft.rows.findIndex(row => row.id === rowDraft.id), rows = [...draft.rows]
		if (index < 0) rows.push(rowDraft); else rows[index] = rowDraft
		setDraft({ ...draft, rows }); setRowDraft(null)
	}
	const saveFilters = (event: FormEvent) => {
		event.preventDefault(); event.stopPropagation()
		if (!rowDraft || !filterForm.current?.reportValidity()) return
		const rules = filterFields.current?.getValue()
		if (rules) { setRowDraft({ ...rowDraft, source: { kind: 'filter', rules } }); setFilterDraft(null) }
	}
	const hours = (game: Game) => { const minutes = effectivePlaytime(game); return minutes == null ? t('gallery.common.noTime') : t('gallery.common.hours', { value: formatCollectionNumber(minutes / 60, i18n.language) }) }
	const stats = (totals: CollectionTotals) => <div className='gdb-home-stats'>{([
		['gallery.statistics.completed', totals.completedGames, '/statistics?tab=completion&criterion=completed'],
		['gallery.statistics.strict', totals.fullyCompletedGames, '/statistics?tab=completion&criterion=strict'],
		['gallery.statistics.unlocked', totals.achievementsUnlocked, '/statistics?tab=achievements'],
	] as const).map(([label, count, path]) => <button type='button' key={label} onClick={() => navigate(path)}><span>{t(label)}</span><strong>{formatCollectionNumber(count, i18n.language, 0)}</strong><small>{t(label === 'gallery.statistics.unlocked' ? 'gallery.statistics.goStatistics' : 'gallery.common.viewAll')}<CollectionIcon name='arrow' /></small></button>)}</div>
	const tile = (item: Game, presentation: HomeRow['presentation']) => <article className={`gdb-home-game ${presentation === 'cards' ? 'is-landscape' : 'is-cover'}`} key={item.id}>
		<GameTitle name={item.name} className='gdb-home-game__art' onOpen={() => setGame(item)} ariaLabel={t('gallery.home.openGame', { name: item.name })}><GameArtwork game={item} role={presentation === 'cards' ? 'hero' : 'cover'} /></GameTitle>
		<GameTitle name={item.name} className='gdb-home-game__title' onOpen={() => setGame(item)} />
		<div className='gdb-home-game__sample'><SampleBadge game={item} /></div>
		<span>{item.platformName}{item.grade != null && <b>{item.grade}<small>/100</small></b>}</span>
	</article>
	const lead = (row: HomeRow, result: HomeRowResult) => {
		return <PlayingNowSpotlight key={row.id} title={title(row, result)} items={result.items} total={result.totalMatches} selectedId={spotlights[row.id]} onSelect={id => setSpotlights(current => ({ ...current, [row.id]: id }))} onOpen={setGame} onViewAll={() => viewAll(row)} formatTime={hours} />
	}
	const shelf = (row: HomeRow, result: HomeRowResult) => {
		const name = title(row, result)
		return <section className='gdb-home-shelf' key={row.id}>
			<div className='gdb-section-heading'><h2><button type='button' onClick={() => viewAll(row)}>{name}</button></h2><div className='gdb-home-shelf__actions'><span>{t('gallery.common.games', { count: result.totalMatches })}</span><button type='button' className='gdb-text-button' onClick={() => viewAll(row)}>{t('gallery.common.viewAll')}<CollectionIcon name='arrow' /></button></div></div>
			{row.source.kind === 'recommendations' && <p className='gdb-home-daily-boundary'>{t('gallery.discovery.daily')}</p>}
			<CollectionRail id={`home-rail-${row.id}`} label={name} className={`gdb-home-rail presentation-${row.presentation}`}>{result.items.map(item => tile(item, row.presentation))}</CollectionRail>
		</section>
	}
	let featured = false
	const content = config.data?.rows.filter(row => row.enabled).map(row => {
		const result = results.get(row.id)
		if (!result || result.state === 'empty' || result.state === 'unavailable') return null
		if (result.state === 'error') return <section className='gdb-home-shelf' key={row.id}><h2>{title(row, result)}</h2><p className='gdb-error'>{t('gallery.common.loadError')}</p><button type='button' className='gdb-text-button' onClick={invalidateCollection}>{t('gallery.common.retry')}</button></section>
		if (row.source.kind === 'summary' && result.summary) return <section className='gdb-home-summary' key={row.id}><div className='gdb-section-heading'><h2>{title(row, result)}</h2><button type='button' className='gdb-text-button' onClick={() => navigate('/statistics')}>{t('gallery.statistics.goStatistics')}<CollectionIcon name='arrow' /></button></div>{stats(result.summary)}</section>
		if (!featured && row.source.kind === 'playingNow' && row.highlightFirst) { featured = true; return lead(row, result) }
		return shelf(row, result)
	}).filter(Boolean) ?? []
	return <section className='gdb-page gdb-home-page'>
		<h1 className='sr-only'>{t('gallery.home.title')}</h1><button type='button' className='gdb-icon-button gdb-home-customize' aria-label={t('gallery.home.personalize')} title={t('gallery.home.personalize')} onClick={customize} disabled={!config.data}><CollectionIcon name='settings' /></button>
		{(config.error || resolved.error) && config.data && resolved.data && <div className='gdb-error' role='alert'>{t('gallery.common.loadError')} <button type='button' className='gdb-text-button' onClick={invalidateCollection}>{t('gallery.common.retry')}</button></div>}
		{(config.error || resolved.error) && (!config.data || !resolved.data) ? <div className='gdb-empty'><h2>{t('gallery.common.loadError')}</h2><button type='button' className='gdb-button' onClick={invalidateCollection}>{t('gallery.common.retry')}</button></div> : !config.data || !resolved.data ? <div className='gdb-home-loading' role='status' aria-label={t('gallery.common.loading')}><div className='gdb-skeleton' /><div className='gdb-skeleton' /></div> : content.length ? <div className='gdb-home-sections' aria-busy={resolved.loading}>{content}</div> : <div className='gdb-empty'><h2>{t('gallery.home.emptyTitle')}</h2><p>{t('gallery.home.emptyHelp')}</p><button type='button' className='gdb-button gdb-button--primary' onClick={customize}><CollectionIcon name='plus' />{t('gallery.home.addFirst')}</button></div>}
		<CollectionSheet open={Boolean(draft)} onClose={() => !saving && setDraft(null)} title={t('gallery.home.configureTitle')} subtitle={t('gallery.home.configureHint')} footer={<><button type='button' className='gdb-button' onClick={() => setDraft(null)} disabled={saving}>{t('gallery.common.cancel')}</button><button type='button' className='gdb-button gdb-button--primary' onClick={() => { void save() }} disabled={saving}>{t('gallery.home.saveHome')}<CollectionIcon name='check' /></button></>}>
			{saveError && <div className='gdb-home-save-error'><p className='gdb-error' role='alert'>{t(conflict ? 'gallery.common.conflict' : 'gallery.common.saveError')}</p>{conflict && <button type='button' className='gdb-text-button' onClick={async () => { try { setDraft(await getHomeConfig()); setSaveError(false) } catch { /* Keep the editable draft on a failed reload. */ } }}>{t('gallery.common.reload')}</button>}</div>}
			<div className='gdb-home-row-settings' aria-busy={draftResolved.loading || sources.loading}>{draft?.rows.map((row, index) => {
				const unchangedSource = JSON.stringify(config.data?.rows.find(value => value.id === row.id)?.source) === JSON.stringify(row.source)
				const result = draftResults.get(row.id) ?? (unchangedSource ? results.get(row.id) : undefined), name = title(row, result)
				return <article className={`gdb-home-row-setting ${row.enabled ? '' : 'is-hidden'}`} key={row.id}><div className='gdb-home-row-setting__top'><CollectionIcon name={row.source.kind === 'summary' ? 'statistics' : row.source.kind === 'filter' ? 'filter' : row.source.kind === 'playingNow' ? 'focus' : row.source.kind === 'recommendations' ? 'dice' : 'playlists'} /><div><strong>{name}</strong><small>{result?.state === 'unavailable' ? t('gallery.home.unavailable') : sourceName(row, result)}{result && row.source.kind !== 'summary' ? ` · ${t('gallery.common.games', { count: result.totalMatches })}` : ''}</small></div><label className='gdb-row-visibility'><input type='checkbox' checked={row.enabled} onChange={event => setDraft(current => current ? { ...current, rows: current.rows.map(value => value.id === row.id ? { ...value, enabled: event.target.checked } : value) } : null)} /><span className='sr-only'>{t('gallery.home.showRow', { title: name })}</span></label></div><div className='gdb-home-row-setting__actions'><button type='button' className='gdb-text-button' onClick={() => editRow(row)}><CollectionIcon name='edit' />{t('gallery.common.edit')}</button><button type='button' className='gdb-icon-button' disabled={!index} aria-label={t('gallery.home.moveUp')} onClick={() => setDraft(current => current ? { ...current, rows: moveRow(current.rows, row.id, -1) } : null)}><CollectionIcon name='up' /></button><button type='button' className='gdb-icon-button' disabled={index === (draft?.rows.length ?? 0) - 1} aria-label={t('gallery.home.moveDown')} onClick={() => setDraft(current => current ? { ...current, rows: moveRow(current.rows, row.id, 1) } : null)}><CollectionIcon name='down' /></button><button type='button' className='gdb-icon-button' aria-label={t('gallery.home.removeRow')} onClick={() => setDraft(current => current ? { ...current, rows: current.rows.filter(value => value.id !== row.id) } : null)}><CollectionIcon name='close' /></button></div></article>
			})}</div><button type='button' className='gdb-button gdb-home-add-row' disabled={!sources.data || (draft?.rows.length ?? 0) >= 20} onClick={() => editRow()}><CollectionIcon name='plus' />{t('gallery.home.addRow')}</button><p className='gdb-hint'>{t('gallery.home.removeInfo')}</p>
		</CollectionSheet>
		<CollectionSheet open={choosingTemplate} onClose={() => setChoosingTemplate(false)} title={t('gallery.home.addRow')}>
			<CollectionTemplatePicker scope='home' onCustom={customRow} onSelect={id => { setChoosingTemplate(false); setRowDraft(homeRowFromTemplate(id, `row-${crypto.randomUUID()}`, t)) }} />
		</CollectionSheet>
		<CollectionSheet open={Boolean(rowDraft)} onClose={() => setRowDraft(null)} title={t('gallery.home.editRow')} footer={<><button type='button' className='gdb-button' onClick={() => setRowDraft(null)}>{t('gallery.common.back')}</button><button type='submit' form='gdb-home-row-form' className='gdb-button gdb-button--primary'>{t('gallery.home.saveRow')}<CollectionIcon name='check' /></button></>}>
			{rowDraft && <form className='gdb-form' id='gdb-home-row-form' ref={rowForm} onSubmit={saveRow}><label>{t('gallery.home.source')}<select value={rowDraft.source.kind} onChange={event => changeSource(event.target.value as HomeSource['kind'])}><option value='playlist' disabled={!lists.length}>{t('gallery.home.sourcePlaylist')}</option><option value='filter'>{t('gallery.home.sourceFilter')}</option><option value='view' disabled={!views.length}>{t('gallery.home.sourceView')}</option><option value='playingNow'>{t('gallery.home.sourcePlaying')}</option><option value='recommendations'>{t('gallery.discovery.recommendations')}</option><option value='summary'>{t('gallery.home.sourceSummary')}</option></select></label>
				{rowDraft.source.kind === 'playlist' && <label>{t('gallery.home.playlistLabel')}<select value={rowDraft.source.playlistId} onChange={event => setRowDraft({ ...rowDraft, source: { kind: 'playlist', playlistId: Number(event.target.value) } })} required>{!lists.some(list => rowDraft.source.kind === 'playlist' && list.id === rowDraft.source.playlistId) && <option value={rowDraft.source.playlistId}>{t('gallery.home.unavailable')}</option>}{lists.map(list => <option key={list.id} value={list.id}>{list.name} · {list.gameCount}</option>)}</select></label>}
				{rowDraft.source.kind === 'view' && <label>{t('gallery.home.viewLabel')}<select value={rowDraft.source.viewId} onChange={event => setRowDraft({ ...rowDraft, source: { kind: 'view', viewId: Number(event.target.value) } })} required>{!views.some(view => rowDraft.source.kind === 'view' && view.id === rowDraft.source.viewId) && <option value={rowDraft.source.viewId}>{t('gallery.home.unavailable')}</option>}{views.map(view => <option key={view.id} value={view.id}>{view.name}</option>)}</select></label>}
				{rowDraft.source.kind === 'filter' && <div className='gdb-home-filter-summary'><p>{describePlaylistRules(rowDraft.source.rules, t)}</p><button type='button' className='gdb-button' onClick={() => rowDraft.source.kind === 'filter' && setFilterDraft(structuredClone(rowDraft.source.rules))}><CollectionIcon name='filter' />{t('gallery.home.filterRules')}</button></div>}
				{rowDraft.source.kind === 'recommendations' && <><p className='gdb-hint'>{t('gallery.discovery.daily')}</p><RecommendationFiltersFields value={rowDraft.source.recommendations} onChange={recommendations => setRowDraft({ ...rowDraft, source: { kind: 'recommendations', recommendations } })} /></>}
				<label>{t('gallery.home.titleLabel')}<input maxLength={120} value={rowDraft.title ?? ''} placeholder={t('gallery.home.titlePlaceholder')} onChange={event => setRowDraft({ ...rowDraft, title: event.target.value })} /></label>{rowDraft.source.kind !== 'summary' && <div className='gdb-form-grid'><label>{t('gallery.home.presentation')}<select value={rowDraft.presentation} onChange={event => setRowDraft({ ...rowDraft, presentation: event.target.value as HomeRow['presentation'] })}><option value='covers'>Covers</option><option value='cards'>Cards</option><option value='row'>Row</option></select></label><label>{t('gallery.home.previewCount')}<input type='number' min={1} max={24} step={1} required value={rowDraft.previewCount} onChange={event => setRowDraft({ ...rowDraft, previewCount: Number(event.target.value) })} /></label></div>}{rowDraft.source.kind === 'playingNow' && <label className='gdb-check-label'><input type='checkbox' checked={rowDraft.highlightFirst} onChange={event => setRowDraft({ ...rowDraft, highlightFirst: event.target.checked })} />{t('gallery.home.highlight')}</label>}
			</form>}
		</CollectionSheet>
		<CollectionSheet open={Boolean(filterDraft)} onClose={() => setFilterDraft(null)} title={t('gallery.rules.filterTitle')} wide footer={<><button type='button' className='gdb-button' onClick={() => setFilterDraft(null)}>{t('gallery.common.cancel')}</button><button type='submit' form='gdb-home-filter-form' className='gdb-button gdb-button--primary'>{t('gallery.rules.useFilters')}<CollectionIcon name='check' /></button></>}>
			{filterDraft && <form className='gdb-form' id='gdb-home-filter-form' ref={filterForm} onSubmit={saveFilters}><PlaylistRulesFields ref={filterFields} rules={filterDraft} onChange={setFilterDraft} /></form>}
		</CollectionSheet>
		{game && <GameDetails game={game} closeDetails={() => setGame(null)} />}
	</section>
}
