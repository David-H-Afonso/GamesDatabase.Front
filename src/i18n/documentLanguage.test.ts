import { afterEach, describe, expect, it } from 'vitest'
import i18n from './index'

const originalLanguage = document.documentElement.lang

afterEach(async () => {
	await i18n.changeLanguage('es')
	document.documentElement.lang = originalLanguage
})

describe('document language follows the actual translation resources', () => {
	it.each(['en', 'es'] as const)('updates a stale HTML language when the UI changes to %s', async language => {
		document.documentElement.lang = 'fr'
		await i18n.changeLanguage(language)
		expect(i18n.resolvedLanguage).toBe(language)
		expect(document.documentElement.lang).toBe(language)
	})

	it('uses the resolved Spanish resource language for a regional preference', async () => {
		document.documentElement.lang = 'en'
		await i18n.changeLanguage('es-MX')
		expect(i18n.resolvedLanguage).toBe('es')
		expect(document.documentElement.lang).toBe('es')
	})

	it('declares the English fallback rather than an unsupported requested locale', async () => {
		document.documentElement.lang = 'fr'
		await i18n.changeLanguage('fr')
		expect(i18n.resolvedLanguage).toBe('en')
		expect(document.documentElement.lang).toBe('en')
	})
})
