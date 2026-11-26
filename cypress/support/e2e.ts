import './commands'
import '@testing-library/cypress/add-commands'

// Every compiled run uses an intentionally nonexistent loopback API. Individual
// fixtures must handle requests; a missing intercept cannot contact owner data.
beforeEach(() => {
	cy.intercept('GET', '**/env-config.js', { headers: { 'content-type': 'application/javascript' }, body: 'window.ENV={VITE_API_URL:"http://127.0.0.1:59999/api"};' })
})

// Tests use deterministic language/appearance, never the owner's browser storage.
Cypress.on('window:before:load', (win) => {
	win.localStorage.setItem('i18nextLng', 'en')
	win.localStorage.setItem('theme', 'gallery')
})
