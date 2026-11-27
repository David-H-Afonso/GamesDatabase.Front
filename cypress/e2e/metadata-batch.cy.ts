import { API, LIBRARY, games, firstGame } from '../support/fixtures'

const lookup = { overwrite: false, includeArtwork: true, includeDurations: true, includeCritic: true, reviewVersion: 2 }
const select = (...positions: number[]) => {
	cy.visit(LIBRARY); cy.wait('@getGames'); cy.get('.gdb-select-mode').click()
	for (const position of positions) cy.get('.gdb-game-select-target').eq(position).click('center').find('input').should('be.checked')
}
const proposal = (id: number, overwrite = false) => ({ overwrite, reviewVersion: 2, token: `fixture-metadata-plan-${id}`, matches: [], fields: [{ field: 'developer', current: overwrite ? 'Existing studio' : null, value: `Verified studio ${id}`, source: 'steam', url: 'https://store.steampowered.com/app/100/' }], notices: [] })

describe('Explicit exact-scope metadata batches (isolated UI fixtures)', () => {
	beforeEach(() => { cy.login('Admin'); cy.mockApiRoutes() })
	it('fills only the selected IDs and keeps selection while using no game PUT or Steam sync', () => {
		const seen: number[] = []
		cy.intercept('POST', /\/api\/games\/\d+\/metadata\/preview$/, request => { const id = Number(new URL(request.url).pathname.split('/')[3]); seen.push(id); expect(request.body).to.deep.equal(lookup); request.reply(proposal(id)) }).as('batchLookup')
		cy.intercept('POST', /\/api\/games\/\d+\/metadata\/apply$/, request => { const id = Number(new URL(request.url).pathname.split('/')[3]); expect(request.body).to.deep.equal({ token: `fixture-metadata-plan-${id}`, fields: ['developer'] }); request.reply({ game: { ...games.find(game => game.id === id), developer: `Verified studio ${id}` }, appliedFields: ['developer'], unchangedFields: [] }) }).as('batchApply')
		select(0, 2); cy.findByRole('checkbox', { name: 'Replace existing metadata' }).should('not.be.checked'); cy.findByRole('button', { name: 'Autofill', exact: true }).click()
		cy.get('dialog.gdb-metadata-batch-sheet').should('contain.text', 'Finished reviewing 2 games.'); cy.then(() => expect(seen).to.deep.equal([1, 3]))
		cy.get('dialog.gdb-metadata-batch-sheet').contains('button', /^Done$/).click(); cy.get('.gdb-bulk-toolbar__count').should('contain.text', '2')
	})
	it('requires confirmation to enable Replace and still makes no lookup until Autofill is run', () => {
		let lookups = 0
		cy.intercept('POST', `${API}/games/1/metadata/preview`, request => { lookups++; expect(request.body).to.deep.equal({ ...lookup, overwrite: true }); request.reply(proposal(1, true)) }).as('replaceLookup')
		cy.intercept('POST', `${API}/games/1/metadata/apply`, { game: { ...firstGame, developer: 'Verified studio 1' }, appliedFields: ['developer'], unchangedFields: [] }).as('replaceApply')
		select(0); cy.findByRole('checkbox', { name: 'Replace existing metadata' }).check(); cy.findByRole('alertdialog').should('contain.text', 'Missing provider values will not erase saved information')
		cy.then(() => expect(lookups).to.equal(0)); cy.findByRole('button', { name: 'Enable Replace' }).click(); cy.findByRole('checkbox', { name: 'Replace existing metadata' }).should('be.checked'); cy.then(() => expect(lookups).to.equal(0))
		cy.findByRole('button', { name: 'Autofill', exact: true }).click(); cy.wait('@replaceLookup'); cy.wait('@replaceApply'); cy.get('dialog.gdb-metadata-batch-sheet').contains('button', /^Done$/).click(); cy.findByRole('checkbox', { name: 'Replace existing metadata' }).should('not.be.checked')
	})
	it('keeps partial outcomes and retries only failed information, not completed games or imports', () => {
		const seen: number[] = []
		cy.intercept('POST', /\/api\/games\/\d+\/metadata\/preview$/, request => { const id = Number(new URL(request.url).pathname.split('/')[3]); seen.push(id); expect(request.body).to.deep.equal(lookup); request.reply(id === 1 && seen.length === 1 ? { statusCode: 503, body: { code: 'internalFixtureMustNotLeak' } } : proposal(id)) })
		cy.intercept('POST', /\/api\/games\/\d+\/metadata\/apply$/, request => { const id = Number(new URL(request.url).pathname.split('/')[3]); request.reply({ game: { ...games.find(game => game.id === id), developer: `Verified studio ${id}` }, appliedFields: ['developer'], unchangedFields: [] }) })
		select(0, 1); cy.findByRole('button', { name: 'Autofill', exact: true }).click(); cy.get('dialog.gdb-metadata-batch-sheet [data-status="failed"]').should('contain.text', firstGame.name); cy.get('dialog.gdb-metadata-batch-sheet [data-status="updated"]').should('contain.text', games[1].name)
		cy.get('dialog.gdb-metadata-batch-sheet').should('not.contain.text', 'internalFixtureMustNotLeak'); cy.findByRole('button', { name: 'Retry unfinished information' }).click(); cy.get('dialog.gdb-metadata-batch-sheet').should('contain.text', 'Finished reviewing 2 games.'); cy.then(() => expect(seen).to.deep.equal([1, 2, 1]))
	})
	it('stops a pending read without applying it or silently processing the next selected game', () => {
		const seen: number[] = []; let writes = 0
		cy.intercept('POST', /\/api\/games\/\d+\/metadata\/preview$/, request => { const id = Number(new URL(request.url).pathname.split('/')[3]); seen.push(id); request.reply({ delay: 1500, body: proposal(id) }) })
		cy.intercept('POST', /\/api\/games\/\d+\/metadata\/apply$/, request => { writes++; request.reply({ statusCode: 500 }) })
		select(0, 1); cy.findByRole('button', { name: 'Autofill', exact: true }).click(); cy.wrap(null).should(() => expect(seen).to.deep.equal([1])); cy.findByRole('button', { name: 'Stop autofill' }).click(); cy.get('dialog.gdb-metadata-batch-sheet [data-status="cancelled"]').should('have.length', 2); cy.then(() => { expect(writes).to.equal(0); expect(seen).to.deep.equal([1]) })
	})
	it('autofills after a Steam import without losing its link, then remembers Steam on and off across a reload', () => {
		let imports = 0
		const imported = { ...firstGame, id: 99, name: 'Steam import fixture', steamAppId: 100, developer: null }
		cy.intercept('GET', `${API}/steam/library`, [])
		cy.intercept('GET', `${API}/steam/store/search*`, [{ appId: 100, name: imported.name, heroUrl: '/sample-artwork/amber-hero.svg', coverUrl: '/sample-artwork/amber-cover.svg' }])
		cy.intercept('POST', `${API}/steam/import`, request => { imports++; expect(request.body).to.deep.equal({ games: [{ appId: 100, heroUrl: '/sample-artwork/amber-hero.svg', coverUrl: '/sample-artwork/amber-cover.svg' }], createMissing: true }); request.reply({ success: true, created: 1, linked: 0, skipped: 0, importedGames: [{ appId: 100, name: imported.name, gdbGameId: 99, action: 'created' }] }) }).as('steamImport')
		cy.intercept('PATCH', `${API}/games/bulk`, request => { expect(request.body.gameIds).to.deep.equal([99]); request.reply({ updatedCount: 1, totalRequested: 1 }) }).as('importSettings')
		cy.intercept('POST', `${API}/games/99/metadata/preview`, request => { expect(imports).to.equal(1); expect(request.body).to.deep.equal(lookup); request.reply(proposal(99)) }).as('importAutofill')
		cy.intercept('POST', `${API}/games/99/metadata/apply`, request => { expect(request.body).to.deep.equal({ token: 'fixture-metadata-plan-99', fields: ['developer'] }); request.reply({ game: { ...imported, developer: 'Verified studio 99' }, appliedFields: ['developer'], unchangedFields: [] }) }).as('importAutofillSave')
		cy.visit(LIBRARY, { onBeforeLoad(win) { const state = JSON.parse(win.localStorage.getItem('persist:root')!); const auth = JSON.parse(state.auth); auth.user.steamId = '76561198000000000'; state.auth = JSON.stringify(auth); win.localStorage.setItem('persist:root', JSON.stringify(state)) } }); cy.wait('@getGames')
		cy.get('.gdb-header__add').click(); cy.findByRole('textbox', { name: 'Title' }).should('be.focused'); cy.findByRole('checkbox', { name: 'Try to autofill info after import' }).should('not.be.checked'); cy.findByRole('button', { name: 'Search Steam' }).click(); cy.findByRole('textbox', { name: 'Title' }).type('Steam')
		cy.findByRole('button', { name: /Steam import fixture.*Store/ }).click(); cy.findByRole('checkbox', { name: 'Try to autofill info after import' }).check(); cy.get('button[type="submit"][form="gdb-create-game-form"]').click()
		cy.wait('@steamImport'); cy.wait('@importSettings'); cy.wait('@importAutofill'); cy.wait('@importAutofillSave').its('response.body.game.steamAppId').should('eq', 100); cy.get('dialog.gdb-metadata-batch-sheet').contains('button', /^Done$/).click(); cy.then(() => expect(imports).to.equal(1))
		cy.reload(); cy.wait('@getGames'); cy.get('.gdb-header__add').click(); cy.findByRole('textbox', { name: 'Title' }).should('be.focused'); cy.findByRole('button', { name: 'Search Steam' }).should('have.attr', 'aria-pressed', 'true').click(); cy.get('dialog.gdb-create-game-sheet').contains('button', /^Cancel$/).click()
		cy.reload(); cy.wait('@getGames'); cy.get('.gdb-header__add').click(); cy.findByRole('button', { name: 'Search Steam' }).should('have.attr', 'aria-pressed', 'false')
	})
})
