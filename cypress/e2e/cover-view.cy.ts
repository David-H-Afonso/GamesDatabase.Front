import { API, LIBRARY, paged } from '../support/fixtures'

const games = [{ id: 1, name: 'Warhammer 40,000: Space Marine II Anniversary Edition', statusId: 1, statusName: 'Playing', platformId: 1, platformName: 'Steam', playWithIds: [], playWithNames: [], steamAppId: 2183900, favorite: false, hero: null, cover: null }, { id: 2, name: 'Balatro', statusId: 2, statusName: 'Done', platformId: 1, platformName: 'Steam', playWithIds: [], playWithNames: [], steamAppId: 2379780, favorite: false, hero: null, cover: null }]

describe('Cover presentation and mature quick tools', () => {
	beforeEach(() => {
		cy.login('Admin'); cy.mockApiRoutes()
		cy.intercept('GET', /\/api\/games(\?.*)?$/, paged(games)).as('games')
		cy.intercept('GET', `${API}/games/1`, games[0])
		cy.intercept('GET', `${API}/gamestatus/active*`, [{ id: 1, name: 'Playing', color: '#61afef' }, { id: 2, name: 'Done', color: '#98c379' }])
		cy.intercept('PUT', `${API}/games/1`, { ...games[0], cover: null }).as('updateImage')
		cy.intercept('PATCH', `${API}/games/1/status`, request => request.reply({ statusCode: 200, body: { ...games[0], statusId: request.body.statusId, statusName: 'Done' } })).as('statusUpdate')
		cy.intercept('POST', `${API}/steam/sync/1`, { success: true }).as('syncGame')
		cy.visit(LIBRARY); cy.wait('@games')
	})
	it('reveals genuinely truncated names and retains the quick status editor', () => {
		cy.get('.game-cover-view h3 button').first().trigger('pointerover', { pointerType: 'mouse' })
		cy.findByRole('tooltip').should('contain.text', games[0].name)
		cy.get('.game-cover-view__status').first().click()
		cy.get('.game-cover-view__quick-editor').contains('button', /^Done$/).click()
		cy.wait('@statusUpdate').its('request.body').should('include', { statusId: 2 })
	})
	it('retains explicit bulk refresh of the selected Steam cover', () => {
		cy.get('.gdb-select-mode').click(); cy.get('.gdb-game-select-target').first().click('center').find('input').should('be.checked')
		cy.get('.gdb-selection-more > summary').click()
		cy.findByLabelText('Image to refresh').select('cover'); cy.contains('button', /^Refresh image$/).click()
		cy.wait('@updateImage').its('request.body').should('include', { cover: null }); cy.wait('@syncGame')
	})
})
