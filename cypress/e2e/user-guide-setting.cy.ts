import { API } from '../support/fixtures'

describe('Guide choice belongs to the newly created account', () => {
	it('administrator can enable the guide for an existing user without creating example data', () => {
		cy.login('Admin'); cy.mockApiRoutes()
		let account = { id: 9, username: 'Existing player', role: 'Standard', isDefault: false, hasPassword: true, tutorialEnabled: false, createdAt: '2026-11-25T12:00:00Z', updatedAt: '2026-11-25T12:00:00Z' }
		cy.intercept('GET', `${API}/users`, request => request.reply([account])).as('users')
		cy.intercept('PUT', `${API}/users/9`, request => { expect(request.body).to.deep.equal({ username: 'Existing player', role: 'Standard', tutorialEnabled: true }); account = { ...account, ...request.body }; request.reply(account) }).as('enableGuide')
		cy.visit('/#/admin/users'); cy.wait('@users'); cy.contains('tr', 'Existing player').contains('button', /^Edit$/).click(); cy.findByLabelText('Show the getting-started guide').should('not.be.checked').check(); cy.contains('button', /^Update$/).click(); cy.wait('@enableGuide'); cy.wait('@users'); cy.get('dialog').should('not.exist')
	})
	it('administrator can create a user without the tutorial and does not seed that user', () => {
		cy.login('Admin'); cy.mockApiRoutes()
		cy.intercept('GET', `${API}/users`, [{ id: 1, username: 'Admin', role: 'Admin', isDefault: true, hasPassword: true, useScoreColors: false, scoreProvider: 'Metacritic', showPriceComparisonIcon: false, tutorialEnabled: false, createdAt: '2026-11-25T12:00:00Z', updatedAt: '2026-11-25T12:00:00Z' }]).as('users')
		cy.intercept('POST', `${API}/users`, request => { expect(request.body).to.deep.include({ username: 'New guide-free user', role: 'Standard', tutorialEnabled: false }); request.reply({ id: 9, ...request.body }) }).as('createUser')
		cy.visit('/#/admin/users'); cy.wait('@users'); cy.contains('button', '+ Create New User').click(); cy.findByLabelText('Username').type('New guide-free user'); cy.findByLabelText('Show the getting-started guide').should('be.checked').uncheck(); cy.contains('button', /^Create$/).click(); cy.wait('@createUser')
	})
})
