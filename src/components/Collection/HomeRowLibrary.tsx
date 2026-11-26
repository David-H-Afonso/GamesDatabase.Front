import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCollectionResource } from '@/hooks/useCollectionResource'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useDisplayedGames } from '@/hooks/useDisplayedGames'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setCardStyle } from '@/store/features/theme/themeSlice'
import { getHomeConfig, getHomeRowGames, resolveHomeRows } from '@/services/CollectionService/CollectionService'
import { deleteGame } from '@/services/GamesService/GamesService'
import { invalidateCollection } from '@/services/CollectionService/collectionEvents'
import { ConfirmDialog, GameCard } from '@/components/elements'
import type { Game } from '@/models/api/Game'
import { CollectionIcon } from './CollectionIcon'
import './HomeRowLibrary.scss'

export default function HomeRowLibrary() {
	const { rowId = '' } = useParams<{ rowId: string }>(), { t } = useTranslation(), navigate = useNavigate(), dispatch = useAppDispatch()
	const layout = useAppSelector(state => state.theme.cardStyle ?? 'cover')
	const [page, setPage] = useState(1), [search, setSearch] = useState(''), [pendingDelete, setPendingDelete] = useState<Game | null>(null), [deleting, setDeleting] = useState(false), [error, setError] = useState(false)
	const debounced = useDebouncedValue(search)
	const config = useCollectionResource('row-library-config', signal => getHomeConfig(signal))
	const row = config.data?.rows.find(value => value.id === rowId)
	const titleResult = useCollectionResource(`row-library-title:${rowId}:${JSON.stringify(row?.source)}`, signal => resolveHomeRows([{ ...row!, enabled: true, previewCount: 1 }], signal), Boolean(row && !row.title))
	const resource = useCollectionResource(`row-library:${rowId}:${page}:${debounced}`, signal => getHomeRowGames(rowId, { page, pageSize: 28, search: debounced || undefined }, signal))
	const result = resource.data
	useDisplayedGames(result?.data ?? [], `${rowId}:${page}:${debounced}`, resource.loading || search !== debounced)
	const title = row?.title || titleResult.data?.[0]?.sourceName || t(row?.source.kind === 'playingNow' ? 'gallery.home.playingNow' : row?.source.kind === 'recommendations' ? 'gallery.discovery.recommendations' : 'gallery.home.rowGames')
	const confirmDelete = async () => {
		if (!pendingDelete || deleting) return
		setDeleting(true); setError(false)
		try { await deleteGame(pendingDelete.id); setPendingDelete(null) } catch { setError(true) } finally { setDeleting(false) }
	}
	return <section className='gdb-page gdb-row-library' aria-busy={resource.loading}>
		<button type='button' className='gdb-text-button gdb-row-library__back' onClick={() => navigate('/')}><CollectionIcon name='back' />{t('gallery.home.backHome')}</button>
		<div className='gdb-page-heading'><div className='gdb-page-title'><h1>{title}<span className='gdb-period'>.</span></h1>{result && <span className='gdb-count'>{t('gallery.common.games', { count: result.totalCount })}</span>}</div></div>
		<div className='gdb-row-library__toolbar'><label className='gdb-search-input'><CollectionIcon name='search' /><span className='sr-only'>{t('gallery.search.nameLabel')}</span><input type='search' value={search} maxLength={250} placeholder={t('gallery.library.search')} onChange={event => { setSearch(event.target.value); setPage(1) }} /></label><div className='gdb-layout-control' role='group' aria-label={t('gallery.home.presentation')}>{(['card', 'row', 'cover'] as const).map(value => <button type='button' key={value} aria-label={value === 'card' ? 'Cards' : value === 'cover' ? 'Covers' : 'Row'} aria-pressed={layout === value} onClick={() => dispatch(setCardStyle(value))}><CollectionIcon name={value === 'card' ? 'cards' : value === 'cover' ? 'covers' : 'row'} /></button>)}</div></div>
		{error && <p className='gdb-error' role='alert'>{t('gallery.common.saveError')}</p>}
		{resource.error ? <div className='gdb-empty'><h2>{t('gallery.home.unavailable')}</h2><p>{t('gallery.home.unavailableHelp')}</p><button type='button' className='gdb-button' onClick={invalidateCollection}>{t('gallery.common.retry')}</button></div> : resource.loading && !result ? <div className='gdb-empty' role='status'>{t('gallery.common.loading')}</div> : !result?.data.length ? <div className='gdb-empty'><h2>{t('gallery.common.noResults')}</h2></div> : <div className={`gdb-row-library__games home-component-games-${layout}`}>{result.data.map((item, index) => <GameCard key={item.id} game={item} variant={layout} hideSelection onDelete={setPendingDelete} index={index} />)}</div>}
		{result && result.totalPages > 1 && <div className='gdb-pagination'><span>{t('gallery.common.results', { from: (page - 1) * result.pageSize + 1, to: Math.min(page * result.pageSize, result.totalCount), count: result.totalCount })}</span><div><button type='button' className='gdb-button' disabled={page <= 1} onClick={() => setPage(current => current - 1)}>{t('gallery.common.previous')}</button><span>{page} / {result.totalPages}</span><button type='button' className='gdb-button' disabled={page >= result.totalPages} onClick={() => setPage(current => current + 1)}>{t('gallery.common.next')}</button></div></div>}
		<ConfirmDialog isOpen={Boolean(pendingDelete)} title={t('common.confirmDeleteTitle')} message={t('home.confirmDeleteGame')} variant='danger' confirmLabel={t('common.delete')} onConfirm={() => { void confirmDelete() }} onCancel={() => !deleting && setPendingDelete(null)} />
	</section>
}
