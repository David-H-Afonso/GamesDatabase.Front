export {}

describe('Mobile filter layout', () => {
	const viewports = [390, 430, 768, 900, 1024]

	viewports.forEach((width) => {
		it(`keeps filters contained without overlap at ${width}px`, () => {
			cy.viewport(width, 800)
			cy.login('Admin')
			cy.mockApiRoutes()
			cy.visit('/')
			cy.wait('@getGames')

			cy.get('#search-input').should('be.visible')
			cy.get('#sort-select').should('be.visible')
			cy.get('#view-select').should('be.visible')
			cy.get('.game-filters-chips__advanced-btn').should('be.visible')

			cy.document().then((doc) => {
				expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth + 1)
			})

			cy.get('#search-input, #sort-select, #view-select, .game-filters-chips__advanced-btn').then(($controls) => {
				const rects = [...$controls].map((element) => element.getBoundingClientRect())

				for (let i = 0; i < rects.length; i += 1) {
					for (let j = i + 1; j < rects.length; j += 1) {
						const a = rects[i]
						const b = rects[j]
						const overlapX = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
						const overlapY = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
						expect(overlapX * overlapY, `controls ${i} and ${j} overlap`).to.equal(0)
					}
				}
			})

			cy.screenshot(`filter-layout-${width}`, { capture: 'viewport' })
		})
	})
})
