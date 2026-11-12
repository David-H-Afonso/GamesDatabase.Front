import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import type { SteamSyncJob } from '@/services'
import { SteamSyncPanel } from './SteamSyncPanel'

const job: SteamSyncJob = { id: 'test-job', state: 'running', createdAt: '2026-11-12T12:00:00Z', totalGames: 1109, processedGames: 412, gamesUpdated: 400, achievementsUpdated: 12345, failedGames: 2, warningCount: 2, currentGameName: 'Vampire Survivors' }
const props = { job, checking: false, starting: false, errorKey: null, onStart: vi.fn(), onRefresh: vi.fn() }

describe('Steam sync progress panel', () => {
	it('shows the operation and committed counters without offering a duplicate start', () => {
		renderWithProviders(<SteamSyncPanel {...props} />)
		expect(screen.getByRole('button', { name: 'Sincronización en curso' })).toBeDisabled()
		expect(screen.getByRole('progressbar', { name: 'Progreso de sincronización de Steam' })).toHaveAttribute('max', '1109')
		expect(screen.getByText('Revisando: Vampire Survivors')).toBeInTheDocument()
		expect(screen.getByText('12.345')).toBeInTheDocument()
	})
	it('uses an indeterminate bar while queued without inventing a percentage', () => {
		renderWithProviders(<SteamSyncPanel {...props} job={{ ...job, state: 'queued', totalGames: 0, processedGames: 0, currentGameName: undefined }} />)
		expect(screen.getByText('En cola')).toBeInTheDocument()
		expect(screen.getByRole('progressbar')).not.toHaveAttribute('value')
	})
	it('marks partial completion honestly and permits a new explicit attempt', () => {
		renderWithProviders(<SteamSyncPanel {...props} job={{ ...job, state: 'completed', processedGames: 1109 }} />)
		expect(screen.getByText('Completada con avisos')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Sincronizar todo' })).toBeEnabled()
	})
	it('provides keyboard-accessible recovery and safe fallback error text', async () => {
		const user = userEvent.setup()
		const onRefresh = vi.fn()
		renderWithProviders(<SteamSyncPanel {...props} errorKey='steamSync.errors.gateway' onRefresh={onRefresh} />)
		await user.tab()
		expect(screen.getByRole('button', { name: 'Recuperar estado' })).toHaveFocus()
		await user.keyboard('{Enter}')
		expect(onRefresh).toHaveBeenCalledOnce()
		expect(screen.getByRole('progressbar')).toHaveAttribute('value', '412')
	})
})
