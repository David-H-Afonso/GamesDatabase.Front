import { LIBRARY, games, paged, openFirstGame, openFilters, applyFilters } from '../support/fixtures'

const fixtureFiltering = (alias: string) => cy.intercept('GET', /\/api\/games(\?.*)?$/, request => {
	const params = new URL(request.url).searchParams, status = params.get('statusId'), platform = params.get('platformId')
	const result = games.filter(game => (!status || String(game.statusId) === status) && (!platform || String(game.platformId) === platform))
	request.reply(paged(result))
}).as(alias)

describe('Library filter draft journeys', () => {
	beforeEach(() => { cy.login('Admin'); cy.mockApiRoutes() })
	it('status filtering is applied only through the real form', () => {
		fixtureFiltering('filteredGames'); cy.visit(LIBRARY); cy.wait('@filteredGames'); cy.get('.gdb-library-results .game-card').should('have.length', 3)
		openFilters(); cy.findByLabelText('Status').select('1'); applyFilters()
		cy.wait('@filteredGames').its('request.url').should('include', 'statusId=1'); cy.get('.gdb-library-results .game-card').should('have.length', 2)
	})
	it('status and platform filters preserve their combined parameters', () => {
		fixtureFiltering('filteredGames'); cy.visit(LIBRARY); cy.wait('@filteredGames'); openFilters()
		cy.findByLabelText('Status').select('1'); cy.findByLabelText('Platform').select('1'); applyFilters()
		cy.wait('@filteredGames').its('request.url').should('include', 'statusId=1').and('include', 'platformId=1')
	})
	it('clearing an individual status retains the other draft controls', () => {
		fixtureFiltering('filteredGames'); cy.visit(LIBRARY); cy.wait('@filteredGames'); openFilters(); cy.findByLabelText('Status').select('1'); applyFilters(); cy.wait('@filteredGames')
		openFilters(); cy.findByLabelText('Status').select(''); applyFilters(); cy.wait('@filteredGames').its('request.url').should('not.include', 'statusId')
		cy.get('.gdb-library-results .game-card').should('have.length', 3)
	})
	it('Reset restores all controls before explicit Apply', () => {
		fixtureFiltering('filteredGames'); cy.visit(LIBRARY); cy.wait('@filteredGames'); openFilters(); cy.findByLabelText('Status').select('1'); applyFilters(); cy.wait('@filteredGames')
		openFilters(); cy.get('dialog.gdb-library-filter-sheet').contains('button', /^Reset$/).click(); applyFilters(); cy.wait('@filteredGames')
		cy.get('.gdb-library-results .game-card').should('have.length', 3)
	})
	it('filters survive opening and closing a game detail', () => {
		fixtureFiltering('filteredGames'); cy.visit(LIBRARY); cy.wait('@filteredGames'); openFilters(); cy.findByLabelText('Status').select('1'); applyFilters(); cy.wait('@filteredGames')
		openFirstGame(); cy.get('dialog.gdb-game-sheet[open] [aria-label="Close"]').first().click(); cy.get('dialog.gdb-game-sheet').should('not.exist')
		openFilters(); cy.findByLabelText('Status').should('have.value', '1')
	})
})
