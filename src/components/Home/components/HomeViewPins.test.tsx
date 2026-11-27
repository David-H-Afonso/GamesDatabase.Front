import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { RootState } from '@/store'
import type { GameView } from '@/models/api/GameView'
import { createGameView } from '@/test/factories'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import i18n from '@/i18n'
import HomeComponent from './HomeComponent'

const mocks = vi.hoisted(() => ({ pin: vi.fn(), use: vi.fn(), load: vi.fn().mockResolvedValue(undefined), refresh: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/services/GameViewService/GameViewService', () => ({ setGameViewPinned: mocks.pin, recordGameViewUse: mocks.use }))
vi.mock('@/hooks', async () => {
	const { useSelector } = await import('react-redux')
	return {
		useGames: () => ({ games: [{ id: 101, name: 'Selection fixture' }], loading: false, lastAppliedFilters: {}, pagination: { page: 1, pageSize: 28, totalCount: 1, totalPages: 1 }, refreshGames: mocks.refresh }),
		useGameViews: () => ({ publicGameViews: useSelector((state: RootState) => state.gameViews.publicGameViews), loadPublicGameViews: mocks.load }),
	}
})
vi.mock('@/hooks/useCollectionResource', () => ({ useCollectionResource: () => ({ data: { totalGames: 1 } }) }))
vi.mock('@/components/elements', () => ({ GameCard: () => <span>Selection fixture</span>, GameCardSkeleton: () => null, ConfirmDialog: () => null, Toast: () => null }))
vi.mock('./GameFiltersChips', () => ({ default: (props: { selectedCount: number; onSelectAll: () => void }) => <><button type='button' onClick={props.onSelectAll}>Select displayed</button><span data-testid='selection-count'>{props.selectedCount}</span></> }))
vi.mock('./SelectiveExportModal', () => ({ default: () => null }))
vi.mock('./BulkEditModal', () => ({ default: () => null }))

const auth = { user: { id: 1, username: 'Pin fixture', role: 'Standard' }, token: 'fixture', refreshToken: null, isAuthenticated: true, loading: false, error: null } as const
const renderPins = (views: GameView[], viewId?: number) => renderWithProviders(<HomeComponent />, { route: viewId ? `/library?viewId=${viewId}` : '/library', preloadedState: { auth, gameViews: { gameViews: views, publicGameViews: views, currentGameView: null, loading: false, error: null, filters: {} } } })
const quickPin = (index = 0) => document.querySelectorAll<HTMLButtonElement>('.gdb-quick-view .gdb-view-pin')[index]
const views = () => [createGameView({ id: 1, name: 'Favorites', pinnedSlot: null }), createGameView({ id: 2, name: 'Short games', pinnedSlot: null }), createGameView({ id: 3, name: 'Not rated', pinnedSlot: null })]

describe('owned quick-view pin controls', () => {
	beforeEach(async () => { vi.clearAllMocks(); await i18n.changeLanguage('en'); mocks.use.mockResolvedValue([]) })
	it('pins the displayed second slot by keyboard without selecting the view, clearing selection or changing filters', async () => {
		const initial = views(), user = userEvent.setup(), { store } = renderPins(initial)
		mocks.pin.mockResolvedValue(initial.map(view => ({ ...view, pinnedSlot: view.id === 2 ? 2 : null })))
		await user.click(screen.getByRole('button', { name: 'Select displayed' })); const filters = store.getState().games.filters
		quickPin(1).focus(); await user.keyboard(' ')
		await waitFor(() => expect(quickPin(1)).toHaveAttribute('aria-pressed', 'true'))
		expect(mocks.pin).toHaveBeenCalledExactlyOnceWith(2, true, 2, expect.any(AbortSignal)); expect(mocks.use).not.toHaveBeenCalled()
		expect(screen.getByTestId('selection-count')).toHaveTextContent('1'); expect(store.getState().games.filters).toEqual(filters); expect(store.getState().theme.viewMode).toBe('default')
		expect([...document.querySelectorAll('.gdb-quick-view__choose')].map(button => button.textContent)).toEqual(['Favorites', 'Short games'])
	})
	it('unpins through the same toggle and preserves the other pinned position', async () => {
		const initial = views().map(view => ({ ...view, pinnedSlot: view.id === 1 ? 1 : view.id === 2 ? 2 : null })); renderPins(initial)
		mocks.pin.mockResolvedValue(initial.map(view => ({ ...view, pinnedSlot: view.id === 1 ? null : view.pinnedSlot })))
		await userEvent.click(quickPin()); await waitFor(() => expect(quickPin()).toHaveAttribute('aria-pressed', 'false'))
		expect(mocks.pin).toHaveBeenCalledWith(1, false, 1, expect.any(AbortSignal)); expect(quickPin(1)).toHaveAttribute('aria-pressed', 'true')
	})
	it('exposes an independent selected-view touch control and a clear server limit without optimistic changes', async () => {
		const initial = views().map(view => ({ ...view, pinnedSlot: view.id <= 2 ? view.id : null })), { store } = renderPins(initial, 3)
		mocks.pin.mockRejectedValue(Object.assign(new Error('Private fixture response must never appear'), { status: 409 }))
		const current = document.querySelector<HTMLButtonElement>('.gdb-saved-views > .gdb-view-pin')!
		expect(current).toHaveAccessibleName('Pin view Not rated'); await userEvent.click(current)
		expect(await screen.findByRole('status')).toHaveTextContent('up to two views'); expect(screen.queryByText(/Private fixture/)).not.toBeInTheDocument()
		expect(store.getState().gameViews.publicGameViews.map(view => view.pinnedSlot)).toEqual([1, 2, null]); expect(current).toHaveAttribute('aria-pressed', 'false')
	})
	it('blocks same-tick duplicate requests and aborts a pending pin on unmount', async () => {
		const initial = views(); let resolve!: (answer: GameView[]) => void; mocks.pin.mockReturnValue(new Promise<GameView[]>(yes => { resolve = yes })); const ui = renderPins(initial)
		fireEvent.click(quickPin()); fireEvent.click(quickPin()); expect(mocks.pin).toHaveBeenCalledOnce(); expect(quickPin()).toBeDisabled()
		const signal = mocks.pin.mock.calls[0][3] as AbortSignal; ui.unmount(); expect(signal.aborted).toBe(true)
		await act(async () => { resolve(initial.map(view => ({ ...view, pinnedSlot: view.id === 1 ? 1 : null }))) })
		expect(ui.store.getState().gameViews.publicGameViews[0].pinnedSlot).toBeNull()
	})
	it('ignores a previous account response and leaves the new account isolated', async () => {
		let resolve!: (answer: GameView[]) => void; const initial = views(); mocks.pin.mockReturnValue(new Promise<GameView[]>(yes => { resolve = yes })); const { store } = renderPins(initial)
		fireEvent.click(quickPin()); const signal = mocks.pin.mock.calls[0][3] as AbortSignal
		act(() => { store.dispatch({ type: 'auth/login/fulfilled', payload: { userId: 2, username: 'New owner', role: 'Standard', token: 'other-fixture', refreshToken: null } }) }); expect(signal.aborted).toBe(true)
		await act(async () => { resolve(initial.map(view => ({ ...view, pinnedSlot: 1 }))) })
		expect(store.getState().gameViews.publicGameViews).toEqual([]); expect(document.querySelector('.gdb-view-pin')).toBeNull()
	})
	it('keeps the previous API compatible by hiding unsupported pin controls', () => {
		const legacy = views().map(view => { const result = { ...view }; delete result.pinnedSlot; return result }); renderPins(legacy)
		expect(document.querySelector('.gdb-view-pin')).toBeNull(); expect(mocks.pin).not.toHaveBeenCalled()
	})
})
