import { forwardRef, useEffect, useId, useImperativeHandle, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Game, GameCreateDto } from '@/models/api/Game'
import { Modal, GameDetails, ConfirmDialog } from '@/components/elements'
import { useGames } from '@/hooks/useGames'
import { useGameStatus } from '@/hooks'
import { steamService } from '@/services'
import type { SteamImportedGame, SteamLibraryGame, SteamStoreSearchResult } from '@/services/SteamService/SteamService'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { selectGameById } from '@/store/features/games'
import { triggerGamesRefresh } from '@/store/features/games/gamesSlice'
import { fetchSteamLibrary, importSteamGames } from '@/store/features/steam/steamSlice'
import './CreateGame.scss'
import { CollectionSheet } from '@/components/Collection/CollectionSheet'
import { CollectionIcon } from '@/components/Collection/CollectionIcon'
import { useCollectionDetails } from '@/components/Collection/collectionDetailsContext'
import { CollectionGameDetails } from '@/components/Collection/CollectionGameDetailsLazy'
import './GalleryCreateGame.scss'
import { creationRequestId } from '@/utils/creationRequestId'
import { readCreateSteamPreference, saveCreateSteamPreference } from '@/utils/createGamePreferences'
import { useGameMetadata } from '@/components/Collection/gameMetadataContext'

const STEAM_ICON_URL = `${import.meta.env.BASE_URL}platform-icons/steam.png`
const STEAM_SEARCH_DEBOUNCE_MS = 350
const MAX_STEAM_RESULTS = 6
const MAX_LIBRARY_RESULTS = 3

type CheaperBy = 'key' | 'store'
type RowStatusId = number | ''

type ManualGameRow = {
	id: string
	creationRequestId: string
	type: 'manual'
	name: string
	statusId: RowStatusId
	cheaperBy?: CheaperBy
	hasEditedName?: boolean
	showExtraFields?: boolean
	steamSearchEnabled: boolean
	platformId?: number
}

type SteamGameRow = {
	id: string
	type: 'steam'
	appId: number
	name: string
	statusId: RowStatusId
	cheaperBy?: CheaperBy
	showExtraFields?: boolean
	source: 'library' | 'store'
	heroUrl?: string
	coverUrl?: string
	iconUrl?: string
	price?: string
	metascore?: number
	playtimeForever?: number
	manualDraft?: ManualGameRow
}

type GameRow = ManualGameRow | SteamGameRow

type SteamSuggestion = {
	appId: number
	name: string
	source: 'library' | 'store'
	heroUrl?: string
	coverUrl?: string
	iconUrl?: string
	price?: string
	metascore?: number
	playtimeForever?: number
	gdbGameId?: number
	gdbGameName?: string
}

type SteamSearchState = {
	loading: boolean
	query: string
	results: SteamSuggestion[]
	error?: string
}

const mapCheaperByToBoolean = (cheaperBy: string | undefined): boolean | undefined => {
	if (cheaperBy === 'key') return true
	if (cheaperBy === 'store') return false
	return undefined
}

const createRowId = (() => {
	let rowId = 0
	return () => `add-game-row-${++rowId}`
})()

const createManualRow = (statusId: RowStatusId, steamSearchEnabled = false): ManualGameRow => ({
	id: createRowId(),
	creationRequestId: creationRequestId(),
	type: 'manual',
	name: '',
	statusId,
	hasEditedName: false,
	showExtraFields: false,
	steamSearchEnabled,
})

const getSteamHeaderImageUrl = (appId: number) => `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`
const getSteamLibraryCoverUrl = (appId: number) => `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900.jpg`

const scoreSteamMatch = (name: string, query: string) => {
	const normalizedName = name.toLowerCase()
	const normalizedQuery = query.toLowerCase()
	if (normalizedName === normalizedQuery) return 0
	if (normalizedName.startsWith(normalizedQuery)) return 1
	return normalizedName.indexOf(normalizedQuery) + 2
}

const getLibrarySuggestions = (library: SteamLibraryGame[], query: string, selectedAppIds: Set<number>): SteamSuggestion[] => {
	const normalizedQuery = query.toLowerCase()
	return library
		.filter((game) => game.name.toLowerCase().includes(normalizedQuery))
		.filter((game) => !selectedAppIds.has(game.appId))
		.sort((a, b) => scoreSteamMatch(a.name, query) - scoreSteamMatch(b.name, query) || a.name.localeCompare(b.name))
		.slice(0, MAX_LIBRARY_RESULTS)
		.map((game) => ({
			appId: game.appId,
			name: game.name,
			source: 'library',
			heroUrl: getSteamHeaderImageUrl(game.appId),
			coverUrl: getSteamLibraryCoverUrl(game.appId),
			iconUrl: game.iconUrl,
			playtimeForever: game.playtimeForever,
			gdbGameId: game.gdbGameId,
			gdbGameName: game.gdbGameName,
		}))
}

const applyStoreCoversToLibrarySuggestions = (librarySuggestions: SteamSuggestion[], storeResults: SteamStoreSearchResult[]) => {
	const storeHeroByAppId = new Map(storeResults.filter((game) => game.heroUrl || game.coverUrl).map((game) => [game.appId, game.heroUrl ?? game.coverUrl]))
	const storeCoverByAppId = new Map(storeResults.filter((game) => game.coverUrl).map((game) => [game.appId, game.coverUrl]))
	return librarySuggestions.map((suggestion) => ({
		...suggestion,
		heroUrl: storeHeroByAppId.get(suggestion.appId) ?? suggestion.heroUrl,
		coverUrl: storeCoverByAppId.get(suggestion.appId) ?? suggestion.coverUrl,
	}))
}

const getStoreSuggestions = (
	storeResults: SteamStoreSearchResult[],
	library: SteamLibraryGame[],
	selectedAppIds: Set<number>,
	usedAppIds: Set<number>,
	limit: number
): SteamSuggestion[] => {
	const libraryByAppId = new Map(library.map((game) => [game.appId, game]))

	return storeResults
		.filter((game) => !selectedAppIds.has(game.appId) && !usedAppIds.has(game.appId))
		.slice(0, limit)
		.map((game) => {
			const libraryGame = libraryByAppId.get(game.appId)
			return {
				appId: game.appId,
				name: game.name,
				source: 'store',
				heroUrl: game.heroUrl ?? game.coverUrl,
				coverUrl: game.heroUrl ? game.coverUrl : undefined,
				iconUrl: game.heroUrl ?? game.coverUrl,
				price: game.price,
				metascore: game.metascore,
				gdbGameId: libraryGame?.gdbGameId,
				gdbGameName: libraryGame?.gdbGameName,
			}
		})
}

