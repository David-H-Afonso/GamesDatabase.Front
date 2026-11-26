import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { createGame } from '@/test/factories'
import i18n from '@/i18n'
import CreateGame from './CreateGame'

const calls = vi.hoisted(() => ({ create: vi.fn(), details: vi.fn(), bulk: vi.fn(), remove: vi.fn(), open: vi.fn(), active: vi.fn(), special: vi.fn(), library: vi.fn(), search: vi.fn(), import: vi.fn() }))
vi.mock('@/hooks/useGames', () => ({ useGames: () => ({ createNewGame: calls.create, fetchGameDetails: calls.details, bulkUpdateGamesById: calls.bulk, deleteGameById: calls.remove }) }))
vi.mock('@/hooks', () => ({ useGameStatus: () => ({ fetchActiveStatusList: calls.active, fetchSpecialStatusList: calls.special }) }))
vi.mock('@/services', async original => ({ ...await original<typeof import('@/services')>(), steamService: { getLibrary: calls.library, searchStore: calls.search, importGames: calls.import } }))
vi.mock('@/components/Collection/collectionDetailsContext', () => ({ useCollectionDetails: () => ({ open: calls.open }) }))
vi.mock('@/components/Collection/CollectionGameDetailsLazy', () => ({ CollectionGameDetails: () => null }))
const auth = { user: { id: 1, username: 'Batch fixture', role: 'Standard', steamId: '76561198000000000' }, token: 'fixture', refreshToken: null, isAuthenticated: true, loading: false, error: null } as const
const open = async () => {
	const view = renderWithProviders(<CreateGame gallery />, { preloadedState: { auth } }), user = userEvent.setup()
	await user.click(screen.getByRole('button', { name: 'Add Game' })); await waitFor(() => expect(within(screen.getByRole('dialog', { name: 'Add Game' })).getByRole('button', { name: 'Add Game' })).toBeEnabled())
	return { ...view, user, sheet: () => within(screen.getByRole('dialog', { name: 'Add Game' })) }
}
const steamRow = async (user: ReturnType<typeof userEvent.setup>, sheet: ReturnType<typeof within>) => {
	if (sheet.getAllByRole('textbox', { name: 'Title' }).every((input: HTMLElement) => (input as HTMLInputElement).value.trim())) await user.click(sheet.getByRole('button', { name: 'Add another row' }))
	const inputs = sheet.getAllByRole('textbox', { name: 'Title' }), input = inputs.find((input: HTMLElement) => !(input as HTMLInputElement).value.trim())!
	const row = within(input.closest('fieldset')!), toggle = row.getByRole('button', { name: 'Search Steam' })
	if (toggle.getAttribute('aria-pressed') !== 'true') await user.click(toggle)
	await user.type(input, 'Imported')
	await user.click(await sheet.findByRole('button', { name: /Imported Steam fixture/ }))
}

