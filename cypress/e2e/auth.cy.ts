export {}

/**
 * Phase 6 — E2E: Authentication Journeys
 *
 * Tests the authentication user journey:
 * - Valid login → home page
 * - Invalid login → error message shown
 * - Session persists on page reload
 * - Logout redirects to login
 * - Protected routes redirect unauthenticated users
 * - Admin routes block non-admin users
 */

const API = 'https://localhost:7245/api'

// ─── Helpers ────────────────────────────────────────────────────────────────

function mockLoginSuccess(username: string, role: 'Admin' | 'Standard' = 'Admin') {
	cy.intercept('POST', `${API}/users/login`, {
		statusCode: 200,
		body: {
			userId: role === 'Admin' ? 1 : 2,
			username,
			role,
			token: `mock-jwt-token-${role.toLowerCase()}`,
		},
	}).as('loginRequest')

	cy.intercept('GET', `${API}/users/*`, {
		userId: role === 'Admin' ? 1 : 2,
		username,
		role,
		useScoreColors: false,
		scoreProvider: 'Metacritic',
		showPriceComparisonIcon: false,
	}).as('getUserPreferences')
}

function mockLoginFail() {
	cy.intercept('POST', `${API}/users/login`, {
		statusCode: 401,
		body: { message: 'Invalid credentials' },
	}).as('loginRequest')
}

function mockHomeApis() {
	cy.intercept('GET', `${API}/games*`, { fixture: 'games.json' }).as('getGames')
	cy.intercept('GET', `${API}/gamestatus/active`, { fixture: 'catalog.json#statuses' })
	cy.intercept('GET', `${API}/gamestatus/special`, { fixture: 'catalog.json#specialStatuses' })
	cy.intercept('GET', `${API}/gameplatforms/active`, { fixture: 'catalog.json#platforms' })
	cy.intercept('GET', `${API}/gameplaywith/active`, [])
	cy.intercept('GET', `${API}/gameplayedstatus/active`, [])
	cy.intercept('GET', `${API}/gamereplaytypes/active`, [])
	cy.intercept('GET', `${API}/gameviews*`, [])
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Authentication Journeys', () => {
	beforeEach(() => {
		cy.clearLocalStorage()
	})

	// ── 6.2 Login válido → ver game list ──────────────────────────────────────

	it('valid credentials → redirects to home page with game list', () => {
		mockLoginSuccess('Admin')
		mockHomeApis()

		cy.visit('/#/login')
		cy.get('#username').type('Admin')
		cy.get('#password').type('{selectall}{backspace}')
		cy.get('button[type="submit"]').should('contain.text', 'Sign In').click()

		cy.wait('@loginRequest')
		cy.url().should('include', '/#/')
		cy.url().should('not.include', 'login')
		cy.get('.home-component').should('exist')
	})

	// ── 6.2 Login inválido → ver error ────────────────────────────────────────

	it('invalid credentials → shows error message', () => {
		mockLoginFail()

		cy.visit('/#/login')
		cy.get('#username').type('WrongUser')
		cy.get('#password').type('WrongPassword')
		cy.get('button[type="submit"]').click()

		cy.wait('@loginRequest')
		cy.url().should('include', 'login')
		cy.get('.login-alert--error').should('be.visible')
	})

	// ── 6.2 Sesión persiste en reload ─────────────────────────────────────────

	it('session persists on page reload', () => {
		cy.login('Admin')
		mockHomeApis()

		cy.visit('/')
		cy.url().should('not.include', 'login')
		cy.get('.home-component').should('exist')

		cy.reload()

		// After reload, the app should rehydrate from localStorage and stay on home
		mockHomeApis()
		cy.url().should('not.include', 'login')
		cy.get('.home-component').should('exist')
	})

	// ── 6.2 Logout → redirect a login ─────────────────────────────────────────

	it('logout redirects to login page', () => {
		cy.login('Admin')
		mockHomeApis()
		cy.visit('/')

		cy.get('.home-component').should('exist')
		cy.get('button[title="Logout"]').click()
		cy.url().should('include', '/#/login')
	})

	// ── 6.2 No acceder a rutas protegidas sin auth ────────────────────────────

	it('unauthenticated user is redirected from home to login', () => {
		cy.visit('/')
		cy.url().should('include', '/#/login')
	})

	// ── 6.2 No acceder a admin como Standard ──────────────────────────────────

	it('standard user is redirected from admin route to home', () => {
		cy.login('StandardUser', 'Standard')
		mockHomeApis()

		cy.visit('/#/admin')
		// ProtectedRoute with adminOnly redirects non-admins to /
		cy.url().should('not.include', '/admin')
		cy.get('.home-component').should('exist')
	})
})
