import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { metadataJob, metadataJobItem } from '@/test/factories/metadataJob'
import { MetadataAutofillJobBanner, MetadataAutofillJobPanel, type MetadataJobObserver } from './MetadataAutofillJobPanel'

const observer = (overrides: Partial<MetadataJobObserver> = {}): MetadataJobObserver => ({ job: metadataJob(), detail: metadataJob(), open: true, busy: false, starting: false, error: null, history: [], hasMoreHistory: false, noticeHidden: false, start: vi.fn(() => true), show: vi.fn(), hide: vi.fn(), change: vi.fn(async () => true), refresh: vi.fn(), retryStart: vi.fn(), moreHistory: vi.fn(async () => undefined), ...overrides })

describe('nonblocking persistent metadata activity', () => {
	it('lets users hide a notice with pending reviews without cancelling or losing the results', async () => {
		const job = metadataJob({ state: 'completed', active: false, items: [metadataJobItem({ status: 'review' })] }), current = observer({ job, detail: job })
		const { rerender } = render(<MetadataAutofillJobBanner observer={current} />)
		await userEvent.click(screen.getByRole('button', { name: /Ocultar el aviso/ })); expect(current.change).toHaveBeenCalledExactlyOnceWith('dismiss', job.id)
		rerender(<MetadataAutofillJobPanel observer={current} onReview={vi.fn()} />); await userEvent.click(screen.getByRole('button', { name: 'Ocultar aviso' })); expect(current.hide).toHaveBeenCalledOnce(); expect(current.change).not.toHaveBeenCalledWith('cancel', job.id)
	})
	it('keeps global progress and explicit cancel outside a modal', async () => {
		const job = metadataJob({ totalGames: 145, items: [], processedGames: 42, updatedGames: 40, unchangedGames: 2 })
		const current = observer({ job }); render(<MetadataAutofillJobBanner observer={current} />)
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(screen.getByRole('status')).toHaveTextContent('42 de 145 procesados')
		expect(screen.getByText(/aunque cierres esta página/)).toBeInTheDocument()
		await userEvent.click(screen.getByRole('button', { name: /Ver detalles/ })); expect(current.show).toHaveBeenCalledOnce()
		await userEvent.click(screen.getByRole('button', { name: 'Cancelar autorrellenado' })); expect(current.change).toHaveBeenCalledWith('cancel', job.id)
	})
	it('allows background continuation even while the server is saving; hide never cancels', async () => {
		const job = metadataJob({ state: 'running', phase: 'saving' }); const current = observer({ job, detail: job })
		render(<MetadataAutofillJobPanel observer={current} onReview={vi.fn()} />)
		await userEvent.click(screen.getByRole('button', { name: 'Continuar en segundo plano' })); expect(current.hide).toHaveBeenCalledOnce(); expect(current.change).not.toHaveBeenCalled()
		fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true })); expect(current.hide).toHaveBeenCalledTimes(2); expect(current.change).not.toHaveBeenCalled()
	})
	it('separates saved fields and pending choices and keeps every sibling actionable', async () => {
		const job = metadataJob({ state: 'completed', active: false, items: [metadataJobItem({ name: 'First fixture', status: 'review', appliedFields: ['story'], notices: ['chooseDurationIdentity'] }), metadataJobItem({ gameId: 12, name: 'Second fixture', status: 'review', notices: ['chooseIdentity'] })] })
		const review = vi.fn(); render(<MetadataAutofillJobPanel observer={observer({ job, detail: job })} onReview={review} />)
		expect(screen.getByText('Guardado: Historia principal')).toBeInTheDocument()
		await userEvent.click(screen.getByRole('button', { name: 'Revisar First fixture' })); await userEvent.click(screen.getByRole('button', { name: 'Revisar Second fixture' }))
		expect(review.mock.calls).toEqual([[11], [12]])
	})
	it('accepts platform-only ratings with one explicit batch confirmation, not one dialog per game', async () => {
		const job = metadataJob({ state: 'completed', active: false, items: [metadataJobItem({ status: 'review', notices: ['criticPlatformScope'] })] })
		const current = observer({ job, detail: job }); render(<MetadataAutofillJobPanel observer={current} onReview={vi.fn()} />)
		await userEvent.click(screen.getByRole('button', { name: 'Aceptar las notas pendientes de Deku' }))
		const confirmation = screen.getByRole('alertdialog'); expect(confirmation).toHaveTextContent('otra plataforma'); expect(current.change).not.toHaveBeenCalled()
		await userEvent.click(within(confirmation).getByRole('button', { name: 'Aceptar las notas pendientes de Deku' }))
		expect(current.change).toHaveBeenCalledExactlyOnceWith('accept-listed-critics', job.id)
	})
	it('filters and bounds long result lists while preserving their totals', async () => {
		const items = Array.from({ length: 145 }, (_, index) => metadataJobItem({ gameId: index + 1, name: `Fixture ${index + 1}`, status: index === 144 ? 'review' : 'unchanged' }))
		const job = metadataJob({ state: 'completed', active: false, items }); render(<MetadataAutofillJobPanel observer={observer({ job, detail: job })} onReview={vi.fn()} />)
		expect(screen.queryByText('Fixture 31')).not.toBeInTheDocument(); expect(screen.getByText('145 de 145 procesados')).toBeInTheDocument()
		await userEvent.click(screen.getByRole('button', { name: 'Mostrar más resultados' })); expect(screen.getByText('Fixture 31')).toBeInTheDocument()
		await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Mostrar resultados' }), 'review')
		expect(screen.getByText('Fixture 145')).toBeInTheDocument(); expect(screen.queryByText('Fixture 1')).not.toBeInTheDocument()
	})
	it('shows source warnings as information without an invented identity-review button', () => {
		const job = metadataJob({ state: 'completed', active: false, items: [metadataJobItem({ status: 'unchanged', notices: ['durationUnavailable'] })] })
		render(<MetadataAutofillJobPanel observer={observer({ job, detail: job })} onReview={vi.fn()} />)
		expect(screen.getByText(/No se ha encontrado una estimación verificada/)).toBeInTheDocument(); expect(screen.queryByRole('button', { name: /Revisar Public fixture/ })).not.toBeInTheDocument()
	})
	it('retains the component state while hidden for individual review', async () => {
		const job = metadataJob({ state: 'completed', active: false, items: [metadataJobItem({ status: 'review' })] }); const current = observer({ job, detail: job })
		const { rerender } = render(<MetadataAutofillJobPanel observer={current} onReview={vi.fn()} />)
		await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Mostrar resultados' }), 'review')
		rerender(<MetadataAutofillJobPanel observer={{ ...current, open: false }} onReview={vi.fn()} />); expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
		rerender(<MetadataAutofillJobPanel observer={current} onReview={vi.fn()} />); expect(screen.getByRole('combobox', { name: 'Mostrar resultados' })).toHaveValue('review')
	})
})
