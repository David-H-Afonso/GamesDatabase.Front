import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
	exportFullDatabase,
	downloadBlob,
	importFullDatabase,
	// exportToZip, // Currently not used - ZIP export UI is disabled
	syncToNetwork,
	analyzeFolders,
	analyzeDatabaseDuplicates,
	deleteOrphanFolder,
	deleteDuplicateGame,
	dismissDuplicateGames,
	type DatabaseDuplicateGameDetails,
	updateImageUrls,
	clearImageCache,
} from '@/services/DataExportService'
import { useGames } from '@/hooks/useGames'
import './AdminDataExport.scss'

interface FolderAnalysisResult {
	totalGamesInDatabase: number
	totalFoldersInFilesystem: number
	difference: number
	potentialDuplicates: PotentialDuplicate[]
	orphanFolders: OrphanFolder[]
	missingGameFolders: MissingGameFolder[]
	databaseDuplicates?: DatabaseDuplicatesResult
}

interface PotentialDuplicate {
	gameName: string
	folderNames: string[]
	reason: string
}

interface OrphanFolder {
	folderName: string
	fullPath: string
}

interface MissingGameFolder {
	gameId: number
	gameName: string
	expectedFolderName: string
	expectedFullPath: string
}

interface DatabaseDuplicatesResult {
	totalGamesInDatabase: number
	duplicateGroups: DatabaseDuplicateGroup[]
}

interface DatabaseDuplicateGroup {
	normalizedKey: string
	games: DatabaseDuplicateGameDetails[]
	reason: string
	matchType?: string
	confidence?: number
}

