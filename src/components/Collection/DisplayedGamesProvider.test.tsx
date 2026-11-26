import { act, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { DisplayedGamesProvider } from './DisplayedGamesProvider'
import { useDisplayedGamesScope } from './displayedGamesContext'
import { useDisplayedGames } from '@/hooks/useDisplayedGames'

const auth = { user: { id: 1, username: 'Scope fixture', role: 'Standard' }, token: 'fixture', refreshToken: null, isAuthenticated: true, loading: false, error: null } as const
let context: ReturnType<typeof useDisplayedGamesScope>
const Probe = () => { context = useDisplayedGamesScope(); return <output data-testid='scope'>{JSON.stringify(context?.scope ?? null)}</output> }
const Register = ({ ids, query = 'page1', loading = false }: { ids: number[]; query?: string; loading?: boolean }) => { useDisplayedGames(ids.map(id => ({ id })), query, loading); return null }
const value = () => JSON.parse(screen.getByTestId('scope').textContent!)

describe('displayed page registry — never a global search or an all-matches pool', () => {
	beforeEach(() => { context = null })
	it('registers only valid distinct IDs, with exact owner/route/query identity and loading state', () => {
		const view = renderWithProviders(<DisplayedGamesProvider><Register ids={[1, 2, 2, -1, 1.5]} /><Probe /></DisplayedGamesProvider>, { preloadedState: { auth }, route: '/library?page=2' })
		expect(value()).toMatchObject({ ownerId: 1, route: '/library?page=2', gameIds: [1, 2], loading: false }); expect(value().signature).toContain('page1')
		view.rerender(<DisplayedGamesProvider><Register ids={[1, 2]} query='page2' loading /><Probe /></DisplayedGamesProvider>)
		expect(value()).toMatchObject({ gameIds: [1, 2], loading: true }); expect(value().signature).toContain('page2')
	})
	it('does not let an older component cleanup clear a newer visible registration', () => {
		const view = renderWithProviders(<DisplayedGamesProvider><Register key='old' ids={[1]} /><Register key='current' ids={[2]} /><Probe /></DisplayedGamesProvider>, { preloadedState: { auth } })
		expect(value().gameIds).toEqual([2])
		view.rerender(<DisplayedGamesProvider><Register key='current' ids={[2]} /><Probe /></DisplayedGamesProvider>)
		expect(value().gameIds).toEqual([2])
	})
	it('clears its own registration on unmount, without retaining an empty fake library', () => {
		const view = renderWithProviders(<DisplayedGamesProvider><Register ids={[1]} /><Probe /></DisplayedGamesProvider>, { preloadedState: { auth } })
		view.rerender(<DisplayedGamesProvider><Probe /></DisplayedGamesProvider>); expect(value()).toBeNull()
	})
	it('hides old-account scope immediately and refuses old-account late registrations', () => {
		const { store } = renderWithProviders(<DisplayedGamesProvider><Probe /></DisplayedGamesProvider>, { preloadedState: { auth } })
		const register = context!.register
		act(() => { register({ ownerId: 1, route: '/library', signature: 'first', gameIds: [1], loading: false }) }); expect(value().ownerId).toBe(1)
		act(() => { store.dispatch({ type: 'auth/login/fulfilled', payload: { userId: 2, username: 'Other fixture', role: 'Standard', token: 'other-fixture', refreshToken: null } }) }); expect(value()).toBeNull()
		act(() => { register({ ownerId: 1, route: '/library', signature: 'late', gameIds: [99], loading: false }) }); expect(value()).toBeNull()
		act(() => { register({ ownerId: 2, route: '/library', signature: 'second', gameIds: [2], loading: false }) }); expect(value().gameIds).toEqual([2])
	})
})
