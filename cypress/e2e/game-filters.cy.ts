export {}

/**
 * Phase 6 — E2E: Game Filters Journeys
 *
 * Tests the filter chip interactions on the home page:
 * - Apply status filter → list updates with filtered API call
 * - Multiple filters → combined API parameters
 * - Clear individual chip (reset to "Todos") → filter removed
 * - Clear all filters → full list restored
 * - Filters persist when opening and closing game details
 */

const API = 'https://localhost:7245/api'

const ALL_GAMES = {
	data: [
		{ id: 1, name: 'Dark Souls', statusId: 1, statusName: 'Completado', platformId: 1, platformName: 'PC', score: 9, grade: 95, critic: null, playWithIds: [], playWithNames: [] },
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

const COMPLETADO_GAMES = {
	data: [
		{ id: 1, name: 'Dark Souls', statusId: 1, statusName: 'Completado', platformId: 1, platformName: 'PC', score: 9, grade: 95, critic: null, playWithIds: [], playWithNames: [] },
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
	page: 1,
	pageSize: 200,
	totalCount: 2,
	totalPages: 1,
	hasNextPage: false,
	hasPreviousPage: false,
}

const PC_GAMES_COMPLETADO = {
	data: [
		{ id: 1, name: 'Dark Souls', statusId: 1, statusName: 'Completado', platformId: 1, platformName: 'PC', score: 9, grade: 95, critic: null, playWithIds: [], playWithNames: [] },
	],
	page: 1,
	pageSize: 200,
	totalCount: 1,
	totalPages: 1,
	hasNextPage: false,
	hasPreviousPage: false,
}

describe('Game Filters Journeys', () => {
	beforeEach(() => {
		cy.login('Admin')
		cy.mockApiRoutes()
	})

	// ── 6.2 Aplicar filtro status → lista actualiza ───────────────────────────

	it('applying a status filter updates the API request with statusId', () => {
		cy.intercept('GET', `${API}/games*`, (req) => {
			const url = new URL(req.url)
			const statusId = url.searchParams.get('statusId')
			req.reply(statusId === '1' ? COMPLETADO_GAMES : ALL_GAMES)
		}).as('getFilteredGames')

		cy.visit('/')
		cy.wait('@getFilteredGames')

		// All 3 games visible initially
		cy.get('.game-row, .game-card-view-container').should('have.length', 3)

		// Open status filter chip popover
		cy.contains('button.game-filters-chips__chip', 'Status:').click()

		// Select "Completado" from the popover
		cy.get('.game-filters-chips__popover').should('be.visible')
		cy.contains('.game-filters-chips__option', 'Completado').click()

		cy.wait('@getFilteredGames').then((interception) => {
			expect(interception.request.url).to.include('statusId=1')
		})

		// Only 2 Completado games should be shown
		cy.get('.game-row, .game-card-view-container').should('have.length', 2)
		cy.contains('Celeste').should('not.exist')
	})

	// ── 6.2 Múltiples filtros → resultado combinado ───────────────────────────

	it('applying status and platform filters combines parameters', () => {
		cy.intercept('GET', `${API}/games*`, (req) => {
			const url = new URL(req.url)
			const statusId = url.searchParams.get('statusId')
			const platformId = url.searchParams.get('platformId')

			if (statusId && platformId) {
				req.reply(PC_GAMES_COMPLETADO)
			} else if (statusId) {
				req.reply(COMPLETADO_GAMES)
			} else {
				req.reply(ALL_GAMES)
			}
		}).as('getMultiFiltered')

		cy.visit('/')
		cy.wait('@getMultiFiltered')

		// Apply status filter
		cy.contains('button.game-filters-chips__chip', 'Status:').click()
		cy.contains('.game-filters-chips__option', 'Completado').click()
		cy.wait('@getMultiFiltered')

		// Apply platform filter
		cy.contains('button.game-filters-chips__chip', 'Plataforma:').click()
		cy.contains('.game-filters-chips__option', 'PC').click()

		cy.wait('@getMultiFiltered').then((interception) => {
			expect(interception.request.url).to.include('statusId=1')
			expect(interception.request.url).to.include('platformId=1')
		})

		cy.get('.game-row, .game-card-view-container').should('have.length', 1)
		cy.contains('Dark Souls').should('be.visible')
	})

	// ── 6.2 Limpiar chip individual → filtro eliminado ────────────────────────

	it('clearing the status chip resets the filter', () => {
		cy.intercept('GET', `${API}/games*`, (req) => {
			const url = new URL(req.url)
			const statusId = url.searchParams.get('statusId')
			req.reply(statusId === '1' ? COMPLETADO_GAMES : ALL_GAMES)
		}).as('getClearFilter')

		cy.visit('/')
		cy.wait('@getClearFilter')

		// Apply filter
		cy.contains('button.game-filters-chips__chip', 'Status:').click()
		cy.contains('.game-filters-chips__option', 'Completado').click()
		cy.wait('@getClearFilter')
		cy.get('.game-row, .game-card-view-container').should('have.length', 2)

		// Clear filter by selecting "Todos"
		cy.contains('button.game-filters-chips__chip', 'Status:').click()
		cy.contains('.game-filters-chips__option', 'Todos').click()

		cy.wait('@getClearFilter').then((interception) => {
			expect(interception.request.url).to.not.include('statusId')
		})

		cy.get('.game-row, .game-card-view-container').should('have.length', 3)
	})

	// ── 6.2 Limpiar todos → lista completa ───────────────────────────────────

	it('resetting all filters restores the full list', () => {
		cy.intercept('GET', `${API}/games*`, (req) => {
			const url = new URL(req.url)
			const statusId = url.searchParams.get('statusId')
			req.reply(statusId ? COMPLETADO_GAMES : ALL_GAMES)
		}).as('getResetAll')

		cy.visit('/')
		cy.wait('@getResetAll')

		// Apply a filter
		cy.contains('button.game-filters-chips__chip', 'Status:').click()
		cy.contains('.game-filters-chips__option', 'Completado').click()
		cy.wait('@getResetAll')
		cy.get('.game-row, .game-card-view-container').should('have.length', 2)

		// Close popover by pressing Escape
		cy.get('body').type('{esc}')

		// Reset the status filter to Todos
		cy.contains('button.game-filters-chips__chip', 'Status:').click()
		cy.contains('.game-filters-chips__option', 'Todos').click()

		cy.wait('@getResetAll')
		cy.get('.game-row, .game-card-view-container').should('have.length', 3)
	})

	// ── 6.2 Filtros persisten tras ver detalles ───────────────────────────────

	it('filters applied before opening game details are still active when panel closes', () => {
		cy.intercept('GET', `${API}/games*`, (req) => {
			const url = new URL(req.url)
			const statusId = url.searchParams.get('statusId')
			req.reply(statusId === '1' ? COMPLETADO_GAMES : ALL_GAMES)
		}).as('getFilterPersist')

		cy.visit('/')
		cy.wait('@getFilterPersist')

		// Apply status filter
		cy.contains('button.game-filters-chips__chip', 'Status:').click()
		cy.contains('.game-filters-chips__option', 'Completado').click()
		cy.wait('@getFilterPersist')

		// Open game details
		cy.get('.game-row').first().click()
		cy.get('.game-details').should('be.visible')

		// Close game details
		cy.get('[aria-label="Close details"]').click()
		cy.get('.game-details').should('not.exist')

		// Status chip should still show the active filter
		cy.contains('button.game-filters-chips__chip', 'Status:').should('have.class', 'is-active').and('contain.text', 'Completado')
	})
})