const getValidStatusId = (statusId: RowStatusId, defaultStatusId?: number) => (statusId === '' ? defaultStatusId : statusId)

export interface CreateGameHandle {
	open: () => void
}

interface CreateGameProps {
	gallery?: boolean
	className?: string
	renderTrigger?: (open: () => void) => ReactNode
}

const OwnedCreateGame = forwardRef<CreateGameHandle, CreateGameProps>(({ className, renderTrigger, gallery = false }, ref) => {
	const { t } = useTranslation()
	const dispatch = useAppDispatch()
	const details = useCollectionDetails()
	const metadata = useGameMetadata()
	const authUser = useAppSelector((state) => state.auth.user)
	const lastSteamSearchEnabled = useRef<boolean | undefined>(undefined)
	if (lastSteamSearchEnabled.current === undefined) lastSteamSearchEnabled.current = readCreateSteamPreference(authUser?.id)
	const initialTitleFocus = useRef<HTMLElement | null>(null)
	const platforms = useAppSelector((state) => (state.gamePlatform.platforms.length ? state.gamePlatform.platforms : state.gamePlatform.activePlatforms))
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [autofillAfterImport, setAutofillAfterImport] = useState(false)
	const autofillHelpId = useId()
	const [submitError, setSubmitError] = useState<string | null>(null)
	const [createdGameId, setCreatedGameId] = useState<number | null>(null)
	const [createdGameFallback, setCreatedGameFallback] = useState<Game | null>(null)
	const [isDetailsOpen, setIsDetailsOpen] = useState(false)
	const [deleteTarget, setDeleteTarget] = useState<Game | null>(null)
	const [lastAddedRowId, setLastAddedRowId] = useState<string | null>(null)
	const [touchedRows, setTouchedRows] = useState<Set<string>>(new Set())
	const [steamSearchByRowId, setSteamSearchByRowId] = useState<Record<string, SteamSearchState>>({})
	const searchSequenceByRowId = useRef<Record<string, number>>({})
	const [activeSearchRowId, setActiveSearchRowId] = useState<string | null>(null)
	const [searchRevision, setSearchRevision] = useState(0)
	const [outcomes, setOutcomes] = useState<Record<string, { state: 'saving' | 'saved' | 'error'; message?: string }>>({})
	const createdRows = useRef(new Map<string, Game>()), importedRows = useRef(new Map<string, SteamImportedGame>()), savedRows = useRef(new Set<string>()), submission = useRef(false)
	const mounted = useRef(true)
	useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

	const isSteamLinked = !!authUser?.steamId
	const { library, libraryLoading } = useAppSelector((state) => state.steam)
	const storeCreatedGame = useAppSelector((state) => (createdGameId ? selectGameById(createdGameId)(state) : undefined))
	const { createNewGame, deleteGameById, fetchGameDetails, bulkUpdateGamesById } = useGames()
	const { fetchActiveStatusList, fetchSpecialStatusList } = useGameStatus()

	const [statusOptions, setStatusOptions] = useState<{ value: number; label: string }[]>([])
	const [catalogLoading, setCatalogLoading] = useState(true), [catalogError, setCatalogError] = useState(false)
	const [defaultStatusId, setDefaultStatusId] = useState<number | undefined>(undefined)
	const [rows, setRows] = useState<GameRow[]>(() => [createManualRow('', lastSteamSearchEnabled.current)])
	const focusTargetRowId = lastAddedRowId ?? rows.find(row => row.type === 'manual' && !savedRows.current.has(row.id))?.id ?? rows[0]?.id
	const rememberSteamSearch = (enabled: boolean) => { lastSteamSearchEnabled.current = enabled; saveCreateSteamPreference(authUser?.id, enabled) }

	useEffect(() => {
		if (storeCreatedGame) {
			setCreatedGameFallback(storeCreatedGame)
		}
	}, [storeCreatedGame])

	const getStatusOptions = async () => {
		setCatalogLoading(true)
		try {
			const [statusList, specialStatusList] = await Promise.all([fetchActiveStatusList(), fetchSpecialStatusList()])
			if (!mounted.current) return []
			const options = statusList?.map((status) => ({ value: status.id, label: status.name })) ?? []
			setStatusOptions(options)
			setCatalogError(!options.length)

			const notFulfilled = specialStatusList?.find((status) => status.statusType === 'NotFulfilled')
			const fallbackStatusId =
				options.find(option => option.value === notFulfilled?.id)?.value ?? (options.find((option) => option.value === 8)?.value || (options.length > 0 ? Math.min(...options.map((option) => option.value)) : undefined))
			setDefaultStatusId(fallbackStatusId)
			return options
		} catch {
			if (mounted.current) setCatalogError(true)
			return []
		} finally {
			if (mounted.current) setCatalogLoading(false)
		}
	}

	useEffect(() => {
		void getStatusOptions()
	}, [])

	useEffect(() => {
		if (defaultStatusId == null) return
		setRows((currentRows) => currentRows.map((row) => (row.statusId === '' ? { ...row, statusId: defaultStatusId } : row)))
	}, [defaultStatusId])

	const steamSearchRequested = isModalOpen && isSteamLinked && rows.some((row) => row.type === 'manual' && row.steamSearchEnabled)
	useEffect(() => {
		if (steamSearchRequested) {
			void dispatch(fetchSteamLibrary())
		}
	}, [dispatch, steamSearchRequested])

	const rowsSearchKey = useMemo(
		() => rows.map((row) => (row.type === 'manual' ? `${row.id}:${row.name}:${row.steamSearchEnabled}` : `${row.id}:steam:${row.appId}`)).join('|'),
		[rows]
	)

	useEffect(() => {
		if (!isModalOpen || !isSteamLinked) {
			setSteamSearchByRowId({})
			return
		}

		const controllers: AbortController[] = []
		const timers = rows
			.filter((row): row is ManualGameRow => row.type === 'manual')
			.map((row) => {
				const query = row.name.trim()
				if (!row.steamSearchEnabled || query.length < 2 || gallery && row.id !== activeSearchRowId) {
					setSteamSearchByRowId((current) => {
						const next = { ...current }
						delete next[row.id]
						return next
					})
					return null
				}

				const requestId = (searchSequenceByRowId.current[row.id] ?? 0) + 1
				searchSequenceByRowId.current[row.id] = requestId
				const controller = new AbortController()
				controllers.push(controller)
				const selectedAppIds = new Set(rows.filter((candidate): candidate is SteamGameRow => candidate.type === 'steam').map((candidate) => candidate.appId))
				const librarySuggestions = getLibrarySuggestions(library, query, selectedAppIds)
				setSteamSearchByRowId((current) => ({ ...current, [row.id]: { loading: true, query, results: librarySuggestions } }))
				return window.setTimeout(async () => {
					try {
						const storeResults = await steamService.searchStore(query, controller.signal)
						if (controller.signal.aborted || searchSequenceByRowId.current[row.id] !== requestId) return

						const enrichedLibrarySuggestions = applyStoreCoversToLibrarySuggestions(librarySuggestions, storeResults)
						const usedAppIds = new Set(enrichedLibrarySuggestions.map((suggestion) => suggestion.appId))
						const storeLimit = librarySuggestions.length >= MAX_LIBRARY_RESULTS ? MAX_LIBRARY_RESULTS : MAX_STEAM_RESULTS - librarySuggestions.length
						const storeSuggestions = getStoreSuggestions(storeResults, library, selectedAppIds, usedAppIds, storeLimit)

						setSteamSearchByRowId((current) => ({
							...current,
							[row.id]: {
								loading: false,
								query,
								results: [...enrichedLibrarySuggestions, ...storeSuggestions].slice(0, MAX_STEAM_RESULTS),
							},
						}))
					} catch {
						if (controller.signal.aborted || searchSequenceByRowId.current[row.id] !== requestId) return
						setSteamSearchByRowId((current) => ({
							...current,
							[row.id]: {
								loading: false,
								query,
								results: librarySuggestions,
								error: t('game.createModal.steamSearchError'),
							},
						}))
					}
				}, STEAM_SEARCH_DEBOUNCE_MS)
			})

		return () => {
			controllers.forEach(controller => controller.abort())
			Object.keys(searchSequenceByRowId.current).forEach(id => { searchSequenceByRowId.current[id]++ })
			timers.forEach((timer) => {
				if (timer) window.clearTimeout(timer)
			})
		}
	}, [gallery, activeSearchRowId, isModalOpen, isSteamLinked, library, rowsSearchKey, searchRevision, t])

	useEffect(() => {
		if (gallery && isModalOpen && lastAddedRowId) (document.getElementById(`${lastAddedRowId}-name`) ?? document.getElementById(`${lastAddedRowId}-source`))?.focus()
	}, [gallery, isModalOpen, lastAddedRowId, rows.length])

	const resetRows = () => {
		const row = createManualRow(defaultStatusId ?? '', lastSteamSearchEnabled.current)
		setRows([row])
		setLastAddedRowId(row.id)
		setTouchedRows(new Set())
		setSteamSearchByRowId({})
		setSubmitError(null)
		setOutcomes({}); createdRows.current.clear(); importedRows.current.clear(); savedRows.current.clear()
		setAutofillAfterImport(false)
		setActiveSearchRowId(null)
	}

	const openAddGameModal = () => {
		setLastAddedRowId(rows.find(row => row.type === 'manual' && !savedRows.current.has(row.id))?.id ?? null)
		setIsModalOpen(true)
	}

	const closeModal = () => {
		if (submission.current) return
		setIsModalOpen(false)
	}

	const confirmDeleteCreatedGame = async () => {
		if (!deleteTarget) return
		const target = deleteTarget
		setDeleteTarget(null)
		await deleteGameById(target.id)
		setIsDetailsOpen(false)
		setCreatedGameFallback(null)
		setCreatedGameId(null)
	}

	const addRow = () => {
		const newRow = createManualRow(defaultStatusId ?? '', lastSteamSearchEnabled.current)
		setRows((currentRows) => [...currentRows, newRow])
		setLastAddedRowId(newRow.id)
	}

	const removeRow = (rowId: string) => {
		const index = rows.findIndex(row => row.id === rowId)
		const remaining = rows.filter(row => row.id !== rowId)
		const next = remaining.length ? remaining : [createManualRow(defaultStatusId ?? '', lastSteamSearchEnabled.current)]
		setRows(next)
		setLastAddedRowId(next[Math.min(Math.max(0, index), next.length - 1)].id)
		if (activeSearchRowId === rowId) setActiveSearchRowId(null)
		setTouchedRows((current) => {
			const next = new Set(current)
			next.delete(rowId)
			return next
		})
	}

	const updateManualRow = (rowId: string, patch: Partial<Omit<ManualGameRow, 'id' | 'type'>>) => {
		setRows((currentRows) => currentRows.map((row) => (row.id === rowId && row.type === 'manual' ? { ...row, ...patch } : row)))
	}

	const updateSteamRow = (rowId: string, patch: Partial<Omit<SteamGameRow, 'id' | 'type'>>) => {
		setRows((currentRows) => currentRows.map((row) => (row.id === rowId && row.type === 'steam' ? { ...row, ...patch } : row)))
	}

	const updateRowStatus = (rowId: string, statusId: RowStatusId) => {
		setRows((currentRows) => currentRows.map((row) => (row.id === rowId ? { ...row, statusId } : row)))
	}

	const toggleExtraFields = (rowId: string) => {
		setRows((currentRows) => currentRows.map((row) => (row.id === rowId ? { ...row, showExtraFields: !row.showExtraFields } : row)))
	}

	const toggleSteamSearch = (row: ManualGameRow) => {
		const nextEnabled = !row.steamSearchEnabled
		rememberSteamSearch(nextEnabled)
		updateManualRow(row.id, { steamSearchEnabled: nextEnabled })
		setActiveSearchRowId(nextEnabled ? row.id : null)
		if (gallery) document.getElementById(`${row.id}-name`)?.focus()

		if (!nextEnabled) {
			setSteamSearchByRowId((current) => {
				const next = { ...current }
				delete next[row.id]
				return next
			})
		}
	}

	const selectSteamSuggestion = (row: ManualGameRow, suggestion: SteamSuggestion) => {
		if (suggestion.gdbGameId || rows.some(value => value.type === 'steam' && value.appId === suggestion.appId)) return
		rememberSteamSearch(true)

		const selectedRow: SteamGameRow = {
			id: row.id,
			type: 'steam',
			appId: suggestion.appId,
			name: suggestion.name,
			statusId: getValidStatusId(row.statusId, defaultStatusId) ?? '',
			cheaperBy: row.cheaperBy,
			showExtraFields: row.showExtraFields,
			source: suggestion.source,
			heroUrl: suggestion.heroUrl,
			coverUrl: suggestion.coverUrl,
			iconUrl: suggestion.iconUrl,
			price: suggestion.price,
			metascore: suggestion.metascore,
			playtimeForever: suggestion.playtimeForever,
			manualDraft: row,
		}

		setRows((currentRows) => {
			return currentRows.some(candidate => candidate.id === row.id) ? currentRows.map((candidate) => (candidate.id === row.id ? selectedRow : candidate)) : [...currentRows, selectedRow]
		})
		setActiveSearchRowId(null)
		if (gallery) document.getElementById(`${row.id}-source`)?.focus()
	}

	const unlinkSteamRow = (row: SteamGameRow) => {
		if (importedRows.current.has(row.id)) return
		rememberSteamSearch(false)
		const manual: ManualGameRow = { ...(row.manualDraft ?? createManualRow(row.statusId)), id: row.id, name: row.name, statusId: row.statusId, cheaperBy: row.cheaperBy, showExtraFields: row.showExtraFields, steamSearchEnabled: false }
		setRows(current => current.map(value => value.id === row.id ? manual : value))
		setActiveSearchRowId(null)
		setLastAddedRowId(row.id)
	}

	const markRowTouched = (rowId: string, shouldValidate = true) => {
		if (!shouldValidate) return
		setTouchedRows((current) => new Set(current).add(rowId))
	}

	const applySteamPostImportUpdates = async (steamRows: SteamGameRow[], importedGames: SteamImportedGame[]) => {
		const updatesByPatch = steamRows.reduce((updates, row) => {
			const imported = importedGames.find((game) => game.appId === row.appId)
			const statusId = getValidStatusId(row.statusId, defaultStatusId)
			const isCheaperByKey = mapCheaperByToBoolean(row.cheaperBy)
			if (!imported?.gdbGameId || !statusId) return updates

			const key = `${statusId}:${isCheaperByKey ?? 'unset'}`
			const patch = updates.get(key) ?? { gameIds: [], statusId, ...(isCheaperByKey !== undefined ? { isCheaperByKey } : {}) }
			patch.gameIds.push(imported.gdbGameId)
			updates.set(key, patch)
			return updates
		}, new Map<string, { gameIds: number[]; statusId: number; isCheaperByKey?: boolean }>())

		for (const patch of updatesByPatch.values()) {
			const result = await bulkUpdateGamesById({
				gameIds: patch.gameIds,
				statusId: patch.statusId,
				...(patch.isCheaperByKey !== undefined ? { isCheaperByKey: patch.isCheaperByKey } : {}),
			})
			if (result.updatedCount !== patch.gameIds.length) throw new Error('Incomplete import settings update')
		}
	}

	const handleBatchSubmit = async () => {
		if (submission.current || isSubmitting) return
		submission.current = true
		const mark = (id: string, state: 'saving' | 'saved' | 'error', message?: string) => { if (mounted.current) setOutcomes(current => ({ ...current, [id]: { state, message } })) }
		try {
			setIsSubmitting(true)
			setSubmitError(null)

			const manualRows = rows.filter((row): row is ManualGameRow => row.type === 'manual' && row.name.trim() !== '' && !savedRows.current.has(row.id))
			const steamRows = rows.filter((row): row is SteamGameRow => row.type === 'steam' && !savedRows.current.has(row.id))

			if ((manualRows.length === 0 && steamRows.length === 0 && !rows.some(row => savedRows.current.has(row.id))) || gallery && rows.some(row => row.type === 'manual' && !row.name.trim())) {
				setTouchedRows(new Set(rows.filter((row) => row.type === 'manual').map((row) => row.id)))
				return
			}

			const rowsWithoutStatus = [...manualRows, ...steamRows].filter((row) => !getValidStatusId(row.statusId, defaultStatusId))
			if (rowsWithoutStatus.length > 0) {
				setRows(current => current.map(row => rowsWithoutStatus.some(invalid => invalid.id === row.id) ? { ...row, showExtraFields: true } : row))
				setSubmitError(t('game.createModal.statusRequired'))
				return
			}

			const errors: string[] = []
			// SQLite writes are sequential. Successful row receipts survive partial
			// failure and closing/reopening; retries send only unfinished work.
			for (const row of manualRows) {
				if (!mounted.current) return
				mark(row.id, 'saving')
				const payload: GameCreateDto = { name: row.name.trim(), statusId: getValidStatusId(row.statusId, defaultStatusId)!, isCheaperByKey: mapCheaperByToBoolean(row.cheaperBy), ...(row.platformId ? { platformId: row.platformId } : {}), creationRequestId: row.creationRequestId }
				try {
					const game = await createNewGame(payload) as Game
					if (!mounted.current) return
					createdRows.current.set(row.id, game); savedRows.current.add(row.id); mark(row.id, 'saved')
				} catch { const error = t('game.createModal.createError'); errors.push(error); mark(row.id, 'error', error) }
			}
			if (!mounted.current) return
			if (steamRows.length > 0) {
				const toImport = steamRows.filter(row => !importedRows.current.has(row.id))
				steamRows.forEach(row => mark(row.id, 'saving'))
				if (toImport.length) try {
					const importResult = await dispatch(
						importSteamGames({
							games: toImport.map((row) => ({
								appId: row.appId,
								logoUrl: row.source === 'library' ? (row.iconUrl ?? row.heroUrl) : undefined,
								heroUrl: row.heroUrl,
								coverUrl: row.coverUrl,
							})),
							createMissing: true,
						})
					).unwrap()
					if (!mounted.current) return
					for (const row of toImport) {
						const receipt = importResult.importedGames?.find(game => game.appId === row.appId && game.gdbGameId && game.action !== 'error')
						if (receipt) importedRows.current.set(row.id, receipt)
					}
					dispatch(triggerGamesRefresh())
					void dispatch(fetchSteamLibrary())
				} catch { /* Per-row failures below retain every successful receipt. */ }
				for (const row of steamRows) {
					if (!mounted.current) return
					const imported = importedRows.current.get(row.id)
					if (!imported) { const error = t('game.createModal.steamImportError'); errors.push(error); mark(row.id, 'error', error); continue }
					try {
						// An already-existing game is not a license to overwrite its
						// personal fields. Imported/linked receipts can finish settings.
						if (imported.action === 'created' || imported.action === 'linked') await applySteamPostImportUpdates([row], [imported])
						if (!mounted.current) return
						savedRows.current.add(row.id); mark(row.id, 'saved', imported.action === 'exists' || imported.action === 'skipped' ? t('gallery.create.alreadyAdded') : undefined)
					} catch { const error = t('gallery.create.settingsFailed'); errors.push(error); mark(row.id, 'error', error) }
				}
			}
			if (!mounted.current) return
			if (errors.length) {
				setSubmitError(t('gallery.create.partial', { saved: rows.filter(row => savedRows.current.has(row.id)).length, total: rows.length }))
				return
			}

			if (autofillAfterImport) {
				const targets = [...new Map(rows.flatMap(row => {
					const created = createdRows.current.get(row.id), imported = importedRows.current.get(row.id)
					if (created) return [[created.id, { id: created.id, name: created.name }] as const]
					if (imported?.gdbGameId && (imported.action === 'created' || imported.action === 'linked')) return [[imported.gdbGameId, { id: imported.gdbGameId, name: imported.name }] as const]
					return []
				})).values()]
				if (targets.length) {
					if (!metadata?.openBatch(targets, { overwrite: false })) { setSubmitError(t('metadata.batch.startFailed')); return }
					setIsModalOpen(false); resetRows(); dispatch(triggerGamesRefresh()); return
				}
			}
			const createdGames = rows.flatMap(row => createdRows.current.has(row.id) ? [createdRows.current.get(row.id)!] : [])
			const uniqueImportedIds = [...new Set(rows.flatMap(row => importedRows.current.get(row.id)?.gdbGameId ?? []))]
			let onlyGame = createdGames.length + uniqueImportedIds.length === 1 ? createdGames[0] : undefined
			if (!onlyGame && createdGames.length + uniqueImportedIds.length === 1) { try { onlyGame = await fetchGameDetails(uniqueImportedIds[0]) as Game } catch { /* Creation succeeded; a failed details read must not retry POST. */ } }
			if (!mounted.current) return
			setIsModalOpen(false); resetRows(); dispatch(triggerGamesRefresh())
			if (onlyGame) {
				if (gallery && details) {
					details.open(onlyGame, (game) => setDeleteTarget(game))
					return
				}
				setCreatedGameFallback(onlyGame)
				setCreatedGameId(onlyGame.id)
				setIsDetailsOpen(true)
			}
		} catch {
			if (mounted.current) setSubmitError(t('game.createModal.createError'))
		} finally {
			submission.current = false
			if (mounted.current) setIsSubmitting(false)
		}
	}

	const renderStatusSelect = (row: GameRow) => (
		<select aria-label={t('game.details.fieldStatus')} value={row.statusId} onChange={(e) => updateRowStatus(row.id, e.target.value === '' ? '' : parseInt(e.target.value, 10))} className='add-game-row__status-select'>
			{statusOptions.length === 0 && <option value=''>{t('game.createModal.statusLoading')}</option>}
			{statusOptions.map((option) => (
				<option key={option.value} value={option.value}>
					{option.label}
				</option>
			))}
		</select>
	)

	const renderCheaperByExtra = (row: ManualGameRow | SteamGameRow) => {
		if (!row.showExtraFields) return null

		const handleCheaperByChange = (value: string) => {
			const cheaperBy = value === '' ? undefined : (value as CheaperBy)
			if (row.type === 'manual') updateManualRow(row.id, { cheaperBy })
			else updateSteamRow(row.id, { cheaperBy })
		}

		return (
			<div className='add-game-row__extra'>
				<div className='add-game-row__extra-field'>
					<label>{t('game.cheaperBy')}:</label>
					<select value={row.cheaperBy ?? ''} onChange={(e) => handleCheaperByChange(e.target.value)}>
						<option value=''>{t('common.none')}</option>
						<option value='key'>{t('game.cheaperByKey')}</option>
						<option value='store'>{t('game.cheaperByStore')}</option>
					</select>
				</div>
			</div>
		)
	}

	const renderSteamResults = (search: SteamSearchState, choose: (suggestion: SteamSuggestion) => void, rowId?: string) => {
		return (
			<div id={rowId ? `${rowId}-results` : undefined} className='steam-suggestions' role='group' aria-label={t('game.createModal.steamResults')}
				onKeyDown={event => {
					if (!gallery || !['ArrowDown', 'ArrowUp'].includes(event.key)) return
					const targets = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'))
					const index = targets.indexOf(document.activeElement as HTMLButtonElement)
					if (!targets.length || index < 0) return
					event.preventDefault()
					targets[(index + (event.key === 'ArrowDown' ? 1 : -1) + targets.length) % targets.length].focus()
				}}>
				<div className='steam-suggestions__header'>
					<span>{t('game.createModal.steamResults')}</span>
					{(search.loading || libraryLoading) && <span role='status'>{t('game.createModal.searchingSteam')}</span>}
				</div>

				{search.results.length === 0 && !search.loading && !search.error ? (
					<div className='steam-suggestions__empty' role='status'>{t('game.createModal.noSteamResults')}</div>
				) : (
					search.results.map((suggestion) => {
						const disabled = !!suggestion.gdbGameId || rows.some(row => row.type === 'steam' && row.appId === suggestion.appId)
						return (
							<button
								key={`${suggestion.source}-${suggestion.appId}`}
								type='button'
								className={`steam-suggestion${disabled ? ' steam-suggestion--disabled' : ''}`}
								onClick={() => choose(suggestion)}
								disabled={disabled}
								title={suggestion.gdbGameId ? t('game.createModal.alreadyInGdb', { name: suggestion.gdbGameName }) : disabled ? t('gallery.create.inBatch') : undefined}>
								<span className='steam-suggestion__image'>
									{suggestion.heroUrl || suggestion.coverUrl || suggestion.iconUrl ? (
										<img src={suggestion.heroUrl ?? suggestion.coverUrl ?? suggestion.iconUrl} alt='' loading='lazy' />
									) : (
										<img src={STEAM_ICON_URL} alt='' />
									)}
								</span>
								<span className='steam-suggestion__content'>
									<span className='steam-suggestion__name'>{suggestion.name}</span>
									<span className='steam-suggestion__meta'>
										<span className={`steam-source-badge steam-source-badge--${suggestion.source}`}>
											{suggestion.source === 'library' ? t('game.createModal.steamLibrary') : t('game.createModal.steamStore')}
										</span>
										{suggestion.playtimeForever != null && suggestion.playtimeForever > 0 && <span>{Math.round(suggestion.playtimeForever / 60)}h</span>}
										{suggestion.metascore != null && <span>{t('home.columns.critic')} {suggestion.metascore}/100</span>}
										{suggestion.price && <span>{suggestion.price}</span>}
										{disabled && <span>{t(suggestion.gdbGameId ? 'game.createModal.inGdb' : 'gallery.create.inBatch')}</span>}
									</span>
								</span>
							</button>
						)
					})
				)}

				{search.error && <div className='steam-suggestions__error' role='alert'>{search.error}<button type='button' className='gdb-text-button' onClick={() => setSearchRevision(value => value + 1)}>{t('gallery.common.retry')}</button></div>}
			</div>
		)
	}
	const renderSteamSuggestions = (row: ManualGameRow) => {
		const search = steamSearchByRowId[row.id]
		return isSteamLinked && row.steamSearchEnabled && row.name.trim().length >= 2 && search && (!gallery || activeSearchRowId === row.id) ? renderSteamResults(search, suggestion => selectSteamSuggestion(row, suggestion), row.id) : null
	}

	const renderManualRow = (row: ManualGameRow) => {
		const showNameError = touchedRows.has(row.id) && row.name.trim() === ''
		const isOnlyRow = rows.length <= 1

		return (
			<div key={row.id} className='add-game-row add-game-row--manual'>
				<div className={`add-game-row__main${isSteamLinked ? '' : ' add-game-row__main--no-steam'}`}>
					{isSteamLinked && (
						<button
							type='button'
							className={`add-game-row__steam-toggle${row.steamSearchEnabled ? ' add-game-row__steam-toggle--active' : ''}`}
							onClick={() => toggleSteamSearch(row)}
							aria-pressed={row.steamSearchEnabled}
							title={row.steamSearchEnabled ? t('game.createModal.steamSearchEnabled') : t('game.createModal.steamSearchDisabled')}>
							<img src={STEAM_ICON_URL} alt='Steam' />
						</button>
					)}
					<div className='add-game-row__name-field'>
						<input
							type='text'
							className='add-game-row__name-input'
							placeholder={t('game.titlePlaceholder')}
							value={row.name}
							autoFocus={row.id === lastAddedRowId}
							onChange={(e) => updateManualRow(row.id, { name: e.target.value, hasEditedName: true })}
							onBlur={() => markRowTouched(row.id, row.hasEditedName)}
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault()
									void handleBatchSubmit()
								}
							}}
						/>
					</div>

					{renderStatusSelect(row)}

					<button
						type='button'
						className='add-game-row__extra-toggle'
						onClick={() => toggleExtraFields(row.id)}
						title={row.showExtraFields ? t('game.createModal.hideExtra') : t('game.createModal.showExtra')}>
						{row.showExtraFields ? '-' : '+'}
					</button>

					<button
						type='button'
						className='add-game-row__delete'
						onClick={() => removeRow(row.id)}
						disabled={isOnlyRow}
						title={isOnlyRow ? t('game.cantDeleteOnlyRow') : t('game.deleteRow')}>
						×
					</button>
				</div>

				{renderSteamSuggestions(row)}

				{renderCheaperByExtra(row)}

				{showNameError && <div className='add-game-row__error'>{t('gallery.create.titleRequired')}</div>}
			</div>
		)
	}

	const renderSteamRow = (row: SteamGameRow) => (
		<div key={row.id} className='add-game-row add-game-row--steam'>
			<div className='add-game-row__steam-art'>
				{row.heroUrl || row.coverUrl || row.iconUrl ? <img src={row.heroUrl ?? row.coverUrl ?? row.iconUrl} alt='' loading='lazy' /> : <img src={STEAM_ICON_URL} alt='' />}
			</div>
			<div className='add-game-row__steam-info'>
				<div className='add-game-row__steam-title'>
					<img src={STEAM_ICON_URL} alt='' />
					<span>{row.name}</span>
				</div>
				<div className='add-game-row__steam-meta'>
					<span className={`steam-source-badge steam-source-badge--${row.source}`}>
						{row.source === 'library' ? t('game.createModal.steamLibrary') : t('game.createModal.steamStore')}
					</span>
					<span>App {row.appId}</span>
					{row.playtimeForever != null && row.playtimeForever > 0 && <span>{Math.round(row.playtimeForever / 60)}h</span>}
					{row.metascore != null && <span>{row.metascore}</span>}
					{row.price && <span>{row.price}</span>}
				</div>
			</div>
			{renderStatusSelect(row)}
			<button
				type='button'
				className='add-game-row__extra-toggle'
				onClick={() => toggleExtraFields(row.id)}
				title={row.showExtraFields ? t('game.createModal.hideExtra') : t('game.createModal.showExtra')}>
				{row.showExtraFields ? '-' : '+'}
			</button>
			<button type='button' className='add-game-row__delete' onClick={() => removeRow(row.id)} title={t('game.deleteRow')}>
				×
			</button>
			{renderCheaperByExtra(row)}
		</div>
	)

	useImperativeHandle(ref, () => ({ open: openAddGameModal }))
	const pendingCount = rows.filter(row => !savedRows.current.has(row.id)).length
	const retrying = rows.some(row => outcomes[row.id]?.state === 'error')
	const galleryContent = (
		<form
			id='gdb-create-game-form'
			className='gdb-form'
			aria-busy={isSubmitting}
			onSubmit={(event) => {
				event.preventDefault()
				void handleBatchSubmit()
			}}>
			{catalogError && <div className='gdb-error' role='alert'>{t('gallery.create.catalogFailed')}<button type='button' className='gdb-text-button' disabled={catalogLoading || isSubmitting} onClick={() => void getStatusOptions()}>{t('gallery.common.retry')}</button></div>}
			{submitError && (
				<p className='gdb-error' role='alert'>
					{submitError}
				</p>
			)}
			<div className='gdb-create-rows'>{rows.map((row, index) => {
				const saved = outcomes[row.id]?.state === 'saved'
				const steamEnabled = row.type === 'steam' || row.steamSearchEnabled
				const searchVisible = row.type === 'manual' && row.steamSearchEnabled && activeSearchRowId === row.id && row.name.trim().length >= 2 && !!steamSearchByRowId[row.id]
				return <fieldset disabled={isSubmitting} key={row.id} className={`gdb-create-row${saved ? ' is-saved' : ''}`}
					onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setActiveSearchRowId(current => current === row.id ? null : current) }}
					onKeyDown={event => {
						if (event.key === 'Escape' && searchVisible) { event.preventDefault(); event.stopPropagation(); document.getElementById(`${row.id}-name`)?.focus(); setActiveSearchRowId(null) }
					}}>
					<legend className='sr-only'>{t('gallery.create.row', { number: index + 1 })}</legend>
					<div className='gdb-create-row__main'>
						{saved ? <>
							<span className='gdb-create-row__saved'><CollectionIcon name='check' /><span className='sr-only'>{t('gallery.create.added')}</span></span>
							<div className='gdb-create-saved'><strong>{row.name}</strong>{outcomes[row.id]?.message && <span>{outcomes[row.id].message}</span>}</div>
						</> : <>
							{isSteamLinked && <button id={`${row.id}-source`} type='button' className='gdb-icon-button gdb-create-source'
								ref={row.type === 'steam' && row.id === focusTargetRowId ? node => { initialTitleFocus.current = node } : undefined}
								aria-label={t(row.type === 'steam' ? 'gallery.create.manual' : 'gallery.create.searchSteam')}
								aria-pressed={steamEnabled}
								title={t(row.type === 'steam' ? 'gallery.create.manual' : row.steamSearchEnabled ? 'game.createModal.steamSearchEnabled' : 'game.createModal.steamSearchDisabled')}
								disabled={row.type === 'steam' && importedRows.current.has(row.id)}
								onClick={() => row.type === 'manual' ? toggleSteamSearch(row) : unlinkSteamRow(row)}>
								<img src={STEAM_ICON_URL} alt='' width={24} height={24} />{steamEnabled && <CollectionIcon name='check' />}
							</button>}
							{row.type === 'manual' ? <label className='gdb-create-title-field'>
								<span className='sr-only'>{t('gallery.create.titleLabel')}</span>
								<input id={`${row.id}-name`} className='gdb-create-name' autoComplete='off' autoFocus={row.id === focusTargetRowId} ref={row.id === focusTargetRowId ? node => { initialTitleFocus.current = node } : undefined} value={row.name} onFocus={() => setActiveSearchRowId(row.id)} onChange={event => { updateManualRow(row.id, { name: event.target.value, hasEditedName: true }); setActiveSearchRowId(row.id) }} placeholder={t('game.titlePlaceholder')} required pattern='.*\S.*' maxLength={500} onBlur={() => markRowTouched(row.id, row.hasEditedName)} onInvalid={() => markRowTouched(row.id)} aria-invalid={touchedRows.has(row.id) && !row.name.trim() || undefined} aria-describedby={row.steamSearchEnabled ? `${row.id}-steam-help` : undefined} aria-controls={searchVisible ? `${row.id}-results` : undefined}
									onKeyDown={event => { if (event.key === 'ArrowDown' && searchVisible) { const result = document.getElementById(`${row.id}-results`)?.querySelector<HTMLButtonElement>('button:not(:disabled)'); if (result) { event.preventDefault(); result.focus() } } }} />
							</label> : <strong className='gdb-create-steam-title' title={row.name}>{row.name}</strong>}
							{row.type === 'manual' && row.steamSearchEnabled && <span id={`${row.id}-steam-help`} className='sr-only'>{t('gallery.create.steamHelp')}</span>}
							<button type='button' className='gdb-icon-button gdb-create-options-toggle' aria-label={t('gallery.create.rowOptions', { number: index + 1 })} title={t('gallery.create.moreOptions')} aria-expanded={!!row.showExtraFields} aria-controls={`${row.id}-options`} onClick={() => { toggleExtraFields(row.id); setActiveSearchRowId(null) }}><CollectionIcon name='down' /></button>
						</>}
						{rows.length > 1 && <button type='button' className='gdb-icon-button gdb-create-remove' aria-label={t('gallery.create.removeRow', { number: index + 1 })} onClick={() => removeRow(row.id)}><CollectionIcon name='close' /></button>}
					</div>
					{!saved && <>
						{row.type === 'manual' && renderSteamSuggestions(row)}
						<div id={`${row.id}-options`} className='gdb-create-options' hidden={!row.showExtraFields}>
							{row.type === 'manual' ? <label>{t('game.details.fieldPlatform')}<select value={row.platformId ?? ''} onChange={event => updateManualRow(row.id, { platformId: event.target.value ? Number(event.target.value) : undefined })}><option value=''>{t('gallery.create.unspecified')}</option>{platforms.map(platform => <option key={platform.id} value={platform.id}>{platform.name}</option>)}</select></label> : <div className='gdb-create-steam-identity'>{(row.heroUrl || row.coverUrl) && <img src={row.heroUrl ?? row.coverUrl} alt='' />}<span>{t(row.source === 'library' ? 'game.createModal.steamLibrary' : 'game.createModal.steamStore')}<small>Steam · App {row.appId}</small></span></div>}
							<label>{t('game.details.fieldStatus')}{renderStatusSelect(row)}</label>
							<label className='gdb-create-price'>{t('game.cheaperBy')}<select value={row.cheaperBy ?? ''} onChange={event => row.type === 'manual' ? updateManualRow(row.id, { cheaperBy: event.target.value ? event.target.value as CheaperBy : undefined }) : updateSteamRow(row.id, { cheaperBy: event.target.value ? event.target.value as CheaperBy : undefined })}><option value=''>{t('common.none')}</option><option value='key'>{t('game.cheaperByKey')}</option><option value='store'>{t('game.cheaperByStore')}</option></select></label>
						</div>
						{row.type === 'manual' && touchedRows.has(row.id) && !row.name.trim() && <p className='gdb-error'>{t('gallery.create.titleRequired')}</p>}
						{outcomes[row.id]?.state === 'error' && <p className='gdb-error' role='alert'>{outcomes[row.id].message}</p>}
						{outcomes[row.id]?.state === 'saving' && <p className='gdb-create-row__status' role='status'>{t('game.adding')}</p>}
					</>}
				</fieldset>
			})}</div>
			<button type='button' className='gdb-text-button gdb-create-add-row' disabled={isSubmitting} onClick={addRow}>
				<CollectionIcon name='plus' />
				{t('game.addAnotherRow')}
			</button>
			<label className='gdb-check-label gdb-create-autofill'><input type='checkbox' checked={autofillAfterImport} disabled={isSubmitting || !metadata?.openBatch} aria-describedby={autofillAfterImport ? autofillHelpId : undefined} onChange={event => setAutofillAfterImport(event.target.checked)} />{t('metadata.batch.autoAfterImport')}</label>
			{autofillAfterImport && <p id={autofillHelpId} className='gdb-hint gdb-create-autofill-help'>{t('metadata.batch.afterImportHelp')}</p>}
		</form>
	)

	return (
		<>
			{isModalOpen &&
				(gallery ? (
					<CollectionSheet
						open
						onClose={() => !isSubmitting && closeModal()}
						title={t('game.addGame')}
						className='gdb-create-game-sheet'
						initialFocusRef={initialTitleFocus}
						closeDisabled={isSubmitting}
						footer={
							<>
								<button type='button' className='gdb-button' disabled={isSubmitting} onClick={closeModal}>
									{t('common.cancel')}
								</button>
									<button type='submit' form='gdb-create-game-form' className='gdb-button gdb-button--primary' disabled={isSubmitting || catalogLoading || catalogError}>
									{isSubmitting ? t('game.adding') : retrying ? t('gallery.create.retryRemaining', { count: pendingCount }) : pendingCount === 0 ? t('gallery.common.done') : pendingCount === 1 ? t('game.addGame') : t('game.addGamesCount', { count: pendingCount })}
									<CollectionIcon name='plus' />
								</button>
							</>
						}>
						{galleryContent}
					</CollectionSheet>
				) : (
					<Modal isOpen={isModalOpen} onClose={closeModal} title={t('game.addGames')} bodyPadding='0' hideBorders={true} headerPaddingBottom='14px' maxWidth='820px'>
						<div className='create-game-modal'>
							{submitError && <div className='create-game-modal__error'>{submitError}</div>}
							<div className='create-game-modal__rows'>{rows.map((row) => (row.type === 'steam' ? renderSteamRow(row) : renderManualRow(row)))}</div>

							<div className='create-game-modal__actions'>
								<button type='button' className='create-game-modal__add-row' onClick={addRow} title={t('game.addAnotherRow')}>
									+
								</button>
								<button type='button' className='create-game-modal__submit' onClick={handleBatchSubmit} disabled={isSubmitting}>
									{isSubmitting ? t('game.adding') : rows.length === 1 ? t('game.addGame') : t('game.addGamesCount', { count: rows.length })}
								</button>
							</div>
						</div>
					</Modal>
				))}

			{isDetailsOpen &&
				(storeCreatedGame || createdGameFallback) &&
				(gallery ? (
					<CollectionGameDetails
						game={storeCreatedGame || createdGameFallback!}
						closeDetails={() => {
							setIsDetailsOpen(false)
							setCreatedGameFallback(null)
							setCreatedGameId(null)
						}}
						onDelete={(game) => setDeleteTarget(game)}
					/>
				) : (
					<GameDetails
						game={storeCreatedGame || createdGameFallback!}
						closeDetails={() => {
							setIsDetailsOpen(false)
							setCreatedGameFallback(null)
							setCreatedGameId(null)
						}}
						onDelete={(game) => setDeleteTarget(game)}
					/>
				))}

			<ConfirmDialog
				isOpen={deleteTarget !== null}
				title={t('common.confirmDeleteTitle')}
				message={t('home.confirmDeleteGame')}
				variant='danger'
				confirmLabel={t('common.delete')}
				onConfirm={confirmDeleteCreatedGame}
				onCancel={() => setDeleteTarget(null)}
			/>

			{renderTrigger ? (
				renderTrigger(openAddGameModal)
			) : (
				<button className={className ?? 'home-component__add-button'} onClick={openAddGameModal} aria-label={t('game.addGame')}>
					<svg
						width='14'
						height='14'
						viewBox='0 0 24 24'
						fill='none'
						stroke='currentColor'
						strokeWidth='2'
						strokeLinecap='round'
						strokeLinejoin='round'
						aria-hidden='true'
						style={{ flexShrink: 0 }}>
						<rect x='1' y='5' width='22' height='14' rx='4' />
						<path d='M8 9v6M5 12h6' />
						<circle cx='16' cy='10' r='1.2' fill='currentColor' stroke='none' />
						<circle cx='19' cy='12' r='1.2' fill='currentColor' stroke='none' />
						<circle cx='16' cy='14' r='1.2' fill='currentColor' stroke='none' />
						<circle cx='13' cy='12' r='1.2' fill='currentColor' stroke='none' />
					</svg>
					<span className='add-game-label'>{t('game.addGame')}</span>
				</button>
			)}
		</>
	)
})

OwnedCreateGame.displayName = 'OwnedCreateGame'

const CreateGame = forwardRef<CreateGameHandle, CreateGameProps>((props, ref) => {
	const ownerId = useAppSelector(state => state.auth.user?.id)
	return <OwnedCreateGame key={ownerId ?? 'anonymous'} ref={ref} {...props} />
})
CreateGame.displayName = 'CreateGame'

export default CreateGame