export const AdminDataExport: React.FC = () => {
	const { t } = useTranslation()
	const [loading, setLoading] = useState(false)
	const [message, setMessage] = useState<string | null>(null)
	const [messageType, setMessageType] = useState<'success' | 'error'>('success')
	const [analysisResult, setAnalysisResult] = useState<FolderAnalysisResult | null>(null)
	const [analyzingFolders, setAnalyzingFolders] = useState(false)
	const [dbDuplicatesResult, setDbDuplicatesResult] = useState<DatabaseDuplicatesResult | null>(null)
	const [analyzingDbDuplicates, setAnalyzingDbDuplicates] = useState(false)
	const [clearingCache, setClearingCache] = useState(false)
	const [showImageUrlPicker, setShowImageUrlPicker] = useState(false)
	const [selectedPreset, setSelectedPreset] = useState<string>('')
	const [customImageBaseUrl, setCustomImageBaseUrl] = useState('')
	const [applyingImageUrls, setApplyingImageUrls] = useState(false)
	const [selectedOrphanFolders, setSelectedOrphanFolders] = useState<string[]>([])
	const [deletingFolders, setDeletingFolders] = useState<string[]>([])
	const [expandedDuplicateGroups, setExpandedDuplicateGroups] = useState<string[]>([])
	const [deletingGameIds, setDeletingGameIds] = useState<number[]>([])
	const [dismissingDuplicateGroups, setDismissingDuplicateGroups] = useState<string[]>([])

	// Hook para manejar los juegos
	const { refreshGames, filters } = useGames()

	const showMessage = (text: string, type: 'success' | 'error') => {
		setMessage(text)
		setMessageType(type)
	}

	const closeMessage = () => {
		setMessage(null)
	}

	const handleExportFullDatabase = async () => {
		try {
			setLoading(true)
			const blob = await exportFullDatabase()
			const filename = `database_export_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv`
			downloadBlob(blob, filename)
			showMessage('Database exported successfully!', 'success')
		} catch (error) {
			console.error('Full export error:', error)
			showMessage(error instanceof Error ? error.message : 'Error exporting database', 'error')
		} finally {
			setLoading(false)
		}
	}

	const handleImportFullDatabase = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		if (!file) return

		try {
			setLoading(true)
			const result = await importFullDatabase(file)

			// Construir mensaje detallado
			const catalogStats = result.catalogs
			const gameStats = result.games
			const detailedMessage = `
				Database imported successfully (MERGE mode)!
				
				Catalogs:
				- Platforms: ${catalogStats.platforms.imported} new, ${catalogStats.platforms.updated} updated
				- Statuses: ${catalogStats.statuses.imported} new, ${catalogStats.statuses.updated} updated
				- PlayWith: ${catalogStats.playWiths.imported} new, ${catalogStats.playWiths.updated} updated
				- PlayedStatuses: ${catalogStats.playedStatuses.imported} new, ${catalogStats.playedStatuses.updated} updated
				${catalogStats.replayTypes ? `\n\t\t\t\t- Replay Types: ${catalogStats.replayTypes.imported} new, ${catalogStats.replayTypes.updated} updated` : ''}
				${result.views ? `\n\t\t\t\t- Views: ${result.views.imported} new, ${result.views.updated} updated` : ''}
				
				Games: ${gameStats.imported} new, ${gameStats.updated} updated
				${result.replays ? `\n\t\t\t\tReplays: ${result.replays.imported} new, ${result.replays.updated} updated` : ''}
				${result.history ? `\n\t\t\t\tHistory: ${result.history.imported} entries imported` : ''}
				
				${result.errors && result.errors.length > 0 ? `Errors: ${result.errors.join(', ')}` : ''}
			`

			showMessage(detailedMessage, result.errors && result.errors.length > 0 ? 'error' : 'success')

			// Refrescar la lista de juegos para mostrar los nuevos datos
			await refreshGames(filters)
		} catch (error) {
			console.error('Full import error:', error)
			showMessage(error instanceof Error ? error.message : 'Error importing database', 'error')
		} finally {
			setLoading(false)
			// Reset file input
			event.target.value = ''
		}
	}

	/* Commented out - ZIP export UI is currently disabled
	const handleExportToZip = async (fullExport: boolean) => {
		try {
			setLoading(true)
			const blob = await exportToZip(fullExport)
			const mode = fullExport ? 'full' : 'partial'
			const filename = `database_${mode}_export_${new Date().toISOString().split('T')[0]}.zip`
			downloadBlob(blob, filename)
			showMessage(`Database exported to ZIP successfully (${mode} mode)!`, 'success')
		} catch (error) {
			console.error('ZIP export error:', error)
			showMessage(error instanceof Error ? error.message : 'Error exporting to ZIP', 'error')
		} finally {
			setLoading(false)
		}
	}
	*/

	const handleSyncToNetwork = async (fullExport: boolean) => {
		try {
			setLoading(true)
			const result = await syncToNetwork(fullExport)

			let detailedMessage = result.message

			if (result.stats) {
				const s = result.stats
				detailedMessage = `
${result.message}

Statistics:
- Total Games: ${s.totalGames}
- Games Synced: ${s.gamesSynced}
- Games Skipped: ${s.gamesSkipped}
- Images Synced: ${s.imagesSynced}
- Images Failed: ${s.imagesFailed}
- Images Retried: ${s.imagesRetried}
- Files Written: ${s.filesWritten}
- Elapsed Time: ${s.elapsedSeconds.toFixed(2)}s
				`
			}

			if (result.failedImages && result.failedImages.length > 0) {
				detailedMessage += `\n\n⚠️ Failed Images Report:\n`
				result.failedImages.forEach((item) => {
					detailedMessage += `\n- ${item.gameName}:\n`
					item.imageTypes.forEach((type) => {
						detailedMessage += `  • ${type}\n`
					})
				})
			}

			showMessage(detailedMessage, 'success')
		} catch (error) {
			console.error('Network sync error:', error)
			showMessage(error instanceof Error ? error.message : 'Error syncing to network', 'error')
		} finally {
			setLoading(false)
		}
	}

	const handleAnalyzeFolders = async () => {
		try {
			setAnalyzingFolders(true)
			const result = await analyzeFolders()
			setAnalysisResult(result)
			setSelectedOrphanFolders([])
			const dbDups = result.databaseDuplicates?.duplicateGroups.length ?? 0
			const msg = dbDups > 0 ? t('admin.dataExport.analysisDuplicates', { count: dbDups }) : t('admin.dataExport.analysisComplete')
			showMessage(msg, 'success')
		} catch (error) {
			console.error('Folder analysis error:', error)
			showMessage(error instanceof Error ? error.message : 'Error analyzing folders', 'error')
		} finally {
			setAnalyzingFolders(false)
		}
	}

	const handleAnalyzeDatabaseDuplicates = async () => {
		try {
			setAnalyzingDbDuplicates(true)
			const result = await analyzeDatabaseDuplicates()
			setDbDuplicatesResult(result)
			setExpandedDuplicateGroups(result.duplicateGroups.map((group) => group.normalizedKey))
			if (result.duplicateGroups.length === 0) {
				showMessage('No se encontraron duplicados en la base de datos.', 'success')
			} else {
				showMessage(`Se encontraron ${result.duplicateGroups.length} grupo(s) de duplicados potenciales.`, 'success')
			}
		} catch (error) {
			console.error('DB duplicate analysis error:', error)
			showMessage(error instanceof Error ? error.message : t('admin.dataExport.errorAnalyze'), 'error')
		} finally {
			setAnalyzingDbDuplicates(false)
		}
	}

	const formatOptionalDate = (date?: string) => {
		if (!date) return 'Sin fecha'
		const parsed = new Date(date)
		if (Number.isNaN(parsed.getTime())) return date
		return parsed.toLocaleDateString()
	}

	const formatMetric = (value?: number, suffix = '') => (value === null || value === undefined ? '—' : `${value}${suffix}`)

	const formatPlaytime = (minutes?: number) => {
		if (!minutes) return 'Sin tiempo'
		const hours = Math.floor(minutes / 60)
		const mins = minutes % 60
		return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
	}

	const getDuplicateGroupKey = (group: DatabaseDuplicateGroup) =>
		group.normalizedKey ||
		group.games
			.map((game) => game.id)
			.sort((a, b) => a - b)
			.join('|')

	const updateDuplicateResultsAfterDelete = (gameId: number) => {
		const removeGame = (groups: DatabaseDuplicateGroup[]) =>
			groups.map((group) => ({ ...group, games: group.games.filter((game) => game.id !== gameId) })).filter((group) => group.games.length > 1)

		setDbDuplicatesResult((current) => (current ? { ...current, duplicateGroups: removeGame(current.duplicateGroups) } : current))
		setAnalysisResult((current) =>
			current?.databaseDuplicates
				? {
						...current,
						databaseDuplicates: {
							...current.databaseDuplicates,
							duplicateGroups: removeGame(current.databaseDuplicates.duplicateGroups),
						},
					}
				: current
		)
	}

	const removeDuplicateGroupFromResults = (groupKey: string) => {
		const removeGroup = (groups: DatabaseDuplicateGroup[]) => groups.filter((group) => getDuplicateGroupKey(group) !== groupKey)

		setDbDuplicatesResult((current) => (current ? { ...current, duplicateGroups: removeGroup(current.duplicateGroups) } : current))
		setAnalysisResult((current) =>
			current?.databaseDuplicates
				? {
						...current,
						databaseDuplicates: {
							...current.databaseDuplicates,
							duplicateGroups: removeGroup(current.databaseDuplicates.duplicateGroups),
						},
					}
				: current
		)
		setExpandedDuplicateGroups((current) => current.filter((key) => key !== groupKey))
	}

	const toggleOrphanSelection = (folderName: string) => {
		setSelectedOrphanFolders((current) => (current.includes(folderName) ? current.filter((name) => name !== folderName) : [...current, folderName]))
	}

	const handleDeleteOrphanFolder = async (folderName: string) => {
		const confirmed = window.confirm(`Se borrará la carpeta huérfana "${folderName}" y todo su contenido. Esta acción no se puede deshacer.`)
		if (!confirmed) return

		try {
			setDeletingFolders((current) => [...current, folderName])
			const result = await deleteOrphanFolder(folderName)
			setAnalysisResult((current) =>
				current
					? {
							...current,
							totalFoldersInFilesystem: Math.max(0, current.totalFoldersInFilesystem - 1),
							difference: current.difference - 1,
							orphanFolders: current.orphanFolders.filter((folder) => folder.folderName !== folderName),
						}
					: current
			)
			setSelectedOrphanFolders((current) => current.filter((name) => name !== folderName))
			showMessage(result.message, 'success')
		} catch (error) {
			console.error('Delete orphan folder error:', error)
			showMessage(error instanceof Error ? error.message : 'Error deleting orphan folder', 'error')
		} finally {
			setDeletingFolders((current) => current.filter((name) => name !== folderName))
		}
	}

	const handleDeleteSelectedOrphanFolders = async () => {
		if (selectedOrphanFolders.length === 0) return
		const confirmed = window.confirm(`Se borrarán ${selectedOrphanFolders.length} carpeta(s) huérfana(s) y todo su contenido. Esta acción no se puede deshacer.`)
		if (!confirmed) return

		for (const folderName of selectedOrphanFolders) {
			try {
				setDeletingFolders((current) => [...current, folderName])
				await deleteOrphanFolder(folderName)
				setAnalysisResult((current) =>
					current
						? {
								...current,
								totalFoldersInFilesystem: Math.max(0, current.totalFoldersInFilesystem - 1),
								difference: current.difference - 1,
								orphanFolders: current.orphanFolders.filter((folder) => folder.folderName !== folderName),
							}
						: current
				)
			} catch (error) {
				console.error('Delete orphan folder error:', error)
				showMessage(error instanceof Error ? error.message : `Error borrando ${folderName}`, 'error')
				break
			} finally {
				setDeletingFolders((current) => current.filter((name) => name !== folderName))
			}
		}

		setSelectedOrphanFolders([])
		showMessage('Carpetas seleccionadas procesadas.', 'success')
	}

	const toggleDuplicateGroup = (key: string) => {
		setExpandedDuplicateGroups((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]))
	}

	const handleDeleteDuplicateGame = async (game: DatabaseDuplicateGameDetails) => {
		const confirmed = window.confirm(`Se borrará "${game.name}" (#${game.id}) de la base de datos. Esta acción no se puede deshacer.`)
		if (!confirmed) return

		try {
			setDeletingGameIds((current) => [...current, game.id])
			const result = await deleteDuplicateGame(game.id)
			updateDuplicateResultsAfterDelete(game.id)
			await refreshGames(filters)
			showMessage(result.message, 'success')
		} catch (error) {
			console.error('Delete duplicate game error:', error)
			showMessage(error instanceof Error ? error.message : 'Error deleting duplicate game', 'error')
		} finally {
			setDeletingGameIds((current) => current.filter((id) => id !== game.id))
		}
	}

	const handleDismissDuplicateGroup = async (group: DatabaseDuplicateGroup) => {
		const groupKey = getDuplicateGroupKey(group)
		const confirmed = window.confirm(`Se descartará este grupo como falso positivo. No volverá a aparecer en el análisis de duplicados.`)
		if (!confirmed) return

		try {
			setDismissingDuplicateGroups((current) => [...current, groupKey])
			const result = await dismissDuplicateGames(group.games.map((game) => game.id))
			removeDuplicateGroupFromResults(groupKey)
			showMessage(result.message, 'success')
		} catch (error) {
			console.error('Dismiss duplicate group error:', error)
			showMessage(error instanceof Error ? error.message : 'Error dismissing duplicate group', 'error')
		} finally {
			setDismissingDuplicateGroups((current) => current.filter((key) => key !== groupKey))
		}
	}

	const handleClearImageCache = async () => {
		try {
			setClearingCache(true)
			const result = await clearImageCache()
			showMessage(result.message, 'success')
		} catch (error) {
			console.error('Clear image cache error:', error)
			showMessage(error instanceof Error ? error.message : t('admin.dataExport.errorClearCache'), 'error')
		} finally {
			setClearingCache(false)
		}
	}

	const IMAGE_URL_PRESETS = [
		{ key: 'nas', label: t('admin.dataExport.imageUrlPresetNas'), url: 'http://192.168.0.32:8082' },
		{ key: 'dev', label: t('admin.dataExport.imageUrlPresetDev'), url: 'https://localhost:7245' },
		{ key: 'prod', label: t('admin.dataExport.imageUrlPresetProd'), url: 'https://gdb.davidhormigafonso.work' },
	]

	const effectiveImageBaseUrl = selectedPreset ? (IMAGE_URL_PRESETS.find((p) => p.key === selectedPreset)?.url ?? '') : customImageBaseUrl.trim()

	const handleUpdateImageUrls = async () => {
		try {
			setApplyingImageUrls(true)
			const result = await updateImageUrls(effectiveImageBaseUrl || undefined)
			let message = t('admin.dataExport.imageUrlsResult', {
				total: result.totalGames,
				updated: result.updatedGames,
				skipped: result.skippedGames,
				correct: result.alreadyCorrect,
				noImages: result.noImagesFound,
			})
			if (!result.nasAccessible) {
				message += `\n\n⚠️ ${t('admin.dataExport.imageUrlNasWarning')}`
				if (result.nasWarning) message += `\n${result.nasWarning}`
			}
			showMessage(message, 'success')
			setShowImageUrlPicker(false)
		} catch (error) {
			console.error('Update image URLs error:', error)
			showMessage(error instanceof Error ? error.message : 'Error updating image URLs', 'error')
		} finally {
			setApplyingImageUrls(false)
		}
	}

	const renderDuplicateGroup = (group: DatabaseDuplicateGroup, idx: number) => {
		const groupKey = getDuplicateGroupKey(group) || `group-${idx}`
		const expanded = expandedDuplicateGroups.includes(groupKey)
		const matchLabel = group.matchType === 'fuzzy' ? `Parecido · ${group.confidence ?? 0}%` : 'Exacto'
		const dismissing = dismissingDuplicateGroups.includes(groupKey)

		return (
			<div key={groupKey} className='duplicate-group-card'>
				<button className='duplicate-group-card__header' type='button' onClick={() => toggleDuplicateGroup(groupKey)}>
					<span className='duplicate-group-card__title'>{group.games.map((game) => game.name).join(' / ')}</span>
					<span className='duplicate-group-card__meta'>
						{matchLabel} · {group.games.length} juegos · {expanded ? 'Ocultar detalles' : 'Ver detalles'}
					</span>
				</button>
				{expanded && (
					<div className='duplicate-group-card__body'>
						<div className='duplicate-group-card__actions'>
							<p className='duplicate-group-card__reason'>{group.reason}</p>
							<button className='btn btn-secondary btn-small' onClick={() => handleDismissDuplicateGroup(group)} disabled={dismissing}>
								{dismissing ? 'Descartando...' : 'Descartar falso positivo'}
							</button>
						</div>
						<div className='duplicate-game-grid'>
							{group.games.map((game) => (
								<article key={game.id} className='duplicate-game-card'>
									<div className='duplicate-game-card__media'>
										{game.cover || game.logo ? <img src={game.cover || game.logo} alt='' loading='lazy' /> : <span>{game.name.slice(0, 2).toUpperCase()}</span>}
									</div>
									<div className='duplicate-game-card__content'>
										<div className='duplicate-game-card__top'>
											<div>
												<strong>{game.name}</strong>
												<span>#{game.id}</span>
											</div>
											<button className='btn btn-danger btn-small' onClick={() => handleDeleteDuplicateGame(game)} disabled={deletingGameIds.includes(game.id)}>
												{deletingGameIds.includes(game.id) ? 'Borrando...' : 'Borrar este'}
											</button>
										</div>
										<div className='duplicate-game-card__chips'>
											<span>{game.statusName || 'Sin estado'}</span>
											<span>{game.platformName || 'Sin plataforma'}</span>
											<span>{game.playedStatusName || 'Sin jugado'}</span>
										</div>
										<dl className='duplicate-game-card__details'>
											<div>
												<dt>Released</dt>
												<dd>{formatOptionalDate(game.released)}</dd>
											</div>
											<div>
												<dt>Started</dt>
												<dd>{formatOptionalDate(game.started)}</dd>
											</div>
											<div>
												<dt>Finished</dt>
												<dd>{formatOptionalDate(game.finished)}</dd>
											</div>
											<div>
												<dt>Grade</dt>
												<dd>{formatMetric(game.grade, '%')}</dd>
											</div>
											<div>
												<dt>Critic</dt>
												<dd>{formatMetric(game.critic, '%')}</dd>
											</div>
											<div>
												<dt>Score</dt>
												<dd>{formatMetric(game.score)}</dd>
											</div>
											<div>
												<dt>Story</dt>
												<dd>{formatMetric(game.story, 'h')}</dd>
											</div>
											<div>
												<dt>Completion</dt>
												<dd>{formatMetric(game.completion, 'h')}</dd>
											</div>
											<div>
												<dt>Steam</dt>
												<dd>{game.steamAppId ? `App ${game.steamAppId}` : 'Sin app'}</dd>
											</div>
											<div>
												<dt>Playtime</dt>
												<dd>{formatPlaytime(game.steamPlaytimeForever)}</dd>
											</div>
											<div>
												<dt>Creado</dt>
												<dd>{formatOptionalDate(game.createdAt)}</dd>
											</div>
											<div>
												<dt>Actualizado</dt>
												<dd>{formatOptionalDate(game.updatedAt)}</dd>
											</div>
										</dl>
									</div>
								</article>
							))}
						</div>
					</div>
				)}
			</div>
		)
	}

	return (
		<div className='admin-data-export'>
			<div className='admin-header'>
				<h1>{t('admin.dataExport.title')}</h1>
			</div>

			{message && (
				<div className={`alert alert-${messageType}`}>
					<button className='alert-close' onClick={closeMessage} aria-label='Close message'>
						×
					</button>
					<pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{message}</pre>
				</div>
			)}

			<div className='export-import-sections'>
				{/* Full Database Export/Import Section */}
				<div className='section full-export-section highlight-section'>
					<h2>🗄️ {t('admin.dataExport.dbSectionTitle')}</h2>
					<p className='section-description'>{t('admin.dataExport.dbSectionDesc')}</p>

					<div className='action-group'>
						<div className='action-item'>
							<h3>{t('admin.dataExport.exportDbTitle')}</h3>
							<p>{t('admin.dataExport.exportDbDesc')}</p>
							<button className='btn btn-primary btn-large' onClick={handleExportFullDatabase} disabled={loading}>
								{loading ? `⏳ ${t('admin.dataExport.exporting')}` : `📥 ${t('admin.dataExport.exportBtn')}`}
							</button>
						</div>

						<div className='action-item'>
							<h3>{t('admin.dataExport.importDbTitle')}</h3>
							<p>{t('admin.dataExport.importDbDesc')}</p>
							<small className='help-text'>⚠️ {t('admin.dataExport.importDbHint')}</small>
							<div className='file-input-container'>
								<input type='file' accept='.csv' onChange={handleImportFullDatabase} disabled={loading} id='csv-full-import' className='file-input' />
								<label htmlFor='csv-full-import' className='file-input-label btn btn-success btn-large'>
									{loading ? `⏳ ${t('admin.dataExport.importing')}` : `📤 ${t('admin.dataExport.importBtn')}`}
								</label>
							</div>
						</div>
					</div>
				</div>

				{/* ZIP Export Section
				<div className='section zip-export-section'>
					<h2>📦 Exportar a ZIP</h2>
					<p className='section-description'>
						Exporta la base de datos y las imágenes en un archivo ZIP comprimido.
					</p>

					<div className='action-group'>
						<div className='action-item'>
							<h3>Exportar Todo (Full)</h3>
							<p>Exporta toda la base de datos con todas las imágenes de los juegos.</p>
							<button
								className='btn btn-primary btn-large'
								onClick={() => handleExportToZip(true)}
								disabled={loading}>
								{loading ? '⏳ Exportando...' : '📦 Exportar ZIP Full'}
							</button>
						</div>

						<div className='action-item'>
							<h3>Exportar Solo Actualizado (Parcial)</h3>
							<p>
								Exporta únicamente los datos y las imágenes que han sido modificados recientemente.
							</p>
							<button
								className='btn btn-secondary btn-large'
								onClick={() => handleExportToZip(false)}
								disabled={loading}>
								{loading ? '⏳ Exportando...' : '📦 Exportar ZIP Parcial'}
							</button>
						</div>
					</div>
				</div> */}

				{/* Network Sync Section */}
				<div className='section network-sync-section'>
					<h2>🌐 {t('admin.dataExport.networkSyncTitle')}</h2>
					<p className='section-description'>{t('admin.dataExport.networkSyncDesc')}</p>

					<div className='action-group'>
						<div className='action-item'>
							<h3>{t('admin.dataExport.syncFullTitle')}</h3>
							<p>{t('admin.dataExport.syncFullDesc')}</p>
							<button className='btn btn-success btn-large' onClick={() => handleSyncToNetwork(true)} disabled={loading}>
								{loading ? `⏳ ${t('admin.dataExport.syncing')}` : `🌐 ${t('admin.dataExport.syncFullBtn')}`}
							</button>
						</div>

						<div className='action-item'>
							<h3>{t('admin.dataExport.syncPartialTitle')}</h3>
							<p>{t('admin.dataExport.syncPartialDesc')}</p>
							<button className='btn btn-secondary btn-large' onClick={() => handleSyncToNetwork(false)} disabled={loading}>
								{loading ? `⏳ ${t('admin.dataExport.syncing')}` : `🌐 ${t('admin.dataExport.syncPartialBtn')}`}
							</button>
						</div>
					</div>
				</div>

				<div className='section folder-analysis-section'>
					<h2>📁 {t('admin.dataExport.folderAnalysisTitle')}</h2>
					<p className='section-description'>{t('admin.dataExport.folderAnalysisDesc')}</p>

					<div className='action-group'>
						<button className='btn btn-primary btn-large' onClick={handleAnalyzeFolders} disabled={analyzingFolders}>
							{analyzingFolders ? `⏳ ${t('common.analyzing')}` : `🔍 ${t('admin.dataExport.analyzeFolders')}`}
						</button>
						<button className={`btn btn-info btn-large${showImageUrlPicker ? ' active' : ''}`} onClick={() => setShowImageUrlPicker((v) => !v)} disabled={applyingImageUrls}>
							{`🔄 ${t('admin.dataExport.updateImageUrls')} ${showImageUrlPicker ? '▲' : '▼'}`}
						</button>
						<button className='btn btn-danger btn-large' onClick={handleClearImageCache} disabled={clearingCache}>
							{clearingCache ? `⏳ ${t('common.clearing')}` : `🗑️ ${t('admin.dataExport.clearImageCache')}`}
						</button>
					</div>

					{showImageUrlPicker && (
						<div className='image-url-picker'>
							<p className='image-url-picker__desc'>{t('admin.dataExport.imageUrlPickerDesc')}</p>

							<div className='image-url-picker__presets'>
								{IMAGE_URL_PRESETS.map((preset) => (
									<button
										key={preset.key}
										className={`image-url-picker__preset-btn${selectedPreset === preset.key ? ' selected' : ''}`}
										onClick={() => {
											setSelectedPreset(preset.key)
											setCustomImageBaseUrl('')
										}}>
										<span className='image-url-picker__preset-label'>{preset.label}</span>
										<span className='image-url-picker__preset-url'>{preset.url}</span>
									</button>
								))}
							</div>

							<div className='image-url-picker__custom'>
								<label className='image-url-picker__custom-label'>{t('admin.dataExport.imageUrlCustomLabel')}</label>
								<input
									type='url'
									className='image-url-picker__custom-input'
									placeholder={t('admin.dataExport.imageUrlCustomPlaceholder')}
									value={customImageBaseUrl}
									onChange={(e) => {
										setCustomImageBaseUrl(e.target.value)
										setSelectedPreset('')
									}}
								/>
							</div>

							{effectiveImageBaseUrl && (
								<p className='image-url-picker__selected'>
									{t('admin.dataExport.imageUrlSelected')} <code>{effectiveImageBaseUrl}</code>
								</p>
							)}

							<button className='btn btn-info btn-large image-url-picker__apply-btn' onClick={handleUpdateImageUrls} disabled={applyingImageUrls || !effectiveImageBaseUrl}>
								{applyingImageUrls ? `⏳ ${t('admin.dataExport.imageUrlApplying')}` : `✅ ${t('admin.dataExport.imageUrlApplyBtn')}`}
							</button>
						</div>
					)}

					{analysisResult && (
						<div className='analysis-results'>
							<div className='analysis-summary'>
								<h3>📊 {t('admin.dataExport.summary')}</h3>
								<div className='summary-grid'>
									<div className='summary-item'>
										<span className='summary-label'>{t('admin.dataExport.gamesInDb')}:</span>
										<span className='summary-value'>{analysisResult.totalGamesInDatabase}</span>
									</div>
									<div className='summary-item'>
										<span className='summary-label'>{t('admin.dataExport.foldersOnDisk')}:</span>
										<span className='summary-value'>{analysisResult.totalFoldersInFilesystem}</span>
									</div>
									<div className='summary-item'>
										<span className='summary-label'>{t('admin.dataExport.difference')}:</span>
										<span className={`summary-value ${analysisResult.difference > 0 ? 'warning' : analysisResult.difference < 0 ? 'error' : 'success'}`}>
											{analysisResult.difference > 0 && '+'}
											{analysisResult.difference}
										</span>
									</div>
								</div>
							</div>

							{analysisResult.potentialDuplicates.length > 0 && (
								<div className='duplicates-section'>
									<h3>🔍 {t('admin.dataExport.potentialDuplicates', { count: analysisResult.potentialDuplicates.length })}</h3>
									{analysisResult.potentialDuplicates.map((dup, idx) => (
										<div key={idx} className='duplicate-item'>
											<div className='duplicate-header'>
												<strong>{dup.gameName}</strong>
												<span className='duplicate-reason'>{dup.reason}</span>
											</div>
											<ul className='folder-list'>
												{dup.folderNames.map((folder, fIdx) => (
													<li key={fIdx}>
														<code>{folder}</code>
													</li>
												))}
											</ul>
										</div>
									))}
								</div>
							)}

							{analysisResult.orphanFolders.length > 0 && (
								<div className='orphans-section'>
									<div className='section-toolbar'>
										<div>
											<h3>📂 {t('admin.dataExport.orphanFolders', { count: analysisResult.orphanFolders.length })}</h3>
											<p className='section-note'>{t('admin.dataExport.orphanFoldersNote')}</p>
										</div>
										<button
											className='btn btn-danger btn-compact'
											onClick={handleDeleteSelectedOrphanFolders}
											disabled={selectedOrphanFolders.length === 0 || deletingFolders.length > 0}>
											Borrar seleccionadas ({selectedOrphanFolders.length})
										</button>
									</div>
									<ul className='orphan-folder-list'>
										{analysisResult.orphanFolders.map((orphan, idx) => (
											<li key={idx} className={selectedOrphanFolders.includes(orphan.folderName) ? 'selected' : ''}>
												<label className='orphan-folder-list__info'>
													<input type='checkbox' checked={selectedOrphanFolders.includes(orphan.folderName)} onChange={() => toggleOrphanSelection(orphan.folderName)} />
													<span>
														<strong>{orphan.folderName}</strong>
														<code>{orphan.fullPath}</code>
													</span>
												</label>
												<button
													className='btn btn-danger btn-small'
													onClick={() => handleDeleteOrphanFolder(orphan.folderName)}
													disabled={deletingFolders.includes(orphan.folderName)}>
													{deletingFolders.includes(orphan.folderName) ? 'Borrando...' : 'Borrar'}
												</button>
											</li>
										))}
									</ul>
								</div>
							)}

							{(analysisResult.missingGameFolders?.length ?? 0) > 0 && (
								<div className='missing-folders-section'>
									<h3>🧩 Juegos sin carpeta ({analysisResult.missingGameFolders.length})</h3>
									<p className='section-note'>Estos juegos existen en la base de datos, pero no tienen la carpeta esperada en disco.</p>
									<ul className='missing-folder-list'>
										{analysisResult.missingGameFolders.map((missing) => (
											<li key={missing.gameId}>
												<div>
													<strong>
														#{missing.gameId} {missing.gameName}
													</strong>
													<span>Carpeta esperada: {missing.expectedFolderName}</span>
													<code>{missing.expectedFullPath}</code>
												</div>
											</li>
										))}
									</ul>
								</div>
							)}

							{(analysisResult.databaseDuplicates?.duplicateGroups.length ?? 0) > 0 && (
								<div className='duplicates-section'>
									<h3>🔁 {t('admin.dataExport.dbDuplicates', { count: analysisResult.databaseDuplicates!.duplicateGroups.length })}</h3>
									{analysisResult.databaseDuplicates!.duplicateGroups.map(renderDuplicateGroup)}
								</div>
							)}

							{analysisResult.potentialDuplicates.length === 0 &&
								analysisResult.orphanFolders.length === 0 &&
								(analysisResult.missingGameFolders?.length ?? 0) === 0 &&
								analysisResult.difference === 0 &&
								(analysisResult.databaseDuplicates?.duplicateGroups.length ?? 0) === 0 && (
									<div className='analysis-success'>
										<h3>✅ {t('admin.dataExport.allCorrect')}</h3>
										<p>{t('admin.dataExport.allCorrectDesc')}</p>
									</div>
								)}
						</div>
					)}
				</div>

				{/* Database Duplicates Section - visible to all authenticated users */}
				<div className='section folder-analysis-section'>
					<h2>🔁 {t('admin.dataExport.dbDuplicatesTitle')}</h2>
					<p className='section-description'>{t('admin.dataExport.dbDuplicatesDesc')}</p>

					<div className='action-group'>
						<button className='btn btn-primary btn-large' onClick={handleAnalyzeDatabaseDuplicates} disabled={analyzingDbDuplicates}>
							{analyzingDbDuplicates ? `⏳ ${t('common.analyzing')}` : `🔁 ${t('admin.dataExport.findDuplicates')}`}
						</button>
					</div>

					{dbDuplicatesResult && (
						<div className='analysis-results'>
							<div className='analysis-summary'>
								<h3>📊 {t('admin.dataExport.summary')}</h3>
								<div className='summary-grid'>
									<div className='summary-item'>
										<span className='summary-label'>{t('admin.dataExport.gamesInDb')}:</span>
										<span className='summary-value'>{dbDuplicatesResult.totalGamesInDatabase}</span>
									</div>
									<div className='summary-item'>
										<span className='summary-label'>{t('admin.dataExport.duplicateGroups')}:</span>
										<span className={`summary-value ${dbDuplicatesResult.duplicateGroups.length > 0 ? 'warning' : 'success'}`}>{dbDuplicatesResult.duplicateGroups.length}</span>
									</div>
								</div>
							</div>

							{dbDuplicatesResult.duplicateGroups.length > 0 && (
								<div className='duplicates-section'>
									<h3>🔍 {t('admin.dataExport.duplicatesFound', { count: dbDuplicatesResult.duplicateGroups.length })}</h3>
									{dbDuplicatesResult.duplicateGroups.map(renderDuplicateGroup)}
								</div>
							)}

							{dbDuplicatesResult.duplicateGroups.length === 0 && (
								<div className='analysis-success'>
									<h3>✅ {t('admin.dataExport.noDuplicates')}</h3>
									<p>{t('admin.dataExport.noDuplicatesDesc')}</p>
								</div>
							)}
						</div>
					)}
				</div>
			</div>

			{/* Instructions Section */}
			<div className='section instructions-section'>
				<h2>📚 {t('admin.dataExport.instructionsTitle')}</h2>
				<div className='instructions-content'>
					<div className='instruction-item'>
						<h3>📥 {t('admin.dataExport.instrExportTitle')}</h3>
						<ul>
							<li>{t('admin.dataExport.instrExport1')}</li>
							<li>{t('admin.dataExport.instrExport2')}</li>
							<li>{t('admin.dataExport.instrExport3')}</li>
							<li>{t('admin.dataExport.instrExport4')}</li>
							<li>{t('admin.dataExport.instrExport5')}</li>
						</ul>
					</div>

					<div className='instruction-item'>
						<h3>📤 {t('admin.dataExport.instrImportTitle')}</h3>
						<ul>
							<li dangerouslySetInnerHTML={{ __html: t('admin.dataExport.instrImport1') }} />
							<li dangerouslySetInnerHTML={{ __html: t('admin.dataExport.instrImport2') }} />
							<li dangerouslySetInnerHTML={{ __html: t('admin.dataExport.instrImport3') }} />
							<li>{t('admin.dataExport.instrImport4')}</li>
							<li>{t('admin.dataExport.instrImport5')}</li>
							<li>{t('admin.dataExport.instrImport6')}</li>
						</ul>
					</div>

					<div className='instruction-item'>
						<h3>💡 {t('admin.dataExport.instrUseCasesTitle')}</h3>
						<ul>
							<li dangerouslySetInnerHTML={{ __html: t('admin.dataExport.instrUseCase1') }} />
							<li dangerouslySetInnerHTML={{ __html: t('admin.dataExport.instrUseCase2') }} />
							<li dangerouslySetInnerHTML={{ __html: t('admin.dataExport.instrUseCase3') }} />
							<li dangerouslySetInnerHTML={{ __html: t('admin.dataExport.instrUseCase4') }} />
							<li dangerouslySetInnerHTML={{ __html: t('admin.dataExport.instrUseCase5') }} />
						</ul>
					</div>

					<div className='instruction-item warning-item'>
						<h3>⚠️ {t('admin.dataExport.instrNotesTitle')}</h3>
						<ul>
							<li dangerouslySetInnerHTML={{ __html: t('admin.dataExport.instrNote1') }} />
							<li dangerouslySetInnerHTML={{ __html: t('admin.dataExport.instrNote2') }} />
							<li dangerouslySetInnerHTML={{ __html: t('admin.dataExport.instrNote3') }} />
							<li dangerouslySetInnerHTML={{ __html: t('admin.dataExport.instrNote4') }} />
							<li dangerouslySetInnerHTML={{ __html: t('admin.dataExport.instrNote5') }} />
							<li dangerouslySetInnerHTML={{ __html: t('admin.dataExport.instrNote6') }} />
							<li dangerouslySetInnerHTML={{ __html: t('admin.dataExport.instrNote7') }} />
						</ul>
					</div>
				</div>
			</div>
		</div>
	)
}

export default AdminDataExport
