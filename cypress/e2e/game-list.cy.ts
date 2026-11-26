import { API, LIBRARY, games, paged } from '../support/fixtures'

describe('Library list journeys', () => {
	beforeEach(() => { cy.login('Admin'); cy.mockApiRoutes() })
	it('Library loads its real-shaped game fixtures', () => {
		cy.visit(LIBRARY); cy.wait('@getGames'); cy.get('.gdb-library-results .game-card').should('have.length', 3)
		cy.contains('.gdb-library-results', 'Dark Souls').should('be.visible'); cy.contains('.gdb-library-results', 'Hollow Knight').should('be.visible')
	})
	it('pagination next and previous preserve the requested pages', () => {
		cy.intercept('GET', /\/api\/games(\?.*)?$/, request => { const page = Number(new URL(request.url).searchParams.get('page') ?? 1); request.reply(paged([games[page - 1]], { page, pageSize: 1, totalCount: 2, totalPages: 2, hasNextPage: page === 1, hasPreviousPage: page === 2 })) }).as('gamesPage')
		cy.visit(LIBRARY); cy.wait('@gamesPage'); cy.contains('.gdb-library-results', 'Dark Souls').should('be.visible')
		cy.get('.pagination-btn').last().click(); cy.wait('@gamesPage').its('request.url').should('include', 'page=2'); cy.contains('.gdb-library-results', 'Hollow Knight').should('be.visible')
		cy.get('.pagination-btn').first().click(); cy.wait('@gamesPage').its('request.url').should('include', 'page=1'); cy.contains('.gdb-library-results', 'Dark Souls').should('be.visible')
	})
	it('literal debounced search filters and clears the Library', () => {
		cy.intercept('GET', /\/api\/games(\?.*)?$/, request => { const params = new URL(request.url).searchParams, terms = params.get('nameSearchJson') ? JSON.parse(params.get('nameSearchJson')!).includeTerms : []; const search = terms[0] ?? params.get('search') ?? ''; request.reply(paged(games.filter(game => game.name.toLowerCase().includes(search.toLowerCase())))) }).as('gamesSearch')
		cy.visit(LIBRARY); cy.wait('@gamesSearch'); cy.get('#search-input').type('Dark'); cy.wait('@gamesSearch')
		cy.get('.gdb-library-results .game-card').should('have.length', 1); cy.contains('.gdb-library-results', 'Hollow Knight').should('not.exist')
		cy.get('#search-input').clear(); cy.wait('@gamesSearch'); cy.get('.gdb-library-results .game-card').should('have.length', 3)
	})
	it('sorting requests the selected real sort field', () => {
		cy.intercept('GET', /\/api\/games(\?.*)?$/, request => { if (new URL(request.url).searchParams.get('sortBy') === 'grade') request.alias = 'gradeSort'; request.reply(paged(games)) })
		cy.visit(LIBRARY); cy.get('#sort-select').select('grade'); cy.wait('@gradeSort').its('request.url').should('include', 'sortBy=grade')
	})
	it('Covers, Cards and Row remain independently selectable', () => {
		cy.visit(LIBRARY); cy.wait('@getGames')
		cy.get('.game-filters-chips__view-btn').first().click(); cy.get('.home-component-games-card').should('exist')
		cy.get('.game-filters-chips__view-btn').eq(1).click(); cy.get('.home-component-games-row').should('exist')
		cy.get('.game-filters-chips__view-btn').eq(2).click(); cy.get('.game-cover-view').should('have.length', 3)
	})
	it('Cards use manual platform time before Steam lifetime time', () => {
		cy.visit(LIBRARY); cy.wait('@getGames'); cy.get('.game-filters-chips__view-btn').first().click()
		cy.contains('.game-card-view-container', 'Dark Souls').within(() => { cy.get('.gdb-card-times').invoke('text').should('match', /3\s*h/); cy.get('.gdb-card-times').should('not.contain.text', '10'); cy.get('.gdb-card-times>span').first().should('have.attr', 'title', 'Manual time') })
	})
	it('an empty result is explicit, not a mock catalogue', () => {
		cy.intercept('GET', /\/api\/games(\?.*)?$/, paged([])).as('emptyGames'); cy.visit(LIBRARY); cy.wait('@emptyGames')
		cy.get('.home-component__no-games').should('be.visible')
	})
})
