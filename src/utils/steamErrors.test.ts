import { steamErrorKey } from './steamErrors'

describe('safe Steam errors', () => {
	it.each([
		['HTTP 504: <html>PRIVATE_DETAIL</html>', 'gateway'],
		['HTTP 409: steamSyncBusy', 'busy'],
		['HTTP 429', 'queueFull'],
		['HTTP 404', 'statusLost'],
		['HTTP 503', 'unavailable'],
		['steamNotLinked', 'unlinked'],
		['https://private.test/?token=PRIVATE <script>bad</script>', 'request'],
	])('maps %s to a known localized message', (message, key) => {
		expect(steamErrorKey(new Error(message))).toBe(`steamSync.errors.${key}`)
		expect(steamErrorKey(message)).not.toContain('PRIVATE')
	})
})
