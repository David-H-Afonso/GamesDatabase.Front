import { API, LIBRARY, firstGame, games, paged } from '../support/fixtures'

const base = { version: '3.0.0', revision: 0, enabled: true, step: 'welcome', requiresPassword: false, hasSamples: false, sampleGames: [] as any[], samplePlaylists: 0, sampleLists: [] as any[] }
const samples = Array.from({ length: 6 }, (_, index) => ({ ...firstGame, id: 90 + index, name: `Example ${index + 1}`, isSample: true, steamAppId: null, hero: '/sample-artwork/amber-hero.svg', cover: '/sample-artwork/amber-cover.svg', logo: '/sample-artwork/amber-logo.svg', createdAt: '2026-11-25T12:00:00Z', updatedAt: '2026-11-25T12:00:00Z' }))
describe('Optional guide and provenance-scoped examples', () => {
	beforeEach(() => { cy.login('Admin'); cy.mockApiRoutes() })
	it('an existing account reactivates, resumes and pauses its server chapter without adding examples', () => {
		let state = { ...base, enabled: false, step: 'progress', revision: 5 }
		cy.intercept('GET', `${API}/onboarding`, request => request.reply(state))
		cy.intercept('POST', `${API}/onboarding/start`, request => { expect(request.body).to.deep.equal({ revision: 5, restart: false }); state = { ...state, enabled: true, revision: 6 }; request.reply(state) }).as('resumeGuide')
		cy.intercept('PUT', `${API}/onboarding`, request => { expect(request.body).to.deep.equal({ revision: 6, step: 'progress', enabled: false, complete: false }); state = { ...state, enabled: false, revision: 7 }; request.reply(state) }).as('pauseGuide')
		cy.visit(LIBRARY); cy.wait('@getGames'); cy.get('dialog.gdb-onboarding').should('not.exist'); cy.get('.gdb-profile-button').click(); cy.contains('button', /^Getting started$/).click(); cy.wait('@resumeGuide')
		cy.get('dialog.gdb-onboarding h3').should('contain.text', 'Keep track of your progress'); cy.get('dialog.gdb-onboarding footer').contains('button', /^Not now$/).click(); cy.wait('@pauseGuide'); cy.get('dialog.gdb-onboarding').should('not.exist')
	})
	it('runs every chapter with the own-library choice and never creates samples', () => {
		let state = { ...base }, creates = 0
		cy.intercept('GET', `${API}/onboarding`, request => request.reply(state))
		cy.intercept('PUT', `${API}/onboarding`, request => { state = { ...state, ...request.body, revision: state.revision + 1 }; request.reply(state) }).as('guideProgress')
		cy.intercept('POST', `${API}/onboarding/samples`, request => { creates++; request.reply(state) })
		cy.visit('/#/'); cy.get('dialog.gdb-onboarding[open]').should('be.visible'); cy.contains('button', /^Use my library$/).click(); cy.wait('@guideProgress')
		for (const title of ['Add and edit games', 'Give your collection some order', 'Keep track of your progress', 'Make Home useful to you', 'Find your next game']) { cy.get('dialog.gdb-onboarding h3').should('contain.text', title); cy.get('dialog.gdb-onboarding footer').contains('button', /^Continue$/).click(); cy.wait('@guideProgress') }
		cy.get('dialog.gdb-onboarding h3').should('contain.text', 'Your library is ready'); cy.contains('button', /^Finish guide$/).click(); cy.wait('@guideProgress').its('request.body.complete').should('eq', true); cy.get('dialog.gdb-onboarding').should('not.exist'); cy.then(() => expect(creates).to.equal(0))
	})
	it('adds examples only on acceptance, reviews exact game/list stamps and leaves ordinary games in Library', () => {
		let state = { ...base }, library = [...games]
		cy.intercept('GET', `${API}/onboarding`, request => request.reply(state))
		cy.intercept('PUT', `${API}/onboarding`, request => { state = { ...state, ...request.body, revision: state.revision + 1 }; request.reply(state) }).as('guideProgress')
		cy.intercept('POST', `${API}/onboarding/samples`, request => { expect(request.body).to.deep.equal({ revision: 0, confirm: true }); state = { ...state, revision: 1, step: 'library', hasSamples: true, sampleGames: samples, samplePlaylists: 1, sampleLists: [{ id: 7, name: 'Example playlist', createdAt: samples[0].createdAt, updatedAt: samples[0].updatedAt }] }; library = [...games, ...samples]; request.reply(state) }).as('createExamples')
		cy.intercept('GET', /\/api\/games(\?.*)?$/, request => request.reply(paged(library)))
		cy.intercept('DELETE', `${API}/onboarding/samples`, request => { expect(request.body.confirm).to.equal(true); expect(request.body.expectedGames.map((game: any) => game.id)).to.deep.equal(samples.map(game => game.id)); expect(request.body.expectedPlaylists).to.deep.equal([{ id: 7, updatedAt: samples[0].updatedAt }]); expect(request.body.removeEditedSamples).to.equal(false); state = { ...state, revision: state.revision + 1, hasSamples: false, sampleGames: [], samplePlaylists: 0, sampleLists: [] }; library = [...games]; request.reply({ state, removedGames: 6, keptGames: 0, removedPlaylists: 1, keptPlaylists: 0 }) }).as('removeExamples')
		cy.visit('/#/'); cy.contains('button', /^Try six example games$/).click(); cy.wait('@createExamples')
		for (let step = 0; step < 5; step++) { cy.get('dialog.gdb-onboarding footer').contains('button', /^Continue$/).click(); cy.wait('@guideProgress') }
		cy.contains('button', /^Remove the examples$/).click(); cy.findByRole('alertdialog').should('contain.text', 'Example 1'); cy.findByRole('alertdialog').contains('button', /^Remove the examples$/).click(); cy.wait('@removeExamples'); cy.findByRole('alertdialog').should('not.exist')
		cy.contains('button', /^Finish guide$/).click(); cy.wait('@guideProgress'); cy.visit(LIBRARY); cy.get('.gdb-library-results .game-card').should('have.length', 3)
	})
})
