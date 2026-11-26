import { customFetch } from '@/utils/customFetch/customFetch'
import { steamService } from './SteamService'

vi.mock('@/utils/customFetch/customFetch', () => ({ customFetch: vi.fn() }))
afterEach(() => vi.clearAllMocks())

describe('Steam artwork read-only contract', () => {
	it('uses a bounded GET and preserves the cancellation signal and hashed candidates', async () => {
		const candidates = { heroUrl: 'https://cdn.test/content-hash/header.jpg', logoUrl: null }
		vi.mocked(customFetch).mockResolvedValue(candidates)
		const signal = new AbortController().signal
		expect(await steamService.getAppArtwork(100, signal)).toEqual(candidates)
		expect(customFetch).toHaveBeenCalledExactlyOnceWith('/steam/app/100/artwork', { signal, timeout: 15000 })
	})
	it.each([0, -1, 1.5, 2147483648, NaN, Infinity])('does not request invalid App ID %s', async id => {
		await expect(steamService.getAppArtwork(id)).rejects.toThrow('Invalid Steam App ID')
		expect(customFetch).not.toHaveBeenCalled()
	})
	it.each([null, '<html>private error</html>', [], { heroUrl: 42 }, { coverUrl: {} }, { logoUrl: false }])('rejects malformed success payloads', async value => {
		vi.mocked(customFetch).mockResolvedValue(value)
		await expect(steamService.getAppArtwork(100)).rejects.toThrow('Invalid artwork response')
	})
	it('permits missing roles without substituting a cover for another role', async () => {
		vi.mocked(customFetch).mockResolvedValue({ coverUrl: 'https://cdn.test/cover.jpg' })
		expect(await steamService.getAppArtwork(100)).toEqual({ coverUrl: 'https://cdn.test/cover.jpg' })
	})
})
