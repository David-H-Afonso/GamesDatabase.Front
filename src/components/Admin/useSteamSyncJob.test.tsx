import { act, fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { steamService, type SteamSyncJob } from '@/services/SteamService/SteamService'
import { useSteamSyncJob } from './useSteamSyncJob'
import { SteamSyncPanel } from './SteamSyncPanel'

const running: SteamSyncJob = {
	id: '00000000-0000-4000-8000-000000000001', state: 'running', createdAt: '2026-11-12T12:00:00Z',
	totalGames: 1109, processedGames: 412, gamesUpdated: 400, achievementsUpdated: 15000, failedGames: 0, warningCount: 0,
	currentGameName: 'Vampire Survivors',
}
const done: SteamSyncJob = { ...running, state: 'completed', processedGames: 1109, currentGameName: undefined }
const Harness = ({ userId = 1, linked = true }: { userId?: number; linked?: boolean }) => {
	const flow = useSteamSyncJob(userId, linked)
	return <SteamSyncPanel job={flow.job} checking={flow.checking} starting={flow.starting} errorKey={flow.errorKey} onStart={flow.start} onRefresh={flow.refresh} />
}
const flush = async () => { await act(async () => { await Promise.resolve() }) }
const advance = async (ms: number) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms) }) }

beforeEach(() => {
	vi.useFakeTimers()
	vi.spyOn(steamService, 'getCurrentSyncJob').mockResolvedValue(null)
	vi.spyOn(steamService, 'startSyncJob').mockResolvedValue(running)
	vi.spyOn(steamService, 'getSyncJob').mockResolvedValue(running)
})
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

