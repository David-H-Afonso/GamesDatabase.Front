import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils/renderWithProviders'

vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string, options?: Record<string, unknown>) => {
			const count = Number(options?.count ?? 0)
			const translations: Record<string, string> = {
				'common.cancel': 'Cancel',
				'common.create': 'Create',
				'common.delete': 'Delete',
				'common.edit': 'Edit',
				'common.optional': 'Optional',
				'common.saveChanges': 'Save changes',
				'common.saving': 'Saving...',
				'game.replays.addReplay': 'Add replay',
				'game.replays.confirmDelete': 'Delete this replay?',
				'game.replays.count': count === 1 ? '1 entry' : '{{count}} entries',
				'game.replays.editReplay': 'Edit replay',
				'game.replays.finished': 'Finished',
				'game.replays.grade': 'Grade (0–100)',
				'game.replays.loading': 'Loading replays...',
				'game.replays.newReplay': 'New replay',
				'game.replays.noReplays': 'No replays recorded.',
				'game.replays.noType': 'No type',
				'game.replays.notes': 'Notes',
				'game.replays.released': 'Release date',
				'game.replays.started': 'Started',
				'game.replays.type': 'Type',
			}

			return (translations[key] ?? key).replace('{{count}}', String(count))
		},
	}),
}))

const mockReplays = [
	{
		id: 1,
		gameId: 1,
		replayTypeId: 1,
		replayTypeName: 'New Game+',
		replayTypeColor: '#ff0',
		started: '2023-06-01',
		finished: '2023-07-01',
		grade: 90,
		notes: 'Even better the second time',
	},
]

const mockGetReplaysByGameId = vi.fn().mockResolvedValue(mockReplays)
const mockCreateGameReplay = vi.fn().mockResolvedValue(undefined)
const mockUpdateGameReplay = vi.fn().mockResolvedValue(undefined)
const mockDeleteGameReplay = vi.fn().mockResolvedValue(undefined)

vi.mock('@/services/GameReplayService', () => ({
	getReplaysByGameId: (...args: any[]) => mockGetReplaysByGameId(...args),
	createGameReplay: (...args: any[]) => mockCreateGameReplay(...args),
	updateGameReplay: (...args: any[]) => mockUpdateGameReplay(...args),
	deleteGameReplay: (...args: any[]) => mockDeleteGameReplay(...args),
}))

vi.mock('@/services/GameReplayTypeService', () => ({
	getActiveGameReplayTypes: vi.fn().mockResolvedValue([{ id: 1, name: 'New Game+' }]),
	getSpecialGameReplayType: vi.fn().mockResolvedValue({ id: 1, name: 'New Game+' }),
}))

vi.mock('@/utils', () => ({
	formatToLocaleDate: (val: string) => val,
	DEFAULT_PAGE_SIZE: 50,
}))

vi.mock('./GameReplaysTab.scss', () => ({}))

