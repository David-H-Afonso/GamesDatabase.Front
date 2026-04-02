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
		reorder: '/gamestatus/reorder',
	},

	/** Game Platform endpoints */
	gamePlatform: {
		base: '/gameplatforms',
		active: '/gameplatforms/active',
		byId: (id: number) => `/gameplatforms/${id}`,
		create: '/gameplatforms',
		update: (id: number) => `/gameplatforms/${id}`,
		delete: (id: number) => `/gameplatforms/${id}`,
		reorder: '/gameplatforms/reorder',
	},

	/** Game Play With endpoints */
	gamePlayWith: {
		base: '/gameplaywith',
		active: '/gameplaywith/active',
		byId: (id: number) => `/gameplaywith/${id}`,
		create: '/gameplaywith',
		update: (id: number) => `/gameplaywith/${id}`,
		delete: (id: number) => `/gameplaywith/${id}`,
		reorder: '/gameplaywith/reorder',
	},

	/** Game Played Status endpoints */
	gamePlayedStatus: {
		base: '/gameplayedstatus',
		active: '/gameplayedstatus/active',
		byId: (id: number) => `/gameplayedstatus/${id}`,
		create: '/gameplayedstatus',
		update: (id: number) => `/gameplayedstatus/${id}`,
		delete: (id: number) => `/gameplayedstatus/${id}`,
		reorder: '/gameplayedstatus/reorder',
	},

	/** Data Export endpoints */
	dataExport: {
		gamesCSV: '/DataExport/games/csv',
		fullExport: '/DataExport/full',
		fullImport: '/DataExport/full',
		selectiveExport: '/DataExport/selective-games-export',
		selectiveImport: '/DataExport/selective-games-import',
		zip: '/Export/zip',
		syncToNetwork: '/Export/sync-to-network',
		analyzeFolders: '/DataExport/analyze-folders',
		analyzeDuplicateGames: '/DataExport/analyze-duplicate-games',
		updateImageUrls: '/DataExport/update-image-urls',
		clearImageCache: '/DataExport/clear-image-cache',
	},

	/** Game Views endpoints */
	gameViews: {
		base: '/gameviews',
		byId: (id: number) => `/gameviews/${id}`,
		create: '/gameviews',
		update: (id: number) => `/gameviews/${id}`,
		delete: (id: number) => `/gameviews/${id}`,
	},

	/** Game Replay Type endpoints */
	gameReplayTypes: {
		base: '/gamereplaytypes',
		active: '/gamereplaytypes/active',
		special: '/gamereplaytypes/special',
		byId: (id: number) => `/gamereplaytypes/${id}`,
		create: '/gamereplaytypes',
		update: (id: number) => `/gamereplaytypes/${id}`,
		delete: (id: number) => `/gamereplaytypes/${id}`,
		reorder: '/gamereplaytypes/reorder',
	},

	/** Game Replay endpoints */
	gameReplays: {
		byGameId: (gameId: number) => `/games/${gameId}/replays`,
		byId: (gameId: number, id: number) => `/games/${gameId}/replays/${id}`,
	},

	/** Game History endpoints */
	gameHistory: {
		byGameId: (gameId: number) => `/games/${gameId}/history`,
		entryById: (gameId: number, entryId: number) => `/games/${gameId}/history/${entryId}`,
		global: '/games/history',
		adminGlobal: '/admin/history',
	},

	/** User endpoints */
	users: {
		login: '/users/login',
		base: '/users',
		byId: (id: number) => `/users/${id}`,
		create: '/users',
		update: (id: number) => `/users/${id}`,
		delete: (id: number) => `/users/${id}`,
		changePassword: (id: number) => `/users/${id}/password`,
	},
} as const

/**
 * Type for API routes structure
 * Provides type safety when accessing routes
 */
export type ApiRoutes = typeof apiRoutes
