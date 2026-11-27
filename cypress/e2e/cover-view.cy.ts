import { API, LIBRARY, paged } from '../support/fixtures'

const games = [{ id: 1, name: 'Warhammer 40,000: Space Marine II Anniversary Edition', statusId: 1, statusName: 'Playing', platformId: 1, platformName: 'Steam', playWithIds: [], playWithNames: [], steamAppId: 2183900, favorite: false, hero: null, cover: null }, { id: 2, name: 'Balatro', statusId: 2, statusName: 'Done', platformId: 1, platformName: 'Steam', playWithIds: [], playWithNames: [], steamAppId: 2379780, favorite: false, hero: null, cover: null }]

describe('Cover presentation and mature quick tools', () => {
	beforeEach(() => {
		cy.login('Admin'); cy.mockApiRoutes()
		cy.intercept('GET', /\/api\/games(\?.*)?$/, paged(games)).as('games')
		cy.intercept('GET', `${API}/games/1`, games[0])
		cy.intercept('GET', `${API}/gamestatus/active*`, [{ id: 1, name: 'Playing', color: '#61afef' }, { id: 2, name: 'Done', color: '#98c379' }])
		cy.intercept('PATCH', `${API}/games/1/status`, request => request.reply({ statusCode: 200, body: { ...games[0], statusId: request.body.statusId, statusName: 'Done' } })).as('statusUpdate')
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
		const url = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2183900/library_600x900.jpg'
		cy.readFile('public/sample-artwork/amber-cover.svg').then(body => cy.intercept('GET', url, { headers: { 'content-type': 'image/svg+xml' }, body }))
		cy.intercept('POST', `${API}/games/1/metadata/preview`, request => {
			expect(request.body).to.deep.equal({ overwrite: true, includeArtwork: true, includeDurations: false, includeCritic: false, reviewVersion: 2, steamAppId: 2183900 })
			request.reply({ overwrite: true, reviewVersion: 2, token: 'fixture-role-only-not-authentication', matches: [{ source: 'steam', steamAppId: 2183900, name: games[0].name, url: 'https://store.steampowered.com/app/2183900/' }], fields: [{ field: 'cover', current: null, value: url, source: 'steam', url: 'https://store.steampowered.com/app/2183900/' }], notices: [] })
		}).as('artworkLookup')
		cy.intercept('POST', `${API}/games/1/metadata/apply`, request => { expect(request.body).to.deep.equal({ token: 'fixture-role-only-not-authentication', fields: ['cover'] }); request.reply({ game: { ...games[0], cover: url }, appliedFields: ['cover'], unchangedFields: [] }) }).as('artworkApply')
		cy.get('.gdb-select-mode').click(); cy.get('.gdb-game-select-target').first().click('center').find('input').should('be.checked')
		cy.get('.gdb-bulk-toolbar').then(toolbar => { if (!toolbar.find('[data-bulk-action="artwork-field"]').length) cy.findByRole('button', { name: 'More actions' }).click() })
		cy.findByLabelText('Image to refresh').select('cover'); cy.contains('button', /^Refresh image$/).click()
		cy.wait('@artworkLookup'); cy.wait('@artworkApply'); cy.get('dialog.gdb-metadata-batch-sheet').should('contain.text', 'Finished reviewing 1 game.').and('contain.text', 'No player sync')
	})
})
