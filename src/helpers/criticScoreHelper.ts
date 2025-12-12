export type CriticProvider = 'Metacritic' | 'OpenCritic' | 'SteamDB'

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

/**
 * Maps critic provider name to numeric ID
 * @param provider - The critic provider name
 * @returns The numeric ID (1 for Metacritic, 2 for OpenCritic, 3 for SteamDB)
 */
export const getCriticProviderIdFromName = (provider: string | null | undefined): number | undefined => {
	if (!provider) return undefined
	
	switch (provider) {
		case 'Metacritic':
			return 1
		case 'OpenCritic':
			return 2
		case 'SteamDB':
			return 3
		default:
			return undefined
	}
}

/**
 * Maps numeric ID to critic provider name
 * @param id - The numeric ID
 * @returns The critic provider name
 */
export const getCriticProviderNameFromId = (id: number | null | undefined): CriticProvider | null => {
	if (id === undefined || id === null || id === 0) return null
	
	switch (id) {
		case 1:
			return 'Metacritic'
		case 2:
			return 'OpenCritic'
		case 3:
			return 'SteamDB'
		default:
			return null
	}
}
