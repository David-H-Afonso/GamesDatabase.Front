import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Game } from '@/models/api/Game'
import type { MetadataField, MetadataIdentity, MetadataPreview } from '@/models/api/GameMetadata'
import { applyGameMetadata, previewGameMetadata } from '@/services/GamesService/GameMetadataService'
import { invalidateCollection } from '@/services/CollectionService/collectionEvents'
import { formatCollectionDate, formatCollectionNumber } from '@/utils/collectionFormatting'
import { CollectionSheet } from './CollectionSheet'
import { CollectionIcon } from './CollectionIcon'
import { GameArtworkPreview } from './GameArtworkPreview'
import './GameMetadataSheet.scss'

const isArtworkField = (field: MetadataField): field is 'logo' | 'hero' | 'cover' => field === 'logo' || field === 'hero' || field === 'cover'

export const GameMetadataSheet = ({ game, onClose }: { game: Game; onClose: () => void }) => {
	const { t, i18n } = useTranslation()
	const [overwrite, setOverwrite] = useState(false), [artwork, setArtwork] = useState(true), [preview, setPreview] = useState<MetadataPreview | null>(null), [selected, setSelected] = useState<MetadataField[]>([])
	const [busy, setBusy] = useState(false), [error, setError] = useState<'lookup' | 'save' | 'conflict' | null>(null)
	const request = useRef<AbortController | null>(null), submitting = useRef(false)
	const phase = useRef<'lookup' | 'save' | null>(null)
	useEffect(() => () => request.current?.abort(), [])
	const lookup = async (identity?: MetadataIdentity) => {
		if (submitting.current) return
		submitting.current = true; phase.current = 'lookup'; const controller = new AbortController(); request.current?.abort(); request.current = controller
		setBusy(true); setError(null)
		try {
			const result = await previewGameMetadata(game.id, { overwrite, includeArtwork: artwork, ...(identity?.steamAppId ? { steamAppId: identity.steamAppId } : {}), ...(identity?.wikidataId ? { wikidataId: identity.wikidataId } : {}) }, controller.signal)
			if (!controller.signal.aborted) { setPreview(result); setSelected(result.fields.map(field => field.field)) }
		} catch { if (!controller.signal.aborted) setError('lookup') }
		finally { if (request.current === controller) { submitting.current = false; phase.current = null; setBusy(false) } }
	}
	const save = async () => {
		if (submitting.current || !preview?.token || !selected.length) return
		submitting.current = true; phase.current = 'save'; const controller = new AbortController(); request.current = controller
		setBusy(true); setError(null)
		try {
			await applyGameMetadata(game.id, preview.token, selected, controller.signal)
			if (!controller.signal.aborted) { invalidateCollection(); onClose() }
		} catch (reason) { if (!controller.signal.aborted) setError((reason as { status?: number }).status === 409 ? 'conflict' : 'save') }
		finally { if (request.current === controller) { submitting.current = false; phase.current = null; setBusy(false) } }
	}
	const cancel = () => { if (phase.current !== 'save') { request.current?.abort(); onClose() } }
	const value = (item: string | number | null, field: MetadataField) => item == null || item === '' ? t('metadata.empty') : field === 'released' && typeof item === 'string' ? formatCollectionDate(item, i18n.language) : typeof item === 'number' ? formatCollectionNumber(item, i18n.language, 0) : item
	const sourceUrl = (url: string) => /^https:\/\/(?:store\.steampowered\.com\/app\/\d+\/?|www\.wikidata\.org\/wiki\/Q\d+)$/.test(url) ? url : undefined
	return <CollectionSheet open onClose={cancel} title={t('metadata.title')} subtitle={game.name} wide className='gdb-metadata-sheet' footer={<>
		<button type='button' className='gdb-button' disabled={busy && phase.current === 'save'} onClick={cancel}>{t('metadata.cancel')}</button>
		{preview ? <><button type='button' className='gdb-text-button' disabled={busy} onClick={() => { setPreview(null); setError(null) }}>{t('metadata.back')}</button><button type='button' className='gdb-button gdb-button--primary' disabled={busy || !preview.token || !selected.length || error === 'conflict' || error === 'lookup'} onClick={() => { void save() }}>{t('metadata.save')}<CollectionIcon name='check' /></button></> : <button type='button' className='gdb-button gdb-button--primary' disabled={busy} onClick={() => { void lookup() }}>{t(busy ? 'metadata.looking' : 'metadata.lookup')}<CollectionIcon name='search' /></button>}
	</>}>
		{error && <div className='gdb-error' role='alert'><p>{t(error === 'lookup' ? 'metadata.lookupFailed' : error === 'conflict' ? 'metadata.conflict' : 'metadata.saveFailed')}</p>{error === 'conflict' && <button type='button' className='gdb-text-button' disabled={busy} onClick={() => { void lookup() }}>{t('metadata.lookup')}</button>}</div>}
		{!preview ? <div className='gdb-form'><p className='gdb-hint'>{t('metadata.sourceOrder')}</p><fieldset className='gdb-metadata-mode'><legend>{t('metadata.mode')}</legend><label><input type='radio' name='metadata-mode' checked={!overwrite} disabled={busy} onChange={() => setOverwrite(false)} />{t('metadata.emptyOnly')}</label><label><input type='radio' name='metadata-mode' checked={overwrite} disabled={busy} onChange={() => setOverwrite(true)} />{t('metadata.overwrite')}</label></fieldset><label className='gdb-check-label'><input type='checkbox' checked={artwork} disabled={busy} onChange={event => setArtwork(event.target.checked)} />{t('metadata.includeArtwork')}</label></div> : <>
			{preview.notices.map(notice => <p key={notice} className='gdb-hint'>{t(`metadata.${notice}`, { defaultValue: t('metadata.noChanges') })}</p>)}
			{preview.matches.length > 0 && <details className='gdb-metadata-identities' open={!preview.fields.length}><summary>{t('metadata.identity')}</summary><div>{preview.matches.map(identity => <button type='button' className='gdb-button' key={identity.url} disabled={busy || game.steamAppId != null && identity.steamAppId != null && game.steamAppId !== identity.steamAppId} onClick={() => { void lookup(identity) }}><span><b>{identity.name}</b><small>{identity.source === 'steam' ? 'Steam' : 'Wikidata'}</small></span><CollectionIcon name='arrow' /></button>)}</div></details>}
			{preview.fields.length > 0 && <fieldset className='gdb-metadata-fields'><legend>{t('metadata.review')}</legend>{preview.fields.map(candidate => <div className='gdb-metadata-field' key={candidate.field}>
				<label><input type='checkbox' checked={selected.includes(candidate.field)} disabled={busy} onChange={event => setSelected(current => event.target.checked ? [...new Set([...current, candidate.field])] : current.filter(field => field !== candidate.field))} /><b>{t(`metadata.fields.${candidate.field}`)}</b></label>
				{(['current', 'suggested'] as const).map(version => {
					const item = version === 'current' ? candidate.current : candidate.value
					return <div key={version} className={isArtworkField(candidate.field) ? 'gdb-metadata-artwork-value' : undefined}>
						{isArtworkField(candidate.field) ? <>
							<GameArtworkPreview role={candidate.field} value={typeof item === 'string' ? item : ''} label={t(`metadata.fields.${candidate.field}`)} name={game.name} caption={t(`metadata.${version}Image`, { role: t(`metadata.fields.${candidate.field}`) })} imageAlt={t(`metadata.${version}ImageAlt`, { role: t(`metadata.fields.${candidate.field}`), name: game.name })} />
							{typeof item === 'string' && item.trim() && <details className='gdb-metadata-artwork-url'><summary>{t('metadata.imageUrl')}</summary><code>{item}</code></details>}
						</> : <><small>{t(`metadata.${version}`)}</small><span>{value(item, candidate.field)}</span></>}
					</div>
				})}
				<a href={sourceUrl(candidate.url)} target='_blank' rel='noopener noreferrer'>{t('metadata.source', { source: candidate.source === 'steam' ? 'Steam' : 'Wikidata' })}<CollectionIcon name='external' /></a>
			</div>)}</fieldset>}
		</>}
	</CollectionSheet>
}
