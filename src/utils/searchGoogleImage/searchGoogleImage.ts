export const searchGoogleImage = (gameName: string, additive?: string) => {
	const url = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`"${gameName}" ${additive}`)}`
	window.open(url, '_blank', 'noopener')
}
