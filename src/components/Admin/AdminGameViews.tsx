import React, { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useGameViews } from '@/hooks/useGameViews'
import { reorderGameViews } from '@/services/GameViewService'
import type { GameView, GameViewCreateDto, GameViewQueryParameters } from '@/models/api/GameView'
import GameViewModal from './GameViewModal'
import ViewTemplateSelector from './ViewTemplates'
import { ReorderButtons } from '@/components/elements/ReorderButtons/ReorderButtons'
import './AdminGameViews.scss'

export const AdminGameViews: React.FC = () => {
	const { t } = useTranslation()
	const { gameViews, loading, error, loadGameViews, loadGameViewById, deleteGameView, createGameView } = useGameViews()

	const [isModalOpen, setIsModalOpen] = useState(false)
	const [editingGameView, setEditingGameView] = useState<GameView | null>(null)
	const [isReordering, setIsReordering] = useState(false)
	const [exportingId, setExportingId] = useState<number | null>(null)
	const [copiedId, setCopiedId] = useState<number | null>(null)
	const [importPanelOpen, setImportPanelOpen] = useState(false)
	const [importText, setImportText] = useState('')
	const [importError, setImportError] = useState<string | null>(null)
	const [importing, setImporting] = useState(false)
	const [templatePanelOpen, setTemplatePanelOpen] = useState(false)
	const importTextareaRef = useRef<HTMLTextAreaElement>(null)

	// Pagination and sorting state
	const [queryParams, setQueryParams] = useState<GameViewQueryParameters>({
		page: 1,
		pageSize: 50,
		includePrivate: true,
	})

	useEffect(() => {
		loadGameViews(queryParams)
	}, [loadGameViews, queryParams])

	const handleSearchChange = (search: string) => {
		setQueryParams((prev) => ({ ...prev, search: search || undefined, page: 1 }))
	}

	const moveView = async (viewId: number, direction: 'up' | 'down') => {
		if (isReordering || !gameViews || gameViews.length < 2) return

		const currentIndex = gameViews.findIndex((v) => v.id === viewId)
		if (currentIndex === -1) return

		const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
		if (targetIndex < 0 || targetIndex >= gameViews.length) return

		// Create new array with swapped positions
		const newOrder = [...gameViews]
		const temp = newOrder[currentIndex]
		newOrder[currentIndex] = newOrder[targetIndex]
		newOrder[targetIndex] = temp

		// Send the new order to backend
		const orderedIds = newOrder.map((v) => v.id)

		setIsReordering(true)
		try {
			await reorderGameViews(orderedIds)
			// Reload to get fresh data with updated sortOrder
			await loadGameViews(queryParams)
		} catch (err) {
			console.error('Failed to reorder views:', err)
			window.alert(t('admin.gameViews.reorderError'))
		} finally {
			setIsReordering(false)
		}
	}

	const handleOpenModal = async (gameView?: GameView) => {
		if (gameView && gameView.id) {
			// Load the full game view (with configuration) by id before opening the modal
			try {
				const full = await loadGameViewById(gameView.id)
				setEditingGameView((full as GameView) || gameView)
			} catch (err) {
				console.error('Failed to load full game view:', err)
				setEditingGameView(gameView)
			}
		} else {
			setEditingGameView(null)
		}
		setIsModalOpen(true)
	}

	const handleCloseModal = () => {
		setIsModalOpen(false)
		setEditingGameView(null)
	}

	const handleSaveComplete = async () => {
		handleCloseModal()
		await loadGameViews(queryParams)
	}

	const handleExportView = async (gameView: GameView) => {
		setExportingId(gameView.id)
		try {
			const full = await loadGameViewById(gameView.id)
			const view = (full as GameView) || gameView
			const exportData = {
				name: view.name,
				description: view.description ?? '',
				configuration: (view as any).configuration ?? {},
			}
			const json = JSON.stringify(exportData, null, 2)
			await navigator.clipboard.writeText(json)
			setCopiedId(gameView.id)
			setTimeout(() => setCopiedId(null), 2000)
		} catch {
			// fallback: open textarea with json
		} finally {
			setExportingId(null)
		}
	}

	const handleImportView = async () => {
		setImportError(null)
		if (!importText.trim()) {
			setImportError(t('admin.gameViews.importPasteError'))
			return
		}
		let parsed: any
		try {
			parsed = JSON.parse(importText.trim())
		} catch {
			setImportError(t('admin.gameViews.importInvalidJson'))
			return
		}
		if (!parsed.name || !parsed.configuration) {
			setImportError(t('admin.gameViews.importMissingFields'))
			return
		}
		setImporting(true)
		try {
			await createGameView({
				name: parsed.name,
				description: parsed.description ?? '',
				configuration: parsed.configuration,
				isPublic: true,
			})
			setImportPanelOpen(false)
			setImportText('')
			await loadGameViews(queryParams)
		} catch (err: any) {
			setImportError(err?.message ?? t('admin.gameViews.importError'))
		} finally {
			setImporting(false)
		}
	}

	const handleDelete = async (id: number, name: string) => {
		if (window.confirm(t('admin.gameViews.confirmDelete', { name }))) {
			try {
				await deleteGameView(id)
				await loadGameViews(queryParams) // Reload data after delete
			} catch (error) {
				console.error('Error deleting game view:', error)
			}
		}
	}

	const handleCreateFromTemplate = async (dto: GameViewCreateDto) => {
		await createGameView(dto)
		setTemplatePanelOpen(false)
		await loadGameViews(queryParams)
	}

	const formatFiltersPreview = (gameView: GameView): string => {
		// Prefer explicit configuration -> fallback to counts provided in the list DTO -> fallback to legacy fields
		const config = (gameView as any).configuration

		let filtersCount = 0
		let sortingCount = 0

		if (config?.filterGroups) {
			// New FilterGroups structure - count total filters across all groups
			filtersCount = config.filterGroups.reduce((total: number, group: any) => {
				return total + (Array.isArray(group.filters) ? group.filters.length : 0)
			}, 0)
		} else if (Array.isArray(config?.filters)) {
			// Legacy filters array
			filtersCount = config.filters.length
		} else if (typeof (gameView as any).filterCount === 'number') {
			// Count from list DTO summary
			filtersCount = (gameView as any).filterCount
		} else if (Array.isArray((gameView as any).filters)) {
			// Very legacy structure
			filtersCount = (gameView as any).filters.length
		}

		if (Array.isArray(config?.sorting)) {
			sortingCount = config.sorting.length
		} else if (typeof (gameView as any).sortCount === 'number') {
			sortingCount = (gameView as any).sortCount
		} else if (Array.isArray((gameView as any).sorting)) {
			sortingCount = (gameView as any).sorting.length
		}

		const parts: string[] = []
		if (filtersCount > 0) {
			if (config?.filterGroups && config.filterGroups.length > 1) {
				parts.push(t('admin.gameViews.filterGroupsSummary', { groups: config.filterGroups.length, count: filtersCount }))
			} else {
				parts.push(t('admin.gameViews.filtersSummary', { count: filtersCount }))
			}
		}
		if (sortingCount > 0) parts.push(t('admin.gameViews.sortingSummary', { count: sortingCount }))

		return parts.length > 0 ? parts.join(', ') : t('admin.gameViews.noConfig')
	}

	return (
		<div className='admin-game-views'>
			<div className='admin-header'>
				<h1>{t('admin.gameViews.title')}</h1>
				<div className='header-actions'>
					<button
						className='btn btn-secondary'
						onClick={() => {
							setTemplatePanelOpen((v) => !v)
							setImportPanelOpen(false)
						}}>
						{templatePanelOpen ? t('admin.crud.cancel') : `⚡ ${t('admin.gameViews.templates')}`}
					</button>
					<button
						className='btn btn-secondary'
						onClick={() => {
							setImportPanelOpen((v) => !v)
							setImportError(null)
							setTemplatePanelOpen(false)
						}}>
						{importPanelOpen ? t('admin.crud.cancel') : `📥 ${t('admin.gameViews.importView')}`}
					</button>
					<button className='btn btn-primary' onClick={() => handleOpenModal()}>
						{t('admin.gameViews.newView')}
					</button>
				</div>
			</div>

			{templatePanelOpen && <ViewTemplateSelector onCreateFromTemplate={handleCreateFromTemplate} onClose={() => setTemplatePanelOpen(false)} />}

			{importPanelOpen && (
				<div className='import-panel'>
					<p className='import-panel__hint'>{t('admin.gameViews.importHint')}</p>
					<textarea
						ref={importTextareaRef}
						className='import-panel__textarea'
						value={importText}
						onChange={(e) => setImportText(e.target.value)}
						placeholder='{"name": "Mi Vista", "configuration": {...}}'
						rows={6}
						spellCheck={false}
					/>
					{importError && <p className='import-panel__error'>{importError}</p>}
					<div className='import-panel__actions'>
						<button className='btn btn-primary' onClick={handleImportView} disabled={importing}>
							{importing ? t('admin.gameViews.importing') : t('admin.gameViews.import')}
						</button>
						<button
							className='btn btn-secondary'
							onClick={() => {
								setImportPanelOpen(false)
								setImportText('')
								setImportError(null)
							}}>
							{t('admin.crud.cancel')}
						</button>
					</div>
				</div>
			)}

			{error && (
				<div
					style={{
						padding: '1rem',
						color: 'red',
						backgroundColor: '#fee',
						borderRadius: '4px',
						marginBottom: '1rem',
					}}>
					Error: {error}
				</div>
			)}

			<div className='controls'>
				<input
					type='text'
					placeholder={t('admin.gameViews.searchPlaceholder')}
					value={queryParams.search || ''}
					onChange={(e) => handleSearchChange(e.target.value)}
					className='search-input'
				/>
			</div>

			{loading ? (
				<div className='loading'>{t('common.loading')}</div>
			) : (
				<div className='game-views-table'>
					<table>
						<thead>
							<tr>
								<th style={{ width: '80px' }}>{t('common.order')}</th>
								<th>{t('common.name')}</th>
								<th>{t('admin.gameViews.configHeader')}</th>
								<th>{t('common.created')}</th>
								<th>{t('common.actions')}</th>
							</tr>
						</thead>
						<tbody>
							{gameViews &&
								gameViews.map((gameView, index) => (
									<tr key={gameView.id}>
										<td>
											<ReorderButtons
												canMoveUp={index > 0}
												canMoveDown={index < gameViews.length - 1}
												onMoveUp={() => moveView(gameView.id, 'up')}
												onMoveDown={() => moveView(gameView.id, 'down')}
												isProcessing={isReordering}
											/>
										</td>
										<td className='view-name'>{gameView.name}</td>
										<td className='filters-preview' title={formatFiltersPreview(gameView)}>
											{formatFiltersPreview(gameView)}
										</td>
										<td>{new Date(gameView.createdAt).toLocaleDateString()}</td>
										<td className='actions'>
											<button
												className={`action-btn export${copiedId === gameView.id ? ' copied' : ''}`}
												onClick={() => handleExportView(gameView)}
												disabled={exportingId === gameView.id}
												title={t('admin.gameViews.exportTitle')}>
												{exportingId === gameView.id ? '...' : copiedId === gameView.id ? `✓ ${t('admin.gameViews.copied')}` : t('admin.gameViews.export')}
											</button>
											<button className='action-btn edit' onClick={() => handleOpenModal(gameView)}>
												{t('admin.crud.edit')}
											</button>
											<button className='action-btn delete' onClick={() => handleDelete(gameView.id, gameView.name)}>
												{t('admin.crud.delete')}
											</button>
										</td>
									</tr>
								))}
							{!gameViews && (
								<tr>
									<td
										colSpan={6}
										style={{
											textAlign: 'center',
											padding: '2rem',
											color: 'var(--text-secondary)',
										}}>
										{t('admin.gameViews.noViews')}
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			)}

			{isModalOpen && <GameViewModal gameView={editingGameView} onClose={handleCloseModal} onSave={handleSaveComplete} />}
		</div>
	)
}

export default AdminGameViews
