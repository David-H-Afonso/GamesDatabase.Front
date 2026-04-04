import { authService } from './AuthService'

describe('AuthService', () => {
	beforeEach(() => vi.restoreAllMocks())

	it('login sends POST with credentials and returns response', async () => {
		const loginResponse = { token: 'jwt-token', user: { id: 1, username: 'admin', role: 'Admin' } }
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: vi.fn().mockResolvedValue(loginResponse),
		})

		const result = await authService.login({ username: 'admin', password: 'pass' })

		expect(globalThis.fetch).toHaveBeenCalledWith(
			expect.stringContaining('/users/login'),
			expect.objectContaining({
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username: 'admin', password: 'pass' }),
			})
		)
		expect(result).toEqual(loginResponse)
	})

	it('login throws "Invalid username or password" on 401', async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 })
		await expect(authService.login({ username: 'x', password: 'y' })).rejects.toThrow('Invalid username or password')
	})

	it('login throws server error message on non-401 failure', async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 500,
			json: vi.fn().mockResolvedValue({ message: 'Server error' }),
		})
		await expect(authService.login({ username: 'x', password: 'y' })).rejects.toThrow('Server error')
	})

	it('login throws "Login failed" when error body has no message', async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 500,
			json: vi.fn().mockResolvedValue({}),
		})
		await expect(authService.login({ username: 'x', password: 'y' })).rejects.toThrow('Login failed')
	})

	it('login throws "Login failed" when error body parsing fails', async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 500,
			json: vi.fn().mockRejectedValue(new Error('parse error')),
		})
		await expect(authService.login({ username: 'x', password: 'y' })).rejects.toThrow('Login failed')
	})

	it('logout is a no-op', () => {
		expect(() => authService.logout()).not.toThrow()
	})
})
