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
		cy.intercept('POST', `${API}/games/1/metadata/preview`, request => { expect(request.body).to.deep.equal({ overwrite: false, includeArtwork: true, includeDurations: true, includeCritic: true, reviewVersion: 2 }); request.reply(preview) }).as('lookup')
		cy.intercept('POST', `${API}/games/1/metadata/apply`, request => { expect(request.body).to.deep.equal({ token: preview.token, fields: ['developer'] }); current = { ...firstGame, developer: 'Verified studio' }; request.reply({ game: current, appliedFields: ['developer'] }) }).as('applyMetadata')
		cy.intercept('GET', `${API}/games/1`, request => request.reply(current))
		openLookup(); cy.contains('button', /^Look up information$/).click(); cy.wait('@lookup'); cy.contains('.gdb-metadata-field', 'Verified studio').should('be.visible')
		cy.contains('.gdb-metadata-field', 'Release date').find('input[type="checkbox"]').uncheck(); cy.contains('button', /^Save selected fields$/).click(); cy.wait('@applyMetadata'); cy.get('dialog.gdb-metadata-sheet').should('not.exist')
	})
	it('discloses exact source hours and saves only the explicitly reviewed duration', () => {
		const durationFields = [
			{ field: 'story', value: 24, current: null, source: 'dekudeals', url: 'https://www.dekudeals.com/items/hades', sourceHours: 23.5 },
			{ field: 'completion', value: 96, current: null, source: 'dekudeals', url: 'https://www.dekudeals.com/items/hades', sourceHours: 95.5 },
		]
		cy.intercept('POST', `${API}/games/1/metadata/preview`, request => { expect(request.body).to.deep.equal({ overwrite: false, includeArtwork: true, includeDurations: true, includeCritic: true, reviewVersion: 2 }); request.reply({ ...preview, notices: [], fields: [...preview.fields, ...durationFields] }) }).as('durationLookup')
		cy.intercept('POST', `${API}/games/1/metadata/apply`, request => { expect(request.body).to.deep.equal({ token: preview.token, fields: ['story'] }); request.reply({ game: { ...firstGame, story: 24 }, appliedFields: ['story'] }) }).as('durationApply')
		openLookup(); cy.findByRole('checkbox', { name: 'Include story and completionist estimates' }).should('be.checked'); cy.contains('button', /^Look up information$/).click(); cy.wait('@durationLookup')
		cy.get('dialog.gdb-metadata-sheet .gdb-metadata-field > label input').uncheck()
		cy.contains('.gdb-metadata-field', 'Main story').scrollIntoView().should('contain.text', '23.5 h').and('contain.text', 'proposed 24 h is rounded').find('input[type="checkbox"]').check()
		cy.contains('.gdb-metadata-field', 'Completionist').should('contain.text', '95.5 h').find('input[type="checkbox"]').should('not.be.checked')
		cy.contains('button', /^Save selected fields$/).click(); cy.wait('@durationApply'); cy.get('dialog.gdb-metadata-sheet').should('not.exist')
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
	it('reviews a fresh critic provider with its public source and keeps opt-out groups unchecked in the request', () => {
		const fields = [{ field: 'critic', current: 89, currentCriticProvider: 'Metacritic', value: 91, criticProvider: 'OpenCritic', criticScope: 'listed-platform', criticUrl: 'https://opencritic.com/game/100/public-fixture', source: 'dekudeals', url: 'https://www.dekudeals.com/items/public-fixture' }]
		cy.intercept('POST', `${API}/games/1/metadata/preview`, request => { expect(request.body).to.deep.equal({ overwrite: true, includeArtwork: false, includeDurations: false, includeCritic: true, reviewVersion: 2 }); request.reply({ ...preview, overwrite: true, reviewVersion: 2, fields, notices: [] }) }).as('criticLookup')
		cy.intercept('POST', `${API}/games/1/metadata/apply`, request => { expect(request.body).to.deep.equal({ token: preview.token, fields: ['critic'] }); request.reply({ game: { ...firstGame, critic: 91, criticProvider: 'OpenCritic' }, appliedFields: ['critic'], unchangedFields: [] }) }).as('criticApply')
		openLookup(); cy.findByRole('radio', { name: 'Replace existing fields' }).check(); cy.findByRole('checkbox', { name: 'Include artwork' }).uncheck(); cy.findByRole('checkbox', { name: 'Include story and completionist estimates' }).uncheck(); cy.contains('button', /^Look up information$/).click(); cy.wait('@criticLookup')
		cy.get('.gdb-metadata-field').should('contain.text', '89 /100 · Metacritic').and('contain.text', '91 /100 · OpenCritic').and('contain.text', 'platform may differ')
		cy.findByRole('link', { name: 'View OpenCritic' }).should('have.attr', 'href', fields[0].criticUrl).and('have.attr', 'rel', 'noopener noreferrer')
		cy.contains('button', /^Save selected fields$/).click(); cy.wait('@criticApply'); cy.get('dialog.gdb-metadata-sheet').should('not.exist')
	})
	it('distinguishes a same-named remake by year/platform and previews three keyless artwork roles without saving', () => {
		const name = 'The Legend of Zelda: Ocarina of Time'
		cy.viewport(390, 844)
		cy.fixture('games.json').then(result => {
			const data = result.data.map((game: { id: number }) => game.id === 1 ? { ...game, name, released: null, platformId: null, platformName: null } : game)
			cy.intercept('GET', /\/api\/games(\?.*)?$/, { ...result, data }).as('getGames')
			cy.intercept('GET', `${API}/games/1`, data[0])
		})
		const matches = [
			{ source: 'wikidata', name, wikidataId: 'Q213911', releaseYear: 1998, platforms: ['Nintendo 64'], url: 'https://www.wikidata.org/wiki/Q213911' },
			{ source: 'wikidata', name, wikidataId: 'Q140140365', releaseYear: 2026, platforms: ['Nintendo Switch 2'], url: 'https://www.wikidata.org/wiki/Q140140365' },
		]
		let lookups = 0, saves = 0
		const fields = (['logo', 'hero', 'cover'] as const).map(field => ({ field, current: null, value: `/sample-artwork/amber-${field}.svg`, source: 'launchbox', url: 'https://gamesdb.launchbox-app.com/games/details/446107-the-legend-of-zelda-ocarina-of-time' }))
		cy.intercept('POST', `${API}/games/1/metadata/preview`, request => {
			lookups++
			if (lookups === 1) request.reply({ ...preview, matches, token: null, fields: [], notices: ['chooseIdentity'] })
			else { expect(request.body.wikidataId).to.equal('Q140140365'); request.reply({ ...preview, matches, fields, notices: [] }) }
		}).as('editionLookup')
		cy.intercept('POST', `${API}/games/1/metadata/apply`, request => { saves++; request.reply({ statusCode: 500 }) })
		// Touch layouts use the detail's explicit options, not desktop hover tools.
		cy.visit(LIBRARY); cy.wait('@getGames'); cy.get('.game-cover-view__open-art').first().click()
		cy.get('dialog.gdb-game-sheet[open]').find('button[aria-label="Game options"]').click()
		cy.contains('button', /^Fill information automatically$/).click()
		cy.get('dialog.gdb-metadata-sheet[open]').should('be.visible')
		cy.contains('button', /^Look up information$/).click(); cy.wait('@editionLookup')
		cy.findByRole('button', { name: /1998 · Nintendo 64/ }).should('be.visible')
		cy.get('.gdb-metadata-sheet .gdb-sheet__body').then(body => expect(body[0].scrollWidth).to.be.at.most(body[0].clientWidth + 1))
		cy.screenshot('metadata-editions-mobile', { capture: 'viewport' })
		cy.findByRole('button', { name: /2026 · Nintendo Switch 2/ }).click(); cy.wait('@editionLookup')
		cy.get('.gdb-metadata-fields .gdb-editor-artwork-preview[data-state="loaded"]').should('have.length', 3)
		cy.get('.gdb-metadata-field').should('have.length', 3)
		cy.findAllByRole('link', { name: 'Source: LaunchBox' }).should('have.length', 3)
		cy.get('.gdb-metadata-sheet .gdb-sheet__body').then(body => expect(body[0].scrollWidth).to.be.at.most(body[0].clientWidth + 1))
		cy.screenshot('metadata-three-roles-mobile', { capture: 'viewport' })
		cy.viewport(1280, 800); cy.screenshot('metadata-three-roles-desktop', { capture: 'viewport' })
		cy.then(() => { expect(saves).to.equal(0); expect(lookups).to.equal(2) })
		cy.get('dialog.gdb-metadata-sheet').contains('button', /^Cancel$/).click()
	})
	it('shows provider failures rather than hiding them as an empty search', () => {
		cy.intercept('POST', `${API}/games/1/metadata/preview`, { ...preview, token: null, fields: [], notices: ['wikidataUnavailable', 'artworkSourceUnavailable'] }).as('providerFailure')
		openLookup(); cy.contains('button', /^Look up information$/).click(); cy.wait('@providerFailure')
		cy.get('dialog.gdb-metadata-sheet').should('contain.text', 'Wikidata could not be checked').and('contain.text', 'An artwork source could not be checked')
		cy.contains('button', /^Save selected fields$/).should('be.disabled')
	})
})
