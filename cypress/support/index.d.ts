/// <reference types="cypress" />
/// <reference types="@testing-library/cypress" />

declare namespace Cypress {
	interface Chainable {
		/**
		 * Log in via the UI by intercepting the login API call.
		 * @param username - The username to type
		 * @param password - The password to type
		 */
		login(username: string, password: string): Chainable<void>
	}
}
