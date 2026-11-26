import { API, LIBRARY, games } from '../support/fixtures'

describe('Explicit random scope and daily Home source', () => {
	beforeEach(() => { cy.login('Admin'); cy.mockApiRoutes() })
	it('desktop dice opens the server-selected detail without changing its state', () => {
		cy.intercept('GET', `${API}/collection/random-game`, games[1]).as('randomGame')
		cy.visit(LIBRARY); cy.wait('@getGames'); cy.get('.gdb-header__random').should('be.visible').click()
		cy.get('dialog.gdb-random-sheet').contains('button', /^Entire library/).click(); cy.wait('@randomGame')
		cy.get('dialog.gdb-game-sheet[open]').should('contain.text', 'Hollow Knight')
	})
	it('mobile keeps dice in the profile and explains an empty library without fallback', () => {
		cy.viewport(390, 844); cy.intercept('GET', `${API}/collection/random-game`, { statusCode: 404, body: { code: 'emptyLibrary' } }).as('randomEmpty')
		cy.visit(LIBRARY); cy.wait('@getGames'); cy.get('.gdb-header__random').should('not.be.visible'); cy.get('.gdb-profile-button').click()
		cy.contains('button', /^Pick a random game$/).click(); cy.get('dialog.gdb-random-sheet').contains('button', /^Entire library/).click(); cy.wait('@randomEmpty')
		cy.get('dialog.gdb-random-sheet [role="status"]').should('contain.text', 'Add a game to your library first'); cy.get('dialog.gdb-game-sheet').should('not.exist')
	})
	it('sends exactly the currently displayed page IDs rather than all filter matches', () => {
		let whole = 0
		cy.intercept('GET', `${API}/collection/random-game`, request => { whole++; request.reply(games[0]) })
		cy.intercept('POST', `${API}/collection/random-game`, request => { expect(request.body).to.deep.equal({ gameIds: games.map(game => game.id) }); request.reply(games[2]) }).as('displayedRandom')
		cy.visit(LIBRARY); cy.wait('@getGames'); cy.get('.gdb-header__random').click(); cy.get('dialog.gdb-random-sheet').contains('button', /^Games shown \(3\)/).should('be.enabled').click(); cy.wait('@displayedRandom')
		cy.get('dialog.gdb-game-sheet').should('contain.text', games[2].name); cy.then(() => expect(whole).to.equal(0))
	})
	it('does not describe an obsolete endpoint as an empty collection or widen a failed displayed pool', () => {
		cy.intercept('POST', `${API}/collection/random-game`, { statusCode: 404, body: { code: 'obsoleteEndpoint' } }).as('obsolete')
		cy.visit(LIBRARY); cy.wait('@getGames'); cy.get('.gdb-header__random').click(); cy.get('dialog.gdb-random-sheet').contains('button', /^Games shown/).should('be.enabled').click(); cy.wait('@obsolete')
		cy.get('dialog.gdb-random-sheet [role="alert"]').should('contain.text', 'A game could not be chosen'); cy.get('dialog.gdb-game-sheet').should('not.exist')
	})
	it('opening and cancelling the scope chooser does not issue a random request', () => {
		let requests = 0; cy.intercept(`${API}/collection/random-game`, request => { requests++; request.reply(games[0]) })
		cy.visit(LIBRARY); cy.wait('@getGames'); cy.get('.gdb-header__random').click(); cy.get('dialog.gdb-random-sheet .gdb-sheet__head button').click(); cy.then(() => expect(requests).to.equal(0))
	})
	it('daily recommendations keep their server metadata and full-source route', () => {
		const row = { id: 'daily', title: 'Today', enabled: true, source: { kind: 'recommendations', recommendations: { includedStatusIds: [], excludedStatusIds: [] } }, presentation: 'covers', previewCount: 2, highlightFirst: false }
		cy.intercept('GET', `${API}/home/config`, { version: 1, revision: 1, rows: [row] })
		cy.intercept('POST', `${API}/home/rows/resolve`, [{ rowId: 'daily', state: 'ready', totalMatches: 3, returnedCount: 2, hasMore: true, recommendationDay: '2026-11-25', serverTime: '2026-11-25T12:00:00Z', refreshAt: '2026-11-26T00:00:00Z', items: games.slice(0, 2) }]).as('dailyRows')
		cy.intercept('GET', `${API}/home/rows/daily/games*`, { data: games, page: 1, pageSize: 28, totalCount: 3, totalPages: 1 }).as('fullDaily')
		cy.visit('/#/'); cy.wait('@dailyRows'); cy.get('.gdb-home-shelf').should('contain.text', 'Refreshes daily at 00:00 UTC'); cy.get('.gdb-home-shelf .gdb-home-game').should('have.length', 2)
		cy.get('.gdb-home-shelf').contains('button', /^View all$/).click(); cy.wait('@fullDaily'); cy.url().should('include', '/library/rows/daily'); cy.get('.gdb-row-library__games .game-card').should('have.length', 3)
	})
})
