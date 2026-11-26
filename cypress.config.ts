import { defineConfig } from 'cypress'

export default defineConfig({
	allowCypressEnv: false,
	e2e: {
		baseUrl: 'http://localhost:5173',
		specPattern: 'cypress/e2e/**/*.cy.{ts,tsx}',
		supportFile: 'cypress/support/e2e.ts',
		fixturesFolder: 'cypress/fixtures',
		viewportWidth: 1280,
		viewportHeight: 720,
		video: false,
		screenshotOnRunFailure: true,
		defaultCommandTimeout: 10000,
		scrollBehavior: 'center',
	},
})
