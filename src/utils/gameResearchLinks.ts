import { getCriticScoreUrl, resolveEffectiveProvider, type CriticProvider } from '@/helpers/criticScoreHelper'
import { googleImageSearchUrl } from './searchGoogleImage/searchGoogleImage'

export interface GameResearchLink { href: string; provider: string }
interface ResearchGame { name: string; criticProvider?: string; platformName?: string; steamAppId?: number }
const criticProvider = (value?: string): CriticProvider | undefined =>
	value === 'Metacritic' || value === 'OpenCritic' || value === 'SteamDB' ? value : undefined

/** The same destinations as the original field editors; never writes game data. */
export const gameResearchLink = (field: string, game: ResearchGame, userProvider?: string): GameResearchLink | null => {
	const name = game.name.trim()
	if (!name) return null
	if (field === 'logo' || field === 'hero' || field === 'cover') {
		const additive = { logo: 'logo', hero: 'header', cover: 'cover art' }[field]
		return { href: googleImageSearchUrl(name, additive), provider: 'Google Images' }
	}
	if (field === 'critic') {
		const provider = resolveEffectiveProvider(criticProvider(game.criticProvider), criticProvider(userProvider))
		return { href: getCriticScoreUrl(name, provider), provider }
	}
	if (field === 'story' || field === 'completion') return { href: `https://howlongtobeat.com/?q=${encodeURIComponent(name)}`, provider: 'HowLongToBeat' }
	if (field === 'platformId') {
		const platform = game.platformName?.toLowerCase() ?? ''
		if (platform.includes('steam')) return {
			href: Number.isSafeInteger(game.steamAppId) && game.steamAppId! > 0
				? `https://store.steampowered.com/app/${game.steamAppId}/`
				: `https://store.steampowered.com/search/?term=${encodeURIComponent(name).replace(/%20/g, '+')}`,
			provider: 'Steam',
		}
		if (platform.includes('epic')) return { href: `https://store.epicgames.com/es-ES/browse?q=${encodeURIComponent(name)}&sortBy=relevancy&sortDir=DESC&count=40`, provider: 'Epic Games' }
	}
	return null
}
