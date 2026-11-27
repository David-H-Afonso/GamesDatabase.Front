import { environment } from '@/environments'
import { customFetch } from '@/utils/customFetch/customFetch'
import { collectionChanged } from '@/services/CollectionService/collectionEvents'
import type { SteamArtwork } from '@/models/api/SteamArtwork'

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
	success: boolean
	error?: string
	created: number
	linked: number
	skipped: number
	importedGames: SteamImportedGame[]
}

export interface SteamImportedGame {
	appId: number
	gdbGameId?: number
	name: string
	action: 'created' | 'linked' | 'skipped' | 'exists' | 'error'
	error?: string
}

export interface SteamSyncResult {
	success?: boolean
	error?: string
	gamesUpdated?: number
	achievementsUpdated?: number
	syncedGames?: number
	syncedAchievements?: number
	errors?: string[]
	achievementsSyncSucceeded?: boolean
	warnings?: string[]
	totalGames?: number
	processedGames?: number
	failedGames?: number
	warningCount?: number
	infoCount?: number
	reasonCounts?: Record<string, number>
	issues?: SteamSyncIssue[]
}

export interface SteamSyncIssue {
	gameId: number
	steamAppId: number
	gameName: string
	severity: 'error' | 'warning' | 'info'
	code: string
}

export interface SteamSyncJob {
	id: string
	state: 'queued' | 'running' | 'completed' | 'failed' | 'interrupted'
	createdAt: string
	startedAt?: string
	finishedAt?: string
	totalGames: number
	processedGames: number
	gamesUpdated: number
	achievementsUpdated: number
	failedGames: number
	warningCount: number
	infoCount?: number
	reasonCounts?: Record<string, number>
	issues?: SteamSyncIssue[]
	issuesTruncated?: boolean
	currentGameName?: string
	error?: string
	result?: SteamSyncResult
}

export const isSteamSyncActive = (job: SteamSyncJob | null): boolean => job?.state === 'queued' || job?.state === 'running'

const validateSyncJob = (value: SteamSyncJob): SteamSyncJob => {
	if (!value || typeof value !== 'object' || typeof value.id !== 'string' || !value.id ||
		!['queued', 'running', 'completed', 'failed', 'interrupted'].includes(value.state) ||
		![value.totalGames, value.processedGames, value.gamesUpdated, value.achievementsUpdated, value.failedGames, value.warningCount].every(count => Number.isInteger(count) && count >= 0) ||
		value.processedGames > value.totalGames) throw new Error('Invalid Steam sync status response')
	if (value.infoCount !== undefined && (!Number.isInteger(value.infoCount) || value.infoCount < 0)) throw new Error('Invalid Steam sync status response')
	if (value.reasonCounts !== undefined && (!value.reasonCounts || typeof value.reasonCounts !== 'object' || Array.isArray(value.reasonCounts) ||
		!Object.values(value.reasonCounts).every(count => Number.isInteger(count) && count >= 0))) throw new Error('Invalid Steam sync status response')
	if (value.issues !== undefined && (!Array.isArray(value.issues) || !value.issues.every(issue => issue &&
		Number.isInteger(issue.gameId) && issue.gameId > 0 && Number.isInteger(issue.steamAppId) &&
		typeof issue.gameName === 'string' && typeof issue.code === 'string' && ['error', 'warning', 'info'].includes(issue.severity)))) throw new Error('Invalid Steam sync status response')
	return value
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
	groupId?: number
	archived?: boolean
	globalPercent?: number
	progressCurrent?: number
	progressMin?: number
	progressMax?: number
}

export interface SteamAchievementSet {
	groupId: number
	displayName: string
	dlcAppId?: number
	archived: boolean
	isAchievable?: boolean
	isCompleted: boolean
	completedAt?: string
	totalAchievements: number
	unlockedAchievements: number
}

export interface SteamAchievementProgress {
	gameId: number
	source: 'none' | 'legacy' | 'sets'
	lastSynced?: string
	lastError?: string
	notice?: 'noPlayerData' | 'unreleased'
	isCompleted: boolean
	isFullyCompleted: boolean
	completionPreserved: boolean
	totalAchievements: number
	unlockedAchievements: number
	eligibleAchievementsTotal: number
	eligibleAchievementsUnlocked: number
	sets: SteamAchievementSet[]
	achievements: SteamAchievement[]
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
	games?: SteamImportGameRequest[]
	createMissing: boolean
}

export interface SteamImportGameRequest {
	appId: number
	logoUrl?: string
	heroUrl?: string
	coverUrl?: string
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
	heroUrl?: string
	coverUrl?: string
	logoUrl?: string
	price?: string
	discountPercent?: number
	originalPrice?: string
	metascore?: number
}

