/// <reference types="cypress" />

const API = '**/api'

/**
 * Seed auth state into localStorage directly so the app boots as authenticated
 * without going through the UI login flow (used by cy.login via cy.session).
 */
function seedAuthState(userId: number, username: string, role: string, token: string): void {
	const persistedRoot = {
		auth: JSON.stringify({
			user: { id: userId, username, role, useScoreColors: false, scoreProvider: 'Metacritic', showPriceComparisonIcon: false },
			token,
			isAuthenticated: true,
			loading: false,
			error: null,
		}),
		_persist: JSON.stringify({ version: -1, rehydrated: true }),
	}
	localStorage.setItem('persist:root', JSON.stringify(persistedRoot))
	localStorage.setItem('i18nextLng', 'en')
	localStorage.setItem('theme', 'gallery')
	localStorage.setItem('cardStyle', 'cover')
}

/**
 * Log in by seeding auth into localStorage (via cy.session for caching).
 * Usage: cy.login('Admin', 'Admin') or cy.login('StandardUser', 'Standard')
 */
Cypress.Commands.add('login', (username: string, role: 'Admin' | 'Standard' = 'Admin') => {
	cy.session(
		[username, role],
		() => {
			cy.window().then((win) => {
				const userId = role === 'Admin' ? 1 : 2
				seedAuthState(userId, username, role, `mock-jwt-token-${role.toLowerCase()}`)
				win.localStorage.setItem(
					'persist:root',
					JSON.stringify({
						auth: JSON.stringify({
							user: { id: userId, username, role, useScoreColors: false, scoreProvider: 'Metacritic', showPriceComparisonIcon: false },
							token: `mock-jwt-token-${role.toLowerCase()}`,
							isAuthenticated: true,
							loading: false,
							error: null,
						}),
						_persist: JSON.stringify({ version: -1, rehydrated: true }),
					})
				)
			})
		},
		{
			validate() {
				cy.window().then((win) => {
					const raw = win.localStorage.getItem('persist:root')
					if (!raw) throw new Error('No persisted auth state found')
					const parsed = JSON.parse(raw) as Record<string, string>
					const auth = JSON.parse(parsed.auth ?? '{}') as { isAuthenticated?: boolean }
					if (!auth.isAuthenticated) throw new Error('User is not authenticated in persisted state')
				})
			},
		}
	)
})

/**
 * Set up cy.intercept() mocks for all standard API routes the home page needs.
 * Call this in beforeEach() before cy.visit().
 */
