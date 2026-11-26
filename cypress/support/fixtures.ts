import fixture from '../fixtures/games.json'

export const API = '**/api'
export const LIBRARY = '/#/library'
export const games = fixture.data
export const firstGame = games[0]
export const paged = (data: unknown[], overrides: Record<string, unknown> = {}) => ({ ...fixture, data, totalCount: data.length, totalPages: data.length ? 1 : 0, ...overrides })
export const openFirstGame = () => {
	cy.get('.gdb-library-results .game-card h3 button').first().click()
	cy.get('dialog.gdb-game-sheet[open]').should('be.visible')
}
export const openGameTab = () => {
	openFirstGame()
	cy.get('dialog.gdb-game-sheet').contains('button', /^Edit game$/).click()
	cy.get('dialog.gdb-game-editor').contains('button', /^Game$/).click()
}
export const saveEditor = () => cy.get('dialog.gdb-game-editor button[type="submit"]').click()
export const openFilters = () => {
	cy.get('.game-filters-chips__advanced-btn').click()
	cy.get('dialog.gdb-library-filter-sheet[open]').should('be.visible')
}
export const applyFilters = () => cy.get('button[type="submit"][form="gdb-library-filters"]').click()
