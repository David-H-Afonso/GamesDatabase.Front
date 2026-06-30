import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Game, GameCreateDto } from '@/models/api/Game'
import { Modal, GameDetails } from '@/components/elements'
import { useGames } from '@/hooks/useGames'
import { useGameStatus } from '@/hooks'
import { steamService } from '@/services'
import type { SteamImportedGame, SteamLibraryGame, SteamStoreSearchResult } from '@/services/SteamService/SteamService'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { selectGameById } from '@/store/features/games'
import { triggerGamesRefresh } from '@/store/features/games/gamesSlice'
import { fetchSteamLibrary, importSteamGames } from '@/store/features/steam/steamSlice'
import './CreateGame.scss'

const STEAM_ICON_URL = 'https://store.steampowered.com/favicon.ico'
const STEAM_SEARCH_DEBOUNCE_MS = 350
const MAX_STEAM_RESULTS = 6
const MAX_LIBRARY_RESULTS = 3

type CheaperBy = 'key' | 'store'
type RowStatusId = number | ''

type ManualGameRow = {
	id: string
	type: 'manual'
	name: string
	statusId: RowStatusId
	cheaperBy?: CheaperBy
	hasEditedName?: boolean
	showExtraFields?: boolean
	steamSearchEnabled: boolean
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
	coverUrl?: string
	iconUrl?: string
	price?: string
	metascore?: number
	playtimeForever?: number
}

type GameRow = ManualGameRow | SteamGameRow

type SteamSuggestion = {
	appId: number
	name: string
	source: 'library' | 'store'
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
	type: 'manual',
	name: '',
	statusId,
	hasEditedName: false,
	showExtraFields: false,
	steamSearchEnabled,
})

const getSteamHeaderImageUrl = (appId: number) => `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`

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
			coverUrl: getSteamHeaderImageUrl(game.appId),
			iconUrl: game.iconUrl,
			playtimeForever: game.playtimeForever,
			gdbGameId: game.gdbGameId,
			gdbGameName: game.gdbGameName,
		}))
}

