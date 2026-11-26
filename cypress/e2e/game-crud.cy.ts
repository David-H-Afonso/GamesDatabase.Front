import { API, LIBRARY, firstGame, games, paged, openFirstGame, openGameTab, saveEditor } from '../support/fixtures'

describe('Game CRUD journeys — unified editor', () => {
	beforeEach(() => { cy.login('Admin'); cy.mockApiRoutes(); cy.intercept('GET', /\/api\/games(\?.*)?$/, paged([firstGame])).as('getGames') })

	it('creating a game opens its new detail without an immediate legacy editor', () => {
		const created = { ...firstGame, id: 99, name: 'New Test Game' }
		cy.intercept('POST', `${API}/games`, { statusCode: 201, body: created }).as('createGame')
		cy.intercept('GET', `${API}/games/99*`, created)
		cy.visit(LIBRARY); cy.wait('@getGames'); cy.createGame('New Test Game'); cy.wait('@createGame')
		cy.get('dialog.gdb-game-sheet[open]').should('be.visible').and('contain.text', 'New Test Game')
		cy.get('.game-details').should('not.exist')
	})
	it('keeps secondary creation settings folded and sends them only on explicit Add', () => {
		cy.intercept('POST', `${API}/games`, { statusCode: 201, body: { ...firstGame, id: 98, name: 'Compact fixture' } }).as('compactCreate')
		cy.intercept('GET', `${API}/games/98*`, { ...firstGame, id: 98, name: 'Compact fixture' })
		cy.visit(LIBRARY); cy.wait('@getGames'); cy.get('.gdb-header__add').click()
		cy.get('dialog.gdb-create-game-sheet').within(() => {
			cy.findByRole('textbox', { name: 'Title' }).type('Compact fixture'); cy.get('.gdb-create-options').should('not.be.visible')
			cy.findByRole('button', { name: 'Options for game 1' }).click(); cy.findByRole('combobox', { name: 'Platform' }).select('2'); cy.findByRole('combobox', { name: 'Status' }).select('1'); cy.get('.gdb-create-price select').select('key')
			cy.findByRole('button', { name: 'Options for game 1' }).click(); cy.get('.gdb-create-options').should('not.be.visible'); cy.get('button[form="gdb-create-game-form"]').click()
		})
		cy.wait('@compactCreate').then(({ request }) => { expect(request.body).to.include({ name: 'Compact fixture', platformId: 2, statusId: 1, isCheaperByKey: true }); expect(request.body.creationRequestId).to.match(/^[0-9a-f-]{36}$/i) })
		cy.get('dialog.gdb-game-sheet[open]').should('contain.text', 'Compact fixture')
	})
	it('retains the successful batch receipt and retries only the unfinished UUID after reopening', () => {
		const payloads: Array<{ name: string; creationRequestId: string }> = []; let secondAttempts = 0
		cy.intercept('POST', `${API}/games`, request => {
			payloads.push(request.body)
			if (request.body.name === 'Second batch fixture' && ++secondAttempts === 1) return request.reply({ statusCode: 500, body: { code: 'syntheticPartialFailure' } })
			request.reply({ statusCode: 201, body: { ...firstGame, id: request.body.name === 'First batch fixture' ? 96 : 97, name: request.body.name } })
		}).as('batchCreate')
		cy.visit(LIBRARY); cy.wait('@getGames'); cy.get('.gdb-header__add').click()
		cy.get('dialog.gdb-create-game-sheet').within(() => { cy.findByRole('textbox', { name: 'Title' }).type('First batch fixture'); cy.findByRole('button', { name: 'Add another row' }).click(); cy.findAllByRole('textbox', { name: 'Title' }).last().type('Second batch fixture'); cy.get('button[form="gdb-create-game-form"]').click() })
		cy.wait('@batchCreate'); cy.wait('@batchCreate'); cy.get('dialog.gdb-create-game-sheet').should('contain.text', '1 of 2 added.'); cy.get('.gdb-create-saved').should('contain.text', 'First batch fixture')
		cy.get('dialog.gdb-create-game-sheet').contains('button', /^Cancel$/).click(); cy.get('.gdb-header__add').click(); cy.get('.gdb-create-name').should('have.value', 'Second batch fixture')
		cy.get('dialog.gdb-create-game-sheet').contains('button', /^Retry unfinished \(1\)$/).click(); cy.wait('@batchCreate'); cy.get('dialog.gdb-create-game-sheet').should('not.exist')
		cy.then(() => { expect(payloads.map(payload => payload.name)).to.deep.equal(['First batch fixture', 'Second batch fixture', 'Second batch fixture']); expect(payloads[1].creationRequestId).to.equal(payloads[2].creationRequestId); expect(payloads[0].creationRequestId).not.to.equal(payloads[1].creationRequestId) })
	})
	it('opening a game shows its actual detail fields', () => {
		cy.visit(LIBRARY); cy.wait('@getGames'); openFirstGame()
		cy.get('dialog.gdb-game-sheet').should('contain.text', 'Dark Souls').and('contain.text', '2018')
	})
	it('editing the title sends only its dirty field on explicit Save', () => {
		cy.intercept('PUT', `${API}/games/1`, { ...firstGame, name: 'Dark Souls Remastered' }).as('updateGame')
		cy.visit(LIBRARY); cy.wait('@getGames'); openGameTab()
		cy.get('dialog.gdb-game-editor input[name="name"]').clear().type('Dark Souls Remastered'); saveEditor()
		cy.wait('@updateGame').its('request.body').should('deep.equal', { name: 'Dark Souls Remastered' })
	})
	it('deletion keeps a single explicit confirmation and removes the game', () => {
		cy.intercept('DELETE', `${API}/games/1`, { statusCode: 204 }).as('deleteGame')
		cy.visit(LIBRARY); cy.wait('@getGames'); openFirstGame()
		cy.intercept('GET', /\/api\/games(\?.*)?$/, paged([])).as('gamesAfterDelete')
		cy.intercept('GET', `${API}/games/1`, { statusCode: 404, body: { code: 'deletedFixture' } })
		cy.get('dialog.gdb-game-sheet [aria-label="Game options"]').click()
		cy.get('dialog.gdb-game-sheet').contains('button', /^Delete game$/).click()
		cy.findByRole('alertdialog').contains('button', /^Delete$/).click(); cy.wait('@deleteGame'); cy.wait('@gamesAfterDelete')
		cy.get('dialog.gdb-game-sheet').should('not.exist'); cy.get('.home-component__no-games').should('be.visible')
	})
	it('the direct status control sends its sparse update', () => {
		cy.intercept('PUT', `${API}/games/1`, { ...firstGame, statusId: 2, statusName: 'Pendiente' }).as('updateGame')
		cy.visit(LIBRARY); cy.wait('@getGames'); openFirstGame(); cy.get('dialog.gdb-game-sheet .gdb-detail-status select').select('2')
		cy.wait('@updateGame').its('request.body').should('deep.equal', { statusId: 2 })
	})
	it('changing the platform uses the draft and explicit Save', () => {
		cy.intercept('PUT', `${API}/games/1`, { ...firstGame, platformId: 2, platformName: 'PS5' }).as('updateGame')
		cy.visit(LIBRARY); cy.wait('@getGames'); openGameTab(); cy.get('dialog.gdb-game-editor select[name="platformId"]').select('2'); saveEditor()
		cy.wait('@updateGame').its('request.body').should('deep.equal', { platformId: 2 })
	})
	it('changing release date preserves a dirty-only Save', () => {
		cy.intercept('PUT', `${API}/games/1`, { ...firstGame, released: '2024-06-15' }).as('updateGame')
		cy.visit(LIBRARY); cy.wait('@getGames'); openGameTab(); cy.get('dialog.gdb-game-editor input[name="released"]').clear().type('2024-06-15'); saveEditor()
		cy.wait('@updateGame').its('request.body').should('deep.equal', { released: '2024-06-15' })
	})
	it('a valid personal grade is saved without recalculating unrelated fields', () => {
		cy.intercept('PUT', `${API}/games/1`, { ...games[0], grade: 85 }).as('updateGame')
		cy.visit(LIBRARY); cy.wait('@getGames'); openGameTab(); cy.get('dialog.gdb-game-editor input[name="grade"]').clear().type('85'); saveEditor()
		cy.wait('@updateGame').its('request.body').should('deep.equal', { grade: 85 })
	})
})
