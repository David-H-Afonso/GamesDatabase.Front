import './utils/storageEnvironment'
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'
import { clearTestStorage } from './utils/storageEnvironment'
import { server } from './mocks/server'
import i18n from '@/i18n'

// jsdom does not implement the native dialog top layer; browser tests verify focus/inertness.
Object.defineProperties(HTMLDialogElement.prototype, {
	showModal: { configurable: true, value: function (this: HTMLDialogElement) { this.open = true } },
	close: { configurable: true, value: function (this: HTMLDialogElement) { this.open = false; this.dispatchEvent(new Event('close')) } },
})

// Start MSW server before all tests
beforeAll(async () => {
	await i18n.changeLanguage('es')
	// Fail closed: a missing fixture must never fall through to an original API.
	server.listen({ onUnhandledRequest: 'error' })
})

// Reset handlers after each test (important for test isolation)
beforeEach(clearTestStorage)
afterEach(() => {
	cleanup()
	server.resetHandlers()
	clearTestStorage()
})

// Close MSW server after all tests
afterAll(() => server.close())