describe('on-demand Steam sync observer', () => {
	it('reads status once when idle, never starts or polls an unsolicited sync', async () => {
		renderWithProviders(<Harness />)
		await flush()
		expect(steamService.getCurrentSyncJob).toHaveBeenCalledTimes(1)
		await advance(60000)
		expect(steamService.startSyncJob).not.toHaveBeenCalled()
		expect(steamService.getSyncJob).not.toHaveBeenCalled()
		expect(steamService.getCurrentSyncJob).toHaveBeenCalledTimes(1)
	})
	it('starts once, displays progress and stops polling after completion', async () => {
		vi.mocked(steamService.getSyncJob).mockResolvedValue(done)
		const { store } = renderWithProviders(<Harness />)
		await flush()
		fireEvent.click(screen.getByRole('button', { name: 'Sincronizar todo' }))
		fireEvent.click(screen.getByRole('button', { name: 'Iniciando…' }))
		await flush()
		expect(steamService.startSyncJob).toHaveBeenCalledTimes(1)
		expect(screen.getByRole('progressbar')).toHaveAttribute('value', '412')
		expect(screen.getByRole('button', { name: 'Sincronización en curso' })).toBeDisabled()
		expect(store.getState().games.needsRefresh).toBe(true)
		await advance(1000)
		expect(screen.getByText('Sincronización completada')).toBeInTheDocument()
		const reads = vi.mocked(steamService.getSyncJob).mock.calls.length
		await advance(60000)
		expect(steamService.getSyncJob).toHaveBeenCalledTimes(reads)
	})
	it('recovers the current job on return without sending another POST', async () => {
		vi.mocked(steamService.getCurrentSyncJob).mockResolvedValue(running)
		renderWithProviders(<Harness />)
		await flush()
		expect(screen.getByText('Revisando: Vampire Survivors')).toBeInTheDocument()
		expect(steamService.startSyncJob).not.toHaveBeenCalled()
		await advance(2000)
		expect(steamService.getSyncJob).toHaveBeenCalledTimes(1)
	})
	it('reconciles an ambiguous POST 504 with GET instead of submitting another job', async () => {
		vi.mocked(steamService.startSyncJob).mockRejectedValue(new Error('HTTP 504: <html>openresty PRIVATE_DETAIL</html>'))
		vi.mocked(steamService.getCurrentSyncJob).mockResolvedValueOnce(null).mockResolvedValue(running)
		renderWithProviders(<Harness />)
		await flush()
		fireEvent.click(screen.getByRole('button', { name: 'Sincronizar todo' }))
		await flush()
		expect(screen.getByRole('progressbar')).toHaveAttribute('value', '412')
		expect(steamService.startSyncJob).toHaveBeenCalledTimes(1)
		expect(steamService.getCurrentSyncJob).toHaveBeenCalledTimes(2)
		expect(screen.queryByText(/openresty|PRIVATE_DETAIL|<html>/)).not.toBeInTheDocument()
	})
	it('retains the last counters on polling errors, bounds retries and allows read-only recovery', async () => {
		vi.mocked(steamService.getCurrentSyncJob).mockResolvedValue(running)
		vi.mocked(steamService.getSyncJob).mockRejectedValue(new Error('HTTP 504: <html>openresty</html>'))
		renderWithProviders(<Harness />)
		await flush()
		await advance(2000 + 4000 + 8000)
		expect(steamService.getSyncJob).toHaveBeenCalledTimes(3)
		expect(screen.getByRole('progressbar')).toHaveAttribute('value', '412')
		expect(screen.getByRole('alert')).toHaveTextContent('El proxy agotó el tiempo de espera')
		expect(screen.getByRole('alert')).not.toHaveTextContent('<html>')
		await advance(60000)
		expect(steamService.getSyncJob).toHaveBeenCalledTimes(3)
		vi.mocked(steamService.getCurrentSyncJob).mockResolvedValue(done)
		fireEvent.click(screen.getByRole('button', { name: 'Recuperar estado' }))
		await flush()
		expect(screen.getByText('Sincronización completada')).toBeInTheDocument()
		expect(steamService.startSyncJob).not.toHaveBeenCalled()
	})
	it('handles a lost job after server restart without claiming saved data was deleted', async () => {
		vi.mocked(steamService.getCurrentSyncJob).mockResolvedValue(running)
		vi.mocked(steamService.getSyncJob).mockRejectedValue(new Error('HTTP 404'))
		renderWithProviders(<Harness />)
		await flush()
		await advance(2000)
		expect(screen.getByText('Sincronización interrumpida')).toBeInTheDocument()
		expect(screen.getByText(/Los juegos ya guardados se conservan/)).toBeInTheDocument()
		await advance(60000)
		expect(steamService.getSyncJob).toHaveBeenCalledTimes(1)
		expect(steamService.startSyncJob).not.toHaveBeenCalled()
	})
	it('cancels observation on unmount and ignores another account’s late response', async () => {
		let finish: (value: SteamSyncJob | null) => void = () => undefined
		const pending = new Promise<SteamSyncJob | null>(resolve => { finish = resolve })
		vi.mocked(steamService.getCurrentSyncJob).mockReturnValueOnce(pending).mockResolvedValue(null)
		const { rerender, unmount } = renderWithProviders(<Harness userId={1} />)
		const signal = vi.mocked(steamService.getCurrentSyncJob).mock.calls[0][0]!
		rerender(<Harness userId={2} />)
		await flush()
		await act(async () => { finish(running); await pending })
		expect(signal.aborted).toBe(true)
		expect(screen.queryByText(/Vampire Survivors/)).not.toBeInTheDocument()
		unmount()
		await advance(60000)
		expect(steamService.getSyncJob).not.toHaveBeenCalled()
	})

	it('does not mistake an older completed job for a successful new start', async () => {
		vi.mocked(steamService.getCurrentSyncJob).mockResolvedValue(done)
		vi.mocked(steamService.startSyncJob).mockRejectedValue(new Error('HTTP 429: queueFull'))
		renderWithProviders(<Harness />)
		await flush()
		fireEvent.click(screen.getByRole('button', { name: 'Sincronizar todo' }))
		await flush()
		expect(screen.getByRole('alert')).toHaveTextContent('La cola de sincronización está ocupada')
		expect(steamService.startSyncJob).toHaveBeenCalledTimes(1)
	})
})
