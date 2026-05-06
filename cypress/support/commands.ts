/// <reference types="cypress" />

const API = 'https://localhost:7245/api'

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
	// Users / preferences
	cy.intercept('POST', `${API}/users/login`, { fixture: 'auth.json#admin' }).as('loginRequest')
	cy.intercept('GET', `${API}/users/*`, { fixture: 'auth.json#preferences' }).as('getUserPreferences')

	// Games list (paged result)
	cy.intercept('GET', `${API}/games*`, { fixture: 'games.json' }).as('getGames')
	cy.intercept('POST', `${API}/games`, (req) => {
		req.reply({
			statusCode: 201,
			body: {
				id: 99,
				name: req.body.name,
				statusId: req.body.statusId ?? 1,
				statusName: 'Completado',
				platformId: null,
				platformName: null,
				score: null,
				grade: null,
				critic: null,
				playWithIds: [],
				playWithNames: [],
			},
		})
	}).as('createGame')
	cy.intercept('PUT', `${API}/games/*`, (req) => {
		req.reply({ statusCode: 200, body: { id: 1, ...req.body } })
	}).as('updateGame')
	cy.intercept('DELETE', `${API}/games/*`, { statusCode: 204, body: null }).as('deleteGame')

	// Catalog (active lists)
	cy.intercept('GET', `${API}/gamestatus/active`, { fixture: 'catalog.json#statuses' }).as('getStatuses')
	cy.intercept('GET', `${API}/gamestatus/special`, { fixture: 'catalog.json#specialStatuses' }).as('getSpecialStatuses')
	cy.intercept('GET', `${API}/gameplatforms/active`, { fixture: 'catalog.json#platforms' }).as('getPlatforms')
	cy.intercept('GET', `${API}/gameplaywith/active`, []).as('getPlayWith')
	cy.intercept('GET', `${API}/gameplayedstatus/active`, []).as('getPlayedStatus')
	cy.intercept('GET', `${API}/gamereplaytypes/active`, []).as('getReplayTypes')

	// Game views — must return an array, NOT a paged object
	cy.intercept('GET', `${API}/gameviews*`, []).as('getGameViews')

	// Replays & History
	cy.intercept('GET', `${API}/games/*/replays`, []).as('getReplays')
	cy.intercept('GET', `${API}/games/*/history`, { data: [], totalCount: 0, page: 1, pageSize: 50, totalPages: 0 }).as('getHistory')
})

/**
 * Open the "Add Game" modal, type the given name, and submit.
 * Expects: mockApiRoutes to be active (POST /games intercept must be in place).
 */
Cypress.Commands.add('createGame', (name: string) => {
	cy.contains('button', 'Add Game').click()
	cy.get('.add-game-row__name-input').clear().type(name)
	cy.get('.create-game-modal__submit').click()
})
