import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { createGame } from '@/test/factories'
import type { OnboardingState } from '@/models/api/Onboarding'
import i18n from '@/i18n'
import { OnboardingProvider } from './OnboardingProvider'
import { OnboardingGuide } from './OnboardingGuide'
import { useOnboarding, type OnboardingContextValue } from './onboardingContext'

const mocks = vi.hoisted(() => ({ get: vi.fn(), start: vi.fn(), save: vi.fn(), create: vi.fn(), views: vi.fn(), change: vi.fn() }))
vi.mock('@/services/CollectionService/OnboardingService', () => ({ getOnboarding: mocks.get, startOnboarding: mocks.start, saveOnboarding: mocks.save, createTutorialSamples: mocks.create, createTutorialViews: mocks.views, changeTutorialSamples: mocks.change }))
vi.mock('@/components/Collection/GameArtwork', () => ({ GameArtwork: () => <span>Artwork</span> }))
const auth = { user: { id: 1, username: 'Fixture', role: 'Admin' }, token: 'fixture', refreshToken: null, isAuthenticated: true, loading: false, error: null } as const
let state: OnboardingState
const Probe = () => { const guide = useOnboarding(); return <><button type='button' onClick={() => { void guide?.openGuide() }}>Open guide</button><button type='button' onClick={() => { void guide?.openGuide(false, 'finish') }}>Manage examples</button><span>{guide?.data?.step}</span></> }
const renderGuide = (authenticated = true) => renderWithProviders(<OnboardingProvider><Probe /><OnboardingGuide onAddGame={vi.fn()} onOpenGame={vi.fn()} onRandomGame={vi.fn()} /></OnboardingProvider>, { preloadedState: authenticated ? { auth } : undefined })
describe('owned onboarding and explicit sample choices', () => {
	beforeEach(async () => {
		vi.clearAllMocks(); await i18n.changeLanguage('en')
		state = { version: '3.0.0', revision: 0, enabled: false, step: 'welcome', sampleGames: [], samplePlaylists: 0, sampleLists: [] }
		mocks.get.mockImplementation(async () => structuredClone(state))
		mocks.start.mockImplementation(async (revision: number, restart: boolean) => { state = { ...state, revision: revision + 1, enabled: true, step: restart ? 'welcome' : state.step }; return structuredClone(state) })
		mocks.save.mockImplementation(async (revision: number, step: OnboardingState['step'], enabled: boolean, complete: boolean) => { state = { ...state, revision: revision + 1, step, enabled, completedVersion: complete ? '3.0.0' : null }; return structuredClone(state) })
		mocks.create.mockImplementation(async (revision: number) => { state = { ...state, revision: revision + 1, step: 'library', sampleGames: [createGame({ id: 77, isSample: true })], samplePlaylists: 1 }; return structuredClone(state) })
		mocks.views.mockImplementation(async (revision: number) => { state = { ...state, revision: revision + 1, exampleViews: [{ id: 201, name: 'Example · Favorites', description: 'Keeps favorites ready.', isPublic: true }, { id: 202, name: 'Example · Not rated', isPublic: true }, { id: 203, name: 'Example · Short games', isPublic: true }] }; return structuredClone(state) })
	})
	it('anonymous and existing accounts never get automatic writes or example games', async () => {
		const anonymous = renderGuide(false); expect(mocks.get).not.toHaveBeenCalled(); anonymous.unmount()
		renderGuide(); await waitFor(() => expect(mocks.get).toHaveBeenCalledOnce()); expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
		expect(mocks.start).not.toHaveBeenCalled(); expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled()
	})
	it('new accounts see the guide without creating or saving any collection data', async () => {
		state.enabled = true; renderGuide(); expect(await screen.findByRole('dialog', { name: 'Getting started' })).toBeInTheDocument()
		expect(mocks.start).not.toHaveBeenCalled(); expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled()
	})
	it('the own-library choice advances only guide progress', async () => {
		state.enabled = true; renderGuide(); await screen.findByRole('dialog', { name: 'Getting started' })
		await userEvent.click(screen.getByRole('button', { name: 'Use my library' })); await screen.findByRole('heading', { name: 'Add and edit games' })
		expect(mocks.save).toHaveBeenCalledWith(0, 'library', true, false, expect.any(AbortSignal)); expect(mocks.create).not.toHaveBeenCalled()
	})
	it('sample creation needs the explicit button and blocks same-tick double submission', async () => {
		state.enabled = true; let resolve!: (state: OnboardingState) => void; const pending = new Promise<OnboardingState>(yes => { resolve = yes }); mocks.create.mockReturnValue(pending)
		renderGuide(); await screen.findByRole('dialog', { name: 'Getting started' }); const button = screen.getByRole('button', { name: 'Try six example games' })
		fireEvent.click(button); fireEvent.click(button); expect(mocks.create).toHaveBeenCalledOnce()
		await act(async () => { state = { ...state, step: 'library', revision: 1 }; resolve(state); await pending })
	})
	it('opening sample management uses the revision returned by reactivation', async () => {
		renderGuide(); await waitFor(() => expect(mocks.get).toHaveBeenCalled())
		await userEvent.click(screen.getByRole('button', { name: 'Manage examples' })); await screen.findByRole('heading', { name: 'Your library is ready' })
		expect(mocks.start).toHaveBeenCalledWith(0, false, expect.any(AbortSignal)); expect(mocks.save).toHaveBeenCalledWith(1, 'finish', true, false, expect.any(AbortSignal))
	})
	it('pause and resume retain the current chapter, not a browser-global completion flag', async () => {
		state.enabled = true; state.step = 'progress'; renderGuide(); await screen.findByRole('heading', { name: 'Keep track of your progress' })
		await userEvent.click(screen.getByRole('button', { name: 'Not now' })); await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
		await userEvent.click(screen.getByRole('button', { name: 'Open guide' })); await screen.findByRole('heading', { name: 'Keep track of your progress' }); expect(mocks.create).not.toHaveBeenCalled()
	})
	it('failed writes stay visible and are retried only by another explicit action', async () => {
		state.enabled = true; mocks.create.mockRejectedValueOnce(new Error('Fixture failure')); renderGuide(); await screen.findByRole('dialog', { name: 'Getting started' })
		await userEvent.click(screen.getByRole('button', { name: 'Try six example games' })); expect(await screen.findByRole('alert')).toHaveTextContent('could not be saved')
		expect(mocks.create).toHaveBeenCalledOnce(); expect(screen.getByRole('button', { name: 'Try six example games' })).toBeEnabled()
	})
	it('reloads a conflicting guide revision before an explicit retry and can restart the guide', async () => {
		state.enabled = true; mocks.create.mockRejectedValueOnce(Object.assign(new Error('Fixture conflict'), { status: 409 })); renderGuide(); await screen.findByRole('dialog', { name: 'Getting started' })
		await userEvent.click(screen.getByRole('button', { name: 'Try six example games' })); expect(await screen.findByRole('alert')).toHaveTextContent(i18n.t('guide.conflict'))
		state.revision = 9; await userEvent.click(screen.getByRole('button', { name: i18n.t('guide.reload') })); await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
		await userEvent.click(screen.getByRole('button', { name: 'Try six example games' })); await screen.findByRole('heading', { name: 'Add and edit games' }); expect(mocks.create).toHaveBeenLastCalledWith(9, expect.any(AbortSignal), 'en')
		await userEvent.click(screen.getByRole('button', { name: 'Manage examples' })); await screen.findByRole('heading', { name: 'Your library is ready' }); await userEvent.click(screen.getByRole('button', { name: i18n.t('guide.restart') })); await screen.findByRole('heading', { name: 'Set up your library' })
		expect(mocks.start).toHaveBeenLastCalledWith(expect.any(Number), true, expect.any(AbortSignal))
	})
	it('a cleanup review freezes exact IDs and timestamps until confirmation', async () => {
		state.enabled = true; state.step = 'finish'; state.hasSamples = true; state.sampleGames = [createGame({ id: 77, name: 'Example game', isSample: true, updatedAt: '2026-11-25T12:00:00Z' })]; state.sampleLists = [{ id: 9, name: 'Example playlist', createdAt: '2026-11-25T12:00:00Z', updatedAt: '2026-11-25T12:00:00Z' }]; state.samplePlaylists = 1
		mocks.change.mockRejectedValue(Object.assign(new Error('Fixture conflict'), { status: 409 })); renderGuide(); await screen.findByRole('heading', { name: 'Your library is ready' })
		await userEvent.click(screen.getByRole('button', { name: 'Remove the examples' })); await screen.findByRole('alertdialog')
		await userEvent.click(screen.getAllByRole('button', { name: 'Remove the examples' }).at(-1)!); await waitFor(() => expect(mocks.change).toHaveBeenCalled())
		expect(mocks.change.mock.calls[0][0]).toEqual({ revision: 0, confirm: true, removeEditedSamples: false, expectedGames: [{ id: 77, updatedAt: '2026-11-25T12:00:00Z' }], expectedPlaylists: [{ id: 9, updatedAt: '2026-11-25T12:00:00Z' }] })
		expect(screen.getByRole('alertdialog')).toHaveTextContent('changed in another window')
	})
	it('keeps reviewed examples only on confirmation and then completes the guide without creating another batch', async () => {
		state = { ...state, enabled: true, step: 'finish', hasSamples: true, sampleGames: [createGame({ id: 77, name: 'Reviewed example', isSample: true, updatedAt: '2026-11-25T12:00:00Z' })] }
		const kept = { ...state, revision: 1, hasSamples: false, sampleGames: [] }
		mocks.change.mockImplementationOnce(async () => { state = kept; return { state: kept, removedGames: 0, keptGames: 1, removedPlaylists: 0, keptPlaylists: 0 } })
		renderGuide(); await screen.findByRole('heading', { name: 'Your library is ready' })
		await userEvent.click(screen.getByRole('button', { name: i18n.t('guide.keep') })); expect(mocks.change).not.toHaveBeenCalled()
		const confirm = screen.getByRole('alertdialog'); expect(confirm).toHaveTextContent('Reviewed example')
		await userEvent.click(screen.getAllByRole('button', { name: i18n.t('guide.keep') }).at(-1)!)
		await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()); expect(mocks.change.mock.calls[0][1]).toBe(false)
		expect(mocks.change.mock.calls[0][0].expectedGames).toEqual([{ id: 77, updatedAt: '2026-11-25T12:00:00Z' }]); expect(mocks.create).not.toHaveBeenCalled()
		await userEvent.click(screen.getByRole('button', { name: 'Finish guide' })); await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
		expect(mocks.save).toHaveBeenLastCalledWith(1, 'finish', false, true, expect.any(AbortSignal))
	})
	it('ignores old account callbacks and cancels a pending sample request before switching owners', async () => {
		let context!: OnboardingContextValue
		const Observer = () => { context = useOnboarding()!; return <span>{context.data?.step}</span> }
		const { store } = renderWithProviders(<OnboardingProvider><Observer /></OnboardingProvider>, { preloadedState: { auth } })
		await waitFor(() => expect(context.data?.step).toBe('welcome')); const old = context
		let resolve!: (state: OnboardingState) => void
		const pending = new Promise<OnboardingState>(yes => { resolve = yes }); mocks.create.mockReturnValueOnce(pending)
		let sampleRequest!: Promise<OnboardingState | null>
		act(() => { sampleRequest = old.createSamples() }); const signal = mocks.create.mock.calls[0][1] as AbortSignal
		state = { ...state, step: 'organize', revision: 4, enabled: true }
		act(() => store.dispatch({ type: 'auth/login/fulfilled', payload: { userId: 2, username: 'Another account', role: 'Standard', token: 'fixture-other', refreshToken: null } }))
		expect(signal.aborted).toBe(true); expect(context.data).toBeNull()
		await waitFor(() => expect(context.data?.step).toBe('organize'))
		await act(async () => { await old.openGuide(); await old.createSamples(); old.hide(); resolve({ ...state, step: 'finish', sampleGames: [createGame({ id: 88 })] }); await sampleRequest })
		expect(mocks.create).toHaveBeenCalledOnce(); expect(mocks.start).not.toHaveBeenCalled(); expect(context.data?.step).toBe('organize'); expect(context.data?.sampleGames).toEqual([]); expect(context.open).toBe(true)
	})
	it('explains retained views and creates them only from the explicit views action', async () => {
		state = { ...state, enabled: true, step: 'views', exampleViews: [] }; renderGuide(); await screen.findByRole('heading', { name: 'Keep useful views ready' })
		expect(mocks.views).not.toHaveBeenCalled(); expect(screen.getByText(/remain available after the guide/)).toBeInTheDocument()
		await userEvent.click(screen.getByRole('button', { name: 'Add three example views' })); await screen.findByRole('button', { name: /Example · Favorites/ })
		expect(mocks.views).toHaveBeenCalledExactlyOnceWith(0, expect.any(AbortSignal), 'en'); expect(mocks.create).not.toHaveBeenCalled(); expect(state.sampleGames).toEqual([])
	})
	it('advances from Library to Views when the API supports them, without auto-creating anything', async () => {
		state = { ...state, enabled: true, step: 'library', exampleViews: [] }; renderGuide(); await screen.findByRole('heading', { name: 'Add and edit games' }); await userEvent.click(screen.getByRole('button', { name: 'Continue' })); await screen.findByRole('heading', { name: 'Keep useful views ready' })
		expect(mocks.save).toHaveBeenCalledWith(0, 'views', true, false, expect.any(AbortSignal)); expect(mocks.views).not.toHaveBeenCalled()
	})
	it('returns the actual scrollable dialog to its top when changing a long chapter', async () => {
		state = { ...state, enabled: true, step: 'views', exampleViews: [] }; renderGuide(); await screen.findByRole('heading', { name: 'Keep useful views ready' })
		const dialog = screen.getByRole('dialog'); dialog.scrollTop = 240
		await userEvent.click(screen.getByRole('button', { name: 'Continue' })); await screen.findByRole('heading', { name: 'Give your collection some order' })
		expect(dialog.scrollTop).toBe(0)
	})
})
