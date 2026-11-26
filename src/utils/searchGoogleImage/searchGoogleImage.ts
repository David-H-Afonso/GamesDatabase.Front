export const googleImageSearchUrl = (gameName: string, additive = '') =>
	`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`"${gameName}" ${additive}`.trim())}`

export const searchGoogleImage = (gameName: string, additive?: string) => {
	window.open(googleImageSearchUrl(gameName, additive), '_blank', 'noopener')
}
