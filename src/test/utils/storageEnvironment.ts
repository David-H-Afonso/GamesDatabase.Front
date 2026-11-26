// Node's host Web Storage must not shadow the browser Storage in jsdom tests.
// Capture the actual jsdom instances before exposing them through test globals.
type BrowserStorageWindow = { localStorage: Storage; sessionStorage: Storage }
const environment = globalThis as typeof globalThis & { jsdom?: { window: BrowserStorageWindow } }
const browser = environment.jsdom?.window
if (!browser) throw new Error('The Storage test bootstrap requires the jsdom environment.')

export const testLocalStorage = browser.localStorage
export const testSessionStorage = browser.sessionStorage

for (const [name, value] of [['localStorage', testLocalStorage], ['sessionStorage', testSessionStorage]] as const) {
	Object.defineProperty(globalThis, name, { configurable: true, writable: true, value })
	Object.defineProperty(window, name, { configurable: true, writable: true, value })
}

export const clearTestStorage = () => {
	testLocalStorage.clear()
	testSessionStorage.clear()
}
