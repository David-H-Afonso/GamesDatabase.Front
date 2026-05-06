import { userService } from './UserService'
import { customFetch } from '@/utils/customFetch'

vi.mock('@/utils/customFetch', () => ({
	customFetch: vi.fn(),
}))

vi.mock('@/environments', () => ({
	environment: {
		baseUrl: 'https://localhost:7245/api',
		fallbackUrl: 'http://localhost:5011/api',
		apiRoutes: {
			users: {
				base: '/users',
				byId: (id: number) => `/users/${id}`,
				create: '/users',
				update: (id: number) => `/users/${id}`,
				delete: (id: number) => `/users/${id}`,
				changePassword: (id: number) => `/users/${id}/change-password`,
			},
			auth: { login: '/auth/login', logout: '/auth/logout' },
			games: {
				base: '/games',
				byId: (id: number) => `/games/${id}`,
				create: '/games',
				update: (id: number) => `/games/${id}`,
				delete: (id: number) => `/games/${id}`,
				bulkUpdate: '/games/bulk',
			},
			gameStatus: {
				base: '/gamestatus',
				special: '/gamestatus/special',
				active: '/gamestatus/active',
				reassignSpecial: '/gamestatus/reassign-special',
				byId: (id: number) => `/gamestatus/${id}`,
				create: '/gamestatus',
				update: (id: number) => `/gamestatus/${id}`,
				delete: (id: number) => `/gamestatus/${id}`,
				reorder: '/gamestatus/reorder',
			},
			gamePlatform: {
				base: '/gameplatforms',
				active: '/gameplatforms/active',
				byId: (id: number) => `/gameplatforms/${id}`,
				create: '/gameplatforms',
				update: (id: number) => `/gameplatforms/${id}`,
				delete: (id: number) => `/gameplatforms/${id}`,
				reorder: '/gameplatforms/reorder',
			},
			gamePlayWith: {
				base: '/gameplaywith',
				active: '/gameplaywith/active',
				byId: (id: number) => `/gameplaywith/${id}`,
				create: '/gameplaywith',
				update: (id: number) => `/gameplaywith/${id}`,
				delete: (id: number) => `/gameplaywith/${id}`,
				reorder: '/gameplaywith/reorder',
			},
			gamePlayedStatus: {
				base: '/gameplayedstatus',
				active: '/gameplayedstatus/active',
				byId: (id: number) => `/gameplayedstatus/${id}`,
				create: '/gameplayedstatus',
				update: (id: number) => `/gameplayedstatus/${id}`,
				delete: (id: number) => `/gameplayedstatus/${id}`,
				reorder: '/gameplayedstatus/reorder',
			},
			gameViews: {
				base: '/gameviews',
				public: '/gameviews/public',
				byId: (id: number) => `/gameviews/${id}`,
				create: '/gameviews',
				update: (id: number) => `/gameviews/${id}`,
				delete: (id: number) => `/gameviews/${id}`,
				configuration: (id: number) => `/gameviews/${id}/configuration`,
			},
		},
		pagination: { defaultPageSize: 50 },
	},
}))

const mockFetch = vi.mocked(customFetch)

describe('UserService', () => {
	beforeEach(() => vi.clearAllMocks())

	it('getAllUsers calls GET on users base', async () => {
		const users = [{ id: 1, username: 'Admin', role: 'Admin' }]
		mockFetch.mockResolvedValue(users)
		const result = await userService.getAllUsers()
		expect(mockFetch).toHaveBeenCalledWith('/users')
		expect(result).toEqual(users)
	})

	it('getUserById calls GET with user id', async () => {
		const user = { id: 1, username: 'Admin', role: 'Admin' }
		mockFetch.mockResolvedValue(user)
		const result = await userService.getUserById(1)
		expect(mockFetch).toHaveBeenCalledWith('/users/1')
		expect(result).toEqual(user)
	})

	it('createUser calls POST with user data', async () => {
		const newUser = { id: 2, username: 'Player', role: 'Standard' }
		mockFetch.mockResolvedValue(newUser)
		const result = await userService.createUser({ username: 'Player', role: 'Standard' as const })
		expect(mockFetch).toHaveBeenCalledWith('/users', expect.objectContaining({ method: 'POST' }))
		expect(result).toEqual(newUser)
	})

	it('updateUser calls PUT with id and data', async () => {
		mockFetch.mockResolvedValue(undefined)
		await userService.updateUser(1, { username: 'UpdatedName' })
		expect(mockFetch).toHaveBeenCalledWith('/users/1', expect.objectContaining({ method: 'PUT' }))
	})

	it('deleteUser calls DELETE with id', async () => {
		mockFetch.mockResolvedValue(undefined)
		await userService.deleteUser(1)
		expect(mockFetch).toHaveBeenCalledWith('/users/1', expect.objectContaining({ method: 'DELETE' }))
	})

	it('changePassword calls POST with password data', async () => {
		mockFetch.mockResolvedValue(undefined)
		await userService.changePassword(1, { newPassword: 'secret123' })
		expect(mockFetch).toHaveBeenCalledWith('/users/1/change-password', expect.objectContaining({ method: 'POST' }))
	})
})
