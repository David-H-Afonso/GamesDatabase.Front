import { describe, it, expect } from 'vitest'
import en from './locales/en.json'
import es from './locales/es.json'
import galleryEn from './locales/gallery.en.json'
import galleryEs from './locales/gallery.es.json'
import guideEn from './locales/guide.en.json'
import guideEs from './locales/guide.es.json'
import metadataEn from './locales/metadata.en.json'
import metadataEs from './locales/metadata.es.json'
import entryflowsEn from './locales/entryflows.en.json'
import entryflowsEs from './locales/entryflows.es.json'

type Json = Record<string, unknown>

/** Flatten a nested translation object into dotted key → string entries. */
function flatten(obj: Json, prefix = ''): Record<string, string> {
	const out: Record<string, string> = {}
	for (const [key, value] of Object.entries(obj)) {
		const path = prefix ? `${prefix}.${key}` : key
		if (value && typeof value === 'object' && !Array.isArray(value)) {
			Object.assign(out, flatten(value as Json, path))
		} else if (typeof value === 'string') {
			out[path] = value
		}
	}
	return out
}

const enFlat = flatten(en as Json)
const esFlat = flatten(es as Json)
const catalogs = [
	{ name: 'base', en: enFlat, es: esFlat },
	{ name: 'gallery', en: flatten(galleryEn), es: flatten(galleryEs) },
	{ name: 'guide', en: flatten(guideEn), es: flatten(guideEs) },
	{ name: 'metadata', en: flatten(metadataEn), es: flatten(metadataEs) },
	{ name: 'entryflows', en: flatten(entryflowsEn), es: flatten(entryflowsEs) },
]

describe('i18n locale integrity', () => {
	it.each(catalogs)('$name has complete nonempty EN/ES keys with matching interpolation variables', ({ en, es }) => {
		expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort())
		const tokens = (value: string) => [...value.matchAll(/{{-?\s*(\w+)(?:\s*,[^}]*)?\s*}}/g)].map(match => match[1]).sort()
		for (const [key, value] of Object.entries(en)) {
			expect(value.trim(), `Empty English key: ${key}`).not.toBe(''); expect(es[key].trim(), `Empty Spanish key: ${key}`).not.toBe('')
			expect(tokens(value), `Different variables for ${key}`).toEqual(tokens(es[key]))
		}
	})
	it('has exact key parity between English and Spanish', () => {
		const enKeys = Object.keys(enFlat).sort()
		const esKeys = Object.keys(esFlat).sort()
		const missingInEs = enKeys.filter((k) => !(k in esFlat))
		const missingInEn = esKeys.filter((k) => !(k in enFlat))
		expect(missingInEs, `Keys missing in es.json: ${missingInEs.join(', ')}`).toEqual([])
		expect(missingInEn, `Keys missing in en.json: ${missingInEn.join(', ')}`).toEqual([])
	})

	it('never embeds HTML tags inside translation values', () => {
		const htmlTag = /<[a-zA-Z/][^>]*>/
		const enOffenders = Object.entries(enFlat).filter(([, v]) => htmlTag.test(v)).map(([k]) => k)
		const esOffenders = Object.entries(esFlat).filter(([, v]) => htmlTag.test(v)).map(([k]) => k)
		expect(enOffenders, `HTML in en.json values: ${enOffenders.join(', ')}`).toEqual([])
		expect(esOffenders, `HTML in es.json values: ${esOffenders.join(', ')}`).toEqual([])
	})
})
