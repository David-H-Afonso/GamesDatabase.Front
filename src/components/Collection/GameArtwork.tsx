import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Game } from '@/models/api/Game'
import OptimizedImage from '@/components/elements/OptimizedImage/OptimizedImage'

interface Props { game: Pick<Game, 'name' | 'cover' | 'hero' | 'logo'>; role?: 'cover' | 'hero' | 'logo'; className?: string; width?: number; eager?: boolean; decorative?: boolean }
export const GameArtwork = ({ game, role = 'cover', className = '', width, eager = false, decorative = false }: Props) => {
	const { t } = useTranslation(), source = game[role]
	const [failedSource, setFailedSource] = useState<string | null>(null)
	useEffect(() => { setFailedSource(null) }, [source])
	if (!source || failedSource === source) return <span className={`gdb-art-empty ${className}`} role='img' aria-label={`${t('gallery.common.noImage')}: ${game.name}`}><b>{game.name}</b><small>{t('gallery.common.noImage')}</small></span>
	return <OptimizedImage src={source} alt={decorative ? '' : game.name} className={className} width={width ?? (role === 'hero' ? 960 : 240)} quality='high' loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : undefined} onError={() => setFailedSource(source)} imageUnavailableText={t('gallery.common.noImage')} />
}
