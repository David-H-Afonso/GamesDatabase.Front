import { LIBRARY, openFilters } from '../support/fixtures'

const noOverflow = () => cy.document().then(doc => expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth + 1))
describe('Responsive Library toolbar', () => {
	for (const width of [390, 430, 768]) it(`preserves the reference composition and real filter form at ${width}px`, () => {
		cy.viewport(width, 800); cy.login('Admin'); cy.mockApiRoutes(); cy.visit(LIBRARY); cy.wait('@getGames')
		cy.get('#search-input').should('be.visible'); cy.get('.game-filters-chips__advanced-btn').should('be.visible')
		cy.get('#sort-select').should(width <= 650 ? 'be.visible' : 'not.be.visible')
		cy.get('.game-filters-chips__view-btn').should('have.length', 3); noOverflow()
		cy.get('#search-input, .game-filters-chips__advanced-btn').then(controls => {
			const a = controls[0].getBoundingClientRect(), b = controls[1].getBoundingClientRect()
			expect(Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))).to.equal(0)
		})
		openFilters(); cy.findByLabelText('Status').should('be.visible'); cy.findByLabelText('Platform').should('be.visible'); noOverflow()
	})
	for (const width of [900, 1024]) it(`retains search, ordering, layouts and Filters without overflow at ${width}px`, () => {
		cy.viewport(width, 800); cy.login('Admin'); cy.mockApiRoutes(); cy.visit(LIBRARY); cy.wait('@getGames')
		cy.get('#search-input').should('be.visible'); cy.get('#sort-select').should('be.visible'); cy.get('.game-filters-chips__advanced-btn').should('be.visible'); cy.get('.game-filters-chips__view-btn').should('have.length', 3); noOverflow()
	})
})
