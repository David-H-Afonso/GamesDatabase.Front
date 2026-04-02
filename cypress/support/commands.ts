/// <reference types="cypress" />

/**
 * Custom Cypress commands.
 * Add reusable commands here (e.g. login, API intercepts).
 *
 * Usage:   cy.login('admin', 'password')
 * Declare: add to cypress/support/index.d.ts
 */

Cypress.Commands.add('login', (username: string, password: string) => {
	cy.intercept('POST', '**/api/users/login', {
		statusCode: 200,
		body: {
			userId: 1,
			username,
			role: 'Admin',
			token: 'mock-jwt-token',
		},
	}).as('loginRequest')

	cy.visit('/login')
	cy.findByLabelText(/username/i).type(username)
	cy.findByLabelText(/password/i).type(password)
	cy.findByRole('button', { name: /login|sign in|enter/i }).click()
	cy.wait('@loginRequest')
})
