import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { Game } from '@/models/api/Game'
import GameDeepLink from './GameDeepLink'

const mockGame: Game = {
	id: 42,
	name: 'Deep Link Game',
	statusId: 1,
	playWithIds: [],
	playWithNames: [],
	favorite: false,
}

const fetchGameDetails = vi.fn()
const deleteGameById = vi.fn()

vi.mock('@/hooks', () => ({
	useGames: () => ({ fetchGameDetails, deleteGameById }),
}))

vi.mock('@/components/elements', () => ({
	GameDetails: ({ game }: { game: Game }) => <div data-testid='deep-link-details'>{game.name}</div>,
}))

describe('GameDeepLink', () => {
	it('loads the game from the hash-router route and reuses GameDetails', async () => {
		fetchGameDetails.mockResolvedValueOnce(mockGame)

		render(
			<MemoryRouter initialEntries={['/games/42']}>
				<Routes>
					<Route path='/games/:id' element={<GameDeepLink />} />
				</Routes>
			</MemoryRouter>
		)

		await waitFor(() => expect(screen.getByTestId('deep-link-details')).toHaveTextContent('Deep Link Game'))
		expect(fetchGameDetails).toHaveBeenCalledWith(42)
	})
})