export interface SteamDateSuggestion {
	reviewVersion?: number
	reviewTimeZone?: string
	updatedAt?: string
	observedLastPlayed?: string | null
	firstAchievementDate?: string | null
	lastAchievementDate?: string | null
	gameId: number
	gameName: string
	steamAppId: number
	steamName: string
	steamIconUrl?: string
	steamPlaytimeForever?: number
	currentStarted?: string
	currentFinished?: string
	proposedStarted?: string
	proposedFinished?: string
	startedSource: 'firstAchievement' | 'none' | string
	finishedSource: 'lastPlayed' | 'none' | string
	isFinishedConflict: boolean
	isFinishedSteamManaged: boolean
	notes: string[]
}

export interface SteamApplyDateSuggestionsResult {
	updated: number
	errors: string[]
	applied: Array<{ gameId: number; started?: string | null; finished?: string | null; updatedAt: string }>
	skipped: Array<{ gameId: number; reason: string }>
}

export interface SteamDateSelection { gameId: number; started?: string; finished?: string; expectedUpdatedAt: string }
export const steamDateReviewTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
const calendarDay = (date: Date, timeZone: string): string | null => {
	try { const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date); return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)?.value).join('-') } catch { return null }
}
export const isSteamReferenceDate = (value: unknown, timeZone = steamDateReviewTimeZone()): value is string => {
	const today = calendarDay(new Date(), timeZone), earliest = calendarDay(new Date('2003-09-11T00:00:00Z'), timeZone)
	if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !today || !earliest || value < earliest || value > today) return false
	const time = Date.parse(`${value}T00:00:00Z`)
	return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value
}
const validDateReviewStamp = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value))

class SteamService {
	async getProfile(): Promise<SteamProfile> {
		return customFetch<SteamProfile>(base.profile)
	}

	async unlinkAccount(): Promise<void> {
		await customFetch(base.unlink, { method: 'DELETE' })
	}

	async linkManually(steamId: string): Promise<SteamProfile> {
		return customFetch<SteamProfile>(base.manualLink, {
			method: 'POST',
			body: { steamId },
		})
	}

	async getLibrary(): Promise<SteamLibraryGame[]> {
		return customFetch<SteamLibraryGame[]>(base.library)
	}

	async importGames(request: SteamImportRequest): Promise<SteamImportResult> {
		return customFetch<SteamImportResult>(base.import, {
			method: 'POST',
			body: request,
		}).then(collectionChanged)
	}

	async syncAll(): Promise<SteamSyncResult> {
		return customFetch<SteamSyncResult>(base.syncAll, { method: 'POST' }).then(collectionChanged)
	}

	async syncGame(gameId: number): Promise<SteamSyncResult> {
		return customFetch<SteamSyncResult>(base.syncGame(gameId), { method: 'POST' }).then(collectionChanged)
	}

	async getLinkUrl(): Promise<{ url: string }> {
		const frontendUrl = encodeURIComponent(window.location.origin)
		return customFetch<{ url: string }>(`${base.linkUrl}?frontend_url=${frontendUrl}`)
	}

	async linkGame(appId: number, gameId: number): Promise<void> {
		await customFetch(base.linkGame, {
			method: 'POST',
			body: { appId, gameId },
		}).then(collectionChanged)
	}

	async getMatchSuggestions(): Promise<SteamMatchSuggestion[]> {
		return customFetch<SteamMatchSuggestion[]>(base.matchSuggestions)
	}

	async getStoreMatchSuggestions(): Promise<SteamMatchSuggestion[]> {
		return customFetch<SteamMatchSuggestion[]>(base.storeMatchSuggestions)
	}

	async getDateSuggestions(options: { gameId?: number; includeStarted?: boolean; timeZone?: string; signal?: AbortSignal } = {}): Promise<SteamDateSuggestion[]> {
		const { signal, ...params } = options
		const timeZone = params.timeZone ?? steamDateReviewTimeZone()
		if (timeZone.length > 100 || !calendarDay(new Date(), timeZone)) throw new Error('Invalid date review time zone')
		const rows = await customFetch<SteamDateSuggestion[]>(base.dateSuggestions, {
			params: { ...params, reviewVersion: 2, timeZone },
			signal,
		})
		if (!Array.isArray(rows) || rows.length > 5000 || rows.some(row => !row || !Number.isSafeInteger(row.gameId) || row.gameId <= 0 || typeof row.gameName !== 'string' || typeof row.steamName !== 'string' || options.gameId !== undefined && row.gameId !== options.gameId || !Array.isArray(row.notes) || [row.proposedStarted, row.proposedFinished].some(date => date != null && !isSteamReferenceDate(date, timeZone)))) throw new Error('Invalid date review response')
		if (new Set(rows.map(row => row.gameId)).size !== rows.length) throw new Error('Invalid date review response')
		return rows
	}

