import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import type { SteamSyncIssue } from '@/services'
import { SteamSyncIssues } from './SteamSyncIssues'
import { SteamSyncPanel } from './SteamSyncPanel'

const issues: SteamSyncIssue[] = [
	{ gameId: 1, steamAppId: 2668510, gameName: 'Red Dead Redemption', severity: 'info', code: 'noPlayerData' },
	{ gameId: 2, steamAppId: 388860, gameName: 'Judas', severity: 'info', code: 'unreleased' },
	{ gameId: 3, steamAppId: 391540, gameName: 'Undertale', severity: 'info', code: 'noAchievements' },
	{ gameId: 4, steamAppId: 620, gameName: 'Restricted game', severity: 'warning', code: 'profilePrivate' },
	{ gameId: 5, steamAppId: 1259420, gameName: 'Days Gone', severity: 'error', code: 'invalidResponse' },
]
const reasonCounts = Object.fromEntries(issues.map(issue => [issue.code, 1]))

describe('sync classifications and per-game explanations', () => {
	it('does not mark informational results as completed with warnings', () => {
		renderWithProviders(<SteamSyncPanel job={{ id: 'job', state: 'completed', createdAt: '2026-11-12T12:00:00Z', totalGames: 3, processedGames: 3, gamesUpdated: 0, achievementsUpdated: 0, failedGames: 0, warningCount: 0, infoCount: 3, reasonCounts, issues: issues.slice(0, 3) }} checking={false} starting={false} errorKey={null} onStart={vi.fn()} onRefresh={vi.fn()} />)
		expect(screen.getByText('Sincronización completada')).toBeInTheDocument()
		expect(screen.queryByText('Completada con avisos')).not.toBeInTheDocument()
		expect(screen.getByText('Casos informativos')).toBeInTheDocument()
	})
	it('shows game links, causes, and the difference between no data and zero achievements', async () => {
		const user = userEvent.setup()
		renderWithProviders(<SteamSyncIssues issues={issues} reasonCounts={reasonCounts} total={5} truncated={false} />)
		await user.click(screen.getByText('Ver motivos por juego'))
		expect(screen.getByRole('link', { name: 'Red Dead Redemption' })).toHaveAttribute('href', '/games/1')
		expect(screen.getByText(/No significa que nunca hayas jugado/)).toBeInTheDocument()
		expect(screen.getByText(/no hay logros publicados. No es un fallo/)).toBeInTheDocument()
		expect(screen.getByText(/todavía no se ha publicado/)).toBeInTheDocument()
	})
	it('filters independently by severity, reason and game name', async () => {
		const user = userEvent.setup()
		renderWithProviders(<SteamSyncIssues issues={issues} reasonCounts={reasonCounts} total={5} truncated={false} />)
		await user.click(screen.getByText('Ver motivos por juego'))
		await user.selectOptions(screen.getByRole('combobox', { name: 'Tipo de resultado' }), 'error')
		expect(screen.getByRole('link', { name: 'Days Gone' })).toBeInTheDocument()
		expect(screen.queryByRole('link', { name: 'Judas' })).not.toBeInTheDocument()
		await user.selectOptions(screen.getByRole('combobox', { name: 'Tipo de resultado' }), 'all')
		await user.selectOptions(screen.getByRole('combobox', { name: 'Motivo' }), 'noAchievements')
		expect(screen.getByRole('link', { name: 'Undertale' })).toBeInTheDocument()
		await user.type(screen.getByRole('searchbox', { name: 'Buscar juego' }), 'missing')
		expect(screen.getByText('No hay resultados que coincidan con estos filtros.')).toBeInTheDocument()
	})
	it.each(['severity', 'reason', 'name'] as const)('returns to the first result when the %s filter changes', async filter => {
		const user = userEvent.setup()
		renderWithProviders(<SteamSyncIssues issues={issues} reasonCounts={reasonCounts} total={5} truncated={false} />)
		await user.click(screen.getByText('Ver motivos por juego'))
		const list = screen.getByRole('list', { name: 'Resultados por juego' })
		list.scrollTop = 300
		if (filter === 'severity') await user.selectOptions(screen.getByRole('combobox', { name: 'Tipo de resultado' }), 'info')
		else if (filter === 'reason') await user.selectOptions(screen.getByRole('combobox', { name: 'Motivo' }), 'noAchievements')
		else await user.type(screen.getByRole('searchbox', { name: 'Buscar juego' }), 'Red')
		expect(screen.getByRole('list', { name: 'Resultados por juego' }).scrollTop).toBe(0)
	})
	it('makes the scrollable result list reachable by keyboard after the filters', async () => {
		const user = userEvent.setup()
		renderWithProviders(<SteamSyncIssues issues={issues} reasonCounts={reasonCounts} total={5} truncated={false} />)
		await user.click(screen.getByText('Ver motivos por juego'))
		await user.click(screen.getByRole('searchbox', { name: 'Buscar juego' }))
		await user.tab()
		expect(screen.getByRole('list', { name: 'Resultados por juego' })).toHaveFocus()
	})
	it('bounds initial rendering and makes additional details explicitly available', async () => {
		const user = userEvent.setup()
		const many = Array.from({ length: 120 }, (_, index) => ({ ...issues[0], gameId: index + 1, gameName: `Game ${index}` }))
		renderWithProviders(<SteamSyncIssues issues={many} reasonCounts={{ noPlayerData: 2000 }} total={2000} truncated />)
		await user.click(screen.getByText('Ver motivos por juego'))
		expect(screen.getAllByRole('link')).toHaveLength(50)
		expect(screen.getByText(/Se muestran 120 de 2000 casos/)).toBeInTheDocument()
		const list = screen.getByRole('list', { name: 'Resultados por juego' })
		list.scrollTop = 300
		await user.click(screen.getByRole('button', { name: 'Mostrar más resultados' }))
		expect(screen.getAllByRole('link')).toHaveLength(100)
		expect(list.scrollTop).toBe(300)
	})
	it('uses safe fallback descriptions for unknown codes rather than rendering raw responses', async () => {
		const user = userEvent.setup()
		renderWithProviders(<SteamSyncIssues issues={[{ ...issues[4], code: 'PRIVATE_DETAIL_<html>' }]} reasonCounts={{}} total={1} truncated={false} />)
		await user.click(screen.getByText('Ver motivos por juego'))
		expect(within(screen.getByRole('list')).getByText('Resultado no disponible')).toBeInTheDocument()
		expect(screen.queryByText(/PRIVATE_DETAIL/)).not.toBeInTheDocument()
	})
})
