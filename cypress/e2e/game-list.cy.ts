export {}

/**
 * Phase 6 — E2E: Game List Journeys
 *
 * Tests the main game list page:
 * - Page loads with list of games
 * - Pagination (next/prev)
 * - Search filters in real time
 * - Sort by different columns
 * - Toggle card/row view modes
 * - Empty state when no results
 */

const API = 'https://localhost:7245/api'

const PAGED_ONE_PAGE = {
	data: [
		{ id: 1, name: 'Dark Souls', statusId: 1, statusName: 'Completado', platformId: 1, platformName: 'PC', score: 9, grade: 95, critic: 89, playWithIds: [], playWithNames: [] },
		{
			id: 2,
			name: 'Hollow Knight',
			statusId: 1,
			statusName: 'Completado',
			platformId: 1,
			platformName: 'PC',
			score: 9,
			grade: 92,
			critic: null,
			playWithIds: [],
			playWithNames: [],
		},
		{ id: 3, name: 'Celeste', statusId: 2, statusName: 'Pendiente', platformId: 1, platformName: 'PC', score: 8, grade: 88, critic: null, playWithIds: [], playWithNames: [] },
	],
	page: 1,
	pageSize: 200,
	totalCount: 3,
	totalPages: 1,
	hasNextPage: false,
	hasPreviousPage: false,
}

const PAGED_PAGE_ONE = {
	data: [
		{ id: 1, name: 'Dark Souls', statusId: 1, statusName: 'Completado', platformId: 1, platformName: 'PC', score: 9, grade: 95, critic: 89, playWithIds: [], playWithNames: [] },
	],
	page: 1,
	pageSize: 1,
	totalCount: 2,
	totalPages: 2,
	hasNextPage: true,
	hasPreviousPage: false,
}

const PAGED_PAGE_TWO = {
	data: [
		{
			id: 2,
			name: 'Hollow Knight',
			statusId: 1,
			statusName: 'Completado',
			platformId: 1,
			platformName: 'PC',
			score: 9,
			grade: 92,
			critic: null,
			playWithIds: [],
			playWithNames: [],
		},
	],
	page: 2,
	pageSize: 1,
	totalCount: 2,
	totalPages: 2,
	hasNextPage: false,
	hasPreviousPage: true,
}

const PAGED_EMPTY = {
	data: [],
	page: 1,
	pageSize: 200,
	totalCount: 0,
	totalPages: 0,
	hasNextPage: false,
	hasPreviousPage: false,
}

describe('Game List Journeys', () => {
	beforeEach(() => {
		cy.login('Admin')
		cy.mockApiRoutes()
	})

	// ── 6.2 Página carga con lista de juegos ──────────────────────────────────

	it('home page loads and shows the game list', () => {
		cy.visit('/')
		cy.wait('@getGames')
		cy.get('.game-row, .game-card-view-container').should('have.length.gte', 1)
		cy.contains('Dark Souls').should('be.visible')
		cy.contains('Hollow Knight').should('be.visible')
	})

	// ── 6.2 Paginación funciona (next, prev) ──────────────────────────────────

	it('pagination next and prev navigate between pages', () => {
		// Page 1 response
		cy.intercept('GET', `${API}/games*`, (req) => {
			const url = new URL(req.url)
			const page = Number(url.searchParams.get('page') ?? '1')
			req.reply(page === 1 ? PAGED_PAGE_ONE : PAGED_PAGE_TWO)
		}).as('getGamesPage')

		cy.visit('/')
		cy.wait('@getGamesPage')
		cy.contains('Dark Souls').should('be.visible')
		cy.contains(/Page 1 of 2/).should('be.visible')

		// Go to next page
		cy.get('.pagination-btn').last().click()
		cy.wait('@getGamesPage')
		cy.contains('Hollow Knight').should('be.visible')
		cy.contains(/Page 2 of 2/).should('be.visible')

		// Go back to previous page
		cy.get('.pagination-btn').first().click()
		cy.wait('@getGamesPage')
		cy.contains('Dark Souls').should('be.visible')
		cy.contains(/Page 1 of 2/).should('be.visible')
	})

	// ── 6.2 Búsqueda filtra en tiempo real ────────────────────────────────────

	it('search input filters the game list', () => {
		cy.intercept('GET', `${API}/games*`, (req) => {
			const url = new URL(req.url)
			const search = url.searchParams.get('search') ?? ''
			const filtered = PAGED_ONE_PAGE.data.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()))
			req.reply({ ...PAGED_ONE_PAGE, data: filtered, totalCount: filtered.length })
		}).as('getGamesSearch')

		cy.visit('/')
		cy.wait('@getGamesSearch')

		cy.get('#search-input').type('Dark')
		cy.wait('@getGamesSearch')
		cy.contains('Dark Souls').should('be.visible')
		cy.contains('Hollow Knight').should('not.exist')

		cy.get('#search-input').clear()
		cy.wait('@getGamesSearch')
		cy.contains('Hollow Knight').should('be.visible')
	})

	// ── 6.2 Sort por diferentes columnas ──────────────────────────────────────

	it('changing sort triggers a new API request with sortBy parameter', () => {
		cy.intercept('GET', `${API}/games*`, (req) => {
			req.alias = 'getGamesSort'
			const url = new URL(req.url)
			if (url.searchParams.get('sortBy') === 'grade') {
				req.alias = 'getGamesGradeSort'
			}
			req.reply(PAGED_ONE_PAGE)
		})

		cy.visit('/')
		cy.wait('@getGamesSort')

		cy.get('#sort-select').select('grade')
		cy.wait('@getGamesGradeSort').then((interception) => {
			expect(interception.request.url).to.include('sortBy=grade')
		})
	})

	// ── 6.2 Toggle card/row view ──────────────────────────────────────────────

	it('toggling from row to card view changes the game render style', () => {
		cy.visit('/')
		cy.wait('@getGames')

		// Default should be card view
		cy.get('.home-component-games-card').should('exist')

		cy.contains('button', 'Row').first().click()
		cy.get('.home-component-games-row').should('exist')

		cy.contains('button', 'Cards').first().click()
		cy.get('.home-component-games-card').should('exist')
	})

	it('card view shows manual platform playtime before Steam playtime', () => {
		cy.visit('/')
		cy.wait('@getGames')

		cy.contains('.game-card-view-container', 'Dark Souls').within(() => {
			cy.get('.game-card-steam-playtime').should('contain.text', '3h')
			cy.get('.game-card-steam-playtime').should('not.contain.text', '10h')
			cy.get('.game-card-playtime-icon').should('have.attr', 'alt', 'PC')
		})
	})

	// ── 6.2 Empty state cuando no hay resultados ──────────────────────────────

	it('shows empty state when API returns no games', () => {
		cy.intercept('GET', `${API}/games*`, PAGED_EMPTY).as('getGamesEmpty')

		cy.visit('/')
		cy.wait('@getGamesEmpty')

		cy.get('.home-component__no-games').should('be.visible').and('contain.text', 'No games found')
	})
})
