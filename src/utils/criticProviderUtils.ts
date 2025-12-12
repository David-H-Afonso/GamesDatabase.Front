/**
 * Utility functions for handling critic provider mappings
 */

export type CriticProvider = 'Metacritic' | 'OpenCritic' | 'SteamDB'

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
