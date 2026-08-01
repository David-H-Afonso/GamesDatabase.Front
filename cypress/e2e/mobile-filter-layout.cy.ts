export {}

describe('Mobile filter layout', () => {
	const mobileWidths = [390, 430, 768]
	const desktopWidths = [900, 1024]

	const noOverflow = () => {
		cy.document().then((doc) => {
			expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth + 1)
		})
	}

	mobileWidths.forEach((width) => {
		it(`shows only search + filters button in the top bar at ${width}px`, () => {
			cy.viewport(width, 800)
			cy.login('Admin')
			cy.mockApiRoutes()
			cy.visit('/')
			cy.wait('@getGames')

			// Top bar keeps only the full-width search and the Filters button.
			cy.get('#search-input').should('be.visible')
			cy.get('.game-filters-chips__advanced-btn').should('be.visible')

			// Sort and custom-view move into the advanced panel: hidden until opened.
			cy.get('#sort-select').should('not.be.visible')
			cy.get('#view-select').should('not.be.visible')

			noOverflow()

			// Opening the panel reveals the moved sort, custom-view and view-mode controls.
			cy.get('.game-filters-chips__advanced-btn').click()
			cy.get('.game-filters-chips__moved-controls-view select').should('be.visible')
			cy.get('.game-filters-chips__moved-controls-sort select').should('be.visible')

			noOverflow()

			cy.get('#search-input, .game-filters-chips__advanced-btn').then(($controls) => {
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

	desktopWidths.forEach((width) => {
		it(`keeps sort and view in the top bar without overflow at ${width}px`, () => {
			cy.viewport(width, 800)
			cy.login('Admin')
			cy.mockApiRoutes()
			cy.visit('/')
			cy.wait('@getGames')

			cy.get('#search-input').should('be.visible')
			cy.get('#sort-select').should('be.visible')
			cy.get('#view-select').should('be.visible')
			cy.get('.game-filters-chips__advanced-btn').should('be.visible')

			noOverflow()
		})
	})
})