	async applyDateSuggestions(suggestions: SteamDateSelection[], signal?: AbortSignal, timeZone = steamDateReviewTimeZone()): Promise<SteamApplyDateSuggestionsResult> {
		this.validateDateSelection(suggestions, timeZone)
		const result = await customFetch<SteamApplyDateSuggestionsResult>(base.applyDateSuggestions, {
			method: 'POST',
			body: { suggestions, timeZone },
			signal,
		})
		const requested = new Map(suggestions.map(row => [row.gameId, row]))
		if (!result || !Number.isSafeInteger(result.updated) || result.updated < 0 || !Array.isArray(result.errors) || !Array.isArray(result.applied) || !Array.isArray(result.skipped) || result.updated !== result.applied.length
			|| result.applied.some(row => !row || !requested.has(row.gameId) || !validDateReviewStamp(row.updatedAt) || !row.started && !row.finished || row.started != null && row.started !== requested.get(row.gameId)?.started || row.finished != null && row.finished !== requested.get(row.gameId)?.finished)
			|| result.skipped.some(row => !row || !requested.has(row.gameId) || typeof row.reason !== 'string')
			|| new Set([...result.applied, ...result.skipped].map(row => row.gameId)).size !== result.applied.length + result.skipped.length
			|| result.applied.length + result.skipped.length !== requested.size) throw new Error('Invalid date save receipt')
		return collectionChanged(result)
	}

	async dismissDateSuggestions(suggestions: SteamDateSelection[], signal?: AbortSignal, timeZone = steamDateReviewTimeZone()): Promise<{ dismissed: number }> {
		this.validateDateSelection(suggestions, timeZone)
		return customFetch<{ dismissed: number }>(base.dismissDateSuggestions, {
			method: 'POST',
			body: { suggestions, timeZone },
			signal,
		})
	}

	private validateDateSelection(suggestions: SteamDateSelection[], timeZone: string) {
		if (!Array.isArray(suggestions) || suggestions.length === 0 || suggestions.length > 1000 || suggestions.some(row => !row || !Number.isSafeInteger(row.gameId) || row.gameId <= 0 || !validDateReviewStamp(row.expectedUpdatedAt) || !row.started && !row.finished || [row.started, row.finished].some(date => date !== undefined && !isSteamReferenceDate(date, timeZone))) || new Set(suggestions.map(row => row.gameId)).size !== suggestions.length) throw new Error('Invalid date review selection')
	}

	async dismissMatchSuggestions(suggestions: Array<{ steamAppId: number; gdbGameId: number }>): Promise<void> {
		await customFetch(base.dismissMatchSuggestions, {
			method: 'POST',
			body: { suggestions },
		})
	}

	async searchStore(query: string, signal?: AbortSignal): Promise<SteamStoreSearchResult[]> {
		const url = `${base.storeSearch}?q=${encodeURIComponent(query)}`
		return signal ? customFetch<SteamStoreSearchResult[]>(url, { signal }) : customFetch<SteamStoreSearchResult[]>(url)
	}

	async addStoreGame(appId: number, assets?: { logoUrl?: string; heroUrl?: string; coverUrl?: string }): Promise<SteamImportedGame> {
		return customFetch<SteamImportedGame>(base.storeAdd, {
			method: 'POST',
			body: { appId, ...assets },
		}).then(collectionChanged)
	}

	async getAchievements(gameId: number): Promise<SteamAchievement[]> {
		return customFetch<SteamAchievement[]>(base.achievements(gameId))
	}

	async startSyncJob(signal?: AbortSignal): Promise<SteamSyncJob> {
		return validateSyncJob(await customFetch<SteamSyncJob>(base.syncJobs, { method: 'POST', signal, timeout: 15000 }))
	}

	async getCurrentSyncJob(signal?: AbortSignal): Promise<SteamSyncJob | null> {
		const response = await customFetch<{ job?: SteamSyncJob }>(base.currentSyncJob, { signal, timeout: 15000 })
		if (!response || typeof response !== 'object') throw new Error('Invalid Steam sync status response')
		return response.job ? validateSyncJob(response.job) : null
	}

	async getSyncJob(id: string, signal?: AbortSignal): Promise<SteamSyncJob> {
		return validateSyncJob(await customFetch<SteamSyncJob>(base.syncJob(id), { signal, timeout: 15000 }))
	}

	async getAchievementProgress(gameId: number, signal?: AbortSignal): Promise<SteamAchievementProgress> {
		return customFetch<SteamAchievementProgress>(base.achievementProgress(gameId), { signal })
	}

	async getAppMetadata(appId: number): Promise<SteamAppMetadata> {
		return customFetch<SteamAppMetadata>(base.appMetadata(appId))
	}

	async getAppArtwork(appId: number, signal?: AbortSignal): Promise<SteamArtwork> {
		if (!Number.isSafeInteger(appId) || appId <= 0 || appId > 2147483647) throw new RangeError('Invalid Steam App ID')
		const result = await customFetch<SteamArtwork>(base.appArtwork(appId), { signal, timeout: 15000 })
		if (!result || typeof result !== 'object' || Array.isArray(result) || ['logoUrl', 'heroUrl', 'coverUrl'].some(key => {
			const value = result[key as keyof SteamArtwork]
			return value != null && typeof value !== 'string'
		})) throw new Error('Invalid artwork response')
		return result
	}
}

export const steamService = new SteamService()
