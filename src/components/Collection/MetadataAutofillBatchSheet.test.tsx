import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import type { MetadataAutofillBatch } from '@/hooks/useMetadataAutofillBatch'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { MetadataAutofillBatchSheet } from './MetadataAutofillBatchSheet'

const makeBatch = (overrides: Partial<MetadataAutofillBatch> = {}): MetadataAutofillBatch => ({ ownerId: 1, targets: [{ id: 51, name: 'Public fixture' }], results: [{ id: 51, name: 'Public fixture', status: 'looking', appliedFields: [], notices: [] }], busy: true, currentId: 51, phase: 'looking', overwrite: false, ...overrides })
const callbacks = () => ({ onClose: vi.fn(), onStop: vi.fn(), onRetry: vi.fn().mockReturnValue(true), onReview: vi.fn() })

describe('visible metadata batch progress and recovery', () => {
	beforeEach(async () => { await i18n.changeLanguage('en') })
	it('explains empty-only scope and shows cancellable progress without any creation/import action', async () => {
		const props = callbacks(); renderWithProviders(<MetadataAutofillBatchSheet batch={makeBatch()} {...props} />)
		expect(screen.getByRole('dialog')).toHaveAccessibleName('Autofill information'); expect(screen.getByText('Fill empty fields')).toBeInTheDocument(); expect(screen.getByText(/Steam links are never changed/)).toBeInTheDocument()
		expect(screen.getByRole('region', { name: 'Progress and results' })).toHaveAttribute('tabindex', '0')
		expect(screen.getByRole('progressbar')).toHaveAttribute('value', '0'); expect(screen.getByRole('progressbar')).toHaveAttribute('max', '1')
		await userEvent.click(screen.getByRole('button', { name: 'Stop autofill' })); expect(props.onStop).toHaveBeenCalledOnce(); expect(props.onRetry).not.toHaveBeenCalled(); expect(screen.queryByRole('button', { name: 'Retry unfinished information' })).not.toBeInTheDocument()
	})
	it('protects an in-flight save from header, Escape, backdrop and Stop dismissal', async () => {
		const props = callbacks(); renderWithProviders(<MetadataAutofillBatchSheet batch={makeBatch({ phase: 'saving', results: [{ id: 51, name: 'Public fixture', status: 'saving', appliedFields: [], notices: [] }] })} {...props} />)
		expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled(); expect(screen.getByRole('button', { name: 'Stop autofill' })).toBeDisabled()
		fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true })); fireEvent.click(screen.getByRole('dialog'), { clientX: -20, clientY: -20 }); expect(props.onClose).not.toHaveBeenCalled(); expect(props.onStop).not.toHaveBeenCalled()
	})
	it('keeps partial and manual-review outcomes visible with metadata-only retry and named review actions', async () => {
		const results: MetadataAutofillBatch['results'] = [
			{ id: 51, name: 'Public fixture', status: 'partial', appliedFields: ['developer'], notices: ['durationSourceUnavailable'] },
			{ id: 52, name: 'Edition fixture', status: 'review', appliedFields: [], notices: ['criticPlatformScope'] },
		]
		const props = callbacks(); renderWithProviders(<MetadataAutofillBatchSheet batch={makeBatch({ busy: false, phase: null, currentId: null, results, targets: results.map(({ id, name }) => ({ id, name })) })} {...props} />)
		expect(screen.getByRole('progressbar')).toHaveAttribute('value', '2'); expect(screen.getByText('Some information saved; a source could not be checked')).toBeInTheDocument(); expect(screen.getByText(/never game creation or Steam import/)).toBeInTheDocument()
		await userEvent.click(screen.getByRole('button', { name: 'Retry unfinished information' })); expect(props.onRetry).toHaveBeenCalledOnce()
		await userEvent.click(screen.getByRole('button', { name: 'Review Edition fixture' })); expect(props.onReview).toHaveBeenCalledExactlyOnceWith(52)
	})
	it('offers no retry when every result is a confirmed no-op or update', () => {
		renderWithProviders(<MetadataAutofillBatchSheet batch={makeBatch({ busy: false, phase: null, currentId: null, results: [{ id: 51, name: 'Public fixture', status: 'unchanged', appliedFields: ['developer'], notices: [] }] })} {...callbacks()} />)
		expect(screen.getByText('Finished reviewing 1 game.')).toBeInTheDocument(); expect(screen.queryByRole('button', { name: 'Retry unfinished information' })).not.toBeInTheDocument()
	})
	it('keeps a large exact result list bounded and expands it only on request', async () => {
		const results: MetadataAutofillBatch['results'] = Array.from({ length: 65 }, (_, index) => ({ id: index + 1, name: `Public fixture ${index + 1}`, status: 'cancelled', appliedFields: [], notices: [] }))
		renderWithProviders(<MetadataAutofillBatchSheet batch={makeBatch({ busy: false, phase: null, currentId: null, results, targets: results.map(({ id, name }) => ({ id, name })) })} {...callbacks()} />)
		expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(30); await userEvent.click(screen.getByRole('button', { name: 'Show more results' })); expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(60); await userEvent.click(screen.getByRole('button', { name: 'Show more results' })); expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(65); expect(screen.queryByRole('button', { name: 'Show more results' })).not.toBeInTheDocument()
	})
	it('keeps artwork role refresh visibly separate from general autofill and player sync', () => {
		renderWithProviders(<MetadataAutofillBatchSheet batch={makeBatch({ artworkField: 'cover', overwrite: true })} {...callbacks()} />)
		expect(screen.getByRole('dialog')).toHaveAccessibleName('Refresh Steam artwork'); expect(screen.getByText('Cover art only')).toBeInTheDocument(); expect(screen.getByText(/No player sync/)).toBeInTheDocument(); expect(screen.queryByText('Replace existing metadata')).not.toBeInTheDocument()
	})
	it('localizes a Replace batch, failure and retry without leaking source response text', async () => {
		await i18n.changeLanguage('es'); renderWithProviders(<MetadataAutofillBatchSheet batch={makeBatch({ busy: false, overwrite: true, phase: null, currentId: null, results: [{ id: 51, name: 'Public fixture', status: 'failed', appliedFields: [], notices: ['untrustedInternalErrorMustNotLeak'] }] })} {...callbacks()} />)
		expect(screen.getByRole('dialog')).toHaveAccessibleName('Rellenar información automáticamente'); expect(screen.getByText('Reemplazar metadatos existentes')).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Reintentar información pendiente' })).toBeInTheDocument(); expect(screen.queryByText(/untrustedInternal/)).not.toBeInTheDocument()
	})
})
