import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import type { Game } from '@/models/api/Game'
import type { RootState } from '@/store'
import i18n from '@/i18n'
import { steamService } from '@/services'

const mockUpdateGameById = vi.fn().mockResolvedValue(undefined)
const mockFetchGameDetails = vi.fn().mockResolvedValue(undefined)

vi.mock('@/hooks', () => ({
	useGames: () => ({
		updateGameById: mockUpdateGameById,
		fetchGameDetails: mockFetchGameDetails,
	}),
}))

vi.mock('@/components/elements', () => ({
	EditableField: ({ value, placeholder, formatter, allowEditing }: any) => (
		<span data-testid='editable-field' data-allow-editing={allowEditing === false ? 'false' : 'true'}>
			{formatter ? formatter(value) : value || placeholder}
		</span>
	),
	OptimizedImage: ({ alt }: any) => <img alt={alt} />,
	Toast: ({ isOpen, message, type }: any) => (isOpen ? <div role='status' data-toast-type={type}>{message}</div> : null),
}))

vi.mock('../EditableSelect/EditableSelect', () => ({
	EditableSelect: ({ displayValue, placeholder, onSave }: any) => (
		<button type='button' data-testid='editable-select' onClick={() => onSave?.(1)}>
			{displayValue || placeholder}
		</button>
	),
}))

vi.mock('../EditableMultiSelect/EditableMultiSelect', () => ({
	EditableMultiSelect: ({ displayValues, placeholder }: any) => (
		<span data-testid='editable-multi-select'>{displayValues?.length > 0 ? displayValues.join(', ') : placeholder}</span>
	),
}))

vi.mock('./GameReplaysTab', () => ({
	GameReplaysTab: () => <div data-testid='replays-tab'>Replays content</div>,
}))

vi.mock('./GameHistoryTab', () => ({
	GameHistoryTab: () => <div data-testid='history-tab'>History content</div>,
}))

vi.mock('@/assets/svgs/trashbin.svg?react', () => ({
	default: (props: any) => <svg data-testid='delete-icon' {...props} />,
}))

vi.mock('@/assets/svgs/lock.svg?react', () => ({
	default: (props: any) => <svg data-testid='lock-icon' {...props} />,
}))

vi.mock('@/assets/svgs/unlock.svg?react', () => ({
	default: (props: any) => <svg data-testid='unlock-icon' {...props} />,
}))

vi.mock('./GameDetails.scss', () => ({}))

vi.mock('@/utils', () => ({
	formatPlaytime: (minutes?: number | null) => {
		if (!minutes) return ''
		const hours = Math.round((minutes / 60) * 10) / 10
		return `${Number.isInteger(hours) ? hours.toFixed(0) : hours.toFixed(1)}h`
	},
	formatToLocaleDate: (val: string) => val,
	hoursToMinutesValue: (value: string | number) => (value === '' ? null : Math.round(Number(value) * 60)),
	minutesToHoursValue: (minutes?: number | null) => (minutes == null ? undefined : minutes / 60),
	searchGoogleImage: vi.fn(),
	useClickOutside: () => ({ current: null }),
	DEFAULT_PAGE_SIZE: 50,
}))

vi.mock('@/helpers/criticScoreHelper', () => ({
	getCriticScoreUrl: vi.fn(),
	getCriticProviderIdFromName: vi.fn(),
	getCriticProviderNameFromId: vi.fn(),
	resolveEffectiveProvider: vi.fn(),
}))

const mockGame: Game = {
	id: 1,
	name: 'Dark Souls',
	statusId: 1,
	statusName: 'Playing',
	platformId: 1,
	platformName: 'PC',
	playedStatusId: 1,
	playedStatusName: 'Finished',
	playWithIds: [1],
	playWithNames: ['Solo'],
	released: '2011-09-22',
	started: '2023-01-01',
	finished: '2023-03-01',
	critic: 89,
	grade: 95,
	story: 40,
	completion: 80,
	score: 92,
	logo: 'https://example.com/logo.png',
	cover: 'https://example.com/cover.png',
	comment: 'Excellent game',
	isCheaperByKey: true,
	keyStoreUrl: 'https://example.com/key',
	manualPlaytimeMinutes: 150,
} as any

