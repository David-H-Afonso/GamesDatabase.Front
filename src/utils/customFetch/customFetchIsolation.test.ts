import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { waitFor } from '@testing-library/react'
import { customFetch, initCustomFetch } from './customFetch'

vi.mock('@/navigation/router', () => ({ router: { navigate: vi.fn() } }))
vi.mock('@/environments', () => ({ environment: { baseUrl: 'http://local-api.test/api' } }))

describe('authenticated response account isolation', () => {
	let auth: { token: string; refreshToken: string | null; user: { id: number } | null }
	const dispatch = vi.fn(), refreshAction = vi.fn(value => ({ type: 'auth/setRefreshedTokens', payload: value })), logout = vi.fn(() => ({ type: 'auth/forceLogout' }))
	beforeEach(() => {
		vi.clearAllMocks(); auth = { token: 'access-a', refreshToken: 'refresh-a', user: { id: 1 } }
		initCustomFetch({ getState: () => ({ auth }), dispatch }, { purge: vi.fn().mockResolvedValue(undefined) }, logout, refreshAction)
	})
	afterEach(() => vi.unstubAllGlobals())
	it('does not return a previous account response after a switch', async () => {
		let finish!: (response: Response) => void
		vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(resolve => { finish = resolve })))
		const request = customFetch('/games'); const rejected = expect(request).rejects.toThrow('account change')
		auth = { token: 'access-b', refreshToken: 'refresh-b', user: { id: 2 } }; finish(Response.json({ privateGames: ['account a'] }))
		await rejected; expect(dispatch).not.toHaveBeenCalled()
	})
	it('an old 401 cannot refresh or log out the newly selected account', async () => {
		let finish!: (response: Response) => void; const fetch = vi.fn(() => new Promise<Response>(resolve => { finish = resolve })); vi.stubGlobal('fetch', fetch)
		const request = customFetch('/playlists'); const rejected = expect(request).rejects.toThrow('account change')
		auth = { token: 'access-b', refreshToken: 'refresh-b', user: { id: 2 } }; finish(new Response(null, { status: 401 }))
		await rejected; expect(fetch).toHaveBeenCalledOnce(); expect(logout).not.toHaveBeenCalled(); expect(refreshAction).not.toHaveBeenCalled()
	})
	it('does not install a late refresh token from a previous account', async () => {
		let finishRefresh!: (response: Response) => void
		const fetch = vi.fn().mockResolvedValueOnce(new Response(null, { status: 401 })).mockImplementationOnce(() => new Promise<Response>(resolve => { finishRefresh = resolve })); vi.stubGlobal('fetch', fetch)
		const request = customFetch('/games'); const rejected = expect(request).rejects.toThrow('account change')
		await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
		auth = { token: 'access-b', refreshToken: 'refresh-b', user: { id: 2 } }; finishRefresh(Response.json({ token: 'late-a', refreshToken: 'late-refresh-a' }))
		await rejected; expect(refreshAction).not.toHaveBeenCalled(); expect(logout).not.toHaveBeenCalled()
	})
})
