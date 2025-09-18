import type { AppDispatch } from '@/store'

// Dispatch a thunk and unwrap the result. Throws if the thunk is rejected.
export const dispatchAndUnwrapAsync = async <T>(dispatch: AppDispatch, thunk: any): Promise<T> => {
	const actionResult = await dispatch(thunk)
	if (actionResult.meta && actionResult.meta.requestStatus === 'rejected') {
		const payload = actionResult.payload
		if (payload) throw payload
		throw actionResult.error || new Error('Request rejected')
	}
	return actionResult.payload as T
}
