import React, { useState } from 'react'
import { exportFullDatabase, downloadBlob, importFullDatabase } from '@/services'
import { useGames } from '@/hooks'
import './AdminDataExport.scss'

export const AdminDataExport: React.FC = () => {
	const [loading, setLoading] = useState(false)
	const [message, setMessage] = useState<string | null>(null)
	const [messageType, setMessageType] = useState<'success' | 'error'>('success')

	// Hook para manejar los juegos
	const { refreshGames, filters } = useGames()

	const showMessage = (text: string, type: 'success' | 'error') => {
		setMessage(text)
		setMessageType(type)
		setTimeout(() => setMessage(null), 5000)
	}

	const handleExportFullDatabase = async () => {
		try {
			setLoading(true)
			console.log('Starting full database export...')
			const blob = await exportFullDatabase()
			console.log('Full export blob received:', blob)
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
				- PlayedStatuses: ${catalogStats.playedStatuses.imported} new, ${
				catalogStats.playedStatuses.updated
			} updated
				
				Games: ${gameStats.imported} new, ${gameStats.updated} updated
				
				${result.errors.length > 0 ? `Errors: ${result.errors.join(', ')}` : ''}
			`

			showMessage(detailedMessage, result.errors.length > 0 ? 'error' : 'success')

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

	return (
		<div className='admin-data-export'>
			<div className='admin-header'>
				<h1>Importar/Exportar Datos</h1>
			</div>

			{message && (
				<div className={`alert alert-${messageType}`}>
					<pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{message}</pre>
				</div>
			)}

			<div className='export-import-sections'>
				{/* Full Database Export/Import Section */}
				<div className='section full-export-section highlight-section'>
					<h2>🗄️ Exportar e Importar Base de Datos</h2>
					<p className='section-description'>
						Exporta o importa <strong>toda la base de datos</strong> incluyendo juegos y todos los
						catálogos (Platforms, Status, PlayWith, PlayedStatus) con sus colores y configuración.
					</p>

					<div className='action-group'>
						<div className='action-item'>
							<h3>Exportar Base de Datos Completa</h3>
							<p>Descarga un backup completo en formato CSV único con todos tus datos.</p>
							<button
								className='btn btn-primary btn-large'
								onClick={handleExportFullDatabase}
								disabled={loading}>
								{loading ? '⏳ Exportando...' : '📥 Exportar Base de Datos'}
							</button>
						</div>

						<div className='action-item'>
							<h3>Importar Base de Datos Completa</h3>
							<p>
								<strong>Modo MERGE:</strong> Actualiza registros existentes y crea nuevos. Los datos
								que no están en el CSV se mantienen intactos.
							</p>
							<div className='file-input-container'>
								<input
									type='file'
									accept='.csv'
									onChange={handleImportFullDatabase}
									disabled={loading}
									id='csv-full-import'
									className='file-input'
								/>
								<label
									htmlFor='csv-full-import'
									className='file-input-label btn btn-success btn-large'>
									{loading ? '⏳ Importando...' : '📤 Importar Base de Datos'}
								</label>
							</div>
							<small className='help-text'>
								⚠️ El CSV debe incluir columna "Type" (Platform/Status/PlayWith/PlayedStatus/Game)
							</small>
						</div>
					</div>
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
								<strong>Actualiza</strong> registros existentes con los datos del CSV
								(identificación por nombre)
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
								<strong>Backup y Restauración:</strong> Exporta regularmente → Guarda el CSV →
								Importa cuando necesites restaurar
							</li>
							<li>
								<strong>Migración:</strong> Exporta de una instancia → Importa en otra (modo MERGE
								combina datos automáticamente)
							</li>
							<li>
								<strong>Sincronización entre equipos:</strong> Exporta cambios de un equipo →
								Importa en otros (los datos únicos de cada equipo se mantienen)
							</li>
							<li>
								<strong>Edición masiva:</strong> Exporta → Edita en Excel/LibreOffice → Reimporta
								(actualiza solo lo modificado en el CSV)
							</li>
							<li>
								<strong>Compartir configuración:</strong> Exporta tus catálogos personalizados →
								Comparte con otros usuarios
							</li>
						</ul>
					</div>

					<div className='instruction-item warning-item'>
						<h3>⚠️ Notas Importantes</h3>
						<ul>
							<li>
								<strong>Identificación:</strong> Los registros se identifican por nombre
								(case-insensitive, sin distinguir mayúsculas)
							</li>
							<li>
								<strong>Orden CSV:</strong> Los catálogos deben ir antes que los juegos en el
								archivo
							</li>
							<li>
								<strong>Columna Type:</strong> Obligatoria
								(Platform/Status/PlayWith/PlayedStatus/Game)
							</li>
							<li>
								<strong>Formato Fechas:</strong> Usar YYYY-MM-DD (ej: 2025-10-01) o dejar vacío
							</li>
							<li>
								<strong>Colores:</strong> Formato hexadecimal con # (ej: #2a475e)
							</li>
							<li>
								<strong>Score:</strong> Se calcula automáticamente, no es necesario incluirlo en el
								CSV
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
