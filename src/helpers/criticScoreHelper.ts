/**
 * Gets the appropriate search URL for a game's critic score based on the provider
 * @param gameName - Name of the game to search
 * @param provider - Score provider (Metacritic, OpenCritic, SteamDB)
 * @returns The search URL for the specified provider
 */
export const getCriticScoreUrl = (gameName: string, provider: string): string => {
	const query = encodeURIComponent(gameName)
	switch (provider) {
		case 'OpenCritic':
			return `https://opencritic.com/search?q=${query}`
		case 'SteamDB':
			return `https://steamdb.info/search/?a=app&q=${query}`
		case 'Metacritic':
		default:
			return `https://www.metacritic.com/search/${query}/`
	}
}
