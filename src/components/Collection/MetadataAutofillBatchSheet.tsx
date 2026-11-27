import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { MetadataAutofillBatch } from '@/hooks/useMetadataAutofillBatch'
import { metadataAutofillRetryable } from '@/services/GamesService/MetadataAutofillService'
import { CollectionSheet } from './CollectionSheet'
import { CollectionIcon } from './CollectionIcon'
import './MetadataAutofillBatchSheet.scss'

interface Props { batch: MetadataAutofillBatch; onClose: () => void; onStop: () => void; onRetry: () => boolean; onReview: (id: number) => void }

export const MetadataAutofillBatchSheet = ({ batch, onClose, onStop, onRetry, onReview }: Props) => {
	const { t } = useTranslation(), [limit, setLimit] = useState(30)
	const successful = batch.results.filter(result => result.status === 'updated' || result.status === 'unchanged').length
	const reviewed = batch.results.filter(result => ['updated', 'unchanged', 'partial', 'review', 'failed'].includes(result.status)).length
	const retryable = batch.results.some(metadataAutofillRetryable)
	const saving = batch.busy && batch.phase === 'saving'
	const current = batch.targets.find(target => target.id === batch.currentId)
	return <CollectionSheet open title={t(batch.artworkField ? 'metadata.batch.artworkTitle' : 'metadata.batch.title')} bodyLabel={t('metadata.batch.resultsLabel')} subtitle={batch.artworkField ? t('metadata.batch.artworkMode', { field: t(`home.imageFields.${batch.artworkField}`) }) : t(batch.overwrite ? 'metadata.batch.replaceMode' : 'metadata.batch.emptyMode')} className='gdb-metadata-batch-sheet' onClose={onClose} closeDisabled={saving} footer={<>
		{batch.busy ? <button type='button' className='gdb-button' disabled={saving} onClick={onStop}>{t('metadata.batch.stop')}</button> : <><button type='button' className='gdb-button' onClick={onClose}>{t('metadata.batch.close')}</button>{retryable && <button type='button' className='gdb-button gdb-button--primary' onClick={() => { onRetry() }}><CollectionIcon name='refresh' />{t('metadata.batch.retry')}</button>}</>}
	</>}>
		<p className='gdb-hint'>{t(batch.artworkField ? 'metadata.batch.artworkScope' : 'metadata.batch.scope', { count: batch.targets.length })}</p>
		<div className='gdb-metadata-batch-progress' role='status' aria-live='polite'><strong>{t('metadata.batch.progress', { done: reviewed, total: batch.targets.length })}</strong><progress value={reviewed} max={batch.targets.length} aria-label={t('metadata.batch.progress', { done: reviewed, total: batch.targets.length })} />{batch.busy && batch.phase && <p>{t(`metadata.batch.${batch.phase}`)}{current ? ` · ${current.name}` : ''}</p>}{!batch.busy && <p>{t(successful === batch.targets.length ? 'metadata.batch.complete' : 'metadata.batch.partial', { count: successful, done: successful, total: batch.targets.length })}</p>}</div>
		<ul className='gdb-metadata-batch-results'>{batch.results.slice(0, limit).map(result => <li key={result.id} data-status={result.status}><div><strong>{result.name}</strong><span>{t(`metadata.batch.${result.status === 'partial' ? 'partialResult' : result.status}`, { defaultValue: t('metadata.batch.pending') })}</span>{result.notices.length > 0 && <p>{t(`metadata.${result.notices[0]}`, { defaultValue: t('metadata.noChanges') })}</p>}</div>{!batch.busy && ['review', 'failed', 'partial'].includes(result.status) && <button type='button' className='gdb-text-button' aria-label={t('metadata.batch.reviewGameNamed', { name: result.name })} onClick={() => onReview(result.id)}>{t('metadata.batch.reviewGame')}<CollectionIcon name='arrow' /></button>}</li>)}</ul>
		{batch.results.length > limit && <button type='button' className='gdb-text-button' onClick={() => setLimit(value => value + 30)}>{t('metadata.batch.more')}</button>}
		{!batch.busy && retryable && <p className='gdb-hint'>{t('metadata.batch.retryHelp')}</p>}
	</CollectionSheet>
}
