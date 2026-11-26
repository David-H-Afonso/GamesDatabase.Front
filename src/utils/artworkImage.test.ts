import { afterEach, describe, expect, it, vi } from 'vitest'
import { preloadArtwork, safeArtworkUrl } from './artworkImage'

describe('artwork candidate validation', () => {
	afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })
	it.each(['javascript:alert(1)', 'file:///image.png', 'data:image/png;base64,abc', 'https://user:password@cdn.test/a.jpg', 'not-a-url'])('rejects unsafe candidate %s without loading it', async value => {
		expect(safeArtworkUrl(value)).toBeNull(); expect(await preloadArtwork(value)).toBe(false)
	})
	it('returns false for an already-aborted lookup without constructing an image', async () => {
		const ImageSpy = vi.fn(); vi.stubGlobal('Image', ImageSpy)
		const controller = new AbortController(); controller.abort()
		expect(await preloadArtwork('https://cdn.test/image.jpg', controller.signal)).toBe(false); expect(ImageSpy).not.toHaveBeenCalled()
	})
	it('allows only the explicit bundled example artwork paths, not arbitrary relative URLs', () => {
		expect(safeArtworkUrl('/sample-artwork/amber-hero.svg')).toBe(`${window.location.origin}/sample-artwork/amber-hero.svg`)
		for (const path of ['/sample-artwork/../private.png', '/sample-artwork/amber-hero.svg?token=private', '/other/image.svg', '//server/private.svg']) expect(safeArtworkUrl(path)).toBeNull()
	})
	it('has a finite deadline for an image that never completes', async () => {
		vi.useFakeTimers(); vi.stubGlobal('Image', class { onload = null; onerror = null; src = '' })
		const result = preloadArtwork('https://cdn.test/image.jpg'); await vi.advanceTimersByTimeAsync(10000)
		expect(await result).toBe(false)
	})
	it('requires decoded pixels and cleans up on cancellation', async () => {
		class ImageStub { onload: (() => void) | null = null; onerror: (() => void) | null = null; naturalWidth = 100; set src(_url: string) { queueMicrotask(() => this.onload?.()) } decode() { return Promise.resolve() } }
		vi.stubGlobal('Image', ImageStub)
		expect(await preloadArtwork('https://cdn.test/image.jpg')).toBe(true)
	})

	it('cancels the in-flight image and detaches its handlers', async () => {
		const images: ImageStub[] = []
		class ImageStub { onload = null; onerror = null; src = ''; constructor() { images.push(this) } }
		vi.stubGlobal('Image', ImageStub)
		const controller = new AbortController(), result = preloadArtwork('https://cdn.test/image.jpg', controller.signal)
		controller.abort()
		expect(await result).toBe(false); expect(images[0].src).toBe(''); expect(images[0].onload).toBeNull(); expect(images[0].onerror).toBeNull()
	})

	it('rejects a nominally loaded image without decoded pixels', async () => {
		class ImageStub { onload: (() => void) | null = null; onerror = null; naturalWidth = 0; set src(_url: string) { queueMicrotask(() => this.onload?.()) } decode() { return Promise.resolve() } }
		vi.stubGlobal('Image', ImageStub)
		expect(await preloadArtwork('https://cdn.test/image.jpg')).toBe(false)
	})

	it('rejects decoding errors rather than replacing working artwork', async () => {
		class ImageStub { onload: (() => void) | null = null; onerror = null; naturalWidth = 100; set src(_url: string) { queueMicrotask(() => this.onload?.()) } decode() { return Promise.reject(new Error('invalid image')) } }
		vi.stubGlobal('Image', ImageStub)
		expect(await preloadArtwork('https://cdn.test/image.jpg')).toBe(false)
	})
})
