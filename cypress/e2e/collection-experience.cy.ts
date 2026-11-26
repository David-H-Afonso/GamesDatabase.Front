import { API, LIBRARY, firstGame, games, openFirstGame } from '../support/fixtures'

const focus = { id: 7, name: 'Focus', isAutomatic: false, maxLength: 4, sortOrder: 0, gameCount: 1, updatedAt: '', createdAt: '', items: [{ id: 71, gameId: 1, position: 0, game: firstGame }] }
describe('Collection experience — real contract-shaped fixtures', () => {
	beforeEach(() => { cy.login('Admin'); cy.mockApiRoutes() })
	it('Shelves reuse manual playlists, preserve their games and leave automatic lists out', () => {
		cy.intercept('GET', `${API}/playlists`, [focus, { ...focus, id: 8, name: 'Automatic list', isAutomatic: true }])
		cy.intercept('GET', `${API}/playlists/7`, focus)
		cy.visit('/#/shelves'); cy.contains('h1', 'Your shelves').should('be.visible'); cy.get('.gdb-personal-shelf').should('have.length', 1)
		cy.contains('.gdb-shelved-game', 'Dark Souls').should('be.visible'); cy.get('.gdb-shelf-title a').should('have.attr', 'href', '#/playlists/7')
	})
	it('Focus management opens without adding anything or syncing Steam', () => {
		cy.intercept('GET', `${API}/playlists`, [focus]); cy.intercept('GET', `${API}/playlists/7`, focus)
		let writes = 0
		cy.intercept('POST', `${API}/playlists/7/items`, request => { writes++; request.reply(focus) })
		cy.visit(LIBRARY); cy.wait('@getGames'); openFirstGame()
		cy.get('[aria-label="Manage this game in Focus"]').should('be.enabled').click(); cy.get('dialog.gdb-detail-focus-manager').should('contain.text', 'Dark Souls')
		cy.then(() => expect(writes).to.equal(0)); cy.get('dialog.gdb-detail-focus-manager').contains('button', /^Done$/).click()
	})
	it('adding to Focus sends only the selected game and reflects the returned manual list', () => {
		let current = focus
		cy.intercept('GET', `${API}/playlists`, request => request.reply([current])); cy.intercept('GET', `${API}/playlists/7`, request => request.reply(current))
		cy.intercept('POST', `${API}/playlists/7/items`, request => { expect(request.body).to.deep.equal({ gameId: 2 }); current = { ...focus, gameCount: 2, items: [...focus.items, { id: 72, gameId: 2, position: 1, game: games[1] }] }; request.reply(current) }).as('addFocus')
		cy.visit(LIBRARY); cy.wait('@getGames'); cy.get('.gdb-library-results .game-card h3 button').eq(1).click()
		cy.get('[aria-label="Add to Focus"]').should('be.enabled').click(); cy.wait('@addFocus'); cy.get('[aria-label="Manage this game in Focus"]').should('exist')
	})
	it('a manual artwork URL is visible in the draft before Save and remains cancellable', () => {
		let saves = 0; cy.intercept('PUT', `${API}/games/1`, request => { saves++; request.reply({ ...firstGame, ...request.body }) })
		cy.visit(LIBRARY); cy.wait('@getGames'); openFirstGame(); cy.get('dialog.gdb-game-sheet').contains('button', /^Edit game$/).click(); cy.get('dialog.gdb-game-editor').contains('button', /^Artwork$/).click()
		const url = `${Cypress.config('baseUrl')}/logo.png?preview-fixture`
		cy.get('dialog.gdb-game-editor input[name="hero"]').clear().type(url)
		cy.get('.gdb-editor-artwork-preview--hero img').should('have.attr', 'src', url).and('be.visible')
		cy.get('dialog.gdb-game-editor').contains('button', /^Cancel$/).click(); cy.then(() => expect(saves).to.equal(0)); cy.get('dialog.gdb-game-sheet[open]').should('be.visible')
	})
	it('a linked App ID stays locked and Steam artwork is a read-only draft lookup', () => {
		const linked = { ...firstGame, steamAppId: 100 }
		cy.intercept('GET', `${API}/games/1`, linked)
		cy.intercept('GET', `${API}/steam/app/100/artwork`, { heroUrl: `${Cypress.config('baseUrl')}/logo.png?steam-fixture` }).as('artwork')
		let saves = 0; cy.intercept('PUT', `${API}/games/1`, request => { saves++; request.reply(linked) })
		cy.visit(LIBRARY); cy.wait('@getGames'); openFirstGame(); cy.get('dialog.gdb-game-sheet').contains('button', /^Edit game$/).click(); cy.get('dialog.gdb-game-editor').contains('button', /^Artwork$/).click()
		cy.get('input[name="steamAppId"]').should('have.attr', 'readonly'); cy.contains('button', 'Refresh hero from Steam').click(); cy.wait('@artwork')
		cy.get('.gdb-editor-artwork-preview--hero img').should('have.attr', 'src').and('include', 'steam-fixture'); cy.then(() => expect(saves).to.equal(0))
	})
})