describe('compact multi-create drafts and retry receipts', () => {
	beforeEach(async () => {
		Object.values(calls).forEach(call => call.mockReset()); await i18n.changeLanguage('en')
		calls.active.mockResolvedValue([{ id: 1, name: 'Playing' }, { id: 8, name: 'Not fulfilled' }]); calls.special.mockResolvedValue([{ id: 8, name: 'Not fulfilled', statusType: 'NotFulfilled' }])
		calls.create.mockImplementation(async ({ name }) => createGame({ id: name === 'First fixture' ? 100 : 101, name }))
		calls.bulk.mockResolvedValue({ updatedCount: 1, totalRequested: 1 }); calls.library.mockResolvedValue([])
		calls.search.mockResolvedValue([{ appId: 570, name: 'Imported Steam fixture', heroUrl: '/sample-artwork/amber-hero.svg', coverUrl: '/sample-artwork/amber-cover.svg' }])
		calls.import.mockResolvedValue({ success: true, created: 1, linked: 0, skipped: 0, importedGames: [{ appId: 570, name: 'Imported Steam fixture', gdbGameId: 200, action: 'created' }] })
		calls.details.mockResolvedValue(createGame({ id: 200, name: 'Imported Steam fixture' }))
	})
	it('keeps one compact title row, an adjacent opt-in Steam icon and all secondary fields collapsed', async () => {
		const { user, sheet, container } = await open(); await user.type(sheet().getByRole('textbox', { name: 'Title' }), 'Manual only')
		expect(calls.search).not.toHaveBeenCalled(); expect(calls.library).not.toHaveBeenCalled()
		expect(sheet().queryByRole('combobox')).not.toBeInTheDocument(); expect(sheet().queryByRole('searchbox')).not.toBeInTheDocument()
		const toggle = sheet().getByRole('button', { name: 'Search Steam' }); expect(toggle).toHaveAttribute('aria-pressed', 'false')
		await user.click(toggle); expect(toggle).toHaveAttribute('aria-pressed', 'true')
		expect(await sheet().findByRole('button', { name: /Imported Steam fixture/ })).toBeInTheDocument()
		expect(sheet().getByRole('textbox', { name: 'Title' })).toHaveValue('Manual only'); expect(container.querySelector('.gdb-create-acquisition')).toBeNull(); expect(calls.create).not.toHaveBeenCalled(); expect(calls.import).not.toHaveBeenCalled()
	})
	it('preserves all secondary settings across collapse, source changes and reopening', async () => {
		const { user, sheet } = await open()
		await user.click(sheet().getByRole('button', { name: 'Options for game 1' })); expect(sheet().getByRole('combobox', { name: 'Status' })).toHaveValue('8')
		await user.selectOptions(sheet().getByRole('combobox', { name: 'Status' }), '1'); await user.selectOptions(sheet().getByRole('combobox', { name: 'Cheaper by' }), 'key')
		await user.click(sheet().getByRole('button', { name: 'Options for game 1' })); expect(sheet().queryByRole('combobox')).not.toBeInTheDocument()
		await steamRow(user, sheet()); await user.click(sheet().getByRole('button', { name: 'Add without linking to Steam' }))
		expect(sheet().getByRole('textbox', { name: 'Title' })).toHaveValue('Imported Steam fixture')
		await user.click(sheet().getByRole('button', { name: 'Cancel' })); await user.click(screen.getByRole('button', { name: 'Add Game' })); await user.click(sheet().getByRole('button', { name: 'Options for game 1' }))
		expect(sheet().getByRole('combobox', { name: 'Status' })).toHaveValue('1'); expect(sheet().getByRole('combobox', { name: 'Cheaper by' })).toHaveValue('key')
		await user.click(sheet().getByRole('button', { name: 'Add Game' })); await waitFor(() => expect(calls.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Imported Steam fixture', statusId: 1, isCheaperByKey: true })))
		expect(calls.import).not.toHaveBeenCalled()
	})
	it('cancels a late Steam search when switched off and retains the manual title', async () => {
		let resolve!: (value: unknown[]) => void; calls.search.mockImplementation(() => new Promise(yes => { resolve = yes }))
		const { user, sheet } = await open(); await user.type(sheet().getByRole('textbox', { name: 'Title' }), 'Manual title'); await user.click(sheet().getByRole('button', { name: 'Search Steam' }))
		await waitFor(() => expect(calls.search).toHaveBeenCalledOnce()); const signal = calls.search.mock.calls[0][1] as AbortSignal
		await user.click(sheet().getByRole('button', { name: 'Search Steam' })); expect(signal.aborted).toBe(true)
		await act(async () => { resolve([{ appId: 570, name: 'Late result' }]) }); expect(sheet().queryByRole('group', { name: 'Steam results' })).not.toBeInTheDocument(); expect(sheet().getByRole('textbox', { name: 'Title' })).toHaveValue('Manual title')
	})
	it('supports keyboard results, Escape back to the title, explicit retry and manual creation after source failure', async () => {
		calls.search.mockRejectedValueOnce(new Error('Synthetic Steam outage'))
		const { user, sheet } = await open(); await user.type(sheet().getByRole('textbox', { name: 'Title' }), 'Imported'); await user.click(sheet().getByRole('button', { name: 'Search Steam' }))
		await user.click(await sheet().findByRole('button', { name: 'Try again' })); const result = await sheet().findByRole('button', { name: /Imported Steam fixture/ })
		await user.click(sheet().getByRole('textbox', { name: 'Title' })); await user.keyboard('{ArrowDown}'); expect(result).toHaveFocus()
		await user.keyboard('{Escape}'); expect(sheet().getByRole('textbox', { name: 'Title' })).toHaveFocus(); expect(sheet().queryByRole('group', { name: 'Steam results' })).not.toBeInTheDocument()
		await user.click(sheet().getByRole('button', { name: 'Search Steam' })); await user.click(sheet().getByRole('button', { name: 'Add Game' })); await waitFor(() => expect(calls.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Imported' })))
		expect(calls.import).not.toHaveBeenCalled()
	})
	it('focuses newly added rows and a surviving title after deleting either neighbour', async () => {
		const { user, sheet } = await open(); expect(sheet().getByRole('textbox', { name: 'Title' })).toHaveFocus()
		await user.type(sheet().getByRole('textbox', { name: 'Title' }), 'First fixture'); await user.click(sheet().getByRole('button', { name: 'Add another row' }))
		expect(sheet().getAllByRole('textbox', { name: 'Title' })[1]).toHaveFocus(); await user.type(sheet().getAllByRole('textbox', { name: 'Title' })[1], 'Second fixture')
		await user.click(sheet().getByRole('button', { name: 'Remove draft row 1' })); expect(sheet().getByRole('textbox', { name: 'Title' })).toHaveValue('Second fixture'); expect(sheet().getByRole('textbox', { name: 'Title' })).toHaveFocus()
		await user.click(sheet().getByRole('button', { name: 'Add another row' })); await user.click(sheet().getByRole('button', { name: 'Remove draft row 2' })); expect(sheet().getByRole('textbox', { name: 'Title' })).toHaveFocus()
	})
	it('never submits a whitespace-only manual row, even when native validation is bypassed', async () => {
		const { user, sheet } = await open(); await user.type(sheet().getByRole('textbox', { name: 'Title' }), '   '); fireEvent.submit(document.getElementById('gdb-create-game-form')!)
		expect(await sheet().findByText('Enter a game title.')).toBeInTheDocument(); expect(sheet().getByRole('textbox', { name: 'Title' })).toHaveAttribute('aria-invalid', 'true'); expect(calls.create).not.toHaveBeenCalled(); expect(calls.import).not.toHaveBeenCalled()
	})
	it('keeps a catalog failure retryable without losing a typed title or inventing a default status', async () => {
		calls.active.mockResolvedValueOnce(undefined)
		renderWithProviders(<CreateGame gallery />, { preloadedState: { auth } }); const user = userEvent.setup(); await user.click(screen.getByRole('button', { name: 'Add Game' })); const sheet = within(screen.getByRole('dialog', { name: 'Add Game' }))
		await sheet.findByText('No usable statuses are available. Retry or check your status settings.'); await user.type(sheet.getByRole('textbox', { name: 'Title' }), 'Keep my draft'); expect(sheet.getByRole('button', { name: 'Add Game' })).toBeDisabled()
		await user.click(sheet.getByRole('button', { name: 'Try again' })); await waitFor(() => expect(sheet.getByRole('button', { name: 'Add Game' })).toBeEnabled()); expect(sheet.getByRole('textbox', { name: 'Title' })).toHaveValue('Keep my draft')
		await user.click(sheet.getByRole('button', { name: 'Add Game' })); await waitFor(() => expect(calls.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Keep my draft', statusId: 8 })))
	})
	it('preserves a closed draft, partial success and the failed row UUID; retries only unfinished rows', async () => {
		let secondAttempt = 0
		calls.create.mockImplementation(async ({ name }) => { if (name === 'Second fixture' && ++secondAttempt === 1) throw new Error('Fixture failure'); return createGame({ id: name === 'First fixture' ? 100 : 101, name }) })
		const { user, sheet } = await open(); await user.type(sheet().getByRole('textbox', { name: 'Title' }), 'First fixture'); await user.click(sheet().getByRole('button', { name: 'Add another row' })); await user.type(sheet().getAllByRole('textbox', { name: 'Title' })[1], 'Second fixture')
		await user.click(sheet().getByRole('button', { name: 'Add 2 games' })); await sheet().findByText('1 of 2 added. Review the unfinished rows before retrying.')
		expect(sheet().getByText('First fixture', { selector: 'strong' })).toBeInTheDocument(); expect(sheet().getByRole('textbox', { name: 'Title' })).toHaveValue('Second fixture')
		await user.click(sheet().getByRole('button', { name: 'Cancel' })); await user.click(screen.getByRole('button', { name: 'Add Game' }))
		expect(sheet().getByRole('textbox', { name: 'Title' })).toHaveValue('Second fixture'); await user.click(sheet().getByRole('button', { name: 'Retry unfinished (1)' }))
		await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Add Game' })).not.toBeInTheDocument())
		expect(calls.create.mock.calls.map(([payload]) => payload.name)).toEqual(['First fixture', 'Second fixture', 'Second fixture'])
		expect(calls.create.mock.calls[1][0].creationRequestId).toBe(calls.create.mock.calls[2][0].creationRequestId); expect(calls.create.mock.calls[0][0].creationRequestId).not.toBe(calls.create.mock.calls[1][0].creationRequestId)
	})
	it('retries failed Steam settings without importing the same App ID again', async () => {
		calls.bulk.mockRejectedValueOnce(new Error('Fixture settings failure'))
		const { user, sheet } = await open(); await steamRow(user, sheet()); await user.click(sheet().getByRole('button', { name: 'Add Game' }))
		await sheet().findByText('Imported. Its selected settings could not be saved; retry to finish this row.')
		expect(calls.import).toHaveBeenCalledOnce(); expect(sheet().getByRole('button', { name: 'Add without linking to Steam' })).toBeDisabled()
		await user.click(sheet().getByRole('button', { name: 'Retry unfinished (1)' })); await waitFor(() => expect(calls.open).toHaveBeenCalled())
		expect(calls.import).toHaveBeenCalledOnce(); expect(calls.bulk).toHaveBeenCalledTimes(2); expect(calls.create).not.toHaveBeenCalled()
		expect(calls.bulk.mock.calls.every(([payload]) => JSON.stringify(payload.gameIds) === '[200]')).toBe(true)
	})
	it('does not overwrite an existing Steam game merely because it was in an import response', async () => {
		calls.import.mockResolvedValue({ success: true, created: 0, linked: 0, skipped: 1, importedGames: [{ appId: 570, gdbGameId: 200, name: 'Imported Steam fixture', action: 'exists' }] })
		const { user, sheet } = await open(); await steamRow(user, sheet()); await user.click(sheet().getByRole('button', { name: 'Add Game' })); await waitFor(() => expect(calls.open).toHaveBeenCalled())
		expect(calls.bulk).not.toHaveBeenCalled(); expect(calls.create).not.toHaveBeenCalled()
	})
	it('prevents same-tick duplicate submits and never continues old-account work in a new account', async () => {
		let resolve!: (game: ReturnType<typeof createGame>) => void; const pending = new Promise<ReturnType<typeof createGame>>(yes => { resolve = yes }); calls.create.mockReturnValue(pending)
		const { user, sheet, store } = await open(); await user.type(sheet().getByRole('textbox', { name: 'Title' }), 'First fixture'); await steamRow(user, sheet())
		const form = document.getElementById('gdb-create-game-form')!; fireEvent.submit(form); fireEvent.submit(form); expect(calls.create).toHaveBeenCalledOnce()
		act(() => { store.dispatch({ type: 'auth/login/fulfilled', payload: { userId: 2, username: 'Other fixture', role: 'Standard', token: 'other-fixture', refreshToken: null } }) })
		await act(async () => { resolve(createGame({ id: 100 })); await pending })
		expect(screen.queryByRole('dialog', { name: 'Add Game' })).not.toBeInTheDocument(); expect(calls.import).not.toHaveBeenCalled(); expect(calls.open).not.toHaveBeenCalled()
	})
})
