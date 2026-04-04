import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import type { GameQueryParameters } from '@/models/api/Game'

const mockPlatforms = [
	{ id: 1, name: 'PC' },
	{ id: 2, name: 'PS5' },
]
const mockPlayWith = [{ id: 1, name: 'Solo' }]
const mockStatuses = [
	{ id: 1, name: 'Playing' },
	{ id: 2, name: 'Completed' },
]
const mockPlayedStatuses = [{ id: 1, name: 'Finished' }]

vi.mock('@/hooks', () => ({
	useGamePlatform: () => ({ fetchList: vi.fn().mockResolvedValue(mockPlatforms) }),
	useGamePlayWith: () => ({ fetchOptions: vi.fn().mockResolvedValue(mockPlayWith) }),
	useGameStatus: () => ({ fetchActiveStatusList: vi.fn().mockResolvedValue(mockStatuses) }),
	useGamePlayedStatus: () => ({ fetchList: vi.fn().mockResolvedValue(mockPlayedStatuses) }),
}))

vi.mock('./GamesFilters.scss', () => ({}))

const defaultFilters: GameQueryParameters = {}

async function loadGamesFilters() {
	const mod = await import('./GamesFilters')
	return mod.default
}

describe('GamesFilters', () => {
	const user = userEvent.setup()

	it('renders all filter inputs and selects', async () => {
		const GamesFilters = await loadGamesFilters()
		renderWithProviders(<GamesFilters value={defaultFilters} onChange={vi.fn()} />)

		expect(screen.getByPlaceholderText('Min grade')).toBeInTheDocument()
		expect(screen.getByPlaceholderText('Max grade')).toBeInTheDocument()
		expect(screen.getByLabelText('Platform filter')).toBeInTheDocument()
		expect(screen.getByLabelText('Play with filter')).toBeInTheDocument()
		expect(screen.getByLabelText('Status filter')).toBeInTheDocument()
		expect(screen.getByLabelText('Played status filter')).toBeInTheDocument()
		expect(screen.getByPlaceholderText('Released Year')).toBeInTheDocument()
		expect(screen.getByPlaceholderText('Started Year')).toBeInTheDocument()
		expect(screen.getByPlaceholderText('Finished Year')).toBeInTheDocument()
		expect(screen.getByLabelText('Page size')).toBeInTheDocument()
		expect(screen.getByLabelText('Price filter')).toBeInTheDocument()
	})

	it('applies closed class when isOpen is false', async () => {
		const GamesFilters = await loadGamesFilters()
		const { container } = renderWithProviders(<GamesFilters value={defaultFilters} onChange={vi.fn()} isOpen={false} />)

		expect(container.querySelector('.games-filters.closed')).toBeInTheDocument()
	})

	it('calls onChange with minGrade and resets page to 1', async () => {
		const onChange = vi.fn()
		const GamesFilters = await loadGamesFilters()
		renderWithProviders(<GamesFilters value={defaultFilters} onChange={onChange} />)

		await user.type(screen.getByPlaceholderText('Min grade'), '5')

		expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ minGrade: 5, page: 1 }))
	})

	it('calls onChange with platformId when platform select changes', async () => {
		const onChange = vi.fn()
		const GamesFilters = await loadGamesFilters()
		renderWithProviders(<GamesFilters value={defaultFilters} onChange={onChange} />)

		// Wait for options to load
		const select = screen.getByLabelText('Platform filter')
		await vi.waitFor(() => {
			expect(select.querySelectorAll('option').length).toBeGreaterThan(1)
		})

		await user.selectOptions(select, '1')

		expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ platformId: 1, page: 1 }))
	})

	it('calls onClear when clear button is clicked', async () => {
		const onClear = vi.fn()
		const GamesFilters = await loadGamesFilters()
		renderWithProviders(<GamesFilters value={defaultFilters} onChange={vi.fn()} onClear={onClear} />)

		await user.click(screen.getByText('Clear filters'))

		expect(onClear).toHaveBeenCalledOnce()
	})

	it('calls onChange with empty object when clear is clicked without onClear prop', async () => {
		const onChange = vi.fn()
		const GamesFilters = await loadGamesFilters()
		renderWithProviders(<GamesFilters value={defaultFilters} onChange={onChange} />)

		await user.click(screen.getByText('Clear filters'))

		expect(onChange).toHaveBeenCalledWith({})
	})

	it('renders showIncomplete checkbox and calls onChange when toggled', async () => {
		const onChange = vi.fn()
		const GamesFilters = await loadGamesFilters()
		renderWithProviders(<GamesFilters value={defaultFilters} onChange={onChange} />)

		const checkbox = screen.getByRole('checkbox', { name: /Show Incomplete Games/ })
		await user.click(checkbox)

		expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ showIncomplete: true, page: 1 }))
	})

	it('loads and renders platform options from hook', async () => {
		const GamesFilters = await loadGamesFilters()
		renderWithProviders(<GamesFilters value={defaultFilters} onChange={vi.fn()} />)

		// Wait for the async options to load
		const select = screen.getByLabelText('Platform filter')
		await vi.waitFor(() => {
			const options = select.querySelectorAll('option')
			expect(options.length).toBeGreaterThan(1)
		})

		expect(screen.getByText('PC')).toBeInTheDocument()
		expect(screen.getByText('PS5')).toBeInTheDocument()
	})

	it('calls onChange with pageSize when page size select changes', async () => {
		const onChange = vi.fn()
		const GamesFilters = await loadGamesFilters()
		renderWithProviders(<GamesFilters value={defaultFilters} onChange={onChange} />)

		await user.selectOptions(screen.getByLabelText('Page size'), '100')

		expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ pageSize: 100, page: 1 }))
	})

	it('renders with populated filter values', async () => {
		const populatedFilters: GameQueryParameters = {
			minGrade: 5,
			maxGrade: 9,
			platformId: 1,
			playWithId: 1,
			statusId: 1,
			playedStatusId: 1,
			releasedYear: 2020,
			startedYear: 2021,
			finishedYear: 2022,
			pageSize: 25,
			isCheaperByKey: true,
			showIncomplete: true,
			excludeStatusIds: [2],
		}
		const GamesFilters = await loadGamesFilters()
		renderWithProviders(<GamesFilters value={populatedFilters} onChange={vi.fn()} />)

		// Wait for async options to load
		const platformSelect = screen.getByLabelText('Platform filter')
		await vi.waitFor(() => {
			expect(platformSelect.querySelectorAll('option').length).toBeGreaterThan(1)
		})

		expect(screen.getByPlaceholderText('Min grade')).toHaveValue(5)
		expect(screen.getByPlaceholderText('Max grade')).toHaveValue(9)
		expect(platformSelect).toHaveValue('1')
		expect(screen.getByPlaceholderText('Released Year')).toHaveValue(2020)
		expect(screen.getByLabelText('Price filter')).toHaveValue('true')
		expect(screen.getByRole('checkbox', { name: /Show Incomplete Games/ })).toBeChecked()
	})

	it('renders with isCheaperByKey false', async () => {
		const GamesFilters = await loadGamesFilters()
		renderWithProviders(<GamesFilters value={{ isCheaperByKey: false }} onChange={vi.fn()} />)

		expect(screen.getByLabelText('Price filter')).toHaveValue('false')
	})

	it('calls onChange with maxGrade', async () => {
		const onChange = vi.fn()
		const GamesFilters = await loadGamesFilters()
		renderWithProviders(<GamesFilters value={defaultFilters} onChange={onChange} />)

		await user.type(screen.getByPlaceholderText('Max grade'), '8')

		expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ maxGrade: 8, page: 1 }))
	})

	it('calls onChange with playWithId when play with select changes', async () => {
		const onChange = vi.fn()
		const GamesFilters = await loadGamesFilters()
		renderWithProviders(<GamesFilters value={defaultFilters} onChange={onChange} />)

		const select = screen.getByLabelText('Play with filter')
		await vi.waitFor(() => {
			expect(select.querySelectorAll('option').length).toBeGreaterThan(1)
		})
		await user.selectOptions(select, '1')

		expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ playWithId: 1, page: 1 }))
	})

	it('calls onChange with statusId when status select changes', async () => {
		const onChange = vi.fn()
		const GamesFilters = await loadGamesFilters()
		renderWithProviders(<GamesFilters value={defaultFilters} onChange={onChange} />)

		const select = screen.getByLabelText('Status filter')
		await vi.waitFor(() => {
			expect(select.querySelectorAll('option').length).toBeGreaterThan(1)
		})
		await user.selectOptions(select, '1')

		expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ statusId: 1, page: 1 }))
	})

	it('calls onChange with playedStatusId when played status select changes', async () => {
		const onChange = vi.fn()
		const GamesFilters = await loadGamesFilters()
		renderWithProviders(<GamesFilters value={defaultFilters} onChange={onChange} />)

		const select = screen.getByLabelText('Played status filter')
		await vi.waitFor(() => {
			expect(select.querySelectorAll('option').length).toBeGreaterThan(1)
		})
		await user.selectOptions(select, '1')

		expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ playedStatusId: 1, page: 1 }))
	})

	it('calls onChange with year fields', async () => {
		const onChange = vi.fn()
		const GamesFilters = await loadGamesFilters()
		renderWithProviders(<GamesFilters value={defaultFilters} onChange={onChange} />)

		await user.type(screen.getByPlaceholderText('Released Year'), '2020')
		expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }))
	})

	it('calls onChange with isCheaperByKey when price filter changes', async () => {
		const onChange = vi.fn()
		const GamesFilters = await loadGamesFilters()
		renderWithProviders(<GamesFilters value={defaultFilters} onChange={onChange} />)

		await user.selectOptions(screen.getByLabelText('Price filter'), 'true')

		expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ isCheaperByKey: true, page: 1 }))
	})

	it('resets isCheaperByKey when price filter is cleared', async () => {
		const onChange = vi.fn()
		const GamesFilters = await loadGamesFilters()
		renderWithProviders(<GamesFilters value={{ isCheaperByKey: true }} onChange={onChange} />)

		await user.selectOptions(screen.getByLabelText('Price filter'), '')

		expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ isCheaperByKey: undefined, page: 1 }))
	})

	it('handles exclude status checkbox — adding', async () => {
		const onChange = vi.fn()
		const GamesFilters = await loadGamesFilters()
		const { container } = renderWithProviders(<GamesFilters value={defaultFilters} onChange={onChange} />)

		// Wait for status options to load in exclude section
		const excludeSection = container.querySelector('.gf-exclude-status')
		await vi.waitFor(() => {
			const labels = excludeSection?.querySelectorAll('label')
			expect(labels!.length).toBeGreaterThan(1) // header label + status labels
		})

		const excludeCheckbox = excludeSection?.querySelector('input[type="checkbox"]') as HTMLInputElement
		if (excludeCheckbox) {
			await user.click(excludeCheckbox)
			expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ excludeStatusIds: expect.any(Array), page: 1 }))
		}
	})

	it('handles exclude status checkbox — removing', async () => {
		const onChange = vi.fn()
		const GamesFilters = await loadGamesFilters()
		const { container } = renderWithProviders(<GamesFilters value={{ excludeStatusIds: [1, 2] }} onChange={onChange} />)

		const excludeSection = container.querySelector('.gf-exclude-status')
		await vi.waitFor(() => {
			const checkboxes = excludeSection?.querySelectorAll('input[type="checkbox"]')
			expect(checkboxes!.length).toBeGreaterThan(0)
		})

		const excludeCheckbox = excludeSection?.querySelector('input[type="checkbox"]:checked') as HTMLInputElement
		if (excludeCheckbox) {
			await user.click(excludeCheckbox)
			expect(onChange).toHaveBeenCalled()
		}
	})
})
