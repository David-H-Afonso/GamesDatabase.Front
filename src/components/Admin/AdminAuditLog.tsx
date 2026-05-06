import React, { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { getGlobalHistory, getAdminHistory } from '@/services/GameHistoryService'
import { useAppSelector } from '@/store/hooks'
import { selectIsAdmin } from '@/store/features/auth/selector'
import type { GameHistoryEntry, GameHistoryQueryParameters } from '@/models/api/GameHistoryEntry'
import './AdminAuditLog.scss'

const ACTION_CLASS: Record<string, string> = {
	Created: 'action-created',
	Updated: 'action-updated',
	Deleted: 'action-deleted',
}

export const AdminAuditLog: React.FC = () => {
	const { t } = useTranslation()
	const isAdmin = useAppSelector(selectIsAdmin)

	const [entries, setEntries] = useState<GameHistoryEntry[]>([])
	const [loading, setLoading] = useState(false)
	const [page, setPage] = useState(1)
	const [totalPages, setTotalPages] = useState(1)
	const [totalCount, setTotalCount] = useState(0)
	const pageSize = 50

	const [filters, setFilters] = useState<GameHistoryQueryParameters>({
		actionType: '',
		field: '',
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

	return (
		<div className='admin-audit-log'>
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
				<input type='text' placeholder={t('admin.audit.filterFieldPlaceholder')} value={filters.field ?? ''} onChange={(e) => handleFilterChange('field', e.target.value)} />
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
								</tr>
							</thead>
							<tbody>
								{entries.length === 0 ? (
									<tr>
										<td colSpan={6} className='aal-empty'>
											{t('admin.audit.empty')}
										</td>
									</tr>
								) : (
									entries.map((entry) => (
										<tr key={entry.id}>
											<td className='aal-date'>{new Date(entry.changedAt).toLocaleString()}</td>
											<td className='aal-game'>{entry.gameName}</td>
											<td>
												<span className={`aal-badge ${ACTION_CLASS[entry.actionType] ?? ''}`}>{t(`admin.audit.badge${entry.actionType}`)}</span>
											</td>
											<td className='aal-field'>{entry.field}</td>
											<td className='aal-value aal-old'>{entry.oldValue ?? '—'}</td>
											<td className='aal-value aal-new'>{entry.newValue ?? '—'}</td>
										</tr>
									))
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
		</div>
	)
}

export default AdminAuditLog
