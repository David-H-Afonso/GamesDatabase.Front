/**
 * Gets the appropriate search URL for a game's critic score based on the provider
 * @param gameName - Name of the game to search
 * @param provider - Score provider (Metacritic, OpenCritic, SteamDB)
 * @returns The search URL for the specified provider
 */
export type CriticProvider = 'Metacritic' | 'OpenCritic' | 'SteamDB'

export const getCriticScoreUrl = (gameName: string, provider: CriticProvider): string => {
	const query = encodeURIComponent(gameName.trim())
	switch (provider) {
		case 'OpenCritic': {
			// Use Google site search for OpenCritic (OpenCritic's own search can be unreliable)
			const googleQuery = encodeURIComponent(`site:opencritic.com ${gameName.trim()}`)
			return `https://www.google.com/search?q=${googleQuery}`
		}
		case 'SteamDB':
			// Use instantsearch to find both apps and packages
			return `https://steamdb.info/instantsearch/?query=${query}`
		case 'Metacritic':
		default:
			// Metacritic search for games
			return `https://www.metacritic.com/search/${query}/`
	}
}

export const resolveEffectiveProvider = (
	gameProvider: CriticProvider | undefined,
	userProvider: CriticProvider | undefined
): CriticProvider => {
	return gameProvider ?? userProvider ?? 'Metacritic'
}
