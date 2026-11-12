import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import type { SteamAchievementProgress } from '@/services'
import { SteamAchievements } from './SteamAchievements'

const progress: SteamAchievementProgress = {
	gameId: 1, source: 'sets', isCompleted: true, isFullyCompleted: false, completionPreserved: true,
	totalAchievements: 4, unlockedAchievements: 1, eligibleAchievementsTotal: 2, eligibleAchievementsUnlocked: 1,
	sets: [
		{ groupId: 0, displayName: 'Base campaign', archived: false, isAchievable: true, isCompleted: true, totalAchievements: 2, unlockedAchievements: 1 },
		{ groupId: 1, displayName: 'Expansion', dlcAppId: 2000, archived: false, isAchievable: false, isCompleted: false, totalAchievements: 2, unlockedAchievements: 0 },
	],
	achievements: [
		{ apiName: 'ONE', displayName: 'First steps', description: 'Finish the tutorial', achieved: true, hidden: false, groupId: 0, globalPercent: 7.5 },
		{ apiName: 'SECRET', displayName: 'Secret boss', description: 'A secret ending', achieved: false, hidden: true, groupId: 0, iconUrl: 'https://images.test/secret.jpg' },
		{ apiName: 'HOARDER', displayName: 'Hoarder', achieved: false, hidden: false, groupId: 1, progressCurrent: 7, progressMin: 0, progressMax: 10 },
		{ apiName: 'LAST', displayName: 'Last challenge', achieved: false, hidden: false, groupId: 1 },
		{ apiName: 'ARCHIVE', displayName: 'Retired event', achieved: true, hidden: false, groupId: 0, archived: true },
	],
}

describe('Steam achievement sets', () => {
	it('distinguishes preserved set completion from 100% total and inaccessible DLC', () => {
		renderWithProviders(<SteamAchievements progress={progress} />)
		expect(screen.getByText('Conjuntos completados: 1')).toBeInTheDocument()
		expect(screen.queryByText(/^100% total ·/)).not.toBeInTheDocument()
		expect(screen.getByText('Sin acceso a este contenido')).toBeInTheDocument()
		expect(screen.getByText('Para el contenido al que tienes acceso: 1 / 2')).toBeInTheDocument()
		expect(screen.getByRole('progressbar', { name: 'Progreso de todos los logros del juego y DLC' })).toHaveAttribute('max', '4')
	})
	it('keeps spoiler text and icons out of the DOM until explicit reveal', async () => {
		const user = userEvent.setup()
		renderWithProviders(<SteamAchievements progress={progress} />)
		expect(screen.queryByText('Secret boss')).not.toBeInTheDocument()
		expect(screen.queryByText('A secret ending')).not.toBeInTheDocument()
		expect(document.querySelector('img[src*="secret"]')).not.toBeInTheDocument()
		await user.click(screen.getByRole('button', { name: 'Revelar spoiler' }))
		expect(screen.getByText('Secret boss')).toBeInTheDocument()
		expect(screen.getByText('A secret ending')).toBeInTheDocument()
	})
	it('does not leak spoiler names through search results', async () => {
		const user = userEvent.setup()
		renderWithProviders(<SteamAchievements progress={progress} />)
		await user.type(screen.getByRole('searchbox', { name: 'Buscar logros' }), 'Secret boss')
		expect(screen.getByText('No hay logros que coincidan con estos filtros.')).toBeInTheDocument()
	})
	it('filters by set and unlock state, excluding unobtainable archived items from locked', async () => {
		const user = userEvent.setup()
		renderWithProviders(<SteamAchievements progress={progress} />)
		await user.selectOptions(screen.getByRole('combobox', { name: 'Conjunto' }), '1')
		expect(screen.queryByText('First steps')).not.toBeInTheDocument()
		expect(screen.getByText('Hoarder')).toBeInTheDocument()
		await user.selectOptions(screen.getByRole('combobox', { name: 'Conjunto' }), 'all')
		await user.click(screen.getByRole('button', { name: /^Bloqueados/ }))
		expect(screen.queryByText('Retired event')).not.toBeInTheDocument()
		expect(screen.queryByText('First steps')).not.toBeInTheDocument()
		await user.click(screen.getByRole('button', { name: /^Archivados/ }))
		expect(screen.getByText('Retired event')).toBeInTheDocument()
		expect(screen.queryByText('Hoarder')).not.toBeInTheDocument()
	})
	it('supports keyboard activation of a completed set', async () => {
		const user = userEvent.setup()
		renderWithProviders(<SteamAchievements progress={progress} />)
		const firstSet = screen.getByRole('button', { name: /Base campaign/ })
		await user.tab()
		expect(firstSet).toHaveFocus()
		await user.keyboard(' ')
		expect(firstSet).toHaveAttribute('aria-pressed', 'true')
		expect(screen.getByRole('combobox', { name: 'Conjunto' })).toHaveValue('0')
	})
	it('renders partial progress and opt-in global rarity', async () => {
		const user = userEvent.setup()
		renderWithProviders(<SteamAchievements progress={progress} />)
		expect(screen.getByRole('progressbar', { name: 'Progreso de Hoarder' })).toHaveAttribute('value', '7')
		expect(screen.getByRole('progressbar', { name: 'Progreso de Hoarder' })).toHaveAttribute('max', '10')
		expect(screen.queryByText('7,5% de los jugadores')).not.toBeInTheDocument()
		await user.click(screen.getByRole('checkbox', { name: 'Mostrar rareza global' }))
		expect(screen.getByText('7,5% de los jugadores')).toBeInTheDocument()
	})
	it('shows an upstream error without discarding the cached list', () => {
		renderWithProviders(<SteamAchievements progress={{ ...progress, lastError: 'profilePrivate' }} />)
		expect(within(screen.getByRole('alert')).getByText(/privacidad del perfil/)).toBeInTheDocument()
		expect(screen.getByText('First steps')).toBeInTheDocument()
	})
	it('supports classic flat data and genuinely empty games', () => {
		const { rerender } = renderWithProviders(<SteamAchievements progress={{ ...progress, source: 'legacy', sets: [], achievements: [progress.achievements[0]] }} />)
		expect(screen.getByText('First steps')).toBeInTheDocument()
		expect(screen.queryByRole('combobox', { name: 'Conjunto' })).not.toBeInTheDocument()
		rerender(<SteamAchievements progress={{ ...progress, isCompleted: false, isFullyCompleted: false, sets: [], achievements: [], totalAchievements: 0, unlockedAchievements: 0 }} />)
		expect(screen.getByText('Este juego no tiene logros disponibles.')).toBeInTheDocument()
		expect(screen.queryByText(/^100% total ·/)).not.toBeInTheDocument()
	})
})
