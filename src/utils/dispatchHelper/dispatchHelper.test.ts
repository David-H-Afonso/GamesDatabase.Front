import { describe, it, expect, vi } from 'vitest'
import { dispatchAndUnwrapAsync } from './dispatchHelper'

// A mock dispatch that returns a pre-set result (mimics RTK's dispatch return shape)
function makeDispatch(result: unknown) {
	return vi.fn().mockResolvedValue(result)
}

describe('dispatchAndUnwrapAsync', () => {
	it('returns the payload on a fulfilled action', async () => {
		const payload = { id: 1, name: 'Zelda' }
		const dispatch = makeDispatch({ meta: { requestStatus: 'fulfilled' }, payload })

		const result = await dispatchAndUnwrapAsync(dispatch as any, 'thunk' as any)

		expect(result).toEqual(payload)
	})

	it('throws the payload when the action is rejected with a payload', async () => {
		const errorPayload = { message: 'Not found', code: 404 }
		const dispatch = makeDispatch({ meta: { requestStatus: 'rejected' }, payload: errorPayload })

		await expect(dispatchAndUnwrapAsync(dispatch as any, 'thunk' as any)).rejects.toEqual(errorPayload)
	})

	it('throws the error object when the action is rejected without a payload', async () => {
		const error = new Error('Network failure')
		const dispatch = makeDispatch({ meta: { requestStatus: 'rejected' }, payload: undefined, error })

		await expect(dispatchAndUnwrapAsync(dispatch as any, 'thunk' as any)).rejects.toEqual(error)
	})

	it('throws a generic error when rejected with no payload and no error', async () => {
		const dispatch = makeDispatch({ meta: { requestStatus: 'rejected' }, payload: undefined, error: undefined })

		await expect(dispatchAndUnwrapAsync(dispatch as any, 'thunk' as any)).rejects.toThrow('Request rejected')
	})

	it('calls dispatch with the provided thunk', async () => {
		const dispatch = makeDispatch({ meta: { requestStatus: 'fulfilled' }, payload: null })
		const thunk = vi.fn()

		await dispatchAndUnwrapAsync(dispatch as any, thunk as any)

		expect(dispatch).toHaveBeenCalledWith(thunk)
	})
})