const applyStoreCoversToLibrarySuggestions = (librarySuggestions: SteamSuggestion[], storeResults: SteamStoreSearchResult[]) => {
	const storeCoverByAppId = new Map(storeResults.filter((game) => game.coverUrl).map((game) => [game.appId, game.coverUrl]))
	return librarySuggestions.map((suggestion) => ({
		...suggestion,
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
				coverUrl: game.coverUrl,
				iconUrl: game.coverUrl,
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
	className?: string
	renderTrigger?: (open: () => void) => ReactNode
}

const CreateGame = forwardRef<CreateGameHandle, CreateGameProps>(({ className, renderTrigger }, ref) => {
	const { t } = useTranslation()
	const dispatch = useAppDispatch()
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [submitError, setSubmitError] = useState<string | null>(null)
	const [createdGameId, setCreatedGameId] = useState<number | null>(null)
	const [createdGameFallback, setCreatedGameFallback] = useState<Game | null>(null)
	const [isDetailsOpen, setIsDetailsOpen] = useState(false)
	const [lastAddedRowId, setLastAddedRowId] = useState<string | null>(null)
	const [lastSteamSearchEnabled, setLastSteamSearchEnabled] = useState(false)
	const [touchedRows, setTouchedRows] = useState<Set<string>>(new Set())
	const [steamSearchByRowId, setSteamSearchByRowId] = useState<Record<string, SteamSearchState>>({})
	const searchSequenceByRowId = useRef<Record<string, number>>({})

	const authUser = useAppSelector((state) => state.auth.user)
	const isSteamLinked = !!authUser?.steamId
	const { library, libraryLoading } = useAppSelector((state) => state.steam)
	const storeCreatedGame = useAppSelector((state) => (createdGameId ? selectGameById(createdGameId)(state) : undefined))
	const { createNewGame, deleteGameById, fetchGameDetails, bulkUpdateGamesById } = useGames()
	const { fetchActiveStatusList, fetchSpecialStatusList } = useGameStatus()

	const [statusOptions, setStatusOptions] = useState<{ value: number; label: string }[]>([])
	const [defaultStatusId, setDefaultStatusId] = useState<number | undefined>(undefined)
	const [rows, setRows] = useState<GameRow[]>(() => [createManualRow('')])

	useEffect(() => {
		if (storeCreatedGame) {
			setCreatedGameFallback(storeCreatedGame)
		}
	}, [storeCreatedGame])

	const getStatusOptions = async () => {
		try {
			const statusList = await fetchActiveStatusList()
			const specialStatusList = await fetchSpecialStatusList()
			const options = statusList?.map((status) => ({ value: status.id, label: status.name })) ?? []
			setStatusOptions(options)

			const notFulfilled = specialStatusList?.find((status) => status.statusType === 'NotFulfilled')
			const fallbackStatusId =
				notFulfilled?.id ?? (options.find((option) => option.value === 8)?.value || (options.length > 0 ? Math.min(...options.map((option) => option.value)) : undefined))
			setDefaultStatusId(fallbackStatusId)
			return options
		} catch (err) {
			console.error('Error fetching status options:', err)
			return []
		}
	}

	useEffect(() => {
		void getStatusOptions()
	}, [])

	useEffect(() => {
		if (defaultStatusId == null) return
		setRows((currentRows) => currentRows.map((row) => (row.statusId === '' ? { ...row, statusId: defaultStatusId } : row)))
	}, [defaultStatusId])

	useEffect(() => {
		if (isModalOpen && isSteamLinked) {
			void dispatch(fetchSteamLibrary())
		}
	}, [dispatch, isModalOpen, isSteamLinked])

	const rowsSearchKey = useMemo(
		() => rows.map((row) => (row.type === 'manual' ? `${row.id}:${row.name}:${row.steamSearchEnabled}` : `${row.id}:steam:${row.appId}`)).join('|'),
		[rows]
	)

	useEffect(() => {
		if (!isModalOpen || !isSteamLinked) {
			setSteamSearchByRowId({})
			return
		}

		const timers = rows
			.filter((row): row is ManualGameRow => row.type === 'manual')
			.map((row) => {
				const query = row.name.trim()
				if (!row.steamSearchEnabled || query.length < 2) {
					setSteamSearchByRowId((current) => {
						const next = { ...current }
						delete next[row.id]
						return next
					})
					return null
				}

				return window.setTimeout(async () => {
					const requestId = (searchSequenceByRowId.current[row.id] ?? 0) + 1
					searchSequenceByRowId.current[row.id] = requestId

					const selectedAppIds = new Set(rows.filter((candidate): candidate is SteamGameRow => candidate.type === 'steam').map((candidate) => candidate.appId))
					const librarySuggestions = getLibrarySuggestions(library, query, selectedAppIds)

					setSteamSearchByRowId((current) => ({
						...current,
						[row.id]: { loading: true, query, results: librarySuggestions },
					}))

					try {
						const storeResults = await steamService.searchStore(query)
						if (searchSequenceByRowId.current[row.id] !== requestId) return

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
					} catch (error) {
						if (searchSequenceByRowId.current[row.id] !== requestId) return
						setSteamSearchByRowId((current) => ({
							...current,
							[row.id]: {
								loading: false,
								query,
								results: librarySuggestions,
								error: error instanceof Error ? error.message : t('game.createModal.steamSearchError'),
							},
						}))
					}
				}, STEAM_SEARCH_DEBOUNCE_MS)
			})

		return () => {
			timers.forEach((timer) => {
				if (timer) window.clearTimeout(timer)
			})
		}
	}, [isModalOpen, isSteamLinked, library, rowsSearchKey, t])

	const resetRows = () => {
		const row = createManualRow(defaultStatusId ?? '', lastSteamSearchEnabled)
		setRows([row])
		setLastAddedRowId(row.id)
		setTouchedRows(new Set())
		setSteamSearchByRowId({})
		setSubmitError(null)
	}

	const openAddGameModal = () => {
		resetRows()
		setIsModalOpen(true)
	}

	const closeModal = () => {
		setIsModalOpen(false)
		setIsSubmitting(false)
		resetRows()
	}

	const addRow = () => {
		const newRow = createManualRow(defaultStatusId ?? '', lastSteamSearchEnabled)
		setRows((currentRows) => [...currentRows, newRow])
		setLastAddedRowId(newRow.id)
	}

	const removeRow = (rowId: string) => {
		setRows((currentRows) => {
			const nextRows = currentRows.filter((row) => row.id !== rowId)
			return nextRows.length > 0 ? nextRows : [createManualRow(defaultStatusId ?? '', lastSteamSearchEnabled)]
		})
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
		setLastSteamSearchEnabled(nextEnabled)
		updateManualRow(row.id, { steamSearchEnabled: nextEnabled })

		if (!nextEnabled) {
			setSteamSearchByRowId((current) => {
				const next = { ...current }
				delete next[row.id]
				return next
			})
		}
	}

	const selectSteamSuggestion = (row: ManualGameRow, suggestion: SteamSuggestion) => {
		if (suggestion.gdbGameId) return

		const selectedRow: SteamGameRow = {
			id: row.id,
			type: 'steam',
			appId: suggestion.appId,
			name: suggestion.name,
			statusId: getValidStatusId(row.statusId, defaultStatusId) ?? '',
			cheaperBy: row.cheaperBy,
			showExtraFields: row.showExtraFields,
			source: suggestion.source,
			coverUrl: suggestion.coverUrl,
			iconUrl: suggestion.iconUrl,
			price: suggestion.price,
			metascore: suggestion.metascore,
			playtimeForever: suggestion.playtimeForever,
		}

		setRows((currentRows) => {
			return currentRows.map((candidate) => (candidate.id === row.id ? selectedRow : candidate))
		})
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

		await Promise.all(
			Array.from(updatesByPatch.values()).map((patch) =>
				bulkUpdateGamesById({
					gameIds: patch.gameIds,
					statusId: patch.statusId,
					...(patch.isCheaperByKey !== undefined ? { isCheaperByKey: patch.isCheaperByKey } : {}),
				})
			)
		)
	}

	const handleBatchSubmit = async () => {
		try {
			setIsSubmitting(true)
			setSubmitError(null)

			const manualRows = rows.filter((row): row is ManualGameRow => row.type === 'manual' && row.name.trim() !== '')
			const steamRows = rows.filter((row): row is SteamGameRow => row.type === 'steam')

			if (manualRows.length === 0 && steamRows.length === 0) {
				setTouchedRows(new Set(rows.filter((row) => row.type === 'manual').map((row) => row.id)))
				setIsSubmitting(false)
				return
			}

			const rowsWithoutStatus = [...manualRows, ...steamRows].filter((row) => !getValidStatusId(row.statusId, defaultStatusId))
			if (rowsWithoutStatus.length > 0) {
				setSubmitError(t('game.createModal.statusRequired'))
				setIsSubmitting(false)
				return
			}

			const manualPayloads: GameCreateDto[] = manualRows.map((row) => ({
				name: row.name.trim(),
				statusId: getValidStatusId(row.statusId, defaultStatusId)!,
				isCheaperByKey: mapCheaperByToBoolean(row.cheaperBy),
			}))

			const createdGames: Game[] = []
			const errors: string[] = []

			const manualResults = await Promise.allSettled(manualPayloads.map((payload) => createNewGame(payload)))
			manualResults.forEach((result) => {
				if (result.status === 'fulfilled') createdGames.push(result.value as Game)
				else errors.push(result.reason instanceof Error ? result.reason.message : t('game.createModal.createError'))
			})

			let importedGameIds: number[] = []
			if (steamRows.length > 0) {
				try {
					const importResult = await dispatch(
						importSteamGames({
							games: steamRows.map((row) => ({
								appId: row.appId,
								logoUrl: row.source === 'library' ? (row.iconUrl ?? row.coverUrl) : undefined,
								coverUrl: row.coverUrl,
							})),
							createMissing: true,
						})
					).unwrap()
					const importedGames = importResult.importedGames ?? []
					await applySteamPostImportUpdates(steamRows, importedGames)
					importedGameIds = importedGames.map((game) => game.gdbGameId).filter((id): id is number => id != null)
					dispatch(triggerGamesRefresh())
					void dispatch(fetchSteamLibrary())
				} catch (error) {
					errors.push(error instanceof Error ? error.message : t('game.createModal.steamImportError'))
				}
			}

			const totalSucceeded = createdGames.length + importedGameIds.length
			if (totalSucceeded === 0) {
				setSubmitError(errors[0] ?? t('game.createModal.createError'))
				setIsSubmitting(false)
				return
			}

			const uniqueImportedIds = Array.from(new Set(importedGameIds))
			if (createdGames.length + uniqueImportedIds.length === 1) {
				const createdGame = createdGames[0] ?? ((await fetchGameDetails(uniqueImportedIds[0])) as Game)
				closeModal()
				setCreatedGameFallback(createdGame)
				setCreatedGameId(createdGame.id)
				setIsDetailsOpen(true)
			} else {
				closeModal()
				dispatch(triggerGamesRefresh())
			}
		} catch (err) {
			setSubmitError(err instanceof Error ? err.message : t('game.createModal.createError'))
		} finally {
			setIsSubmitting(false)
		}
	}

	const renderStatusSelect = (row: GameRow) => (
		<select value={row.statusId} onChange={(e) => updateRowStatus(row.id, e.target.value === '' ? '' : parseInt(e.target.value, 10))} className='add-game-row__status-select'>
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

	const renderSteamSuggestions = (row: ManualGameRow) => {
		const search = steamSearchByRowId[row.id]
		const hasSearchText = row.name.trim().length >= 2
		if (!isSteamLinked || !row.steamSearchEnabled || !hasSearchText || !search) return null

		return (
			<div className='steam-suggestions' role='listbox'>
				<div className='steam-suggestions__header'>
					<span>{t('game.createModal.steamResults')}</span>
					{(search.loading || libraryLoading) && <span>{t('game.createModal.searchingSteam')}</span>}
				</div>

				{search.results.length === 0 && !search.loading ? (
					<div className='steam-suggestions__empty'>{t('game.createModal.noSteamResults')}</div>
				) : (
					search.results.map((suggestion) => {
						const disabled = !!suggestion.gdbGameId
						return (
							<button
								key={`${suggestion.source}-${suggestion.appId}`}
								type='button'
								className={`steam-suggestion${disabled ? ' steam-suggestion--disabled' : ''}`}
								onClick={() => selectSteamSuggestion(row, suggestion)}
								disabled={disabled}
								title={disabled ? t('game.createModal.alreadyInGdb', { name: suggestion.gdbGameName }) : undefined}>
								<span className='steam-suggestion__image'>
									{suggestion.coverUrl || suggestion.iconUrl ? <img src={suggestion.coverUrl ?? suggestion.iconUrl} alt='' loading='lazy' /> : <img src={STEAM_ICON_URL} alt='' />}
								</span>
								<span className='steam-suggestion__content'>
									<span className='steam-suggestion__name'>{suggestion.name}</span>
									<span className='steam-suggestion__meta'>
										<span className={`steam-source-badge steam-source-badge--${suggestion.source}`}>
											{suggestion.source === 'library' ? t('game.createModal.steamLibrary') : t('game.createModal.steamStore')}
										</span>
										{suggestion.playtimeForever != null && suggestion.playtimeForever > 0 && <span>{Math.round(suggestion.playtimeForever / 60)}h</span>}
										{suggestion.metascore != null && <span>{suggestion.metascore}</span>}
										{suggestion.price && <span>{suggestion.price}</span>}
										{disabled && <span>{t('game.createModal.inGdb')}</span>}
									</span>
								</span>
							</button>
						)
					})
				)}

				{search.error && <div className='steam-suggestions__error'>{search.error}</div>}
			</div>
		)
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

				{showNameError && <div className='add-game-row__error'>Required</div>}
			</div>
		)
	}

	const renderSteamRow = (row: SteamGameRow) => (
		<div key={row.id} className='add-game-row add-game-row--steam'>
			<div className='add-game-row__steam-art'>
				{row.coverUrl || row.iconUrl ? <img src={row.coverUrl ?? row.iconUrl} alt='' loading='lazy' /> : <img src={STEAM_ICON_URL} alt='' />}
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

	return (
		<>
			{isModalOpen && (
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
			)}

			{isDetailsOpen && (storeCreatedGame || createdGameFallback) && (
				<GameDetails
					game={storeCreatedGame || createdGameFallback!}
					closeDetails={() => {
						setIsDetailsOpen(false)
						setCreatedGameFallback(null)
						setCreatedGameId(null)
					}}
					onDelete={async (game) => {
						if (!window.confirm(t('home.confirmDeleteGame'))) return
						await deleteGameById(game.id)
						setIsDetailsOpen(false)
						setCreatedGameFallback(null)
						setCreatedGameId(null)
					}}
				/>
			)}

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

CreateGame.displayName = 'CreateGame'

export default CreateGame