Cypress.Commands.add('mockApiRoutes', () => {
	// Fail closed: no unhandled Cypress request can reach a real API/data store.
	cy.intercept('**/api/**', request => {
		if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) throw new Error(`Unmatched Cypress mutation: ${request.method} ${new URL(request.url).pathname}`)
		request.reply({ statusCode: 404, body: { code: 'unmatchedCypressFixture' } })
	})
	cy.intercept('GET', `${API}/onboarding`, { version: '3.0.0', revision: 0, enabled: false, step: 'welcome', hasSamples: false, sampleGames: [], samplePlaylists: 0, sampleLists: [] }).as('getOnboarding')
	cy.intercept('GET', `${API}/users/setup-status`, { defaultCredentialsAvailable: false, defaultUsername: null }).as('setupStatus')
	cy.intercept('POST', `${API}/users/logout`, { statusCode: 200, body: {} })
	cy.intercept('GET', `${API}/playlists*`, []).as('getPlaylists')
	cy.intercept('GET', `${API}/playlist-groups*`, [])
	cy.intercept('GET', `${API}/home/config`, { version: 1, revision: 1, rows: [] }).as('homeConfig')
	cy.intercept('POST', `${API}/home/rows/resolve`, (request) => request.reply((request.body.rows ?? request.body ?? []).map((row: any) => ({ rowId: row.id, state: 'empty', totalMatches: 0, returnedCount: 0, hasMore: false, items: [] }))))
	cy.intercept('GET', `${API}/steam/search*`, [])
	cy.intercept('GET', `${API}/steam/store-search*`, [])
	cy.intercept('GET', `${API}/steam/library-search*`, [])
	// Users / preferences
	cy.fixture('auth.json').then((auth) => {
		cy.intercept('POST', `${API}/users/login`, auth.admin).as('loginRequest')
		cy.intercept('GET', /\/api\/users\/\d+(\?.*)?$/, request => {
			const id = Number(new URL(request.url).pathname.split('/').at(-1)) || 1
			request.reply({ ...auth.preferences, id, userId: id, username: id === 2 ? 'StandardUser' : 'Admin', role: id === 2 ? 'Standard' : 'Admin' })
		}).as('getUserPreferences')
	})

	// Games list (paged result)
	cy.fixture('games.json').then((result) => {
		cy.intercept('GET', /\/api\/games(\?.*)?$/, result).as('getGames')
		cy.intercept('GET', /\/api\/games\/\d+(\?.*)?$/, (req) => req.reply(result.data.find((game: any) => game.id === Number(new URL(req.url).pathname.split('/').at(-1))) ?? result.data[0])).as('getGameDetail')
		cy.intercept('GET', `${API}/games/summary`, { totalGames: result.data.length, completedGames: 0, fullyCompletedGames: 0, favoriteGames: 1, timedGames: 1, effectivePlaytimeMinutes: 180, steamPlaytimeMinutes: 600, ratedGames: 3, averageGrade: 91, achievementsUnlocked: 0, achievementsTotal: 0, lastUpdatedAt: null })
		cy.intercept('POST', `${API}/games`, (req) => req.reply({ statusCode: 201, body: { ...result.data[0], ...req.body, id: 99, score: null, grade: null, critic: null } })).as('createGame')
		cy.intercept('PUT', `${API}/games/*`, (req) => req.reply({ statusCode: 200, body: { ...(result.data.find((game: any) => game.id === Number(new URL(req.url).pathname.split('/').at(-1))) ?? result.data[0]), ...req.body } })).as('updateGame')
	})
	cy.intercept('DELETE', `${API}/games/*`, { statusCode: 204, body: null }).as('deleteGame')

	// Catalog (active lists)
	cy.fixture('catalog.json').then((catalog) => {
		const paged = (data: unknown[]) => ({
			data,
			page: 1,
			pageSize: 200,
			totalCount: data.length,
			totalPages: 1,
			hasNextPage: false,
			hasPreviousPage: false,
		})

		cy.intercept('GET', `${API}/gamestatus*`, paged(catalog.statuses)).as('getAllStatuses')
		cy.intercept('GET', `${API}/gamestatus/special`, catalog.specialStatuses).as('getSpecialStatuses')
		cy.intercept('GET', `${API}/gamestatus/active`, catalog.statuses).as('getStatuses')
		cy.intercept('GET', `${API}/gameplatforms*`, paged(catalog.platforms)).as('getAllPlatforms')
		cy.intercept('GET', `${API}/gameplatforms/active`, catalog.platforms).as('getPlatforms')
	})
	cy.intercept('GET', `${API}/gameplaywith*`, { data: [], page: 1, pageSize: 200, totalCount: 0, totalPages: 1, hasNextPage: false, hasPreviousPage: false }).as('getAllPlayWith')
	cy.intercept('GET', `${API}/gameplaywith/active`, []).as('getPlayWith')
	cy.intercept('GET', `${API}/gameplayedstatus*`, { data: [], page: 1, pageSize: 200, totalCount: 0, totalPages: 1, hasNextPage: false, hasPreviousPage: false }).as('getAllPlayedStatus')
	cy.intercept('GET', `${API}/gameplayedstatus/active`, []).as('getPlayedStatus')
	cy.intercept('GET', `${API}/gamereplaytypes*`, { data: [], page: 1, pageSize: 200, totalCount: 0, totalPages: 1, hasNextPage: false, hasPreviousPage: false }).as('getAllReplayTypes')
	cy.intercept('GET', `${API}/gamereplaytypes/active`, []).as('getReplayTypes')

	// Game views — must return an array, NOT a paged object
	cy.intercept('GET', `${API}/gameviews*`, []).as('getGameViews')
	cy.intercept('POST', `${API}/gameviews/*/use`, []).as('recordViewUse')

	// Replays & History
	cy.intercept('GET', `${API}/games/*/replays`, []).as('getReplays')
	cy.intercept('GET', `${API}/games/*/history`, { data: [], totalCount: 0, page: 1, pageSize: 50, totalPages: 0 }).as('getHistory')
})

/**
 * Open the "Add Game" modal, type the given name, and submit.
 * Expects: mockApiRoutes to be active (POST /games intercept must be in place).
 */
Cypress.Commands.add('createGame', (name: string) => {
	cy.get('.gdb-header__add').click()
	cy.get('.gdb-create-name').first().clear().type(name)
	cy.get('button[type="submit"][form="gdb-create-game-form"]').click()
})
