import React, { useState } from 'react'
import { exportGamesCSV, downloadBlob, importGamesCSV } from '@/services'
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

	const handleExportGames = async () => {
		try {
			setLoading(true)
			console.log('Starting export...')
			const blob = await exportGamesCSV()
			console.log('Export blob received:', blob)
			const filename = `games_export_${new Date().toISOString().split('T')[0]}.csv`
			downloadBlob(blob, filename)
			showMessage('Games exported successfully!', 'success')
		} catch (error) {
			console.error('Export error:', error)
			showMessage(error instanceof Error ? error.message : 'Error exporting games', 'error')
		} finally {
			setLoading(false)
		}
	}

	const handleImportGames = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		if (!file) return

		try {
			setLoading(true)
			const result = await importGamesCSV(file)
			showMessage(`Games imported successfully! ${result.message || ''}`, 'success')

			// Refrescar la lista de juegos para mostrar los nuevos datos
			// Usar los filtros actuales para mantener la misma vista
			await refreshGames(filters)
		} catch (error) {
			console.error('Import error:', error)
			showMessage(error instanceof Error ? error.message : 'Error importing games', 'error')
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

			{message && <div className={`alert alert-${messageType}`}>{message}</div>}

			<div className='export-import-sections'>
				{/* Export Section */}
				<div className='section export-section'>
					<h2>Exportar Datos</h2>
					<p>Exporta todos los juegos a un archivo CSV para respaldo o análisis.</p>
					<button className='btn btn-primary' onClick={handleExportGames} disabled={loading}>
						{loading ? 'Exportando...' : 'Exportar Juegos a CSV'}
					</button>
				</div>

				{/* Import Section */}
				<div className='section import-section'>
					<h2>Importar Datos</h2>
					<p>Importa juegos desde un archivo CSV. El archivo debe seguir el formato estándar.</p>
					<div className='file-input-container'>
						<input
							type='file'
							accept='.csv'
							onChange={handleImportGames}
							disabled={loading}
							id='csv-import'
							className='file-input'
						/>
						<label htmlFor='csv-import' className='file-input-label btn btn-secondary'>
							{loading ? 'Importando...' : 'Seleccionar archivo CSV'}
						</label>
					</div>
					<small className='help-text'>Formatos soportados: CSV (.csv). Tamaño máximo: 10MB</small>
				</div>
			</div>

			{/* Instructions Section */}
			<div className='section instructions-section'>
				<h2>Instrucciones</h2>
				<div className='instructions-content'>
					<div className='instruction-item'>
						<h3>Exportar</h3>
						<ul>
							<li>Haz clic en "Exportar Juegos a CSV" para descargar todos los juegos</li>
							<li>El archivo incluirá todos los campos disponibles</li>
							<li>Útil para respaldos o análisis de datos</li>
						</ul>
					</div>
					<div className='instruction-item'>
						<h3>Importar</h3>
						<ul>
							<li>Selecciona un archivo CSV con el formato correcto</li>
							<li>Los datos existentes no se sobrescribirán automáticamente</li>
							<li>Revisa el resultado para confirmar la importación</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
	)
}

export default AdminDataExport
