import React, { useState, useMemo } from 'react'
import {
	exportFullDatabase,
	downloadBlob,
	importFullDatabase,
	// exportToZip, // Currently not used - ZIP export UI is disabled
	syncToNetwork,
	analyzeFolders,
	analyzeDatabaseDuplicates,
	updateImageUrls,
} from '@/services'
import { useGames } from '@/hooks'
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
	const [loading, setLoading] = useState(false)
	const [message, setMessage] = useState<string | null>(null)
	const [messageType, setMessageType] = useState<'success' | 'error'>('success')
	const [analysisResult, setAnalysisResult] = useState<FolderAnalysisResult | null>(null)
	const [analyzingFolders, setAnalyzingFolders] = useState(false)
	const [dbDuplicatesResult, setDbDuplicatesResult] = useState<DatabaseDuplicatesResult | null>(null)
	const [analyzingDbDuplicates, setAnalyzingDbDuplicates] = useState(false)

	// Hook para manejar los juegos
	const { refreshGames, filters } = useGames()

	// Detectar si estamos en localhost o IP local específica
	const isLocalEnvironment = useMemo(() => {
		const hostname = window.location.hostname.toLowerCase()
		return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '192.168.0.32'
	}, [])

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
			const filename = `database_full_export_${new Date().toISOString().split('T')[0]}.csv`
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
				${result.views ? `\n\t\t\t\t- Views: ${result.views.imported} new, ${result.views.updated} updated` : ''}
				
				Games: ${gameStats.imported} new, ${gameStats.updated} updated
				
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
			const msg = dbDups > 0 ? `Análisis completado. ${dbDups} grupo(s) de duplicados en la base de datos.` : 'Análisis de carpetas completado'
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
			showMessage(error instanceof Error ? error.message : 'Error analyzing database duplicates', 'error')
		} finally {
			setAnalyzingDbDuplicates(false)
		}
	}

	const handleUpdateImageUrls = async () => {
		try {
			setLoading(true)
			const result = await updateImageUrls()
			const message = `
Actualización de URLs de imágenes completada:

✅ Total juegos: ${result.totalGames}
📝 Actualizados: ${result.updatedGames}
⏭️ Omitidos: ${result.skippedGames}
✓ Ya correctos: ${result.alreadyCorrect}
⚠️ Sin imágenes: ${result.noImagesFound}
			`
			showMessage(message, 'success')
		} catch (error) {
			console.error('Update image URLs error:', error)
			showMessage(error instanceof Error ? error.message : 'Error updating image URLs', 'error')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className='admin-data-export'>
			<div className='admin-header'>
				<h1>Importar/Exportar Datos</h1>
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
					<h2>🗄️ Exportar e Importar Base de Datos</h2>
					<p className='section-description'>
						Exporta o importa <strong>toda la base de datos</strong> incluyendo juegos y todos los catálogos (Platforms, Status, PlayWith, PlayedStatus) con sus colores y
						configuración.
					</p>

					<div className='action-group'>
						<div className='action-item'>
							<h3>Exportar Base de Datos Completa (CSV)</h3>
							<p>Descarga un backup completo en formato CSV único con todos tus datos.</p>
							<button className='btn btn-primary btn-large' onClick={handleExportFullDatabase} disabled={loading}>
								{loading ? '⏳ Exportando...' : '📥 Exportar CSV'}
							</button>
						</div>

						<div className='action-item'>
							<h3>Importar Base de Datos Completa (CSV)</h3>
							<p>
								<strong>Modo MERGE:</strong> Actualiza registros existentes y crea nuevos. Los datos que no están en el CSV se mantienen intactos.
							</p>
							<small className='help-text'>⚠️ El CSV debe incluir columna "Type" (Platform/Status/PlayWith/PlayedStatus/Game)</small>
							<div className='file-input-container'>
								<input type='file' accept='.csv' onChange={handleImportFullDatabase} disabled={loading} id='csv-full-import' className='file-input' />
								<label htmlFor='csv-full-import' className='file-input-label btn btn-success btn-large'>
									{loading ? '⏳ Importando...' : '📤 Importar CSV'}
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

				{/* Network Sync Section - Only show on local environments */}
				{isLocalEnvironment && (
					<div className='section network-sync-section'>
						<h2>🌐 Sincronizar a Red</h2>
						<p className='section-description'>Sincroniza la base de datos y las imágenes a una ubicación de red compartida.</p>

						<div className='action-group'>
							<div className='action-item'>
								<h3>Sincronizar Todo (Full)</h3>
								<p>Sincroniza toda la base de datos con todas las imágenes a la red.</p>
								<button className='btn btn-success btn-large' onClick={() => handleSyncToNetwork(true)} disabled={loading}>
									{loading ? '⏳ Sincronizando...' : '🌐 Sync Full'}
								</button>
							</div>

							<div className='action-item'>
								<h3>Sincronizar Solo Actualizado (Parcial)</h3>
								<p>Sincroniza únicamente los datos y las imágenes que han sido modificados.</p>
								<button className='btn btn-secondary btn-large' onClick={() => handleSyncToNetwork(false)} disabled={loading}>
									{loading ? '⏳ Sincronizando...' : '🌐 Sync Parcial'}
								</button>
							</div>
						</div>
					</div>
				)}

				{isLocalEnvironment && (
					<div className='section folder-analysis-section'>
						<h2>📁 Análisis de Carpetas</h2>
						<p className='section-description'>Detecta duplicados potenciales y carpetas huérfanas comparando la base de datos con el sistema de archivos.</p>

						<div className='action-group'>
							<button className='btn btn-primary btn-large' onClick={handleAnalyzeFolders} disabled={analyzingFolders}>
								{analyzingFolders ? '⏳ Analizando...' : '🔍 Analizar Carpetas'}
							</button>

							<button className='btn btn-warning btn-large' onClick={handleUpdateImageUrls} disabled={loading}>
								{loading ? '⏳ Actualizando...' : '🔄 Actualizar URLs de Imágenes'}
							</button>
						</div>

						{analysisResult && (
							<div className='analysis-results'>
								<div className='analysis-summary'>
									<h3>📊 Resumen</h3>
									<div className='summary-grid'>
										<div className='summary-item'>
											<span className='summary-label'>Juegos en DB:</span>
											<span className='summary-value'>{analysisResult.totalGamesInDatabase}</span>
										</div>
										<div className='summary-item'>
											<span className='summary-label'>Carpetas en Disco:</span>
											<span className='summary-value'>{analysisResult.totalFoldersInFilesystem}</span>
										</div>
										<div className='summary-item'>
											<span className='summary-label'>Diferencia:</span>
											<span className={`summary-value ${analysisResult.difference > 0 ? 'warning' : analysisResult.difference < 0 ? 'error' : 'success'}`}>
												{analysisResult.difference > 0 && '+'}
												{analysisResult.difference}
											</span>
										</div>
									</div>
								</div>

								{analysisResult.potentialDuplicates.length > 0 && (
									<div className='duplicates-section'>
										<h3>🔍 Duplicados Potenciales ({analysisResult.potentialDuplicates.length})</h3>
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
										<h3>👻 Carpetas Huérfanas ({analysisResult.orphanFolders.length})</h3>
										<p className='section-note'>Carpetas que no corresponden a ningún juego en la base de datos</p>
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
										<h3>🔁 Duplicados en Base de Datos ({analysisResult.databaseDuplicates!.duplicateGroups.length})</h3>
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
											<h3>✅ Todo Correcto</h3>
											<p>No se encontraron duplicados ni carpetas huérfanas. La base de datos y el sistema de archivos están sincronizados.</p>
										</div>
									)}
							</div>
						)}
					</div>
				)}

				{/* Database Duplicates Section - visible to all authenticated users */}
				<div className='section folder-analysis-section'>
					<h2>🔁 Duplicados en Base de Datos</h2>
					<p className='section-description'>Detecta juegos con nombres idénticos o equivalentes (mismas palabras, distinto formato) directamente en la base de datos.</p>

					<div className='action-group'>
						<button className='btn btn-primary btn-large' onClick={handleAnalyzeDatabaseDuplicates} disabled={analyzingDbDuplicates}>
							{analyzingDbDuplicates ? '⏳ Analizando...' : '🔁 Buscar Duplicados'}
						</button>
					</div>

					{dbDuplicatesResult && (
						<div className='analysis-results'>
							<div className='analysis-summary'>
								<h3>📊 Resumen</h3>
								<div className='summary-grid'>
									<div className='summary-item'>
										<span className='summary-label'>Juegos en DB:</span>
										<span className='summary-value'>{dbDuplicatesResult.totalGamesInDatabase}</span>
									</div>
									<div className='summary-item'>
										<span className='summary-label'>Grupos duplicados:</span>
										<span className={`summary-value ${dbDuplicatesResult.duplicateGroups.length > 0 ? 'warning' : 'success'}`}>{dbDuplicatesResult.duplicateGroups.length}</span>
									</div>
								</div>
							</div>

							{dbDuplicatesResult.duplicateGroups.length > 0 && (
								<div className='duplicates-section'>
									<h3>🔍 Duplicados Encontrados ({dbDuplicatesResult.duplicateGroups.length} grupos)</h3>
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
									<h3>✅ Sin Duplicados</h3>
									<p>No se encontraron juegos duplicados en la base de datos.</p>
								</div>
							)}
						</div>
					)}
				</div>
			</div>

			{/* Instructions Section */}
			<div className='section instructions-section'>
				<h2>📚 Instrucciones y Casos de Uso</h2>
				<div className='instructions-content'>
					<div className='instruction-item'>
						<h3>� Exportar Base de Datos</h3>
						<ul>
							<li>Descarga TODO: juegos + catálogos (Platforms, Status, PlayWith, PlayedStatus)</li>
							<li>Incluye colores, orden personalizado y configuración de cada catálogo</li>
							<li>Formato único con columna "Type" para identificar cada tipo de registro</li>
							<li>Ideal para backups completos o migración entre instancias</li>
							<li>
								El archivo se descarga como: <code>database_full_export_YYYY-MM-DD.csv</code>
							</li>
						</ul>
					</div>

					<div className='instruction-item'>
						<h3>📤 Importar Base de Datos (Modo MERGE)</h3>
						<ul>
							<li>
								<strong>Actualiza</strong> registros existentes con los datos del CSV (identificación por nombre)
							</li>
							<li>
								<strong>Crea</strong> nuevos registros que no existen en la base de datos
							</li>
							<li>
								<strong>Mantiene</strong> los registros que NO están en el CSV (no es destructivo)
							</li>
							<li>En caso de conflicto, el CSV importado tiene preferencia</li>
							<li>Perfecto para sincronización y actualizaciones masivas sin perder datos</li>
							<li>Muestra estadísticas detalladas después de la importación</li>
						</ul>
					</div>

					<div className='instruction-item'>
						<h3>💡 Casos de Uso</h3>
						<ul>
							<li>
								<strong>Backup y Restauración:</strong> Exporta regularmente → Guarda el CSV → Importa cuando necesites restaurar
							</li>
							<li>
								<strong>Migración:</strong> Exporta de una instancia → Importa en otra (modo MERGE combina datos automáticamente)
							</li>
							<li>
								<strong>Sincronización entre equipos:</strong> Exporta cambios de un equipo → Importa en otros (los datos únicos de cada equipo se mantienen)
							</li>
							<li>
								<strong>Edición masiva:</strong> Exporta → Edita en Excel/LibreOffice → Reimporta (actualiza solo lo modificado en el CSV)
							</li>
							<li>
								<strong>Compartir configuración:</strong> Exporta tus catálogos personalizados → Comparte con otros usuarios
							</li>
						</ul>
					</div>

					<div className='instruction-item warning-item'>
						<h3>⚠️ Notas Importantes</h3>
						<ul>
							<li>
								<strong>Identificación:</strong> Los registros se identifican por nombre (case-insensitive, sin distinguir mayúsculas)
							</li>
							<li>
								<strong>Orden CSV:</strong> Los catálogos deben ir antes que los juegos en el archivo
							</li>
							<li>
								<strong>Columna Type:</strong> Obligatoria (Platform/Status/PlayWith/PlayedStatus/Game)
							</li>
							<li>
								<strong>Formato Fechas:</strong> Usar YYYY-MM-DD (ej: 2025-10-01) o dejar vacío
							</li>
							<li>
								<strong>Colores:</strong> Formato hexadecimal con # (ej: #2a475e)
							</li>
							<li>
								<strong>Score:</strong> Se calcula automáticamente, no es necesario incluirlo en el CSV
							</li>
							<li>
								<strong>Valores booleanos:</strong> True/False para IsActive, IsDefault, etc.
							</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
	)
}

export default AdminDataExport
