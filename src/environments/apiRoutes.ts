/**
 * API endpoints configuration
 * Centralized location for all API routes used across the application
 */
export const apiRoutes = {
	/** Games endpoints */
	games: {
		base: '/games',
		byId: (id: number) => `/games/${id}`,
		create: '/games',
		update: (id: number) => `/games/${id}`,
		delete: (id: number) => `/games/${id}`,
	},

	/** Game Status endpoints */
	gameStatus: {
		base: '/gamestatus',
		special: '/gamestatus/special',
		reassignSpecial: '/gamestatus/reassign-special',
		active: '/gamestatus/active',
		byId: (id: number) => `/gamestatus/${id}`,
		create: '/gamestatus',
		update: (id: number) => `/gamestatus/${id}`,
		delete: (id: number) => `/gamestatus/${id}`,
	},

	/** Game Platform endpoints */
	gamePlatform: {
		base: '/gameplatforms',
		active: '/gameplatforms/active',
		byId: (id: number) => `/gameplatforms/${id}`,
		create: '/gameplatforms',
		update: (id: number) => `/gameplatforms/${id}`,
		delete: (id: number) => `/gameplatforms/${id}`,
	},

	/** Game Play With endpoints */
	gamePlayWith: {
		base: '/gameplaywith',
		active: '/gameplaywith/active',
		byId: (id: number) => `/gameplaywith/${id}`,
		create: '/gameplaywith',
		update: (id: number) => `/gameplaywith/${id}`,
		delete: (id: number) => `/gameplaywith/${id}`,
	},

	/** Game Played Status endpoints */
	gamePlayedStatus: {
		base: '/gameplayedstatus',
		active: '/gameplayedstatus/active',
		byId: (id: number) => `/gameplayedstatus/${id}`,
		create: '/gameplayedstatus',
		update: (id: number) => `/gameplayedstatus/${id}`,
		delete: (id: number) => `/gameplayedstatus/${id}`,
	},

	/** Data Export endpoints */
	dataExport: {
		gamesCSV: '/DataExport/games/csv',
	},
} as const

/**
 * Type for API routes structure
 * Provides type safety when accessing routes
 */
export type ApiRoutes = typeof apiRoutes
