/** Never render provider/proxy HTML, URLs, credentials or exception details as UI errors. */
export const steamErrorKey = (error: unknown): string => {
	const message = error instanceof Error ? error.message : typeof error === 'string' ? error : ''
	if (/HTTP 504\b|gateway.?time.?out/i.test(message)) return 'steamSync.errors.gateway'
	if (/HTTP 409\b|steamSyncBusy/i.test(message)) return 'steamSync.errors.busy'
	if (/HTTP 429\b|queueFull/i.test(message)) return 'steamSync.errors.queueFull'
	if (/HTTP 404\b/.test(message)) return 'steamSync.errors.statusLost'
	if (/steamNotLinked|no Steam account linked/i.test(message)) return 'steamSync.errors.unlinked'
	if (/HTTP 50[023]\b|serviceStopping/i.test(message)) return 'steamSync.errors.unavailable'
	return 'steamSync.errors.request'
}
