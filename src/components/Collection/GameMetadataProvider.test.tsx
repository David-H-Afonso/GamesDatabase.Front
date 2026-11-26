import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createGame } from '@/test/factories'
import { GameMetadataProvider } from './GameMetadataProvider'
import { useGameMetadata } from './gameMetadataContext'

let ownerId: number | undefined = 1
vi.mock('@/store/hooks', () => ({ useAppSelector: (selector: (state: unknown) => unknown) => selector({ auth: { isAuthenticated: Boolean(ownerId), user: ownerId ? { id: ownerId } : null } }) }))

describe('metadata selections are scoped to the current account', () => {
	beforeEach(() => { ownerId = 1 })
	it('keeps a selection across replaced cards but closes it immediately on account change', () => {
		const { result, rerender } = renderHook(useGameMetadata, { wrapper: GameMetadataProvider })
		const game = createGame({ id: 11, name: 'First account' })
		act(() => result.current!.open(game)); rerender(); expect(result.current!.game).toEqual(game)
		ownerId = 2; rerender(); expect(result.current!.game).toBeNull()
	})
	it('late callbacks from an old account cannot replace or close the current review', () => {
		const { result, rerender } = renderHook(useGameMetadata, { wrapper: GameMetadataProvider })
		const old = result.current!, first = createGame({ id: 11 }), second = createGame({ id: 22 })
		ownerId = 2; rerender(); act(() => result.current!.open(second))
		act(() => { old.open(first); old.close() }); expect(result.current!.game).toEqual(second)
		act(() => result.current!.close(first.id)); expect(result.current!.game).toEqual(second)
		act(() => result.current!.close(second.id)); expect(result.current!.game).toBeNull()
	})
	it('does not retain or create a review after logout', () => {
		const { result, rerender } = renderHook(useGameMetadata, { wrapper: GameMetadataProvider })
		act(() => result.current!.open(createGame())); ownerId = undefined; rerender()
		act(() => result.current!.open(createGame())); expect(result.current!.game).toBeNull()
	})
})
