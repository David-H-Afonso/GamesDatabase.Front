import { useEffect, useState, useRef, useCallback, useMemo, type FormEvent } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { useTranslation } from 'react-i18next'
import {
	fetchSteamLibrary,
	importSteamGames,
	clearLastImportResult,
	fetchSteamProfile,
	unlinkSteam,
	syncAllSteam,
	clearSteamError,
	markSteamGameLinked,
} from '@/store/features/steam/steamSlice'
import { setSteamProfile } from '@/store/features/auth/authSlice'
import { steamService, type SteamDateSuggestion, type SteamMatchSuggestion, type SteamStoreSearchResult } from '@/services/SteamService/SteamService'
import { getGames } from '@/services/GamesService/GamesService'
import type { Game } from '@/models/api/Game'
import { ConfirmDialog, Toast } from '@/components/elements'
import './AdminSteam.scss'
import './AdminSteamImport.scss'

type ImportAction = 'create' | 'skip' | 'link'
type ActiveTab = 'account' | 'library' | 'suggestions' | 'store' | 'storeSuggestions' | 'dateSuggestions'
type LibrarySortKey = 'appId' | 'name' | 'playtime' | 'status' | 'action'
type SortDirection = 'asc' | 'desc'

interface LinkTarget {
	gameId: number
	gameName: string
}

