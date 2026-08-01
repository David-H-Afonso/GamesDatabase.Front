import { describe, it, expect } from 'vitest'
import en from './locales/en.json'
import es from './locales/es.json'

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

describe('i18n locale integrity', () => {
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
