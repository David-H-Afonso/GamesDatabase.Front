import React, { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { getGlobalHistory, getAdminHistory } from '@/services/GameHistoryService'
import { updateGame } from '@/services/GamesService'
import { useAppSelector } from '@/store/hooks'
import { selectIsAdmin } from '@/store/features/auth/selector'
import { GameDetails } from '@/components/elements/GameDetails/GameDetails'
import { ConfirmDialog } from '@/components/elements'
import { useGames } from '@/hooks/useGames/useGames'
import type { Game } from '@/models/api/Game'
import type { GameHistoryEntry, GameHistoryQueryParameters } from '@/models/api/GameHistoryEntry'
import './AdminAuditLog.scss'

const ACTION_CLASS: Record<string, string> = {
	Created: 'action-created',
	Updated: 'action-updated',
	Deleted: 'action-deleted',
}

const FIELD_OPTIONS = [
	'Name',
	'Status',
	'Grade',
	'Critic',
	'CriticProvider',
	'Story',
	'Completion',
	'Platform',
	'Released',
	'Started',
	'Finished',
	'Comment',
	'PlayedStatus',
	'Logo',
	'Cover',
	'IsCheaperByKey',
	'KeyStoreUrl',
	'ManualPlaytimeMinutes',
]

const REVERTIBLE_FIELDS = new Set([
	'Name',
	'Grade',
	'Critic',
	'CriticProvider',
	'Story',
	'Completion',
	'Released',
	'Started',
	'Finished',
	'Comment',
	'Logo',
	'Cover',
	'IsCheaperByKey',
	'KeyStoreUrl',
	'ManualPlaytimeMinutes',
])

const FIELD_TO_UPDATE_KEY: Record<string, string> = {
	Name: 'name',
	Grade: 'grade',
	Critic: 'critic',
	CriticProvider: 'criticProvider',
	Story: 'story',
	Completion: 'completion',
	Released: 'released',
	Started: 'started',
	Finished: 'finished',
	Comment: 'comment',
	Logo: 'logo',
	Cover: 'cover',
	IsCheaperByKey: 'isCheaperByKey',
	KeyStoreUrl: 'keyStoreUrl',
	ManualPlaytimeMinutes: 'manualPlaytimeMinutes',
}

const NULL_MARKERS = new Set(['', '—', '-', 'null', 'undefined'])

const parseHistoryValue = (field: string, value?: string | null) => {
	if (value == null || NULL_MARKERS.has(value.trim())) return null

	if (['Grade', 'Critic', 'Story', 'Completion', 'ManualPlaytimeMinutes'].includes(field)) {
		const parsed = Number(value)
		return Number.isFinite(parsed) ? parsed : null
	}

	if (field === 'IsCheaperByKey') {
		if (value.toLowerCase() === 'true' || value.toLowerCase() === 'sí' || value.toLowerCase() === 'si') return true
		if (value.toLowerCase() === 'false' || value.toLowerCase() === 'no') return false
		return null
	}

	return value
}

export const AdminAuditLog: React.FC = () => {
	const { t } = useTranslation()
	const isAdmin = useAppSelector(selectIsAdmin)
	const { fetchGameDetails } = useGames()

	const [entries, setEntries] = useState<GameHistoryEntry[]>([])
	const [loading, setLoading] = useState(false)
	const [selectedGame, setSelectedGame] = useState<Game | null>(null)
	const [openingGameId, setOpeningGameId] = useState<number | null>(null)
	const [revertingEntryId, setRevertingEntryId] = useState<number | null>(null)
	const [revertTarget, setRevertTarget] = useState<GameHistoryEntry | null>(null)
	const [page, setPage] = useState(1)
	const [totalPages, setTotalPages] = useState(1)
	const [totalCount, setTotalCount] = useState(0)
	const pageSize = 50

	const [filters, setFilters] = useState<GameHistoryQueryParameters>({
		actionType: '',
		search: '',
		from: '',
		to: '',
	})

	const load = useCallback(
		async (currentPage: number, currentFilters: GameHistoryQueryParameters) => {
			setLoading(true)
			try {
				const params: GameHistoryQueryParameters = {
					page: currentPage,
					pageSize,
					...(currentFilters.actionType ? { actionType: currentFilters.actionType } : {}),
					...(currentFilters.field ? { field: currentFilters.field } : {}),
					...(currentFilters.search ? { search: currentFilters.search } : {}),
					...(currentFilters.from ? { from: currentFilters.from } : {}),
					...(currentFilters.to ? { to: currentFilters.to } : {}),
				}
				const fetcher = isAdmin ? getAdminHistory : getGlobalHistory
				const result = await fetcher(params)
				setEntries(result.data)
				setTotalPages(result.totalPages)
				setTotalCount(result.totalCount)
			} catch {
				setEntries([])
			} finally {
				setLoading(false)
			}
		},
		[isAdmin]
	)

	useEffect(() => {
		void load(page, filters)
	}, [load, page, filters])

	const handleFilterChange = (key: keyof GameHistoryQueryParameters, value: string) => {
		setPage(1)
		setFilters((prev) => ({ ...prev, [key]: value }))
	}

	const handlePageChange = (newPage: number) => {
		setPage(newPage)
	}

	const getRevertDisabledReason = (entry: GameHistoryEntry) => {
		if (entry.actionType !== 'Updated') return t('admin.audit.revertOnlyUpdates')
		if (!entry.gameId) return t('admin.audit.revertMissingGame')
		if (!REVERTIBLE_FIELDS.has(entry.field)) return t('admin.audit.revertUnsupportedField')
		if (entry.field === 'Name' && !entry.oldValue?.trim()) return t('admin.audit.revertUnsupportedField')
		return ''
	}

	const openGameDetails = async (entry: GameHistoryEntry) => {
		if (!entry.gameId || openingGameId !== null) return
		setOpeningGameId(entry.gameId)
		try {
			const game = await fetchGameDetails(entry.gameId)
			setSelectedGame(game as Game)
		} finally {
			setOpeningGameId(null)
		}
	}

	const requestRevert = (entry: GameHistoryEntry) => {
		const disabledReason = getRevertDisabledReason(entry)
		if (disabledReason || !entry.gameId || revertingEntryId !== null) return
		setRevertTarget(entry)
	}

	const confirmRevert = async () => {
		const entry = revertTarget
		setRevertTarget(null)
		if (!entry || !entry.gameId) return

		setRevertingEntryId(entry.id)
		try {
			const updateKey = FIELD_TO_UPDATE_KEY[entry.field]
			const updateValue = parseHistoryValue(entry.field, entry.oldValue)
			await updateGame(entry.gameId, { [updateKey]: updateValue } as any)
			await load(page, filters)
			if (selectedGame?.id === entry.gameId) {
				const refreshed = await fetchGameDetails(entry.gameId)
				setSelectedGame(refreshed as Game)
			}
		} finally {
			setRevertingEntryId(null)
		}
	}

	return (
		<div className='admin-audit-log'>
			{selectedGame && <GameDetails game={selectedGame} closeDetails={() => setSelectedGame(null)} />}

			<div className='admin-header'>
				<h1>{isAdmin ? t('admin.audit.titleAll') : t('admin.audit.title')}</h1>
				<span className='aal-count'>{t('admin.audit.entriesCount', { count: totalCount })}</span>
			</div>

			<div className='aal-filters'>
				<select value={filters.actionType ?? ''} onChange={(e) => handleFilterChange('actionType', e.target.value)}>
					<option value=''>{t('admin.audit.filterAllActions')}</option>
					<option value='Created'>{t('admin.audit.filterCreated')}</option>
					<option value='Updated'>{t('admin.audit.filterUpdated')}</option>
					<option value='Deleted'>{t('admin.audit.filterDeleted')}</option>
				</select>
				<select value={filters.field ?? ''} onChange={(e) => handleFilterChange('field', e.target.value)} aria-label={t('admin.audit.filterFieldLabel')}>
					<option value=''>{t('admin.audit.filterAllFields')}</option>
					{FIELD_OPTIONS.map((field) => (
						<option key={field} value={field}>
							{field}
						</option>
					))}
				</select>
				<input type='text' placeholder={t('admin.audit.filterSearchPlaceholder')} value={filters.search ?? ''} onChange={(e) => handleFilterChange('search', e.target.value)} />
				<input type='date' value={filters.from ?? ''} onChange={(e) => handleFilterChange('from', e.target.value)} title={t('admin.audit.dateFrom')} />
				<input type='date' value={filters.to ?? ''} onChange={(e) => handleFilterChange('to', e.target.value)} title={t('admin.audit.dateTo')} />
			</div>

			{loading ? (
				<div className='loading'>{t('common.loading')}</div>
			) : (
				<>
					<div className='aal-table-wrapper'>
						<table className='aal-table'>
							<thead>
								<tr>
									<th>{t('admin.audit.tableDate')}</th>
									<th>{t('admin.audit.tableGame')}</th>
									<th>{t('admin.audit.tableAction')}</th>
									<th>{t('admin.audit.tableField')}</th>
									<th>{t('admin.audit.tableBefore')}</th>
									<th>{t('admin.audit.tableAfter')}</th>
									<th>{t('admin.audit.tableActions')}</th>
								</tr>
							</thead>
							<tbody>
								{entries.length === 0 ? (
									<tr>
										<td colSpan={7} className='aal-empty'>
											{t('admin.audit.empty')}
										</td>
									</tr>
								) : (
									entries.map((entry) => {
										const revertDisabledReason = getRevertDisabledReason(entry)
										return (
											<tr
												key={entry.id}
												className={entry.gameId ? 'aal-row aal-row--clickable' : 'aal-row'}
												onClick={() => {
													void openGameDetails(entry)
												}}>
												<td className='aal-date'>{new Date(entry.changedAt).toLocaleString()}</td>
												<td className='aal-game'>{entry.gameName}</td>
												<td>
													<span className={`aal-badge ${ACTION_CLASS[entry.actionType] ?? ''}`}>{t(`admin.audit.badge${entry.actionType}`)}</span>
												</td>
												<td className='aal-field'>{entry.field}</td>
												<td className='aal-value aal-old'>{entry.oldValue ?? '—'}</td>
												<td className='aal-value aal-new'>{entry.newValue ?? '—'}</td>
												<td className='aal-actions' onClick={(e) => e.stopPropagation()}>
													<button
														type='button'
														className='aal-action-btn'
														onClick={() => void openGameDetails(entry)}
														disabled={!entry.gameId || openingGameId === entry.gameId}
														title={entry.gameId ? t('admin.audit.openGame') : t('admin.audit.revertMissingGame')}>
														{openingGameId === entry.gameId ? t('common.loading') : t('admin.audit.openGame')}
													</button>
													<button
														type='button'
														className='aal-action-btn aal-action-btn--revert'
														onClick={() => requestRevert(entry)}
														disabled={!!revertDisabledReason || revertingEntryId === entry.id}
														title={revertDisabledReason || t('admin.audit.revertChange')}>
														{revertingEntryId === entry.id ? t('common.loading') : t('admin.audit.revertChange')}
													</button>
												</td>
											</tr>
										)
									})
								)}
							</tbody>
						</table>
					</div>

					<div className='pagination-controls'>
						<button className='pagination-btn' disabled={page <= 1} onClick={() => handlePageChange(page - 1)}>
							{t('common.previous')}
						</button>
						<span className='pagination-info'>
							{t('common.page')} {page} {t('common.of')} {totalPages} ({t('admin.audit.entriesCount', { count: totalCount })})
						</span>
						<button className='pagination-btn' disabled={page >= totalPages} onClick={() => handlePageChange(page + 1)}>
							{t('common.next')}
						</button>
					</div>
				</>
			)}

			<ConfirmDialog
				isOpen={revertTarget !== null}
				title={t('admin.audit.revertChange')}
				message={revertTarget ? t('admin.audit.revertConfirm', { game: revertTarget.gameName, field: revertTarget.field }) : ''}
				variant='primary'
				onConfirm={confirmRevert}
				onCancel={() => setRevertTarget(null)}
			/>
		</div>
	)
}

export default AdminAuditLog