export const AdminSteamImport = () => {
	const dispatch = useAppDispatch()
	const { t } = useTranslation()
	const authUser = useAppSelector((state) => state.auth.user)
	const { profile, library, libraryLoading, profileLoading, syncLoading, importLoading, lastSyncResult, lastImportResult, error } = useAppSelector((state) => state.steam)

	const [rowActions, setRowActions] = useState<Map<number, ImportAction>>(new Map())
	const [linkTargets, setLinkTargets] = useState<Map<number, LinkTarget>>(new Map())
	const [filterUnmatched, setFilterUnmatched] = useState(false)
	const [linkLoading, setLinkLoading] = useState(false)
	const [linkResults, setLinkResults] = useState<{ linked: number; errors: string[] } | null>(null)
	const [activeTab, setActiveTab] = useState<ActiveTab>('account')
	const [suggestions, setSuggestions] = useState<SteamMatchSuggestion[]>([])
	const [suggestionsLoading, setSuggestionsLoading] = useState(false)
	const [suggestionsDismissing, setSuggestionsDismissing] = useState(false)
	const [suggestionsError, setSuggestionsError] = useState<string | null>(null)
	const [librarySearch, setLibrarySearch] = useState('')
	const [suggestionSearch, setSuggestionSearch] = useState('')
	const [selectedSuggestionIds, setSelectedSuggestionIds] = useState<Set<number>>(new Set())
	const [storeSuggestions, setStoreSuggestions] = useState<SteamMatchSuggestion[]>([])
	const [storeSuggestionsLoading, setStoreSuggestionsLoading] = useState(false)
	const [storeSuggestionsDismissing, setStoreSuggestionsDismissing] = useState(false)
	const [storeSuggestionsError, setStoreSuggestionsError] = useState<string | null>(null)
	const [storeSuggestionSearch, setStoreSuggestionSearch] = useState('')
	const [selectedStoreSuggestionIds, setSelectedStoreSuggestionIds] = useState<Set<string>>(new Set())
	const [dateSuggestions, setDateSuggestions] = useState<SteamDateSuggestion[]>([])
	const [dateSuggestionsLoading, setDateSuggestionsLoading] = useState(false)
	const [dateSuggestionsApplying, setDateSuggestionsApplying] = useState(false)
	const [dateSuggestionsDismissing, setDateSuggestionsDismissing] = useState(false)
	const [dateSuggestionsError, setDateSuggestionsError] = useState<string | null>(null)
	const [dateSuggestionSearch, setDateSuggestionSearch] = useState('')
	const [selectedDateSuggestionIds, setSelectedDateSuggestionIds] = useState<Set<number>>(new Set())
	const [dateApplyResult, setDateApplyResult] = useState<{ updated: number; errors: string[] } | null>(null)
	const [dateDismissResult, setDateDismissResult] = useState<number | null>(null)
	const [librarySort, setLibrarySort] = useState<{ key: LibrarySortKey; direction: SortDirection }>({ key: 'appId', direction: 'asc' })
	const [message, setMessage] = useState<string | null>(null)
	const [isSuccess, setIsSuccess] = useState(true)
	const [unlinkConfirmOpen, setUnlinkConfirmOpen] = useState(false)
	const [noGamesToast, setNoGamesToast] = useState(false)
	const [manualSteamId, setManualSteamId] = useState('')
	const [manualLinkLoading, setManualLinkLoading] = useState(false)

	// Store search state
	const [storeQuery, setStoreQuery] = useState('')
	const [storeResults, setStoreResults] = useState<SteamStoreSearchResult[]>([])
	const [storeLoading, setStoreLoading] = useState(false)
	const [storeSearched, setStoreSearched] = useState(false)
	const [storeAdding, setStoreAdding] = useState<Set<number>>(new Set())
	const [storeAdded, setStoreAdded] = useState<Map<number, 'created' | 'exists' | 'error'>>(new Map())
	const storeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const isSteamLinked = !!authUser?.steamId

	useEffect(() => {
		if (isSteamLinked) {
			dispatch(fetchSteamLibrary())
			dispatch(fetchSteamProfile())
		}
		return () => {
			dispatch(clearLastImportResult())
		}
	}, [dispatch, isSteamLinked])

	useEffect(() => {
		if (isSteamLinked && activeTab === 'suggestions' && suggestions.length === 0 && !suggestionsLoading && !suggestionsError) {
			loadSuggestions()
		}
		if (isSteamLinked && activeTab === 'storeSuggestions' && storeSuggestions.length === 0 && !storeSuggestionsLoading && !storeSuggestionsError) {
			loadStoreSuggestions()
		}
		if (isSteamLinked && activeTab === 'dateSuggestions' && dateSuggestions.length === 0 && !dateSuggestionsLoading && !dateSuggestionsError) {
			loadDateSuggestions()
		}
	}, [isSteamLinked, activeTab])

	const handleConnectSteam = async () => {
		try {
			const { url } = await steamService.getLinkUrl()
			if (window.electronAPI?.isElectron) {
				await window.electronAPI.openExternal(url)
			} else {
				window.location.href = url
			}
		} catch {
			setMessage(t('admin.steam.account.connectError'))
			setIsSuccess(false)
		}
	}

	const handleManualLink = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		const steamId = manualSteamId.trim()
		if (!steamId) {
			setMessage(t('admin.steam.account.manualEnterId'))
			setIsSuccess(false)
			return
		}

		setManualLinkLoading(true)
		try {
			const linkedProfile = await steamService.linkManually(steamId)
			dispatch(
				setSteamProfile({
					steamId: linkedProfile.steamId,
					steamNickname: linkedProfile.steamNickname,
					steamAvatarUrl: linkedProfile.steamAvatarUrl,
				})
			)
			setManualSteamId('')
			setMessage(t('admin.steam.account.linkedOk'))
			setIsSuccess(true)
		} catch {
			setMessage(t('admin.steam.account.linkFailed'))
			setIsSuccess(false)
		} finally {
			setManualLinkLoading(false)
			setTimeout(() => setMessage(null), 4000)
		}
	}

	const handleUnlink = async () => {
		setUnlinkConfirmOpen(false)
		try {
			await dispatch(unlinkSteam()).unwrap()
			dispatch(setSteamProfile(null))
			setActiveTab('account')
			setMessage(t('admin.steam.account.unlinkedOk'))
			setIsSuccess(true)
		} catch {
			setMessage(t('admin.steam.account.unlinkError'))
			setIsSuccess(false)
		}
		setTimeout(() => setMessage(null), 3000)
	}

	const handleSyncAll = async () => {
		try {
			const result = await dispatch(syncAllSteam()).unwrap()
			const syncedGames = result.gamesUpdated ?? result.syncedGames ?? 0
			const syncedAchievements = result.achievementsUpdated ?? result.syncedAchievements ?? 0
			setMessage(t('admin.steam.account.syncDone', { games: syncedGames, achievements: syncedAchievements }))
			setIsSuccess(true)
		} catch {
			setMessage(t('admin.steam.account.syncError'))
			setIsSuccess(false)
		}
		setTimeout(() => setMessage(null), 5000)
	}

	const handleClearError = () => dispatch(clearSteamError())

	const loadSuggestions = async () => {
		setSuggestionsLoading(true)
		setSuggestionsError(null)
		setSelectedSuggestionIds(new Set())
		try {
			const data = await steamService.getMatchSuggestions()
			setSuggestions(data)
		} catch (e) {
			setSuggestionsError(e instanceof Error ? e.message : t('admin.steam.suggestionsView.loadError'))
		} finally {
			setSuggestionsLoading(false)
		}
	}

	const getSuggestionKey = (suggestion: SteamMatchSuggestion) => `${suggestion.steamAppId}:${suggestion.gdbGameId}`

	const loadStoreSuggestions = async () => {
		setStoreSuggestionsLoading(true)
		setStoreSuggestionsError(null)
		setSelectedStoreSuggestionIds(new Set())
		try {
			const data = await steamService.getStoreMatchSuggestions()
			setStoreSuggestions(data)
		} catch (e) {
			setStoreSuggestionsError(e instanceof Error ? e.message : t('admin.steam.storeSuggestions.loadError'))
		} finally {
			setStoreSuggestionsLoading(false)
		}
	}

	const removeStoreSuggestion = (suggestion: SteamMatchSuggestion) => {
		const key = getSuggestionKey(suggestion)
		setStoreSuggestions((prev) => prev.filter((s) => getSuggestionKey(s) !== key))
		setSelectedStoreSuggestionIds((prev) => {
			const next = new Set(prev)
			next.delete(key)
			return next
		})
	}

	const removeSuggestions = (toRemove: SteamMatchSuggestion[]) => {
		const keys = new Set(toRemove.map(getSuggestionKey))
		setSuggestions((prev) => prev.filter((suggestion) => !keys.has(getSuggestionKey(suggestion))))
		setSelectedSuggestionIds((prev) => {
			const next = new Set(prev)
			toRemove.forEach((suggestion) => next.delete(suggestion.steamAppId))
			return next
		})
	}

	const removeStoreSuggestions = (toRemove: SteamMatchSuggestion[]) => {
		const keys = new Set(toRemove.map(getSuggestionKey))
		setStoreSuggestions((prev) => prev.filter((suggestion) => !keys.has(getSuggestionKey(suggestion))))
		setSelectedStoreSuggestionIds((prev) => {
			const next = new Set(prev)
			keys.forEach((key) => next.delete(key))
			return next
		})
	}

	const settleAppliedDateSuggestions = (applied: SteamDateSuggestion[]) => {
		const appliedByGameId = new Map(applied.map((suggestion) => [suggestion.gameId, suggestion]))
		setDateSuggestions((prev) =>
			prev
				.map((suggestion) => {
					const appliedSuggestion = appliedByGameId.get(suggestion.gameId)
					if (!appliedSuggestion) return suggestion

					const startedApplied = !suggestion.currentStarted && !!suggestion.proposedStarted
					const finishedApplied = !!suggestion.proposedFinished && (!suggestion.currentFinished || suggestion.isFinishedSteamManaged)
					return {
						...suggestion,
						currentStarted: startedApplied ? suggestion.proposedStarted : suggestion.currentStarted,
						currentFinished: finishedApplied ? suggestion.proposedFinished : suggestion.currentFinished,
						proposedStarted: startedApplied ? undefined : suggestion.proposedStarted,
						proposedFinished: finishedApplied ? undefined : suggestion.proposedFinished,
					}
				})
				.filter((suggestion) => suggestion.proposedStarted || suggestion.proposedFinished)
		)
		setSelectedDateSuggestionIds((prev) => {
			const next = new Set(prev)
			appliedByGameId.forEach((_, id) => next.delete(id))
			return next
		})
	}

	const settleDismissedDateSuggestions = (dismissed: SteamDateSuggestion[]) => {
		const dismissedIds = new Set(dismissed.map((suggestion) => suggestion.gameId))
		setDateSuggestions((prev) => prev.filter((suggestion) => !dismissedIds.has(suggestion.gameId)))
		setSelectedDateSuggestionIds((prev) => {
			const next = new Set(prev)
			dismissedIds.forEach((id) => next.delete(id))
			return next
		})
	}

	const loadDateSuggestions = async () => {
		setDateSuggestionsLoading(true)
		setDateSuggestionsError(null)
		setDateApplyResult(null)
		setSelectedDateSuggestionIds(new Set())
		try {
			const data = await steamService.getDateSuggestions()
			setDateSuggestions(data)
		} catch (e) {
			setDateSuggestionsError(e instanceof Error ? e.message : t('admin.steam.dateSuggestions.loadError'))
		} finally {
			setDateSuggestionsLoading(false)
		}
	}

	const handleLinkSuggestion = async (suggestion: SteamMatchSuggestion) => {
		try {
			await steamService.linkGame(suggestion.steamAppId, suggestion.gdbGameId)
			removeSuggestions([suggestion])
			dispatch(markSteamGameLinked({ appId: suggestion.steamAppId, gameId: suggestion.gdbGameId, gameName: suggestion.gdbGameName }))
		} catch {
			// ignore
		}
	}

	const handleBulkLinkSuggestions = async () => {
		const toLink = filteredSuggestions.filter((s) => selectedSuggestionIds.has(s.steamAppId))
		for (const s of toLink) {
			try {
				await steamService.linkGame(s.steamAppId, s.gdbGameId)
				removeSuggestions([s])
				dispatch(markSteamGameLinked({ appId: s.steamAppId, gameId: s.gdbGameId, gameName: s.gdbGameName }))
			} catch {
				/* ignore individual errors */
			}
		}
		setSelectedSuggestionIds(new Set())
	}

	const handleBulkDismissSuggestions = async () => {
		const toDismiss = filteredSuggestions.filter((s) => selectedSuggestionIds.has(s.steamAppId))
		if (toDismiss.length === 0) return

		setSuggestionsDismissing(true)
		setSuggestionsError(null)
		try {
			await steamService.dismissMatchSuggestions(toDismiss.map((s) => ({ steamAppId: s.steamAppId, gdbGameId: s.gdbGameId })))
			removeSuggestions(toDismiss)
		} catch (e) {
			setSuggestionsError(e instanceof Error ? e.message : t('admin.steam.suggestionsView.dismissError'))
		} finally {
			setSuggestionsDismissing(false)
		}
	}

	const handleLinkStoreSuggestion = async (suggestion: SteamMatchSuggestion) => {
		try {
			await steamService.linkGame(suggestion.steamAppId, suggestion.gdbGameId)
			removeStoreSuggestion(suggestion)
			dispatch(markSteamGameLinked({ appId: suggestion.steamAppId, gameId: suggestion.gdbGameId, gameName: suggestion.gdbGameName }))
		} catch {
			// ignore
		}
	}

	const handleBulkLinkStoreSuggestions = async () => {
		const toLink = filteredStoreSuggestions.filter((s) => selectedStoreSuggestionIds.has(getSuggestionKey(s)))
		for (const suggestion of toLink) {
			try {
				await steamService.linkGame(suggestion.steamAppId, suggestion.gdbGameId)
				removeStoreSuggestion(suggestion)
				dispatch(markSteamGameLinked({ appId: suggestion.steamAppId, gameId: suggestion.gdbGameId, gameName: suggestion.gdbGameName }))
			} catch {
				/* ignore individual errors */
			}
		}
		setSelectedStoreSuggestionIds(new Set())
	}

	const handleBulkDismissStoreSuggestions = async () => {
		const toDismiss = filteredStoreSuggestions.filter((s) => selectedStoreSuggestionIds.has(getSuggestionKey(s)))
		if (toDismiss.length === 0) return

		setStoreSuggestionsDismissing(true)
		setStoreSuggestionsError(null)
		try {
			await steamService.dismissMatchSuggestions(toDismiss.map((s) => ({ steamAppId: s.steamAppId, gdbGameId: s.gdbGameId })))
			removeStoreSuggestions(toDismiss)
		} catch (e) {
			setStoreSuggestionsError(e instanceof Error ? e.message : t('admin.steam.storeSuggestions.dismissError'))
		} finally {
			setStoreSuggestionsDismissing(false)
		}
	}

	const toggleDateSuggestionSelection = (gameId: number) => {
		setSelectedDateSuggestionIds((prev) => {
			const next = new Set(prev)
			if (next.has(gameId)) next.delete(gameId)
			else next.add(gameId)
			return next
		})
	}

	const toggleAllVisibleDateSuggestions = () => {
		const visibleIds = filteredDateSuggestions.map((s) => s.gameId)
		const allSelected = visibleIds.every((id) => selectedDateSuggestionIds.has(id))
		setSelectedDateSuggestionIds((prev) => {
			const next = new Set(prev)
			visibleIds.forEach((id) => {
				if (allSelected) next.delete(id)
				else next.add(id)
			})
			return next
		})
	}

	const handleApplyDateSuggestions = async () => {
		const toApply = filteredDateSuggestions.filter((s) => selectedDateSuggestionIds.has(s.gameId) && (s.proposedStarted || s.proposedFinished))
		if (toApply.length === 0) return

		setDateSuggestionsApplying(true)
		setDateSuggestionsError(null)
		try {
			const result = await steamService.applyDateSuggestions(
				toApply.map((s) => ({
					gameId: s.gameId,
					started: s.proposedStarted,
					finished: s.proposedFinished,
				}))
			)
			setDateApplyResult(result)
			setDateDismissResult(null)
			settleAppliedDateSuggestions(toApply)
		} catch (e) {
			setDateSuggestionsError(e instanceof Error ? e.message : t('admin.steam.dateSuggestions.applyError'))
		} finally {
			setDateSuggestionsApplying(false)
		}
	}

	const handleDismissDateSuggestions = async (gameIds?: number[]) => {
		const ids = gameIds ?? [...selectedDateSuggestionIds]
		const toDismiss = dateSuggestions.filter((s) => ids.includes(s.gameId) && (s.proposedStarted || s.proposedFinished))
		if (toDismiss.length === 0) return

		setDateSuggestionsDismissing(true)
		setDateSuggestionsError(null)
		try {
			const result = await steamService.dismissDateSuggestions(
				toDismiss.map((s) => ({ gameId: s.gameId, started: s.proposedStarted, finished: s.proposedFinished }))
			)
			setDateDismissResult(result.dismissed)
			setDateApplyResult(null)
			settleDismissedDateSuggestions(toDismiss)
		} catch (e) {
			setDateSuggestionsError(e instanceof Error ? e.message : t('admin.steam.dateSuggestions.dismissError'))
		} finally {
			setDateSuggestionsDismissing(false)
		}
	}

	const toggleSuggestionSelection = (appId: number) => {
		setSelectedSuggestionIds((prev) => {
			const s = new Set(prev)
			if (s.has(appId)) s.delete(appId)
			else s.add(appId)
			return s
		})
	}

	const toggleAllVisibleSuggestions = () => {
		const visibleIds = filteredSuggestions.map((s) => s.steamAppId)
		const allSelected = visibleIds.every((id) => selectedSuggestionIds.has(id))
		if (allSelected) {
			setSelectedSuggestionIds((prev) => {
				const s = new Set(prev)
				visibleIds.forEach((id) => s.delete(id))
				return s
			})
		} else {
			setSelectedSuggestionIds((prev) => {
				const s = new Set(prev)
				visibleIds.forEach((id) => s.add(id))
				return s
			})
		}
	}

	const toggleStoreSuggestionSelection = (suggestion: SteamMatchSuggestion) => {
		const key = getSuggestionKey(suggestion)
		setSelectedStoreSuggestionIds((prev) => {
			const next = new Set(prev)
			if (next.has(key)) next.delete(key)
			else next.add(key)
			return next
		})
	}

	const toggleAllVisibleStoreSuggestions = () => {
		const visibleIds = filteredStoreSuggestions.map(getSuggestionKey)
		const allSelected = visibleIds.every((id) => selectedStoreSuggestionIds.has(id))
		setSelectedStoreSuggestionIds((prev) => {
			const next = new Set(prev)
			visibleIds.forEach((id) => {
				if (allSelected) next.delete(id)
				else next.add(id)
			})
			return next
		})
	}

	const handleStoreSearch = useCallback(async (q: string) => {
		if (q.trim().length < 2) {
			setStoreResults([])
			setStoreSearched(false)
			return
		}
		setStoreLoading(true)
		try {
			const results = await steamService.searchStore(q.trim())
			setStoreResults(results)
			setStoreSearched(true)
		} catch {
			setStoreResults([])
		} finally {
			setStoreLoading(false)
		}
	}, [])

	const handleStoreQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const q = e.target.value
		setStoreQuery(q)
		if (storeTimerRef.current) clearTimeout(storeTimerRef.current)
		storeTimerRef.current = setTimeout(() => handleStoreSearch(q), 400)
	}

	const handleAddStoreGame = async (appId: number) => {
		setStoreAdding((prev) => new Set(prev).add(appId))
		try {
			const storeGame = storeResults.find((game) => game.appId === appId)
			const result = await steamService.addStoreGame(appId, {
				heroUrl: storeGame?.heroUrl ?? storeGame?.coverUrl,
				coverUrl: storeGame?.coverUrl,
			})
			setStoreAdded((prev) => new Map(prev).set(appId, result.action === 'created' ? 'created' : result.action === 'linked' ? 'exists' : 'error'))
			if (result.action === 'created') await dispatch(fetchSteamLibrary())
		} catch {
			setStoreAdded((prev) => new Map(prev).set(appId, 'error'))
		} finally {
			setStoreAdding((prev) => {
				const s = new Set(prev)
				s.delete(appId)
				return s
			})
		}
	}

	// Set of appIds already in GDB (from current library)
	const libraryAppIds = new Set(library.filter((g) => g.gdbGameId).map((g) => g.appId))

	const getAction = (appId: number): ImportAction => rowActions.get(appId) ?? 'skip'

	const setAction = (appId: number, action: ImportAction) => {
		setRowActions((prev) => new Map(prev).set(appId, action))
		if (action !== 'link') {
			setLinkTargets((prev) => {
				const m = new Map(prev)
				m.delete(appId)
				return m
			})
		}
	}

	const setLinkTarget = (appId: number, target: LinkTarget | null) => {
		setLinkTargets((prev) => {
			const m = new Map(prev)
			if (target) m.set(appId, target)
			else m.delete(appId)
			return m
		})
	}

	const handleImport = async () => {
		const appIds = library.filter((g) => getAction(g.appId) === 'create').map((g) => g.appId)

		const toLink = library.filter((g) => getAction(g.appId) === 'link' && linkTargets.has(g.appId))

		if (appIds.length === 0 && toLink.length === 0) {
			setNoGamesToast(true)
			return
		}

		// Link actions
		if (toLink.length > 0) {
			setLinkLoading(true)
			const errors: string[] = []
			let linked = 0
			for (const game of toLink) {
				const target = linkTargets.get(game.appId)!
				try {
					await steamService.linkGame(game.appId, target.gameId)
					linked++
				} catch {
					errors.push(t('admin.steam.libraryView.linkError', { game: game.name, target: target.gameName }))
				}
			}
			setLinkLoading(false)
			setLinkResults({ linked, errors })
		}

		// Create actions
		if (appIds.length > 0) {
			await dispatch(importSteamGames({ appIds, createMissing: true }))
		}

		// Refresh library so "En GDB" badges update
		setRowActions(new Map())
		setLinkTargets(new Map())
		await dispatch(fetchSteamLibrary())
	}

	const handleSelectAllUnmatched = () => {
		const newMap = new Map(rowActions)
		library.forEach((g) => {
			if (!g.gdbGameId) newMap.set(g.appId, 'create')
		})
		setRowActions(newMap)
	}

	const getStatusSortValue = (game: (typeof library)[number]) => (game.gdbGameId ? 1 : 0)

	const getActionSortValue = (appId: number) => {
		const action = getAction(appId)
		switch (action) {
			case 'create':
				return 2
			case 'link':
				return 1
			case 'skip':
			default:
				return 0
		}
	}

	const handleLibrarySort = (key: LibrarySortKey) => {
		setLibrarySort((current) => {
			if (current.key === key) {
				return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
			}

			return { key, direction: key === 'playtime' ? 'desc' : 'asc' }
		})
	}

	const filteredLibrary = useMemo(() => {
		const normalizedSearch = librarySearch.trim().toLowerCase()
		const filtered = library.filter((g) => !filterUnmatched || !g.gdbGameId).filter((g) => !normalizedSearch || g.name.toLowerCase().includes(normalizedSearch))

		const sorted = [...filtered].sort((left, right) => {
			let comparison = 0

			switch (librarySort.key) {
				case 'name':
					comparison = left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
					break
				case 'playtime':
					comparison = (left.playtimeForever ?? 0) - (right.playtimeForever ?? 0)
					break
				case 'status':
					comparison = getStatusSortValue(left) - getStatusSortValue(right)
					break
				case 'action':
					comparison = getActionSortValue(left.appId) - getActionSortValue(right.appId)
					break
				case 'appId':
				default:
					comparison = left.appId - right.appId
					break
			}

			if (comparison === 0 && librarySort.key !== 'appId') {
				comparison = left.appId - right.appId
			}

			return librarySort.direction === 'asc' ? comparison : -comparison
		})

		return sorted
	}, [filterUnmatched, getAction, library, librarySearch, librarySort])

	// Client-side pagination keeps the mounted DOM bounded even for very large
	// libraries (hundreds of Steam titles), so at most LIBRARY_PAGE_SIZE rows
	// are rendered at a time.
	const LIBRARY_PAGE_SIZE = 50
	const [libraryPage, setLibraryPage] = useState(1)
	const libraryPageCount = Math.max(1, Math.ceil(filteredLibrary.length / LIBRARY_PAGE_SIZE))

	// Reset to the first page whenever the effective result set changes.
	useEffect(() => {
		setLibraryPage(1)
	}, [librarySearch, filterUnmatched, librarySort])

	const clampedLibraryPage = Math.min(libraryPage, libraryPageCount)
	const pagedLibrary = filteredLibrary.slice((clampedLibraryPage - 1) * LIBRARY_PAGE_SIZE, clampedLibraryPage * LIBRARY_PAGE_SIZE)

	const filteredSuggestions = suggestions.filter(
		(s) => !suggestionSearch.trim() || s.steamName.toLowerCase().includes(suggestionSearch.toLowerCase()) || s.gdbGameName.toLowerCase().includes(suggestionSearch.toLowerCase())
	)
	const filteredStoreSuggestions = storeSuggestions.filter(
		(s) =>
			!storeSuggestionSearch.trim() ||
			s.steamName.toLowerCase().includes(storeSuggestionSearch.toLowerCase()) ||
			s.gdbGameName.toLowerCase().includes(storeSuggestionSearch.toLowerCase())
	)
	const filteredDateSuggestions = dateSuggestions.filter(
		(s) =>
			!dateSuggestionSearch.trim() ||
			s.steamName.toLowerCase().includes(dateSuggestionSearch.toLowerCase()) ||
			s.gameName.toLowerCase().includes(dateSuggestionSearch.toLowerCase())
	)

	const dateSourceLabel = (source: string) => {
		switch (source) {
			case 'lastPlayed':
				return t('admin.steam.dateSuggestions.sourceLastPlayed')
			case 'firstAchievement':
				return t('admin.steam.dateSuggestions.sourceFirstAchievement')
			default:
				return t('admin.steam.dateSuggestions.sourceNone')
		}
	}

	const dateNoteLabel = (note: string) => {
		switch (note) {
			case 'noLastPlayed':
				return t('admin.steam.dateSuggestions.noteNoLastPlayed')
			case 'noFirstAchievement':
				return t('admin.steam.dateSuggestions.noteNoFirstAchievement')
			case 'keptStarted':
				return t('admin.steam.dateSuggestions.noteKeptStarted')
			default:
				return note
		}
	}

	const formatSteamMinutes = (minutes?: number) => {
		if (minutes == null) return '—'
		if (minutes <= 0) return '0h'
		return `${Math.round(minutes / 60)}h`
	}

	const toCreateCount = library.filter((g) => getAction(g.appId) === 'create').length
	const toLinkCount = library.filter((g) => getAction(g.appId) === 'link' && linkTargets.has(g.appId)).length
	const totalActionCount = toCreateCount + toLinkCount

	const renderAccountContent = () =>
		!isSteamLinked ? (
			<div className='steam-connect-section'>
				<div className='steam-connect-card'>
					<h2>{t('admin.steam.account.connectTitle')}</h2>
					<p>{t('admin.steam.account.connectDesc')}</p>
					<button className='btn btn-steam' onClick={handleConnectSteam}>
						<img src='https://store.steampowered.com/favicon.ico' alt='' width={16} height={16} />
						{t('admin.steam.account.connectButton')}
					</button>
				</div>

				<form className='steam-connect-card steam-manual-form' onSubmit={handleManualLink}>
					<h2>{t('admin.steam.account.manualTitle')}</h2>
					<label htmlFor='manual-steam-id'>{t('admin.steam.account.manualLabel')}</label>
					<div className='steam-manual-row'>
						<input id='manual-steam-id' type='text' value={manualSteamId} onChange={(event) => setManualSteamId(event.target.value)} placeholder='7656119...' autoComplete='off' />
						<button className='btn btn-primary' type='submit' disabled={manualLinkLoading}>
							{manualLinkLoading ? t('admin.steam.account.manualSaving') : t('admin.steam.account.manualSave')}
						</button>
					</div>
					<p>{t('admin.steam.account.manualHint')}</p>
				</form>
			</div>
		) : (
			<div className='steam-linked-section'>
				{profileLoading ? (
					<p>{t('admin.steam.account.loadingProfile')}</p>
				) : profile ? (
					<div className='steam-profile'>
						{profile.steamAvatarUrl && <img src={profile.steamAvatarUrl} alt={profile.steamNickname} className='steam-avatar' />}
						<div className='steam-profile-info'>
							<h3>{profile.steamNickname}</h3>
							<p className='steam-id'>SteamID: {profile.steamId}</p>
							{profile.steamLinkedAt && <p className='steam-linked-date'>{t('admin.steam.account.linkedOn', { date: new Date(profile.steamLinkedAt).toLocaleDateString() })}</p>}
						</div>
					</div>
				) : null}

				<div className='steam-actions'>
					<button className='btn btn-primary' onClick={handleSyncAll} disabled={syncLoading}>
						{syncLoading ? t('admin.steam.account.syncing') : t('admin.steam.account.syncAll')}
					</button>
					<button className='btn btn-danger' onClick={() => setUnlinkConfirmOpen(true)}>
						{t('admin.steam.account.disconnect')}
					</button>
				</div>

				{lastSyncResult && (
					<div className='steam-sync-result'>
						<h4>{t('admin.steam.account.lastSyncTitle')}</h4>
						<ul>
							<li>{t('admin.steam.account.syncedGames', { count: lastSyncResult.gamesUpdated ?? lastSyncResult.syncedGames ?? 0 })}</li>
							<li>{t('admin.steam.account.syncedAchievements', { count: lastSyncResult.achievementsUpdated ?? lastSyncResult.syncedAchievements ?? 0 })}</li>
							{(lastSyncResult.errors?.length ?? 0) > 0 && <li className='sync-errors'>{t('admin.steam.account.syncErrors', { errors: lastSyncResult.errors?.join(', ') })}</li>}
						</ul>
					</div>
				)}
			</div>
		)

	const renderSortIndicator = (key: LibrarySortKey) => {
		if (librarySort.key !== key) return null
		return librarySort.direction === 'asc' ? ' ▲' : ' ▼'
	}

	return (
		<div className='admin-steam admin-steam-import'>
			<h1 className='admin-page-title'>Steam</h1>

			<ConfirmDialog
				isOpen={unlinkConfirmOpen}
				title={t('admin.steam.unlinkConfirmTitle')}
				message={t('admin.steam.unlinkConfirmMessage')}
				variant='danger'
				onConfirm={handleUnlink}
				onCancel={() => setUnlinkConfirmOpen(false)}
			/>
			<Toast isOpen={noGamesToast} message={t('admin.steam.noGamesSelected')} type='warning' onClose={() => setNoGamesToast(false)} />

			<div className='import-tabs'>
				<button className={`tab-btn${activeTab === 'account' ? ' tab-btn--active' : ''}`} onClick={() => setActiveTab('account')}>
					{t('admin.steam.tabsAccount')}
				</button>
				<button className={`tab-btn${activeTab === 'library' ? ' tab-btn--active' : ''}`} onClick={() => setActiveTab('library')} disabled={!isSteamLinked}>
					{t('admin.steam.tabsLibrary')}
				</button>
				<button className={`tab-btn${activeTab === 'suggestions' ? ' tab-btn--active' : ''}`} onClick={() => setActiveTab('suggestions')} disabled={!isSteamLinked}>
					{t('admin.steam.tabsSuggestions')}
				</button>
				<button className={`tab-btn${activeTab === 'store' ? ' tab-btn--active' : ''}`} onClick={() => setActiveTab('store')} disabled={!isSteamLinked}>
					{t('admin.steam.tabsStore')}
				</button>
				<button className={`tab-btn${activeTab === 'storeSuggestions' ? ' tab-btn--active' : ''}`} onClick={() => setActiveTab('storeSuggestions')} disabled={!isSteamLinked}>
					{t('admin.steam.tabs.storeSuggestions')}
				</button>
				<button className={`tab-btn${activeTab === 'dateSuggestions' ? ' tab-btn--active' : ''}`} onClick={() => setActiveTab('dateSuggestions')} disabled={!isSteamLinked}>
					{t('admin.steam.tabs.dateSuggestions')}
				</button>
			</div>

			{(activeTab === 'account' || !isSteamLinked) && (error || message) && (
				<div className={`alert ${isSuccess && !error ? 'alert--success' : 'alert--error'}`} onClick={handleClearError}>
					{error || message}
				</div>
			)}

			{activeTab !== 'account' && isSteamLinked && error && (
				<div className='alert alert--error' style={{ cursor: 'pointer' }} onClick={handleClearError}>
					{error}
				</div>
			)}

			{activeTab === 'account' || !isSteamLinked ? (
				renderAccountContent()
			) : activeTab === 'store' ? (
				<div className='store-search-view'>
					<p className='store-search-hint'>{t('admin.steam.store.hint')}</p>
					<input className='search-input' type='text' placeholder={t('admin.steam.store.placeholder')} value={storeQuery} onChange={handleStoreQueryChange} autoFocus />
					{storeLoading && <p className='store-loading'>{t('admin.steam.store.searching')}</p>}
					{!storeLoading && storeSearched && storeResults.length === 0 && <p className='store-no-results'>{t('admin.steam.store.noResults', { query: storeQuery })}</p>}
					{storeResults.length > 0 && (
						<div className='store-results-grid'>
							{storeResults.map((game) => {
								const addedState = storeAdded.get(game.appId)
								const isAdding = storeAdding.has(game.appId)
								const alreadyInLibrary = libraryAppIds.has(game.appId)
								const inGdb = addedState === 'created' || alreadyInLibrary || addedState === 'exists'
								return (
									<div key={game.appId} className={`store-card${inGdb ? ' store-card--added' : ''}`}>
										<div className='store-card-cover'>{(game.heroUrl || game.coverUrl) && <img src={game.heroUrl ?? game.coverUrl} alt={game.name} loading='lazy' />}</div>
										<div className='store-card-info'>
											<span className='store-card-name'>{game.name}</span>
											<span className='store-card-appid'>App {game.appId}</span>
											<div className='store-card-meta'>
												{game.metascore != null && <span className='store-card-score'>{game.metascore}</span>}
												{game.price ? (
													<span className='store-card-price'>
														{game.discountPercent ? (
															<>
																<span className='price-original'>{game.originalPrice}</span>
																<span className='price-discount'>-{game.discountPercent}%</span>
																<span className='price-final'>{game.price}</span>
															</>
														) : (
															game.price
														)}
													</span>
												) : (
													<span className='store-card-price store-card-price--free'>{t('admin.steam.store.free')}</span>
												)}
											</div>
										</div>
										<div className='store-card-action'>
											{inGdb ? (
												<span className='badge badge--exists'>{t('admin.steam.store.inGdb')}</span>
											) : addedState === 'error' ? (
												<button className='btn btn-secondary btn-sm' onClick={() => handleAddStoreGame(game.appId)}>
													{t('admin.steam.store.retry')}
												</button>
											) : (
												<button className='btn btn-primary btn-sm' onClick={() => handleAddStoreGame(game.appId)} disabled={isAdding}>
													{isAdding ? '...' : t('admin.steam.store.add')}
												</button>
											)}
										</div>
									</div>
								)
							})}
						</div>
					)}
				</div>
			) : activeTab === 'storeSuggestions' ? (
				<div className='suggestions-view'>
					{storeSuggestionsLoading ? (
						<p>{t('admin.steam.storeSuggestions.loading')}</p>
					) : storeSuggestionsError ? (
						<div className='alert alert--error'>{storeSuggestionsError}</div>
					) : storeSuggestions.length === 0 ? (
						<div className='no-suggestions'>
							<p>{t('admin.steam.storeSuggestions.empty')}</p>
							<button className='btn btn-secondary btn-sm' onClick={loadStoreSuggestions}>
								{t('admin.steam.storeSuggestions.refresh')}
							</button>
						</div>
					) : (
						<>
							<p className='suggestions-hint'>{t('admin.steam.storeSuggestions.hint', { count: storeSuggestions.length })}</p>
							<div className='suggestions-toolbar'>
								<input
									className='search-input'
									type='text'
									placeholder={t('admin.steam.common.searchByName')}
									value={storeSuggestionSearch}
									onChange={(e) => setStoreSuggestionSearch(e.target.value)}
								/>
								<button className='btn btn-secondary btn-sm' onClick={loadStoreSuggestions} disabled={storeSuggestionsLoading}>
									{t('admin.steam.storeSuggestions.refresh')}
								</button>
								{selectedStoreSuggestionIds.size > 0 && (
									<div className='bulk-actions'>
										<span className='bulk-count'>{t('admin.steam.common.selectedCount', { count: selectedStoreSuggestionIds.size })}</span>
										<button className='btn btn-primary btn-sm' onClick={handleBulkLinkStoreSuggestions}>
											{t('admin.steam.common.linkSelected')}
										</button>
										<button className='btn btn-secondary btn-sm' onClick={handleBulkDismissStoreSuggestions} disabled={storeSuggestionsDismissing}>
											{storeSuggestionsDismissing ? t('admin.steam.common.dismissing') : t('admin.steam.common.dismissSelected')}
										</button>
									</div>
								)}
							</div>
							<div className='library-table-wrapper'>
								<table className='library-table'>
									<thead>
										<tr>
											<th className='check-cell'>
												<input
													type='checkbox'
													checked={filteredStoreSuggestions.length > 0 && filteredStoreSuggestions.every((s) => selectedStoreSuggestionIds.has(getSuggestionKey(s)))}
													onChange={toggleAllVisibleStoreSuggestions}
												/>
											</th>
											<th>{t('admin.steam.common.steam')}</th>
											<th>{t('admin.steam.common.gdb')}</th>
											<th>{t('admin.steam.common.confidence')}</th>
											<th>{t('admin.steam.common.action')}</th>
										</tr>
									</thead>
									<tbody>
										{filteredStoreSuggestions.map((s) => {
											const key = getSuggestionKey(s)
											return (
												<tr
													key={key}
													className={selectedStoreSuggestionIds.has(key) ? 'row--selected row--selectable' : 'row--selectable'}
													onClick={() => toggleStoreSuggestionSelection(s)}>
													<td className='check-cell'>
														<input
															type='checkbox'
															checked={selectedStoreSuggestionIds.has(key)}
															onClick={(event) => event.stopPropagation()}
															onChange={() => toggleStoreSuggestionSelection(s)}
														/>
													</td>
													<td>
														<div className='suggestion-game'>
															{s.steamIconUrl && <img src={s.steamIconUrl} alt='' width={32} height={32} style={{ borderRadius: 2 }} />}
															<div>
																<span className='game-name'>{s.steamName}</span>
																<span className='game-appid'>App {s.steamAppId}</span>
															</div>
														</div>
													</td>
													<td>
														<span className='game-name'>{s.gdbGameName}</span>
														<span className='game-appid'>GDB #{s.gdbGameId}</span>
													</td>
													<td>
														<span className={`confidence-badge confidence--${s.confidence === 100 ? 'high' : s.confidence >= 75 ? 'mid' : 'low'}`}>{s.confidence}%</span>
													</td>
													<td>
														<button
															className='btn btn-primary btn-sm'
															onClick={(event) => {
																event.stopPropagation()
																handleLinkStoreSuggestion(s)
															}}>
															{t('admin.steam.common.link')}
														</button>
													</td>
												</tr>
											)
										})}
									</tbody>
								</table>
							</div>
						</>
					)}
				</div>
			) : activeTab === 'dateSuggestions' ? (
				<div className='suggestions-view'>
					{dateSuggestionsLoading ? (
						<p>{t('admin.steam.dateSuggestions.loading')}</p>
					) : dateSuggestionsError ? (
						<div className='alert alert--error'>{dateSuggestionsError}</div>
					) : dateSuggestions.length === 0 ? (
						<div className='no-suggestions'>
							<p>{t('admin.steam.dateSuggestions.empty')}</p>
							<button className='btn btn-secondary btn-sm' onClick={loadDateSuggestions}>
								{t('admin.steam.dateSuggestions.refresh')}
							</button>
						</div>
					) : (
						<>
							<p className='suggestions-hint'>{t('admin.steam.dateSuggestions.hint', { count: dateSuggestions.length })}</p>
							{dateApplyResult && (
								<div className='import-result alert alert--success'>
									<strong>{t('admin.steam.dateSuggestions.applyDone')}:</strong> {dateApplyResult.updated}
									{dateApplyResult.errors.length > 0 && (
										<ul>
											{dateApplyResult.errors.map((e, i) => (
												<li key={i}>{e}</li>
											))}
										</ul>
									)}
								</div>
							)}
							{dateDismissResult !== null && <div className='import-result alert alert--success'>{t('admin.steam.dateSuggestions.dismissDone')}</div>}
							<div className='suggestions-toolbar'>
								<input
									className='search-input'
									type='text'
									placeholder={t('admin.steam.common.searchByName')}
									value={dateSuggestionSearch}
									onChange={(e) => setDateSuggestionSearch(e.target.value)}
								/>
								<button className='btn btn-secondary btn-sm' onClick={loadDateSuggestions} disabled={dateSuggestionsLoading}>
									{t('admin.steam.dateSuggestions.refresh')}
								</button>
								{selectedDateSuggestionIds.size > 0 && (
									<div className='bulk-actions'>
										<span className='bulk-count'>{t('admin.steam.common.selectedCount', { count: selectedDateSuggestionIds.size })}</span>
										<button className='btn btn-primary btn-sm' onClick={handleApplyDateSuggestions} disabled={dateSuggestionsApplying || dateSuggestionsDismissing}>
											{dateSuggestionsApplying ? t('admin.steam.dateSuggestions.applying') : t('admin.steam.dateSuggestions.applySelected')}
										</button>
										<button className='btn btn-danger btn-sm' onClick={() => handleDismissDateSuggestions()} disabled={dateSuggestionsDismissing || dateSuggestionsApplying}>
											{dateSuggestionsDismissing ? t('admin.steam.dateSuggestions.dismissing') : t('admin.steam.dateSuggestions.dismissSelected')}
										</button>
									</div>
								)}
							</div>
							<div className='library-table-wrapper'>
								<table className='library-table'>
									<thead>
										<tr>
											<th className='check-cell'>
												<input
													type='checkbox'
													checked={filteredDateSuggestions.length > 0 && filteredDateSuggestions.every((s) => selectedDateSuggestionIds.has(s.gameId))}
													onChange={toggleAllVisibleDateSuggestions}
												/>
											</th>
											<th>{t('admin.steam.common.gdb')}</th>
											<th>{t('admin.steam.common.steam')}</th>
											<th>{t('admin.steam.dateSuggestions.currentDates')}</th>
											<th>{t('admin.steam.dateSuggestions.proposedDates')}</th>
											<th>{t('admin.steam.dateSuggestions.sources')}</th>
											<th></th>
										</tr>
									</thead>
									<tbody>
										{filteredDateSuggestions.map((s) => (
											<tr
												key={s.gameId}
												className={selectedDateSuggestionIds.has(s.gameId) ? 'row--selected row--selectable' : 'row--selectable'}
												onClick={() => toggleDateSuggestionSelection(s.gameId)}>
												<td className='check-cell'>
													<input
														type='checkbox'
														checked={selectedDateSuggestionIds.has(s.gameId)}
														onClick={(event) => event.stopPropagation()}
														onChange={() => toggleDateSuggestionSelection(s.gameId)}
													/>
												</td>
												<td>
													<span className='game-name'>{s.gameName}</span>
													<span className='game-appid'>GDB #{s.gameId}</span>
												</td>
												<td>
													<div className='suggestion-game'>
														{s.steamIconUrl && <img src={s.steamIconUrl} alt='' width={32} height={32} style={{ borderRadius: 2 }} />}
														<div>
															<span className='game-name'>{s.steamName}</span>
															<span className='game-appid'>App {s.steamAppId}</span>
															<span className='game-appid'>
																{t('admin.steam.dateSuggestions.playtime')}: {formatSteamMinutes(s.steamPlaytimeForever)}
															</span>
														</div>
													</div>
												</td>
												<td>
													<span className='game-appid'>
														{t('admin.steam.dateSuggestions.started')}: {s.currentStarted || '—'}
													</span>
													<span className='game-appid'>
														{t('admin.steam.dateSuggestions.finished')}: {s.currentFinished || '—'}
													</span>
												</td>
												<td>
													<span className='game-appid'>
														{t('admin.steam.dateSuggestions.started')}: {s.proposedStarted || '—'}
													</span>
													<span className='game-appid'>
														{t('admin.steam.dateSuggestions.finished')}: {s.proposedFinished || '—'}
													</span>
												</td>
												<td>
													<span className='game-appid'>{dateSourceLabel(s.startedSource)}</span>
													<span className='game-appid'>{dateSourceLabel(s.finishedSource)}</span>
													{s.notes.map((note) => (
														<span className='game-appid' key={note}>
															{dateNoteLabel(note)}
														</span>
													))}
												</td>
												<td className='action-cell' onClick={(e) => e.stopPropagation()}>
													<button
														className='btn btn-danger btn-sm'
														title={t('admin.steam.dateSuggestions.dismiss')}
														disabled={dateSuggestionsDismissing || dateSuggestionsApplying}
														onClick={() => handleDismissDateSuggestions([s.gameId])}>
														{t('admin.steam.dateSuggestions.dismiss')}
													</button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</>
					)}
				</div>
			) : activeTab === 'suggestions' ? (
				<div className='suggestions-view'>
					{suggestionsLoading ? (
						<p>{t('admin.steam.suggestionsView.searching')}</p>
					) : suggestionsError ? (
						<div className='alert alert--error'>{suggestionsError}</div>
					) : suggestions.length === 0 ? (
						<p className='no-suggestions'>{t('admin.steam.suggestionsView.none')}</p>
					) : (
						<>
							<p className='suggestions-hint'>{t('admin.steam.suggestionsView.hint', { count: suggestions.length })}</p>
							<div className='suggestions-toolbar'>
								<input className='search-input' type='text' placeholder={t('admin.steam.common.searchByName')} value={suggestionSearch} onChange={(e) => setSuggestionSearch(e.target.value)} />
								{selectedSuggestionIds.size > 0 && (
									<div className='bulk-actions'>
										<span className='bulk-count'>{t('admin.steam.suggestionsView.selectedCount', { count: selectedSuggestionIds.size })}</span>
										<button className='btn btn-primary btn-sm' onClick={handleBulkLinkSuggestions}>
											{t('admin.steam.suggestionsView.linkSelected')}
										</button>
										<button className='btn btn-secondary btn-sm' onClick={handleBulkDismissSuggestions} disabled={suggestionsDismissing}>
											{suggestionsDismissing ? t('admin.steam.suggestionsView.dismissing') : t('admin.steam.suggestionsView.dismissSelected')}
										</button>
									</div>
								)}
							</div>
							<div className='library-table-wrapper'>
								<table className='library-table'>
									<thead>
										<tr>
											<th className='check-cell'>
												<input
													type='checkbox'
													checked={filteredSuggestions.length > 0 && filteredSuggestions.every((s) => selectedSuggestionIds.has(s.steamAppId))}
													onChange={toggleAllVisibleSuggestions}
												/>
											</th>
											<th>{t('admin.steam.suggestionsView.colSteam')}</th>
											<th>{t('admin.steam.suggestionsView.colGdb')}</th>
											<th>{t('admin.steam.suggestionsView.colConfidence')}</th>
											<th>{t('admin.steam.suggestionsView.colAction')}</th>
										</tr>
									</thead>
									<tbody>
										{filteredSuggestions.map((s) => (
											<tr
												key={s.steamAppId}
												className={selectedSuggestionIds.has(s.steamAppId) ? 'row--selected row--selectable' : 'row--selectable'}
												onClick={() => toggleSuggestionSelection(s.steamAppId)}>
												<td className='check-cell'>
													<input
														type='checkbox'
														checked={selectedSuggestionIds.has(s.steamAppId)}
														onClick={(event) => event.stopPropagation()}
														onChange={() => toggleSuggestionSelection(s.steamAppId)}
													/>
												</td>
												<td>
													<div className='suggestion-game'>
														{s.steamIconUrl && <img src={s.steamIconUrl} alt='' width={32} height={32} style={{ borderRadius: 2 }} />}
														<div>
															<span className='game-name'>{s.steamName}</span>
															<span className='game-appid'>App {s.steamAppId}</span>
														</div>
													</div>
												</td>
												<td>
													<span className='game-name'>{s.gdbGameName}</span>
													<span className='game-appid'>GDB #{s.gdbGameId}</span>
												</td>
												<td>
													<span className={`confidence-badge confidence--${s.confidence === 100 ? 'high' : s.confidence >= 75 ? 'mid' : 'low'}`}>{s.confidence}%</span>
												</td>
												<td>
													<button
														className='btn btn-primary btn-sm'
														onClick={(event) => {
															event.stopPropagation()
															handleLinkSuggestion(s)
														}}>
														{t('admin.steam.suggestionsView.link')}
													</button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</>
					)}
				</div>
			) : (
				<>
					{lastImportResult && (
						<div className='import-result alert alert--success'>
							<strong>{t('admin.steam.libraryView.importResult')}</strong> {t('admin.steam.libraryView.importCreated', { count: lastImportResult.created })},{' '}
							{t('admin.steam.libraryView.importLinked', { count: lastImportResult.linked })}, {t('admin.steam.libraryView.importSkipped', { count: lastImportResult.skipped })}
						</div>
					)}

					{linkResults && (
						<div className='import-result alert alert--success'>
							<strong>{t('admin.steam.libraryView.linkResult')}</strong> {t('admin.steam.libraryView.linkedCount', { count: linkResults.linked })}
							{linkResults.errors.length > 0 && (
								<ul>
									{linkResults.errors.map((e, i) => (
										<li key={i}>{e}</li>
									))}
								</ul>
							)}
						</div>
					)}

					<div className='import-controls'>
						<label className='filter-toggle'>
							<input type='checkbox' checked={filterUnmatched} onChange={(e) => setFilterUnmatched(e.target.checked)} />
							{t('admin.steam.libraryView.showOnlyUnmatched')}
						</label>
						<div className='import-actions'>
							<button className='btn btn-secondary' onClick={handleSelectAllUnmatched} disabled={libraryLoading}>
								{t('admin.steam.libraryView.selectAllUnmatched')}
							</button>
							<button className='btn btn-primary' onClick={handleImport} disabled={importLoading || linkLoading || totalActionCount === 0}>
								{importLoading || linkLoading
									? t('admin.steam.libraryView.processing')
									: `${t('admin.steam.libraryView.apply')} (${toCreateCount > 0 ? t('admin.steam.libraryView.applyCreate', { count: toCreateCount }) : ''}${
											toCreateCount > 0 && toLinkCount > 0 ? ', ' : ''
										}${toLinkCount > 0 ? t('admin.steam.libraryView.applyLink', { count: toLinkCount }) : ''})`}
							</button>
						</div>
					</div>
					<input
						className='search-input search-input--library'
						type='text'
						placeholder={t('admin.steam.libraryView.searchPlaceholder')}
						value={librarySearch}
						onChange={(e) => setLibrarySearch(e.target.value)}
					/>

					{libraryLoading ? (
						<p>{t('admin.steam.libraryView.loading')}</p>
					) : (
						<>
							<div className='library-table-wrapper'>
								<table className='library-table'>
									<thead>
										<tr>
											<th>{t('admin.steam.libraryView.colCover')}</th>
											<th>
												<button type='button' className='btn btn-secondary btn-sm' onClick={() => handleLibrarySort('name')}>
													{t('admin.steam.libraryView.colName')}
													{renderSortIndicator('name')}
												</button>
											</th>
											<th>
												<button type='button' className='btn btn-secondary btn-sm' onClick={() => handleLibrarySort('playtime')}>
													{t('admin.steam.libraryView.colPlaytime')}
													{renderSortIndicator('playtime')}
												</button>
											</th>
											<th>
												<button type='button' className='btn btn-secondary btn-sm' onClick={() => handleLibrarySort('status')}>
													{t('admin.steam.libraryView.colStatus')}
													{renderSortIndicator('status')}
												</button>
											</th>
											<th>
												<button type='button' className='btn btn-secondary btn-sm' onClick={() => handleLibrarySort('action')}>
													{t('admin.steam.libraryView.colAction')}
													{renderSortIndicator('action')}
												</button>
											</th>
										</tr>
									</thead>
									<tbody>
										{pagedLibrary.map((game) => {
											const action = getAction(game.appId)
											return (
												<tr key={game.appId} className={action === 'create' ? 'row--selected' : action === 'link' ? 'row--link' : ''}>
													<td>{game.iconUrl ? <img src={game.iconUrl} alt='' width={32} height={32} style={{ borderRadius: 2 }} /> : <div className='no-icon' />}</td>
													<td>
														<span className='game-name'>{game.name}</span>
														<span className='game-appid'>App {game.appId}</span>
													</td>
													<td>{game.playtimeForever > 0 ? `${Math.round(game.playtimeForever / 60)}h` : '—'}</td>
													<td>
														{game.gdbGameId ? (
															<span className='badge badge--exists'>{t('admin.steam.libraryView.inGdb', { id: game.gdbGameId })}</span>
														) : (
															<span className='badge badge--missing'>{t('admin.steam.libraryView.notImported')}</span>
														)}
													</td>
													<td className='action-cell'>
														<select value={action} onChange={(e) => setAction(game.appId, e.target.value as ImportAction)} className='action-select'>
															<option value='skip'>{t('admin.steam.libraryView.actionSkip')}</option>
															<option value='create'>{t('admin.steam.libraryView.actionCreate')}</option>
															<option value='link'>{t('admin.steam.libraryView.actionLink')}</option>
														</select>
														{action === 'link' && (
															<GameSearch onSelect={(g) => setLinkTarget(game.appId, { gameId: g.id, gameName: g.name })} selected={linkTargets.get(game.appId) ?? null} />
														)}
													</td>
												</tr>
											)
										})}
									</tbody>
								</table>
							</div>
							{filteredLibrary.length > LIBRARY_PAGE_SIZE && (
								<div className='library-pagination'>
									<button className='btn btn-secondary btn-sm' onClick={() => setLibraryPage((p) => Math.max(1, p - 1))} disabled={clampedLibraryPage <= 1}>
										{t('common.previous')}
									</button>
									<span className='library-pagination__info'>
										{t('admin.steam.libraryView.pageInfo', { page: clampedLibraryPage, pages: libraryPageCount })} · {t('admin.steam.libraryView.rowsInfo', { count: filteredLibrary.length })}
									</span>
									<button className='btn btn-secondary btn-sm' onClick={() => setLibraryPage((p) => Math.min(libraryPageCount, p + 1))} disabled={clampedLibraryPage >= libraryPageCount}>
										{t('common.next')}
									</button>
								</div>
							)}
						</>
					)}
				</>
			)}
		</div>
	)
}

interface GameSearchProps {
	onSelect: (game: Game) => void
	selected: { gameId: number; gameName: string } | null
}

function GameSearch({ onSelect, selected }: GameSearchProps) {
	const { t } = useTranslation()
	const [query, setQuery] = useState('')
	const [results, setResults] = useState<Game[]>([])
	const [searching, setSearching] = useState(false)
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const search = useCallback(async (q: string) => {
		if (q.length < 2) {
			setResults([])
			return
		}
		setSearching(true)
		try {
			const data = await getGames({ search: q, pageSize: 8, page: 1 } as any)
			setResults(data.data)
		} finally {
			setSearching(false)
		}
	}, [])

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const q = e.target.value
		setQuery(q)
		if (timerRef.current) clearTimeout(timerRef.current)
		timerRef.current = setTimeout(() => search(q), 300)
	}

	const handleSelect = (game: Game) => {
		onSelect(game)
		setQuery(game.name)
		setResults([])
	}

	return (
		<div className='game-search'>
			{selected && <span className='game-search-selected'>→ {selected.gameName}</span>}
			<input className='game-search-input' type='text' placeholder={t('admin.steam.libraryView.gameSearchPlaceholder')} value={query} onChange={handleChange} autoComplete='off' />
			{searching && <span className='game-search-loading'>...</span>}
			{results.length > 0 && (
				<ul className='game-search-results'>
					{results.map((g) => (
						<li key={g.id} onClick={() => handleSelect(g)}>
							{g.name}
						</li>
					))}
				</ul>
			)}
		</div>
	)
}

export default AdminSteamImport
