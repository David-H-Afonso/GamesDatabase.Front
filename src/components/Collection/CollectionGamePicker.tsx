import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CollectionMetric } from '@/models/api/Collection'
import type { Game } from '@/models/api/Game'
import { useCollectionResource } from '@/hooks/useCollectionResource'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { getCollectionGames } from '@/services/CollectionService/CollectionService'
import { invalidateCollection } from '@/services/CollectionService/collectionEvents'
import { CollectionSheet } from './CollectionSheet'
import { CollectionIcon } from './CollectionIcon'
import { GameArtwork } from './GameArtwork'

export interface CollectionPickerQuery { metric: CollectionMetric; year?: number; month?: number; value?: number; developer?: string }
interface Props { open: boolean; onClose: () => void; title: string; note?: string; query: CollectionPickerQuery; onChoose: (game: Game) => void; busy?: boolean; error?: string; onReload?: () => void; disabledGameIds?: number[] }
export const CollectionGamePicker = ({ open, onClose, title, note, query, onChoose, busy = false, error, onReload, disabledGameIds = [] }: Props) => {
	const { t } = useTranslation(), [page, setPage] = useState(1), [search, setSearch] = useState('')
	const debounced = useDebouncedValue(search), queryKey = JSON.stringify(query)
	useEffect(() => { setPage(1); setSearch('') }, [open, queryKey])
	const resource = useCollectionResource(`metric-picker:${queryKey}:${page}:${debounced}`, signal => getCollectionGames({ ...query, page, pageSize: 28, search: debounced || undefined }, signal), open)
	const result = resource.data
	return <CollectionSheet open={open} onClose={() => !busy && onClose()} title={title} subtitle={result ? t('gallery.common.games', { count: result.totalCount }) : undefined}>
		{error && <p className='gdb-error' role='alert'>{error}</p>}
		{error && onReload && <button type='button' className='gdb-text-button' onClick={onReload}>{t('gallery.common.reload')}</button>}
		{note && <p className='gdb-hint'>{note}</p>}<label className='gdb-search-input gdb-picker-search'><CollectionIcon name='search' /><span className='sr-only'>{t('gallery.search.nameLabel')}</span><input type='search' value={search} maxLength={250} placeholder={t('gallery.search.phrasePlaceholder')} onChange={event => { setSearch(event.target.value); setPage(1) }} /></label>
		<div className='gdb-game-picker' aria-busy={resource.loading || search !== debounced || busy}>{resource.error ? <><p className='gdb-error'>{t('gallery.common.loadError')}</p><button type='button' className='gdb-button' onClick={invalidateCollection}>{t('gallery.common.retry')}</button></> : resource.loading && !result ? <p className='gdb-hint'>{t('gallery.common.loading')}</p> : result?.data.length ? result.data.map(game => <button type='button' key={game.id} disabled={busy || disabledGameIds.includes(game.id)} onClick={() => onChoose(game)}><span className='gdb-mini-cover'><GameArtwork game={game} width={66} /></span><span><strong>{game.name}</strong><small>{game.platformName}</small></span><CollectionIcon name='arrow' /></button>) : <p className='gdb-hint'>{t('gallery.common.noResults')}</p>}</div>
		{result && result.totalPages > 1 && <div className='gdb-pagination'><button type='button' className='gdb-button' disabled={page <= 1 || busy} onClick={() => setPage(current => current - 1)}>{t('gallery.common.previous')}</button><span>{page} / {result.totalPages}</span><button type='button' className='gdb-button' disabled={page >= result.totalPages || busy} onClick={() => setPage(current => current + 1)}>{t('gallery.common.next')}</button></div>}
	</CollectionSheet>
}
