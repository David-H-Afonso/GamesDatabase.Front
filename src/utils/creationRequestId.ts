/** UUIDv4 works on local HTTP too, where crypto.randomUUID may be unavailable. */
export const creationRequestId = (): string => {
	const bytes = crypto.getRandomValues(new Uint8Array(16))
	bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128
	const text = [...bytes].map(value => value.toString(16).padStart(2, '0')).join('')
	return `${text.slice(0, 8)}-${text.slice(8, 12)}-${text.slice(12, 16)}-${text.slice(16, 20)}-${text.slice(20)}`
}