describe('GameReplaysTab', () => {
	const user = userEvent.setup()

	beforeEach(() => {
		vi.clearAllMocks()
		mockGetReplaysByGameId.mockResolvedValue(mockReplays)
	})

	it('shows loading state initially', async () => {
		mockGetReplaysByGameId.mockReturnValue(new Promise(() => {}))
		const { GameReplaysTab } = await import('./GameReplaysTab')
		renderWithProviders(<GameReplaysTab gameId={1} />)

		expect(screen.getByText('Loading replays...')).toBeInTheDocument()
	})

	it('renders replays after loading', async () => {
		const { GameReplaysTab } = await import('./GameReplaysTab')
		renderWithProviders(<GameReplaysTab gameId={1} />)

		await waitFor(() => {
			expect(screen.getByText('1 entry')).toBeInTheDocument()
		})

		expect(screen.getByText('New Game+')).toBeInTheDocument()
		expect(screen.getByText('90/100')).toBeInTheDocument()
		expect(screen.getByText('Even better the second time')).toBeInTheDocument()
	})

	it('shows empty state when no replays', async () => {
		mockGetReplaysByGameId.mockResolvedValue([])
		const { GameReplaysTab } = await import('./GameReplaysTab')
		renderWithProviders(<GameReplaysTab gameId={1} />)

		await waitFor(() => {
			expect(screen.getByText('No replays recorded.')).toBeInTheDocument()
		})
	})

	it('opens new replay form when + button is clicked', async () => {
		const { GameReplaysTab } = await import('./GameReplaysTab')
		renderWithProviders(<GameReplaysTab gameId={1} />)

		await waitFor(() => {
			expect(screen.getByText('+ Add replay')).toBeInTheDocument()
		})

		await user.click(screen.getByText('+ Add replay'))

		expect(screen.getByText('New replay')).toBeInTheDocument()
		expect(screen.getByLabelText('Type')).toBeInTheDocument()
		expect(screen.getByLabelText('Started')).toBeInTheDocument()
		expect(screen.getByLabelText('Finished')).toBeInTheDocument()
		expect(screen.getByLabelText('Grade (0–100)')).toBeInTheDocument()
		expect(screen.getByLabelText('Notes')).toBeInTheDocument()
	})

	it('opens edit form when Editar button is clicked', async () => {
		const { GameReplaysTab } = await import('./GameReplaysTab')
		renderWithProviders(<GameReplaysTab gameId={1} />)

		await waitFor(() => {
			expect(screen.getByText('Edit')).toBeInTheDocument()
		})

		await user.click(screen.getByText('Edit'))

		expect(screen.getByText('Edit replay')).toBeInTheDocument()
		expect(screen.getByText('Save changes')).toBeInTheDocument()
	})

	it('deletes a replay after confirming in the dialog', async () => {
		const { GameReplaysTab } = await import('./GameReplaysTab')
		renderWithProviders(<GameReplaysTab gameId={1} />)

		await waitFor(() => {
			expect(screen.getByText('Delete')).toBeInTheDocument()
		})

		await user.click(screen.getByText('Delete'))
		const dialog = screen.getByRole('alertdialog')
		await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

		expect(mockDeleteGameReplay).toHaveBeenCalledWith(1, 1)
	})

	it('does not delete a replay when the confirmation is cancelled', async () => {
		const { GameReplaysTab } = await import('./GameReplaysTab')
		renderWithProviders(<GameReplaysTab gameId={1} />)

		await waitFor(() => {
			expect(screen.getByText('Delete')).toBeInTheDocument()
		})

		await user.click(screen.getByText('Delete'))
		const dialog = screen.getByRole('alertdialog')
		await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))

		expect(mockDeleteGameReplay).not.toHaveBeenCalled()
		expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
	})

	it('closes form when Cancelar is clicked', async () => {
		const { GameReplaysTab } = await import('./GameReplaysTab')
		renderWithProviders(<GameReplaysTab gameId={1} />)

		await waitFor(() => {
			expect(screen.getByText('+ Add replay')).toBeInTheDocument()
		})

		await user.click(screen.getByText('+ Add replay'))
		expect(screen.getByText('New replay')).toBeInTheDocument()

		await user.click(screen.getByText('Cancel'))
		expect(screen.queryByText('New replay')).not.toBeInTheDocument()
	})

	it('submits new replay form', async () => {
		mockCreateGameReplay.mockResolvedValue(undefined)
		mockGetReplaysByGameId.mockResolvedValue(mockReplays)
		const { GameReplaysTab } = await import('./GameReplaysTab')
		renderWithProviders(<GameReplaysTab gameId={1} />)

		await waitFor(() => {
			expect(screen.getByText('+ Add replay')).toBeInTheDocument()
		})

		await user.click(screen.getByText('+ Add replay'))
		await user.click(screen.getByText('Create'))

		await waitFor(() => {
			expect(mockCreateGameReplay).toHaveBeenCalled()
		})
	})
})
