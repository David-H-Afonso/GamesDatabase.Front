import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './mocks/server'
import i18n from '@/i18n'

// Start MSW server before all tests
beforeAll(async () => {
	await i18n.changeLanguage('es')
	server.listen({ onUnhandledRequest: 'warn' })
})

// Reset handlers after each test (important for test isolation)
afterEach(() => {
	cleanup()
	server.resetHandlers()
})

// Close MSW server after all tests
afterAll(() => server.close())
