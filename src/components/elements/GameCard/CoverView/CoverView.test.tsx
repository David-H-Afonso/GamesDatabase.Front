import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import type { Game } from '@/models/api/Game'
import type { RootState } from '@/store'

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
	it('exposes the full game name as a tooltip title', async () => {
		const { default: CoverView } = await import('./CoverView')
		renderWithProviders(<CoverView game={game} openDetails={vi.fn()} />, { preloadedState })

		expect(screen.getByText(game.name)).toHaveAttribute('title', game.name)
	})

	it('updates status from the hover quick editor', async () => {
		const onFieldUpdate = vi.fn().mockResolvedValue(undefined)
		const { default: CoverView } = await import('./CoverView')
		renderWithProviders(<CoverView game={game} openDetails={vi.fn()} onFieldUpdate={onFieldUpdate} />, { preloadedState })

		fireEvent.click(screen.getByRole('button', { name: 'Playing' }))
		fireEvent.click(screen.getByRole('button', { name: 'Done' }))

		expect(onFieldUpdate).toHaveBeenCalledWith(game.id, 'statusId', 2)
	})

	it('updates play-with values from the hover quick editor', async () => {
		const onFieldUpdate = vi.fn().mockResolvedValue(undefined)
		const { default: CoverView } = await import('./CoverView')
		renderWithProviders(<CoverView game={game} openDetails={vi.fn()} onFieldUpdate={onFieldUpdate} />, { preloadedState })

		fireEvent.click(screen.getByRole('button', { name: 'Friends' }))
		fireEvent.click(screen.getByRole('checkbox', { name: /Family/ }))

		expect(onFieldUpdate).toHaveBeenCalledWith(game.id, 'playWithIds', [1, 2])
	})
})
