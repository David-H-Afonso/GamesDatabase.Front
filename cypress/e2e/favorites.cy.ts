import { API, LIBRARY, games, paged, openFilters, applyFilters } from '../support/fixtures'

describe('Favorites journeys', () => {
	beforeEach(() => { cy.login('Admin'); cy.mockApiRoutes() })
	it('marks a game from its quick action and keeps the authoritative favorite state', () => {
		const updated = { ...games[0], favorite: true }
		let current = [...games]
		cy.intercept('GET', /\/api\/games(\?.*)?$/, request => request.reply(paged(current))).as('getGames')
		cy.intercept('PUT', `${API}/games/1`, request => { current = [updated, ...games.slice(1)]; request.reply(updated) }).as('favoriteUpdate')
		cy.intercept('GET', `${API}/games/1`, request => request.reply(current[0]))
		cy.visit(LIBRARY); cy.wait('@getGames')
		cy.contains('.game-cover-view', 'Dark Souls').find('.game-cover-view__open-art').focus()
		cy.press(Cypress.Keyboard.Keys.TAB)
		cy.contains('.game-cover-view', 'Dark Souls').find('[aria-label="Mark as favorite"]').should('have.focus').and('be.visible').click()
		cy.wait('@favoriteUpdate').its('request.body').should('deep.equal', { favorite: true })
		cy.contains('.game-cover-view', 'Dark Souls').find('[aria-label="Remove from favorites"]').should('have.attr', 'aria-pressed', 'true')
	})
	it('applies the favorites criterion from the cancellable form', () => {
		cy.intercept('GET', /\/api\/games(\?.*)?$/, request => { const favorite = new URL(request.url).searchParams.get('favorite') === 'true'; if (favorite) request.alias = 'favoritesOnly'; request.reply(paged(favorite ? games.filter(game => game.favorite) : games)) })
		cy.visit(LIBRARY); openFilters(); cy.findByLabelText('Only my favorites').check(); applyFilters(); cy.wait('@favoritesOnly')
		cy.get('.gdb-library-results .game-card').should('have.length', 1).and('contain.text', 'Hollow Knight')
	})
	it('creates a favorites GameView using its mature template and secondary ordering', () => {
		cy.intercept('GET', `${API}/gameviews*`, []).as('getViews')
		cy.intercept('POST', `${API}/gameviews`, request => {
			expect(request.body.configuration.filterGroups[0].filters[0]).to.deep.include({ field: 'Favorite', operator: 'Equals', value: true })
			expect(request.body.configuration.sorting[0]).to.deep.include({ field: 'Favorite', direction: 'Descending', order: 1 })
			expect(request.body.configuration.sorting[1]).to.deep.include({ field: 'Grade', direction: 'Descending', order: 2 })
			request.reply({ statusCode: 201, body: { id: 10, ...request.body } })
		}).as('createView')
		cy.visit('/#/admin/game-views'); cy.wait('@getViews'); cy.contains('button', 'Templates').click(); cy.contains('.template-card', 'Favorites').click(); cy.get('select').select('grade'); cy.contains('button', 'Create View').click(); cy.wait('@createView')
	})
})