const defaultState: Partial<RootState> = {
	gameStatus: { activeStatuses: [{ id: 1, name: 'Playing', color: '#00f' }] } as any,
	gamePlatform: { platforms: [{ id: 1, name: 'PC' }] } as any,
	gamePlayedStatus: { playedStatuses: [{ id: 1, name: 'Finished' }] } as any,
	gamePlayWith: { playWithOptions: [{ id: 1, name: 'Solo' }] } as any,
	auth: { user: { scoreProvider: 'Metacritic' } } as any,
}

const steamGame: Game = { ...mockGame, steamAppId: 570 } as any

let imageShouldLoad = true

class MockImage {
	onload: (() => void) | null = null
	onerror: (() => void) | null = null
	set src(_value: string) {
		queueMicrotask(() => (imageShouldLoad ? this.onload?.() : this.onerror?.()))
	}
}

vi.stubGlobal('Image', MockImage)

describe('GameDetails', () => {
	const user = userEvent.setup()

	beforeEach(async () => {
		await i18n.changeLanguage('en')
		vi.clearAllMocks()
		imageShouldLoad = true
		vi.useFakeTimers({ shouldAdvanceTime: true })
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('renders the game name', async () => {
		const { GameDetails } = await import('./GameDetails')
		renderWithProviders(<GameDetails game={mockGame} closeDetails={vi.fn()} />, { preloadedState: defaultState })

		expect(screen.getByText('Game details: Dark Souls')).toBeInTheDocument()
	})

	it('renders info tab by default with section headers', async () => {
		const { GameDetails } = await import('./GameDetails')
		renderWithProviders(<GameDetails game={mockGame} closeDetails={vi.fn()} />, { preloadedState: defaultState })

		expect(screen.getByText('Status')).toBeInTheDocument()
		expect(screen.getByText('Released')).toBeInTheDocument()
		expect(screen.getByText('Critic Score')).toBeInTheDocument()
		expect(screen.getByText('Platform')).toBeInTheDocument()
		expect(screen.getByText('Grade')).toBeInTheDocument()
		expect(screen.getByText('Comment')).toBeInTheDocument()
	})

	it('switches to replays tab when clicked', async () => {
		const { GameDetails } = await import('./GameDetails')
		renderWithProviders(<GameDetails game={mockGame} closeDetails={vi.fn()} />, { preloadedState: defaultState })

		await user.click(screen.getByText('Replays'))

		expect(screen.getByTestId('replays-tab')).toBeInTheDocument()
		expect(screen.queryByText('Status')).not.toBeInTheDocument()
	})

	it('switches to history tab when clicked', async () => {
		const { GameDetails } = await import('./GameDetails')
		renderWithProviders(<GameDetails game={mockGame} closeDetails={vi.fn()} />, { preloadedState: defaultState })

		await user.click(screen.getByText('History'))

		expect(screen.getByTestId('history-tab')).toBeInTheDocument()
	})

	it('calls onDelete when delete button is clicked', async () => {
		const onDelete = vi.fn()
		const { GameDetails } = await import('./GameDetails')
		renderWithProviders(<GameDetails game={mockGame} closeDetails={vi.fn()} onDelete={onDelete} />, { preloadedState: defaultState })

		await user.click(screen.getByLabelText('Delete game'))

		expect(onDelete).toHaveBeenCalledWith(mockGame)
	})

	it('calls closeDetails after animation when close button is clicked', async () => {
		const closeDetails = vi.fn()
		const { GameDetails } = await import('./GameDetails')
		renderWithProviders(<GameDetails game={mockGame} closeDetails={closeDetails} />, { preloadedState: defaultState })

		await user.click(screen.getByLabelText('Close details'))

		expect(closeDetails).not.toHaveBeenCalled()

		vi.advanceTimersByTime(300)

		expect(closeDetails).toHaveBeenCalledOnce()
	})

	it('renders cover and logo images when provided', async () => {
		const { GameDetails } = await import('./GameDetails')
		renderWithProviders(<GameDetails game={mockGame} closeDetails={vi.fn()} />, { preloadedState: defaultState })

		expect(screen.getByAltText('Dark Souls logo')).toBeInTheDocument()
		expect(screen.getByAltText('Dark Souls cover')).toBeInTheDocument()
	})

	it('renders Key URL field when isCheaperByKey is set', async () => {
		const { GameDetails } = await import('./GameDetails')
		renderWithProviders(<GameDetails game={mockGame} closeDetails={vi.fn()} />, { preloadedState: defaultState })

		expect(screen.getByText('Key URL')).toBeInTheDocument()
	})

	it('renders manual played hours below the completion checkbox', async () => {
		const { GameDetails } = await import('./GameDetails')
		renderWithProviders(<GameDetails game={mockGame} closeDetails={vi.fn()} />, { preloadedState: defaultState })

		expect(screen.getByText('Played hours')).toBeInTheDocument()
		expect(screen.getByText('2.5h')).toBeInTheDocument()
	})

	it('shows tab navigation buttons', async () => {
		const { GameDetails } = await import('./GameDetails')
		renderWithProviders(<GameDetails game={mockGame} closeDetails={vi.fn()} />, { preloadedState: defaultState })

		expect(screen.getByText('Info')).toBeInTheDocument()
		expect(screen.getByText('Replays')).toBeInTheDocument()
		expect(screen.getByText('History')).toBeInTheDocument()
	})

	it('does not render logo when game.logo is empty', async () => {
		const { GameDetails } = await import('./GameDetails')
		renderWithProviders(<GameDetails game={{ ...mockGame, logo: '' }} closeDetails={vi.fn()} />, { preloadedState: defaultState })

		expect(screen.queryByAltText('Dark Souls logo')).not.toBeInTheDocument()
	})

	it('does not render cover when game.cover is empty', async () => {
		const { GameDetails } = await import('./GameDetails')
		renderWithProviders(<GameDetails game={{ ...mockGame, cover: '' }} closeDetails={vi.fn()} />, { preloadedState: defaultState })

		expect(screen.queryByAltText('Dark Souls cover')).not.toBeInTheDocument()
	})

	it('renders editable fields for the game', async () => {
		const { GameDetails } = await import('./GameDetails')
		renderWithProviders(<GameDetails game={mockGame} closeDetails={vi.fn()} />, { preloadedState: defaultState })

		const editableFields = screen.getAllByTestId('editable-field')
		expect(editableFields.length).toBeGreaterThanOrEqual(5)
	})

	it('renders editable selects for status, platform, played status', async () => {
		const { GameDetails } = await import('./GameDetails')
		renderWithProviders(<GameDetails game={mockGame} closeDetails={vi.fn()} />, { preloadedState: defaultState })

		const editableSelects = screen.getAllByTestId('editable-select')
		expect(editableSelects.length).toBeGreaterThanOrEqual(3)
	})

	it('renders multi-select for play with options', async () => {
		const { GameDetails } = await import('./GameDetails')
		renderWithProviders(<GameDetails game={mockGame} closeDetails={vi.fn()} />, { preloadedState: defaultState })

		expect(screen.getByTestId('editable-multi-select')).toBeInTheDocument()
	})

	it('does not call onDelete when onDelete is not provided', async () => {
		const { GameDetails } = await import('./GameDetails')
		renderWithProviders(<GameDetails game={mockGame} closeDetails={vi.fn()} />, { preloadedState: defaultState })

		// Should not throw when clicking delete without onDelete
		await user.click(screen.getByLabelText('Delete game'))
	})

	it('uses the just-saved critic provider when opening the critic link', async () => {
		const updatedGame = { ...mockGame, criticProvider: 'Metacritic' }
		mockUpdateGameById.mockResolvedValueOnce(updatedGame)

		const { getCriticProviderIdFromName, getCriticProviderNameFromId, getCriticScoreUrl, resolveEffectiveProvider } = await import('@/helpers/criticScoreHelper')
		vi.mocked(getCriticProviderIdFromName).mockImplementation((provider) => (provider === 'SteamDB' ? 3 : provider === 'Metacritic' ? 1 : undefined))
		vi.mocked(getCriticProviderNameFromId).mockReturnValue('Metacritic')
		vi.mocked(resolveEffectiveProvider).mockReturnValue('Metacritic')
		vi.mocked(getCriticScoreUrl).mockReturnValue('https://www.metacritic.com/search/dark-souls/')
		const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

		const { GameDetails } = await import('./GameDetails')
		renderWithProviders(<GameDetails game={{ ...mockGame, criticProvider: 'SteamDB' }} closeDetails={vi.fn()} />, { preloadedState: defaultState })

		await user.click(screen.getByRole('button', { name: 'SteamDB' }))
		await user.click(screen.getByText('Critic Score'))

		expect(mockUpdateGameById).toHaveBeenCalledWith(mockGame.id, { criticProvider: 'Metacritic' })
		expect(resolveEffectiveProvider).toHaveBeenLastCalledWith('Metacritic', 'Metacritic')
		expect(getCriticScoreUrl).toHaveBeenLastCalledWith('Dark Souls', 'Metacritic')
		expect(openSpy).toHaveBeenCalledWith('https://www.metacritic.com/search/dark-souls/', '_blank', 'noopener')
	})

	it('adds closing class when close button clicked', async () => {
		const { GameDetails } = await import('./GameDetails')
		const { container } = renderWithProviders(<GameDetails game={mockGame} closeDetails={vi.fn()} />, { preloadedState: defaultState })

		await user.click(screen.getByLabelText('Close details'))

		const panel = container.querySelector('.game-details')
		expect(panel?.classList.contains('closing')).toBe(true)
	})

	it('no longer renders the re-fetch both images button in the header', async () => {
		const { GameDetails } = await import('./GameDetails')
		renderWithProviders(<GameDetails game={steamGame} closeDetails={vi.fn()} />, { preloadedState: defaultState })

		expect(screen.queryByLabelText('Re-fetch images from Steam')).not.toBeInTheDocument()
	})

	it('locks the Steam App ID field when the game is already linked', async () => {
		const { GameDetails } = await import('./GameDetails')
		renderWithProviders(<GameDetails game={steamGame} closeDetails={vi.fn()} />, { preloadedState: defaultState })

		expect(screen.getByText('570')).toHaveAttribute('data-allow-editing', 'false')
		expect(screen.getByTestId('lock-icon')).toBeInTheDocument()
		expect(screen.getByLabelText('Unlock to edit the Steam App ID')).toBeInTheDocument()
	})

	it('unlocks the Steam App ID field when the lock button is clicked', async () => {
		const { GameDetails } = await import('./GameDetails')
		renderWithProviders(<GameDetails game={steamGame} closeDetails={vi.fn()} />, { preloadedState: defaultState })

		await user.click(screen.getByLabelText('Unlock to edit the Steam App ID'))

		expect(screen.getByText('570')).toHaveAttribute('data-allow-editing', 'true')
		expect(screen.getByTestId('unlock-icon')).toBeInTheDocument()
		expect(screen.getByLabelText('Lock the Steam App ID')).toBeInTheDocument()
	})

	it('keeps the Steam App ID editable when the game has no steamAppId', async () => {
		const { GameDetails } = await import('./GameDetails')
		renderWithProviders(<GameDetails game={mockGame} closeDetails={vi.fn()} />, { preloadedState: defaultState })

		expect(screen.queryByTestId('lock-icon')).not.toBeInTheDocument()
		expect(screen.queryByLabelText('Unlock to edit the Steam App ID')).not.toBeInTheDocument()
	})

	it('refreshes the cover from Steam when the candidate image loads', async () => {
		vi.useRealTimers()
		imageShouldLoad = true
		const { GameDetails } = await import('./GameDetails')
		renderWithProviders(<GameDetails game={steamGame} closeDetails={vi.fn()} />, { preloadedState: defaultState })

		await user.click(screen.getAllByLabelText('Refresh cover from Steam')[0])

		await waitFor(() => expect(mockUpdateGameById).toHaveBeenCalledWith(steamGame.id, { cover: 'https://cdn.cloudflare.steamstatic.com/steam/apps/570/header.jpg' }))
		expect(screen.queryByRole('status')).not.toBeInTheDocument()
	})

	it('keeps the previous cover and shows a toast when the Steam cover does not load', async () => {
		vi.useRealTimers()
		imageShouldLoad = false
		const { GameDetails } = await import('./GameDetails')
		renderWithProviders(<GameDetails game={steamGame} closeDetails={vi.fn()} />, { preloadedState: defaultState })

		await user.click(screen.getAllByLabelText('Refresh cover from Steam')[0])

		expect(await screen.findByRole('status')).toHaveTextContent(/load the Steam cover/)
		expect(mockUpdateGameById).not.toHaveBeenCalled()
	})

	it('restores the previous logo and shows a toast when Steam returns no valid logo', async () => {
		vi.useRealTimers()
		imageShouldLoad = true
		const syncSpy = vi.spyOn(steamService, 'syncGame').mockResolvedValue({} as any)
		mockFetchGameDetails.mockResolvedValueOnce({ ...steamGame, logo: '' })

		const { GameDetails } = await import('./GameDetails')
		renderWithProviders(<GameDetails game={steamGame} closeDetails={vi.fn()} />, { preloadedState: defaultState })

		await user.click(screen.getByLabelText('Refresh logo from Steam'))

		expect(await screen.findByRole('status')).toHaveTextContent(/load the Steam logo/)
		// Previous logo still loads → restore it so the user does not lose working data
		await waitFor(() => expect(mockUpdateGameById).toHaveBeenCalledWith(steamGame.id, { logo: steamGame.logo }))
		expect(syncSpy).toHaveBeenCalledWith(steamGame.id)
	})

	it('restores the previous logo unconditionally even when CDN is unreachable', async () => {
		vi.useRealTimers()
		imageShouldLoad = false // simulates CDN hiccup / network failure
		const syncSpy = vi.spyOn(steamService, 'syncGame').mockResolvedValue({} as any)
		mockFetchGameDetails.mockResolvedValueOnce({ ...steamGame, logo: '' })

		const { GameDetails } = await import('./GameDetails')
		renderWithProviders(<GameDetails game={steamGame} closeDetails={vi.fn()} />, { preloadedState: defaultState })

		await user.click(screen.getByLabelText('Refresh logo from Steam'))

		expect(await screen.findByRole('status')).toHaveTextContent(/load the Steam logo/)
		// Previous logo must ALWAYS be restored regardless of whether it currently loads.
		// A transient CDN failure must not silently discard the user's existing logo URL.
		await waitFor(() => expect(mockUpdateGameById).toHaveBeenCalledWith(steamGame.id, { logo: steamGame.logo }))
		expect(syncSpy).toHaveBeenCalledWith(steamGame.id)
	})

	it('replaces the logo when Steam returns one that loads', async () => {
		vi.useRealTimers()
		imageShouldLoad = true
		vi.spyOn(steamService, 'syncGame').mockResolvedValue({} as any)
		mockFetchGameDetails.mockResolvedValueOnce({ ...steamGame, logo: 'https://example.com/new-logo.png' })

		const { GameDetails } = await import('./GameDetails')
		renderWithProviders(<GameDetails game={steamGame} closeDetails={vi.fn()} />, { preloadedState: defaultState })

		await user.click(screen.getByLabelText('Refresh logo from Steam'))

		await waitFor(() => expect(mockFetchGameDetails).toHaveBeenCalledWith(steamGame.id))
		expect(screen.queryByText(/load the Steam logo/)).not.toBeInTheDocument()
	})
})
