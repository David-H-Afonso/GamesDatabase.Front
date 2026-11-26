import { act, fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { createGame } from '@/test/factories'
import { CollectionDetailsProvider } from './CollectionDetailsProvider'
import { useCollectionDetails } from './collectionDetailsContext'
import type { Game } from '@/models/api/Game'

const mocks = vi.hoisted(() => ({ close: {} as Record<number, () => void> }))
vi.mock('./CollectionGameDetailsLazy', () => ({ CollectionGameDetails: ({ game, closeDetails }: { game: Game; closeDetails: () => void }) => {
	mocks.close[game.id] = closeDetails
	return <section role='dialog' aria-label={game.name}><input aria-label='Draft' defaultValue='' /><button type='button' onClick={closeDetails}>Close</button></section>
} }))
const first = createGame({ id: 501, name: 'First game' }), second = createGame({ id: 502, name: 'Second game' })
const Trigger = ({ game }: { game: Game }) => { const details = useCollectionDetails(); return <button type='button' onClick={() => details?.open(game)}>Open {game.name}</button> }
const auth = { user: { id: 1, username: 'test', role: 'Admin' }, token: 'test', refreshToken: null, isAuthenticated: true, loading: false, error: null } as const

describe('stable collection details host', () => {
	beforeEach(() => { mocks.close = {} })
	it('retains an open editor draft when a refreshed query replaces every card', async () => {
		const { rerender } = renderWithProviders(<CollectionDetailsProvider><Trigger game={first} /></CollectionDetailsProvider>, { preloadedState: { auth } })
		await userEvent.click(screen.getByRole('button', { name: 'Open First game' }))
		fireEvent.change(screen.getByLabelText('Draft'), { target: { value: 'Unsaved across refresh' } })
		rerender(<CollectionDetailsProvider><p>New query results</p></CollectionDetailsProvider>)
		expect(screen.getByRole('dialog', { name: 'First game' })).toBeInTheDocument()
		expect(screen.getByLabelText('Draft')).toHaveValue('Unsaved across refresh')
	})
	it('does not let a late close from the old game dismiss a newer selection', async () => {
		renderWithProviders(<CollectionDetailsProvider><Trigger game={first} /><Trigger game={second} /></CollectionDetailsProvider>, { preloadedState: { auth } })
		await userEvent.click(screen.getByRole('button', { name: 'Open First game' }))
		const staleClose = mocks.close[first.id]
		await userEvent.click(screen.getByRole('button', { name: 'Open Second game' }))
		act(staleClose)
		expect(screen.getByRole('dialog', { name: 'Second game' })).toBeInTheDocument()
	})
	it('removes the previous account selection immediately on logout', async () => {
		const { store } = renderWithProviders(<CollectionDetailsProvider><Trigger game={first} /></CollectionDetailsProvider>, { preloadedState: { auth } })
		await userEvent.click(screen.getByRole('button', { name: 'Open First game' }))
		act(() => { store.dispatch({ type: 'auth/forceLogout' }) })
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})
	it('closes on route navigation, not on a query refresh', async () => {
		renderWithProviders(<CollectionDetailsProvider><Trigger game={first} /><Link to='/statistics'>Statistics</Link></CollectionDetailsProvider>, { preloadedState: { auth } })
		await userEvent.click(screen.getByRole('button', { name: 'Open First game' }))
		await userEvent.click(screen.getByRole('link', { name: 'Statistics' }))
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})
})
