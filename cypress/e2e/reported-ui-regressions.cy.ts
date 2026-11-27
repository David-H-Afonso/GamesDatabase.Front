import { API, LIBRARY, firstGame, games, paged } from '../support/fixtures'

const focus = { id: 7, name: 'Focus', isAutomatic: false, maxLength: 4, sortOrder: 0, gameCount: 1, updatedAt: '', createdAt: '', items: [{ id: 71, gameId: 1, position: 0, game: firstGame }] }
const record = { id: 'game-1', source: 'game', recordId: 1, game: firstGame, date: '2026-01-04', grade: 95, type: 'Game' }
const statistics = {
	version: 1, year: 2026, dateKind: 'finished', timeBasis: 'accumulated-only', dateBasis: 'stored-records-not-sessions', years: [2026],
	totals: { totalGames: 3, effectiveMinutes: 180, steamMinutes: 600, manualMinutes: 180, timedGames: 1, missingTimeGames: 2, completedGames: 1, fullyCompletedGames: 0, closureGames: 1, missingFinishGames: 2, missingStoryGames: 3, achievementsUnlocked: 0, achievementsTotal: 0, achievementGames: 0, unknownAchievementDates: 0 },
	byStatus: [{ statusId: 1, name: 'Completed', color: '#22c55e', count: 1 }],
	months: Array.from({ length: 12 }, (_, index) => ({ month: index + 1, records: index ? 0 : 1, games: index ? 0 : 1, mainRecords: index ? 0 : 1, replayRecords: 0, unlocks: 0, artworkGame: index ? null : firstGame })),
	records: [record], ranking: [record], distinctGames: 1, mainRecords: 1, replayRecords: 0, ratedGames: 1, average: 95, datedUnlocks: 0, unlocksByGame: [], progressBins: [], nearComplete: [], topPlaytime: games, developers: [],
}

const expectSingleSearchRing = (selector: string) => {
	cy.get(selector).focus().should('have.css', 'outline-style', 'none').and('have.css', 'box-shadow', 'none').and('have.css', 'border-top-width', '0px')
	cy.get(selector).parent().should('have.css', 'outline-style', 'solid').and('have.css', 'outline-width', '2px')
}

describe('Reported collection UI regressions', () => {
	beforeEach(() => {
		cy.login('StandardUser', 'Standard'); cy.mockApiRoutes()
		cy.intercept('GET', `${API}/playlists`, [focus])
		cy.intercept('GET', `${API}/playlists/7`, focus)
		cy.intercept('GET', `${API}/collection/statistics*`, statistics)
		cy.intercept('GET', `${API}/collection/goty`, { revision: 1, selections: {} })
		cy.intercept('GET', `${API}/collection/games*`, paged(games))
	})

	it('omits empty platform badges and keeps selection separate from card actions', () => {
		cy.intercept('GET', /\/api\/games(\?.*)?$/, paged(games.map((game, index) => ({ ...game, platformName: index === 0 ? '' : index === 1 ? ' \t ' : 'PC' }))))
		cy.visit(LIBRARY, { onBeforeLoad: win => win.localStorage.setItem('cardStyle', 'card') })
		cy.get('.gdb-card-platform').should('have.length', 1).and('have.text', 'PC')
		cy.get('.gdb-count-select').click()
		cy.get('.gdb-game-select-target input').first().check().should('be.checked')
		cy.get('.game-card').first().should('have.class', 'is-selected').find('.gdb-card-tools').should('not.be.visible')
		cy.get('dialog.gdb-game-sheet[open]').should('not.exist')
		cy.get('.gdb-game-select-target input').first().uncheck().should('not.be.checked')
	})

	it('uses a named 44px plus control to add a game to Focus once by pointer', () => {
		let additions = 0
		cy.intercept('POST', `${API}/playlists/7/items`, request => {
			additions += 1
			expect(request.body).to.deep.equal({ gameId: 2 })
			request.reply({ ...focus, gameCount: 2, items: [...focus.items, { id: 72, gameId: 2, position: 1, game: games[1] }] })
		}).as('addFocus')
		cy.visit('/#/focus'); cy.contains('button', /^Manage$/).click()
		cy.get('.focus-search input').type('Hollow')
		expectSingleSearchRing('.focus-search input')
		cy.get('.focus-search-result__add[aria-label="Add Hollow Knight to Focus"]').as('add')
		cy.get('@add').should('have.text', '').and('have.css', 'width', '44px').and('have.css', 'height', '44px').find('svg[aria-hidden=true]').should('exist')
		cy.get('@add').click()
		cy.wait('@addFocus'); cy.get('.focus-manage-list').should('contain.text', 'Hollow Knight')
		cy.then(() => expect(additions).to.equal(1))
	})

	it('keeps only the outer focus ring in playlist search', () => {
		cy.visit('/#/playlists/7'); cy.get('.playlist-add').click()
		expectSingleSearchRing('.playlist-search>input')
	})

	for (const width of [1440, 390]) it(`keeps statistics tabs vertically stable and keyboard reachable at ${width}px`, () => {
		cy.viewport(width, 900); cy.visit('/#/statistics?year=2026')
		cy.get('.gdb-statistics-navigation').should('have.css', 'overflow-y', 'hidden').should(nav => {
			expect(nav[0].scrollHeight).to.equal(nav[0].clientHeight)
			if (width === 1440) expect(nav[0].scrollWidth).to.equal(nav[0].clientWidth)
			else expect(nav[0].scrollWidth).to.be.greaterThan(nav[0].clientWidth)
		})
		cy.get('.gdb-statistics-navigation>button').last().focus().should('have.css', 'outline-style', 'solid').should(button => {
			const nav = button[0].parentElement!.getBoundingClientRect(), bounds = button[0].getBoundingClientRect()
			expect(bounds.left).to.be.at.least(nav.left - 1); expect(bounds.right).to.be.at.most(nav.right + 1)
		})
		cy.contains('button', /^Choose my GOTY$/).click()
		expectSingleSearchRing('.gdb-picker-search input')
		cy.get('.gdb-game-picker>button').first().focus().should('have.css', 'outline-style', 'solid').and('not.have.css', 'background-color', 'rgba(0, 0, 0, 0)')
		cy.get('html').should(html => expect(html[0].scrollWidth).to.be.at.most(width + 1))
	})
})
