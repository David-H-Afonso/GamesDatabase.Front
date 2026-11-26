import { API, LIBRARY, firstGame } from '../support/fixtures'

const preview = { overwrite: false, token: 'fixture-review-not-authentication', matches: [], notices: ['durationUnavailable'], fields: [{ field: 'developer', value: 'Verified studio', current: null, source: 'steam', url: 'https://store.steampowered.com/app/100/' }, { field: 'released', value: '2024-02-29', current: null, source: 'steam', url: 'https://store.steampowered.com/app/100/' }] }
const openLookup = () => {
	cy.visit(LIBRARY); cy.wait('@getGames'); cy.get('.game-cover-view__options-trigger').first().focus().should('have.css', 'pointer-events', 'auto').click()
	cy.contains('button', /^Fill information automatically$/).click(); cy.get('dialog.gdb-metadata-sheet[open]').should('be.visible')
}
describe('Reviewed automatic information', () => {
	beforeEach(() => { cy.login('Admin'); cy.mockApiRoutes() })
	it('Cards and both Row modes expose the same explicit review without opening a detail', () => {
		cy.visit(LIBRARY); cy.wait('@getGames')
		cy.get('.game-filters-chips__view-toggle button').eq(0).click()
		cy.get('.gdb-card-tools > button').first().focus().should('be.visible').click(); cy.contains('button', /^Fill information automatically$/).click()
		cy.get('dialog.gdb-metadata-sheet').should('be.visible'); cy.get('dialog.gdb-metadata-sheet').contains('button', /^Cancel$/).click()
		cy.get('.game-filters-chips__view-toggle button').eq(1).click()
		for (let mode = 0; mode < 2; mode++) {
			cy.get('.gdb-row-tools summary').first().click(); cy.contains('button', /^Fill information automatically$/).click()
			cy.get('dialog.gdb-metadata-sheet').should('be.visible'); cy.get('dialog.gdb-game-sheet').should('not.exist'); cy.get('dialog.gdb-metadata-sheet').contains('button', /^Cancel$/).click()
			if (!mode) cy.findByRole('button', { name: 'More columns' }).click()
		}
	})
	it('Cancel in the initial overwrite question makes no lookup or save', () => {
		let lookups = 0, saves = 0
		cy.intercept('POST', `${API}/games/1/metadata/preview`, request => { lookups++; request.reply(preview) })
		cy.intercept('POST', `${API}/games/1/metadata/apply`, request => { saves++; request.reply({ game: firstGame, appliedFields: [] }) })
		openLookup(); cy.findByRole('radio', { name: 'Fill empty fields' }).should('be.checked'); cy.get('dialog.gdb-metadata-sheet').contains('button', /^Cancel$/).click()
		cy.then(() => { expect(lookups).to.equal(0); expect(saves).to.equal(0) })
	})
	it('explicit lookup shows provenance and applies only the checked sparse fields', () => {
		let current = firstGame
		cy.intercept('POST', `${API}/games/1/metadata/preview`, request => { expect(request.body).to.deep.equal({ overwrite: false, includeArtwork: true }); request.reply(preview) }).as('lookup')
		cy.intercept('POST', `${API}/games/1/metadata/apply`, request => { expect(request.body).to.deep.equal({ token: preview.token, fields: ['developer'] }); current = { ...firstGame, developer: 'Verified studio' }; request.reply({ game: current, appliedFields: ['developer'] }) }).as('applyMetadata')
		cy.intercept('GET', `${API}/games/1`, request => request.reply(current))
		openLookup(); cy.contains('button', /^Look up information$/).click(); cy.wait('@lookup'); cy.contains('.gdb-metadata-field', 'Verified studio').should('be.visible')
		cy.contains('.gdb-metadata-field', 'Release date').find('input[type="checkbox"]').uncheck(); cy.contains('button', /^Save selected fields$/).click(); cy.wait('@applyMetadata'); cy.get('dialog.gdb-metadata-sheet').should('not.exist')
	})
	it('overwrite is explicit and an unavailable source never clears fields', () => {
		cy.intercept('POST', `${API}/games/1/metadata/preview`, request => { expect(request.body.overwrite).to.equal(true); request.reply({ ...preview, overwrite: true, token: null, fields: [], notices: ['noChanges', 'durationUnavailable'] }) }).as('lookup')
		openLookup(); cy.findByRole('radio', { name: 'Replace existing fields' }).check(); cy.contains('button', /^Look up information$/).click(); cy.wait('@lookup')
		cy.contains('button', /^Save selected fields$/).should('be.disabled'); cy.get('dialog.gdb-metadata-sheet').should('contain.text', 'Existing estimates are left unchanged')
	})
	it('a stale game rejects Apply and retains the review instead of overwriting', () => {
		cy.intercept('POST', `${API}/games/1/metadata/preview`, preview).as('lookup')
		cy.intercept('POST', `${API}/games/1/metadata/apply`, { statusCode: 409, body: { code: 'metadataConflict' } }).as('staleApply')
		openLookup(); cy.contains('button', /^Look up information$/).click(); cy.wait('@lookup'); cy.contains('button', /^Save selected fields$/).click(); cy.wait('@staleApply')
		cy.get('dialog.gdb-metadata-sheet').should('contain.text', 'game changed after this lookup'); cy.contains('button', /^Save selected fields$/).should('be.disabled')
	})
})
