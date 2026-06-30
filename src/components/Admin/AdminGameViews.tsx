import React, { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useGameViews } from '@/hooks/useGameViews'
import { reorderGameViews } from '@/services/GameViewService'
import type { GameView, GameViewCreateDto, GameViewQueryParameters } from '@/models/api/GameView'
import GameViewModal from './GameViewModal'
import ViewTemplateSelector from './ViewTemplates'
import { DataTable, DragHandle, type DataTableColumn } from '@/components/elements/DataTable/DataTable'
import { ReorderButtons } from '@/components/elements/ReorderButtons/ReorderButtons'
import { IconButton } from '@/components/elements/IconButton/IconButton'
import { ConfirmDialog, Toast } from '@/components/elements'
import EditIcon from '@/assets/svgs/edit.svg?react'
import ExportIcon from '@/assets/svgs/export.svg?react'
import DeleteIcon from '@/assets/svgs/trashbin.svg?react'
import './AdminGameViews.scss'

export const AdminGameViews: React.FC = () => {
	const { t } = useTranslation()
	const { gameViews, loading, error, loadGameViews, loadGameViewById, deleteGameView, createGameView } = useGameViews()

	const [isModalOpen, setIsModalOpen] = useState(false)
	const [editingGameView, setEditingGameView] = useState<GameView | null>(null)
	const [views, setViews] = useState<GameView[]>([])
	const [isReordering, setIsReordering] = useState(false)
	const [reorderError, setReorderError] = useState(false)
	const [deleteTarget, setDeleteTarget] = useState<GameView | null>(null)
	const [exportingId, setExportingId] = useState<number | null>(null)
	const [copiedId, setCopiedId] = useState<number | null>(null)
	const [importPanelOpen, setImportPanelOpen] = useState(false)
	const [importText, setImportText] = useState('')
	const [importError, setImportError] = useState<string | null>(null)
	const [importing, setImporting] = useState(false)
	const [templatePanelOpen, setTemplatePanelOpen] = useState(false)
	const importTextareaRef = useRef<HTMLTextAreaElement>(null)

	const [queryParams, setQueryParams] = useState<GameViewQueryParameters>({
		page: 1,
		pageSize: 50,
		includePrivate: true,
	})

	useEffect(() => {
		loadGameViews(queryParams)
	}, [loadGameViews, queryParams])

	useEffect(() => {
		setViews(gameViews ?? [])
	}, [gameViews])

	const handleSearchChange = (search: string) => {
		setQueryParams((prev) => ({ ...prev, search: search || undefined, page: 1 }))
	}

	const handleReorder = async (orderedIds: number[]) => {
		if (isReordering) return
		const byId = new Map(views.map((view) => [view.id, view]))
		const next = orderedIds.map((id) => byId.get(id)).filter((view): view is GameView => view !== undefined)
		const previous = views
		setReorderError(false)
		setViews(next)
		setIsReordering(true)
		try {
			await reorderGameViews(orderedIds)
			await loadGameViews(queryParams)
		} catch {
			setViews(previous)
			setReorderError(true)
		} finally {
			setIsReordering(false)
		}
	}

	const moveView = (viewId: number, direction: 'up' | 'down') => {
		const ordered = [...views]
		const currentIndex = ordered.findIndex((view) => view.id === viewId)
		if (currentIndex === -1) return
		const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
		if (targetIndex < 0 || targetIndex >= ordered.length) return
		const [moved] = ordered.splice(currentIndex, 1)
		ordered.splice(targetIndex, 0, moved)
		void handleReorder(ordered.map((view) => view.id))
	}

	const handleOpenModal = async (gameView?: GameView) => {
		if (gameView && gameView.id) {
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

	const confirmDelete = async () => {
		if (!deleteTarget) return
		const target = deleteTarget
		setDeleteTarget(null)
		try {
			await deleteGameView(target.id)
			await loadGameViews(queryParams)
		} catch (error) {
			console.error('Error deleting game view:', error)
		}
	}

	const handleCreateFromTemplate = async (dto: GameViewCreateDto) => {
		await createGameView(dto)
		setTemplatePanelOpen(false)
		await loadGameViews(queryParams)
	}

	const formatFiltersPreview = (gameView: GameView): string => {
		const config = (gameView as any).configuration

		let filtersCount = 0
		let sortingCount = 0

		if (config?.filterGroups) {
			filtersCount = config.filterGroups.reduce((total: number, group: any) => {
				return total + (Array.isArray(group.filters) ? group.filters.length : 0)
			}, 0)
		} else if (Array.isArray(config?.filters)) {
			filtersCount = config.filters.length
		} else if (typeof (gameView as any).filterCount === 'number') {
			filtersCount = (gameView as any).filterCount
		} else if (Array.isArray((gameView as any).filters)) {
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

	const columns: DataTableColumn<GameView>[] = [
		{
			key: '__order',
			header: t('common.order'),
			width: '108px',
			render: (gameView, index) => (
				<div className='order-cell'>
					<DragHandle label={t('common.dragToReorder')} />
					<ReorderButtons
						canMoveUp={index > 0}
						canMoveDown={index < views.length - 1}
						onMoveUp={() => moveView(gameView.id, 'up')}
						onMoveDown={() => moveView(gameView.id, 'down')}
						isProcessing={isReordering}
						size='small'
					/>
				</div>
			),
		},
		{
			key: 'name',
			header: t('common.name'),
			render: (gameView) => <span className='view-name'>{gameView.name}</span>,
		},
		{
			key: 'config',
			header: t('admin.gameViews.configHeader'),
			render: (gameView) => (
				<span className='filters-preview' title={formatFiltersPreview(gameView)}>
					{formatFiltersPreview(gameView)}
				</span>
			),
		},
		{
			key: 'created',
			header: t('common.created'),
			render: (gameView) => new Date(gameView.createdAt).toLocaleDateString(),
		},
		{
			key: 'actions',
			header: t('common.actions'),
			align: 'right',
			width: '160px',
			render: (gameView) => (
				<div className='actions'>
					<IconButton label={t('admin.crud.edit')} icon={<EditIcon />} size='sm' onClick={() => handleOpenModal(gameView)} />
					<IconButton
						label={copiedId === gameView.id ? t('admin.gameViews.copied') : t('admin.gameViews.exportTitle')}
						icon={<ExportIcon />}
						size='sm'
						className={copiedId === gameView.id ? 'icon-button--success' : undefined}
						disabled={exportingId === gameView.id}
						onClick={() => handleExportView(gameView)}
					/>
					<IconButton label={t('admin.crud.delete')} icon={<DeleteIcon />} variant='danger' size='sm' onClick={() => setDeleteTarget(gameView)} />
				</div>
			),
		},
	]

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
						{templatePanelOpen ? (
							t('admin.crud.cancel')
						) : (
							<>
								<svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
									<path d='M13 2 3 14h7l-1 8 10-12h-7l1-8Z' />
								</svg>
								{t('admin.gameViews.templates')}
							</>
						)}
					</button>
					<button
						className='btn btn-secondary'
						onClick={() => {
							setImportPanelOpen((v) => !v)
							setImportError(null)
							setTemplatePanelOpen(false)
						}}>
						{importPanelOpen ? (
							t('admin.crud.cancel')
						) : (
							<>
								<svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
									<path d='M12 3v12' />
									<path d='m8 11 4 4 4-4' />
									<path d='M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2' />
								</svg>
								{t('admin.gameViews.importView')}
							</>
						)}
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

			{error && <div className='alert alert-error'>{error}</div>}

			<div className='controls'>
				<input
					type='text'
					placeholder={t('admin.gameViews.searchPlaceholder')}
					value={queryParams.search || ''}
					onChange={(e) => handleSearchChange(e.target.value)}
					className='search-input'
				/>
			</div>

			<div className='game-views-table'>
				<DataTable
					columns={columns}
					items={views}
					getRowId={(gameView) => gameView.id}
					loading={loading}
					emptyMessage={t('admin.gameViews.noViews')}
					sortable={{ onReorder: (orderedIds) => void handleReorder(orderedIds.map(Number)) }}
				/>
			</div>

			{isModalOpen && <GameViewModal gameView={editingGameView} onClose={handleCloseModal} onSave={handleSaveComplete} />}

			<ConfirmDialog
				isOpen={deleteTarget !== null}
				title={t('admin.crud.confirmDeleteTitle')}
				message={deleteTarget ? t('admin.gameViews.confirmDelete', { name: deleteTarget.name }) : ''}
				variant='danger'
				confirmLabel={t('admin.crud.delete')}
				onConfirm={confirmDelete}
				onCancel={() => setDeleteTarget(null)}
			/>

			<Toast isOpen={reorderError} message={t('admin.gameViews.reorderError')} type='error' onClose={() => setReorderError(false)} />
		</div>
	)
}

export default AdminGameViews
