import { useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import type { Game } from '@/models/api/Game'
import OptimizedImage from '@/components/elements/OptimizedImage/OptimizedImage'
import { gameArtworkRevision, subscribeGameArtwork } from '@/services/CollectionService/collectionEvents'

interface Props { game: Pick<Game, 'name' | 'cover' | 'hero' | 'logo'> & Partial<Pick<Game, 'id'>>; role?: 'cover' | 'hero' | 'logo'; className?: string; width?: number; eager?: boolean; decorative?: boolean }
export const GameArtwork = ({ game, role = 'cover', className = '', width, eager = false, decorative = false }: Props) => {
	const { t } = useTranslation()
	const revision = useSyncExternalStore(subscribeGameArtwork, () => gameArtworkRevision(game.id), () => 0)
	// Display-only Cover -> Hero fallback. Never backfill storage or borrow Cover
	// for Hero/Logo; editor/review previews still show their exact source.
	const sources = [...new Set((role === 'cover' ? [game.cover, game.hero] : [game[role]]).map(value => value?.trim()).filter((value): value is string => Boolean(value)))]
	const sourceKey = JSON.stringify([role, ...sources, revision])
	const [failed, setFailed] = useState<{ key: string; sources: string[] }>({ key: '', sources: [] })
	const failures = failed.key === sourceKey ? failed.sources : []
	const source = sources.find(value => !failures.includes(value))
	if (!source) return <span className={`gdb-art-empty ${className}`} role='img' aria-label={`${t('gallery.common.noImage')}: ${game.name}`}><b>{game.name}</b><small>{t('gallery.common.noImage')}</small></span>
	return <OptimizedImage key={`${source}:${revision}`} src={source} alt={decorative ? '' : game.name} className={className} width={width ?? (role === 'hero' ? 960 : 240)} quality='high' loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : undefined} onError={() => setFailed(previous => ({ key: sourceKey, sources: [...new Set([...(previous.key === sourceKey ? previous.sources : []), source])] }))} imageUnavailableText={t('gallery.common.noImage')} />
}
