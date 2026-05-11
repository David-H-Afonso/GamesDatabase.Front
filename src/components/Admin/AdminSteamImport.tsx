import { useEffect, useState, useRef, useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchSteamLibrary, importSteamGames, clearLastImportResult } from '@/store/features/steam/steamSlice'
import { steamService, type SteamMatchSuggestion, type SteamStoreSearchResult } from '@/services/SteamService/SteamService'
import { getGames } from '@/services/GamesService/GamesService'
import type { Game } from '@/models/api/Game'
import './AdminSteamImport.scss'

type ImportAction = 'create' | 'skip' | 'link'
type ActiveTab = 'library' | 'suggestions' | 'store'

interface LinkTarget {
	gameId: number
	gameName: string
}

export const AdminSteamImport = () => {
	const dispatch = useAppDispatch()
	const authUser = useAppSelector((state) => state.auth.user)
	const { library, libraryLoading, importLoading, lastImportResult, error } = useAppSelector((state) => state.steam)

	const [rowActions, setRowActions] = useState<Map<number, ImportAction>>(new Map())
	const [linkTargets, setLinkTargets] = useState<Map<number, LinkTarget>>(new Map())
	const [filterUnmatched, setFilterUnmatched] = useState(false)
	const [linkLoading, setLinkLoading] = useState(false)
	const [linkResults, setLinkResults] = useState<{ linked: number; errors: string[] } | null>(null)
	const [activeTab, setActiveTab] = useState<ActiveTab>('library')
	const [suggestions, setSuggestions] = useState<SteamMatchSuggestion[]>([])
	const [suggestionsLoading, setSuggestionsLoading] = useState(false)
	const [suggestionsError, setSuggestionsError] = useState<string | null>(null)
	const [librarySearch, setLibrarySearch] = useState('')
	const [suggestionSearch, setSuggestionSearch] = useState('')
	const [selectedSuggestionIds, setSelectedSuggestionIds] = useState<Set<number>>(new Set())

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
		}
		return () => {
			dispatch(clearLastImportResult())
		}
	}, [dispatch, isSteamLinked])

	useEffect(() => {
		if (isSteamLinked && activeTab === 'suggestions') {
			loadSuggestions()
		}
	}, [isSteamLinked, activeTab])

	const loadSuggestions = async () => {
		setSuggestionsLoading(true)
		setSuggestionsError(null)
		setSelectedSuggestionIds(new Set())
		try {
			const data = await steamService.getMatchSuggestions()
			setSuggestions(data)
		} catch (e) {
			setSuggestionsError(e instanceof Error ? e.message : 'Error cargando sugerencias')
		} finally {
			setSuggestionsLoading(false)
		}
	}

	const handleLinkSuggestion = async (suggestion: SteamMatchSuggestion) => {
		try {
			await steamService.linkGame(suggestion.steamAppId, suggestion.gdbGameId)
			setSuggestions((prev) => prev.filter((s) => s.steamAppId !== suggestion.steamAppId))
			setSelectedSuggestionIds((prev) => {
				const s = new Set(prev)
				s.delete(suggestion.steamAppId)
				return s
			})
			await dispatch(fetchSteamLibrary())
		} catch {
			// ignore
		}
	}

	const handleBulkLinkSuggestions = async () => {
		const toLink = filteredSuggestions.filter((s) => selectedSuggestionIds.has(s.steamAppId))
		for (const s of toLink) {
			try {
				await steamService.linkGame(s.steamAppId, s.gdbGameId)
				setSuggestions((prev) => prev.filter((x) => x.steamAppId !== s.steamAppId))
			} catch {
				/* ignore individual errors */
			}
		}
		setSelectedSuggestionIds(new Set())
		await dispatch(fetchSteamLibrary())
	}

	const handleBulkDismissSuggestions = () => {
		setSuggestions((prev) => prev.filter((s) => !selectedSuggestionIds.has(s.steamAppId)))
		setSelectedSuggestionIds(new Set())
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
			alert('No hay juegos seleccionados para importar o vincular')
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
					errors.push(`Error vinculando ${game.name} a ${target.gameName}`)
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

	const filteredLibrary = library.filter((g) => !filterUnmatched || !g.gdbGameId).filter((g) => !librarySearch.trim() || g.name.toLowerCase().includes(librarySearch.toLowerCase()))

	const filteredSuggestions = suggestions.filter(
		(s) => !suggestionSearch.trim() || s.steamName.toLowerCase().includes(suggestionSearch.toLowerCase()) || s.gdbGameName.toLowerCase().includes(suggestionSearch.toLowerCase())
	)

	const toCreateCount = library.filter((g) => getAction(g.appId) === 'create').length
	const toLinkCount = library.filter((g) => getAction(g.appId) === 'link' && linkTargets.has(g.appId)).length
	const totalActionCount = toCreateCount + toLinkCount

	if (!isSteamLinked) {
		return (
			<div className='admin-steam-import'>
				<h1>Importar biblioteca de Steam</h1>
				<p>Primero debes conectar tu cuenta de Steam en la sección de Steam Integration.</p>
			</div>
		)
	}

	return (
		<div className='admin-steam-import'>
			<h1>Importar biblioteca de Steam</h1>

			<div className='import-tabs'>
				<button className={`tab-btn${activeTab === 'library' ? ' tab-btn--active' : ''}`} onClick={() => setActiveTab('library')}>
					Biblioteca
				</button>
				<button className={`tab-btn${activeTab === 'suggestions' ? ' tab-btn--active' : ''}`} onClick={() => setActiveTab('suggestions')}>
					Sugerencias de vinculación
				</button>
				<button className={`tab-btn${activeTab === 'store' ? ' tab-btn--active' : ''}`} onClick={() => setActiveTab('store')}>
					Buscar en Steam
				</button>
			</div>

			{error && <div className='alert alert--error'>{error}</div>}

			{activeTab === 'store' ? (
				<div className='store-search-view'>
					<p className='store-search-hint'>Busca juegos en la tienda de Steam para añadirlos a GDB aunque no los tengas comprados.</p>
					<input className='search-input' type='text' placeholder='Buscar juego en Steam...' value={storeQuery} onChange={handleStoreQueryChange} autoFocus />
					{storeLoading && <p className='store-loading'>Buscando...</p>}
					{!storeLoading && storeSearched && storeResults.length === 0 && <p className='store-no-results'>No se encontraron resultados para &quot;{storeQuery}&quot;.</p>}
					{storeResults.length > 0 && (
						<div className='store-results-grid'>
							{storeResults.map((game) => {
								const addedState = storeAdded.get(game.appId)
								const isAdding = storeAdding.has(game.appId)
								const alreadyInLibrary = libraryAppIds.has(game.appId)
								const inGdb = addedState === 'created' || alreadyInLibrary || addedState === 'exists'
								return (
									<div key={game.appId} className={`store-card${inGdb ? ' store-card--added' : ''}`}>
										<div className='store-card-cover'>{game.coverUrl && <img src={game.coverUrl} alt={game.name} loading='lazy' />}</div>
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
													<span className='store-card-price store-card-price--free'>Gratis</span>
												)}
											</div>
										</div>
										<div className='store-card-action'>
											{inGdb ? (
												<span className='badge badge--exists'>En GDB</span>
											) : addedState === 'error' ? (
												<button className='btn btn-secondary btn-sm' onClick={() => handleAddStoreGame(game.appId)}>
													Reintentar
												</button>
											) : (
												<button className='btn btn-primary btn-sm' onClick={() => handleAddStoreGame(game.appId)} disabled={isAdding}>
													{isAdding ? '...' : 'Añadir'}
												</button>
											)}
										</div>
									</div>
								)
							})}
						</div>
					)}
				</div>
			) : activeTab === 'suggestions' ? (
				<div className='suggestions-view'>
					{suggestionsLoading ? (
						<p>Buscando coincidencias...</p>
					) : suggestionsError ? (
						<div className='alert alert--error'>{suggestionsError}</div>
					) : suggestions.length === 0 ? (
						<p className='no-suggestions'>No se encontraron coincidencias posibles. Puede que todos los juegos ya estén vinculados o los nombres difieran demasiado.</p>
					) : (
						<>
							<p className='suggestions-hint'>
								Se han encontrado {suggestions.length} posibles coincidencias por nombre entre tu biblioteca de Steam y juegos en GDB sin vincular.
							</p>
							<div className='suggestions-toolbar'>
								<input className='search-input' type='text' placeholder='Buscar por nombre...' value={suggestionSearch} onChange={(e) => setSuggestionSearch(e.target.value)} />
								{selectedSuggestionIds.size > 0 && (
									<div className='bulk-actions'>
										<span className='bulk-count'>{selectedSuggestionIds.size} seleccionadas</span>
										<button className='btn btn-primary btn-sm' onClick={handleBulkLinkSuggestions}>
											Vincular seleccionadas
										</button>
										<button className='btn btn-secondary btn-sm' onClick={handleBulkDismissSuggestions}>
											Descartar seleccionadas
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
											<th>Steam</th>
											<th>En GDB</th>
											<th>Confianza</th>
											<th>Acción</th>
										</tr>
									</thead>
									<tbody>
										{filteredSuggestions.map((s) => (
											<tr key={s.steamAppId} className={selectedSuggestionIds.has(s.steamAppId) ? 'row--selected' : ''}>
												<td className='check-cell'>
													<input type='checkbox' checked={selectedSuggestionIds.has(s.steamAppId)} onChange={() => toggleSuggestionSelection(s.steamAppId)} />
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
													<button className='btn btn-primary btn-sm' onClick={() => handleLinkSuggestion(s)}>
														Vincular
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
							<strong>Importación completada:</strong> {lastImportResult.created} creados, {lastImportResult.linked} vinculados, {lastImportResult.skipped} omitidos
						</div>
					)}

					{linkResults && (
						<div className='import-result alert alert--success'>
							<strong>Vinculación completada:</strong> {linkResults.linked} vinculados
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
							Mostrar solo juegos no existentes en GDB
						</label>
						<div className='import-actions'>
							<button className='btn btn-secondary' onClick={handleSelectAllUnmatched} disabled={libraryLoading}>
								Seleccionar todos los no importados
							</button>
							<button className='btn btn-primary' onClick={handleImport} disabled={importLoading || linkLoading || totalActionCount === 0}>
								{importLoading || linkLoading
									? 'Procesando...'
									: `Aplicar (${toCreateCount > 0 ? `${toCreateCount} crear` : ''}${toCreateCount > 0 && toLinkCount > 0 ? ', ' : ''}${toLinkCount > 0 ? `${toLinkCount} vincular` : ''})`}
							</button>
						</div>
					</div>
					<input
						className='search-input search-input--library'
						type='text'
						placeholder='Buscar por nombre...'
						value={librarySearch}
						onChange={(e) => setLibrarySearch(e.target.value)}
					/>

					{libraryLoading ? (
						<p>Cargando biblioteca de Steam...</p>
					) : (
						<div className='library-table-wrapper'>
							<table className='library-table'>
								<thead>
									<tr>
										<th>Portada</th>
										<th>Nombre</th>
										<th>Tiempo de juego</th>
										<th>Estado en GDB</th>
										<th>Acción</th>
									</tr>
								</thead>
								<tbody>
									{filteredLibrary.map((game) => {
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
													{game.gdbGameId ? <span className='badge badge--exists'>En GDB (#{game.gdbGameId})</span> : <span className='badge badge--missing'>No importado</span>}
												</td>
												<td className='action-cell'>
													<select value={action} onChange={(e) => setAction(game.appId, e.target.value as ImportAction)} className='action-select'>
														<option value='skip'>Omitir</option>
														<option value='create'>Crear en GDB</option>
														<option value='link'>Vincular a existente</option>
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
			<input className='game-search-input' type='text' placeholder='Buscar juego en GDB...' value={query} onChange={handleChange} autoComplete='off' />
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
