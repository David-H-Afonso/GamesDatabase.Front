export {}

/**
 * Phase 6 — E2E: Game CRUD Journeys
 *
 * Tests the game create / read / update / delete user journey:
 * - Create game → appears in list (details panel opens)
 * - Open details → fields visible
 * - Edit name inline → saved
 * - Delete game → confirmation → removed from list
 */

const API = 'https://localhost:7245/api'

const GAME_1 = {
	id: 1,
	name: 'Dark Souls',
	statusId: 1,
	statusName: 'Completado',
	platformId: 1,
	platformName: 'PC',
	score: 9,
	grade: 95,
	critic: 89,
	released: '2018-05-25',
	started: '2023-01-01',
	finished: '2023-02-15',
	comment: 'Awesome game',
	playWithIds: [],
	playWithNames: [],
	logo: null,
	cover: null,
}

const GAMES_LIST = {
	data: [GAME_1],
	page: 1,
	pageSize: 200,
	totalCount: 1,
	totalPages: 1,
	hasNextPage: false,
	hasPreviousPage: false,
}

describe('Game CRUD Journeys', () => {
	beforeEach(() => {
		cy.login('Admin')
		cy.mockApiRoutes()
	})

	// ── 6.2 Crear juego → aparece en lista ────────────────────────────────────

	it('creating a game opens the details panel for the new game', () => {
		const newGame = {
			id: 99,
			name: 'New Test Game',
			statusId: 1,
			statusName: 'Completado',
			platformId: null,
			platformName: null,
			score: null,
			grade: null,
			critic: null,
			playWithIds: [],
			playWithNames: [],
		}

		cy.intercept('GET', `${API}/games*`, GAMES_LIST).as('getGames')
		cy.intercept('POST', `${API}/games`, { statusCode: 201, body: newGame }).as('createGame')
		cy.intercept('GET', `${API}/games/99*`, newGame).as('getNewGame')

		cy.visit('/')
		cy.wait('@getGames')

		cy.createGame('New Test Game')
		cy.wait('@createGame')

		// After creation, GameDetails panel opens for the new game
		cy.get('.game-details').should('be.visible')
		cy.contains('New Test Game').should('be.visible')
	})

	// ── 6.2 Abrir detalles → todos los campos visibles ────────────────────────

	it('clicking a game row opens the details panel with correct data', () => {
		cy.intercept('GET', `${API}/games*`, GAMES_LIST).as('getGames')

		cy.visit('/')
		cy.wait('@getGames')

		// Click the first game row to open details
		cy.get('.game-row').first().click()

		cy.get('.game-details').should('be.visible')
		cy.get('.game-details').within(() => {
			cy.contains('Dark Souls').should('be.visible')
		})
	})

	// ── 6.2 Editar nombre inline → guardado ───────────────────────────────────

	it('editing game name inline sends a PUT request', () => {
		cy.intercept('GET', `${API}/games*`, GAMES_LIST).as('getGames')
		cy.intercept('PUT', `${API}/games/1`, { statusCode: 200, body: { ...GAME_1, name: 'Dark Souls Remastered' } }).as('updateGame')

		cy.visit('/')
		cy.wait('@getGames')

		cy.get('.game-row').first().click()
		cy.get('.game-details').should('be.visible')

		// The name is rendered in an EditableField; click it to enter edit mode
		cy.get('.game-details .editable-field').first().click()
		cy.get('.game-details .editable-field-input').first().clear().type('Dark Souls Remastered{enter}')

		cy.wait('@updateGame').then((interception) => {
			expect(interception.request.body).to.deep.include({ name: 'Dark Souls Remastered' })
		})
	})

	// ── 6.2 Borrar juego → confirmación → eliminado ───────────────────────────

	it('deleting a game after confirmation removes it from the list', () => {
		const gamesAfterDelete = { ...GAMES_LIST, data: [], totalCount: 0 }

		cy.intercept('GET', `${API}/games*`, GAMES_LIST).as('getGames')
		cy.intercept('DELETE', `${API}/games/1`, { statusCode: 204, body: null }).as('deleteGame')

		cy.visit('/')
		cy.wait('@getGames')

		cy.get('.game-row').first().click()
		cy.get('.game-details').should('be.visible')

		// Override games list to return empty after delete
		cy.intercept('GET', `${API}/games*`, gamesAfterDelete).as('getGamesAfterDelete')

		// Click delete and confirm the browser dialog
		cy.on('window:confirm', () => true)
		cy.get('[aria-label="Delete game"]').click()

		cy.wait('@deleteGame')
		cy.wait('@getGamesAfterDelete')

		cy.get('.game-details').should('not.exist')
		cy.get('.home-component__no-games').should('be.visible')
	})
})
