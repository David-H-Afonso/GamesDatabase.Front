import { describe, expect, it } from 'vitest'
import type { MetadataCandidate } from '@/models/api/GameMetadata'
import { confirmedMetadataReceipt } from './gameMetadataReceipts'

const fields: MetadataCandidate[] = [
	{ field: 'developer', current: null, value: 'Public studio', source: 'steam', url: 'https://store.steampowered.com/app/100/' },
	{ field: 'critic', current: null, value: 91, criticProvider: 'OpenCritic', source: 'dekudeals', url: 'https://www.dekudeals.com/items/public-fixture' },
]
const receipt = { game: { id: 51, developer: 'Public studio', critic: 91, criticProvider: 'OpenCritic' }, appliedFields: ['critic', 'developer'] }

describe('metadata receipt identity and exact field acknowledgement', () => {
	it('accepts an exact receipt in a different field order without requiring newer optional fields', () => {
		expect(confirmedMetadataReceipt(receipt, 51, fields)).toBe(true)
		expect(confirmedMetadataReceipt({ ...receipt, unchangedFields: ['developer'] }, 51, fields)).toBe(true)
	})
	it.each([null, undefined, 'not a receipt', {}, { ...receipt, appliedFields: null }, { ...receipt, appliedFields: ['developer', 'developer'] }, { ...receipt, unchangedFields: ['developer', 'developer'] }])('does not confirm malformed/duplicate receipt %#', value => {
		expect(confirmedMetadataReceipt(value, 51, fields)).toBe(false)
	})
	it('does not confirm an empty selection or another game ID', () => {
		expect(confirmedMetadataReceipt(receipt, 51, [])).toBe(false); expect(confirmedMetadataReceipt(receipt, 52, fields)).toBe(false)
	})
})
