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

interface DatabaseDuplicatesResult {
	totalGamesInDatabase: number
	duplicateGroups: DatabaseDuplicateGroup[]
}

interface DatabaseDuplicateGroup {
	normalizedKey: string
	games: Array<{ id: number; name: string }>
	reason: string
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
						<button className={`btn btn-warning btn-large${showImageUrlPicker ? ' active' : ''}`} onClick={() => setShowImageUrlPicker((v) => !v)} disabled={applyingImageUrls}>
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

							<button className='btn btn-warning btn-large image-url-picker__apply-btn' onClick={handleUpdateImageUrls} disabled={applyingImageUrls || !effectiveImageBaseUrl}>
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
									<h3>👻 {t('admin.dataExport.orphanFolders', { count: analysisResult.orphanFolders.length })}</h3>
									<p className='section-note'>{t('admin.dataExport.orphanFoldersNote')}</p>
									<ul className='folder-list'>
										{analysisResult.orphanFolders.map((orphan, idx) => (
											<li key={idx}>
												<code>{orphan.folderName}</code>
											</li>
										))}
									</ul>
								</div>
							)}

							{(analysisResult.databaseDuplicates?.duplicateGroups.length ?? 0) > 0 && (
								<div className='duplicates-section'>
									<h3>🔁 {t('admin.dataExport.dbDuplicates', { count: analysisResult.databaseDuplicates!.duplicateGroups.length })}</h3>
									{analysisResult.databaseDuplicates!.duplicateGroups.map((group, idx) => (
										<div key={idx} className='duplicate-item'>
											<div className='duplicate-header'>
												<strong>{group.games.map((g) => g.name).join(' / ')}</strong>
												<span className='duplicate-reason'>{group.reason}</span>
											</div>
											<ul className='folder-list'>
												{group.games.map((g, gIdx) => (
													<li key={gIdx}>
														<code>
															#{g.id} {g.name}
														</code>
													</li>
												))}
											</ul>
										</div>
									))}
								</div>
							)}

							{analysisResult.potentialDuplicates.length === 0 &&
								analysisResult.orphanFolders.length === 0 &&
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
									{dbDuplicatesResult.duplicateGroups.map((group, idx) => (
										<div key={idx} className='duplicate-item'>
											<div className='duplicate-header'>
												<span className='duplicate-reason'>{group.reason}</span>
											</div>
											<ul className='folder-list'>
												{group.games.map((game) => (
													<li key={game.id}>
														<code>#{game.id}</code> {game.name}
													</li>
												))}
											</ul>
										</div>
									))}
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
