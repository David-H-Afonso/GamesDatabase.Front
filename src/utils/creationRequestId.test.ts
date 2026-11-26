import { describe, expect, it } from 'vitest'
import { creationRequestId } from './creationRequestId'

describe('draft creation UUIDs without requiring a secure-context randomUUID API', () => {
	it('generates distinct, correctly versioned UUIDv4 identifiers', () => {
		const ids = Array.from({ length: 64 }, creationRequestId)
		expect(new Set(ids).size).toBe(ids.length)
		ids.forEach(id => expect(id).toMatch(/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/))
	})
})
