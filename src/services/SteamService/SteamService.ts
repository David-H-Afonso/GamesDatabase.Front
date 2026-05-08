import { environment } from '@/environments'
import { customFetch } from '@/utils/customFetch/customFetch'

const base = environment.apiRoutes.steam

export interface SteamProfile {
	steamId: string
	steamNickname: string
	steamAvatarUrl?: string
	steamLinkedAt?: string
}

export interface SteamLibraryGame {
	appId: number
	name: string
	playtimeForever: number
	playtime2Weeks?: number
	iconUrl?: string
	logoUrl?: string
	gdbGameId?: number
	gdbGameName?: string
}

export interface SteamImportResult {
	importedCount: number
	linkedCount: number
	skippedCount: number
	games: SteamImportedGame[]
}

export interface SteamImportedGame {
	appId: number
	gameId?: number
	name: string
	action: 'created' | 'linked' | 'skipped'
	error?: string
}

export interface SteamSyncResult {
	syncedGames: number
	syncedAchievements: number
	errors: string[]
}

export interface SteamAchievement {
	apiName: string
	displayName: string
	description?: string
	achieved: boolean
	unlockTime?: string
	iconUrl?: string
	iconGrayUrl?: string
	hidden: boolean
}

export interface SteamAppMetadata {
	appId: number
	name?: string
	developer?: string
	publisher?: string
	genres?: string[]
	releaseDate?: string
	metacriticScore?: number
	headerImageUrl?: string
	backgroundImageUrl?: string
	price?: number
	isFree: boolean
}

export interface SteamImportRequest {
	appIds?: number[]
	createMissing: boolean
}

export interface SteamMatchSuggestion {
	steamAppId: number
	steamName: string
	steamIconUrl?: string
	gdbGameId: number
	gdbGameName: string
	confidence: number
}

export interface SteamStoreSearchResult {
	appId: number
	name: string
	coverUrl?: string
	price?: string
	discountPercent?: number
	originalPrice?: string
	metascore?: number
}

class SteamService {
	async getProfile(): Promise<SteamProfile> {
		return customFetch<SteamProfile>(base.profile)
	}

	async unlinkAccount(): Promise<void> {
		await customFetch(base.unlink, { method: 'DELETE' })
	}

	async getLibrary(): Promise<SteamLibraryGame[]> {
		return customFetch<SteamLibraryGame[]>(base.library)
	}

	async importGames(request: SteamImportRequest): Promise<SteamImportResult> {
		return customFetch<SteamImportResult>(base.import, {
			method: 'POST',
			body: request,
		})
	}

	async syncAll(): Promise<SteamSyncResult> {
		return customFetch<SteamSyncResult>(base.syncAll, { method: 'POST' })
	}

	async syncGame(gameId: number): Promise<SteamSyncResult> {
		return customFetch<SteamSyncResult>(base.syncGame(gameId), { method: 'POST' })
	}

	async getLinkUrl(): Promise<{ url: string }> {
		return customFetch<{ url: string }>(base.linkUrl)
	}

	async linkGame(appId: number, gameId: number): Promise<void> {
		await customFetch(base.linkGame, {
			method: 'POST',
			body: { appId, gameId },
		})
	}

	async getMatchSuggestions(): Promise<SteamMatchSuggestion[]> {
		return customFetch<SteamMatchSuggestion[]>(base.matchSuggestions)
	}

	async searchStore(query: string): Promise<SteamStoreSearchResult[]> {
		return customFetch<SteamStoreSearchResult[]>(`${base.storeSearch}?q=${encodeURIComponent(query)}`)
	}

	async addStoreGame(appId: number): Promise<SteamImportedGame> {
		return customFetch<SteamImportedGame>(base.storeAdd, {
			method: 'POST',
			body: { appId },
		})
	}

	async getAchievements(gameId: number): Promise<SteamAchievement[]> {
		return customFetch<SteamAchievement[]>(base.achievements(gameId))
	}

	async getAppMetadata(appId: number): Promise<SteamAppMetadata> {
		return customFetch<SteamAppMetadata>(base.appMetadata(appId))
	}
}

export const steamService = new SteamService()
