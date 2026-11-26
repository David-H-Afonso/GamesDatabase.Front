import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import type { Game } from '@/models/api/Game'
import type { RootState } from '@/store'
import i18n from '@/i18n'

vi.mock('../../OptimizedImage/OptimizedImage', () => ({
	default: ({ alt }: any) => <img alt={alt} />,
}))

vi.mock('./CoverView.scss', () => ({}))

const game: Game = {
	id: 1,
	name: 'Warhammer 40,000: Space Marine II Anniversary Edition',
	statusId: 1,
	statusName: 'Playing',
	platformName: 'Steam',
	playWithIds: [1],
	playWithNames: ['Friends', 'Family', 'Solo'],
	cover: 'https://example.com/cover.jpg',
} as any

const preloadedState: Partial<RootState> = {
	gameStatus: {
		activeStatuses: [
			{ id: 1, name: 'Playing', color: '#61afef' },
			{ id: 2, name: 'Done', color: '#98c379' },
		],
	} as any,
	gamePlayWith: {
		playWithOptions: [
			{ id: 1, name: 'Friends', color: '#ab32ec' },
			{ id: 2, name: 'Family', color: '#099012' },
		],
	} as any,
}

describe('CoverView', () => {
	it('shows the full-completion badge for manually completed games', async () => {
		const { default: CoverView } = await import('./CoverView')
		renderWithProviders(<CoverView game={{ ...game, isManuallyCompleted: true }} openDetails={vi.fn()} />, { preloadedState })

		expect(screen.getByText('100%')).toBeInTheDocument()
	})

	it('shows completed sets without claiming that every achievement is unlocked', async () => {
		const { default: CoverView } = await import('./CoverView')
		renderWithProviders(<CoverView game={{ ...game, steamAppId: 1794680, steamAchievementsUnlocked: 197, steamAchievementsTotal: 243, steamSetsCompleted: 4, isCompleted: true, isFullyCompleted: false }} openDetails={vi.fn()} />, { preloadedState })
		expect(screen.getByText('Completado')).toBeInTheDocument()
		expect(screen.queryByText('100%')).not.toBeInTheDocument()
	})

	it('does not turn a 100-hour duration into a completion badge', async () => {
		const { default: CoverView } = await import('./CoverView')
		renderWithProviders(<CoverView game={{ ...game, completion: 100 }} openDetails={vi.fn()} />, { preloadedState })
		expect(screen.queryByText('100%')).not.toBeInTheDocument()
		expect(screen.queryByText('Completado')).not.toBeInTheDocument()
	})

	it('keeps the complete accessible title without a duplicate native tooltip', async () => {
		const { default: CoverView } = await import('./CoverView')
		renderWithProviders(<CoverView game={game} openDetails={vi.fn()} />, { preloadedState })

		expect(screen.getByRole('button', { name: game.name })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: game.name })).not.toHaveAttribute('title')
	})

	it('opens status editing only after an explicit click', async () => {
		const onFieldUpdate = vi.fn().mockResolvedValue(undefined)
		const user = userEvent.setup()
		const { default: CoverView } = await import('./CoverView')
		renderWithProviders(<CoverView game={game} openDetails={vi.fn()} onFieldUpdate={onFieldUpdate} />, { preloadedState })

		expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument()
		await user.click(screen.getByRole('button', { name: 'Playing' }))
		const doneButton = screen.getByRole('button', { name: 'Done' })
		await user.click(doneButton)

		expect(onFieldUpdate).toHaveBeenCalledTimes(1)
		expect(onFieldUpdate).toHaveBeenCalledWith(game.id, 'statusId', 2)
	})

	it('updates play-with values from the explicit options panel', async () => {
		const onFieldUpdate = vi.fn().mockResolvedValue(undefined)
		const { default: CoverView } = await import('./CoverView')
		renderWithProviders(<CoverView game={game} openDetails={vi.fn()} onFieldUpdate={onFieldUpdate} />, { preloadedState })

		fireEvent.click(screen.getByRole('button', { name: i18n.t('gallery.detail.gameOptions') }))
		fireEvent.click(screen.getByRole('button', { name: new RegExp(i18n.t('game.details.fieldPlayWith')) }))
		await userEvent.click(screen.getByRole('checkbox', { name: /Family/ }))

		expect(onFieldUpdate).toHaveBeenCalledWith(game.id, 'playWithIds', [1, 2])
	})
})
