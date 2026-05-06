/// <reference types="cypress" />
/// <reference types="@testing-library/cypress" />

declare namespace Cypress {
	interface Chainable {
		/**
		 * Log in by seeding auth state into localStorage (via cy.session).
		 * @param username - The username to log in as
		 * @param role - 'Admin' or 'Standard' (default: 'Admin')
		 */
		login(username: string, role?: 'Admin' | 'Standard'): Chainable<void>

		/**
		 * Set up cy.intercept() mocks for all standard API routes.
		 * Call in beforeEach() before cy.visit().
		 */
		mockApiRoutes(): Chainable<void>

		/**
		 * Open the Add Game modal, type the given name, and submit.
		 * Requires mockApiRoutes() to be active.
		 * @param name - The game name to enter
		 */
		createGame(name: string): Chainable<void>
	}
}
