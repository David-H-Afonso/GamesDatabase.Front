import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import OptimizedImage from '@/components/elements/OptimizedImage/OptimizedImage'
import type { GameArtworkRole } from '@/models/api/SteamArtwork'
import { safeArtworkUrl } from '@/utils/artworkImage'

/** Preview this exact source, never a substituted image or artwork role. */
export const GameArtworkPreview = ({ role, value, label, name, caption, imageAlt }: { role: GameArtworkRole; value: string; label: string; name: string; caption?: string; imageAlt?: string }) => {
	const { t } = useTranslation()
	const source = safeArtworkUrl(value)
	const [loadedSource, setLoadedSource] = useState<string | null>(null), [failedSource, setFailedSource] = useState<string | null>(null)
	const state = !value.trim() ? 'empty' : !source ? 'invalid' : failedSource === source ? 'failed' : loadedSource === source ? 'loaded' : 'loading'
	const loading = state === 'loading'
	return (
		<figure className={`gdb-editor-artwork-preview gdb-editor-artwork-preview--${role}`} aria-label={caption ?? t('gallery.detail.artworkPreviewLabel', { role: label })} data-state={state}>
			<div className='gdb-editor-artwork-preview__frame' aria-busy={loading}>
				{source && state !== 'failed' ? (
					<OptimizedImage
						key={source}
						src={source}
						alt={imageAlt ?? t('gallery.detail.artworkPreviewAlt', { role: label, name: name.trim() })}
						width={role === 'hero' ? 480 : 192}
						quality='high'
						loading='eager'
						onLoad={() => setLoadedSource(source)}
						onError={() => setFailedSource(source)}
						imageUnavailableText={t('gallery.detail.artworkPreviewFailed')}
					/>
				) : <p>{t(`gallery.detail.artworkPreview${state === 'empty' ? 'Empty' : state === 'invalid' ? 'Invalid' : 'Failed'}`)}</p>}
				{loading && <span className='sr-only' role='status'>{t('gallery.detail.artworkPreviewLoading')}</span>}
			</div>
			<figcaption>{caption ?? t('gallery.detail.artworkPreview')}</figcaption>
		</figure>
	)
}
