export const safeArtworkUrl = (value: string | null | undefined): string | null => {
	if (!value) return null
	try {
		const sample = /^\/sample-artwork\/(?:amber|orbit|harbor)-(?:hero|cover|logo)\.svg$/.test(value)
		const url = sample && typeof window !== 'undefined' ? new URL(value, window.location.origin) : new URL(value)
		return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null
	} catch { return null }
}

/** A bounded, abortable validation before replacing any artwork draft value. */
export const preloadArtwork = (value: string, signal?: AbortSignal): Promise<boolean> => {
	const url = safeArtworkUrl(value)
	if (!url || signal?.aborted) return Promise.resolve(false)
	return new Promise(resolve => {
		const image = new Image()
		let complete = false
		const finish = (loaded: boolean) => {
			if (complete) return
			complete = true
			clearTimeout(timer)
			signal?.removeEventListener('abort', cancel)
			image.onload = null; image.onerror = null
			if (!loaded) image.src = ''
			resolve(loaded)
		}
		const cancel = () => finish(false)
		const timer = setTimeout(cancel, 10000)
		image.onload = () => {
			if (typeof image.decode === 'function') void image.decode().then(() => finish(image.naturalWidth > 0)).catch(cancel)
			else finish(image.naturalWidth > 0)
		}
		image.onerror = cancel
		signal?.addEventListener('abort', cancel, { once: true })
		image.src = url
	})
}
