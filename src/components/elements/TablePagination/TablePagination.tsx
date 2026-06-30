import { useTranslation } from 'react-i18next'
import { PAGE_SIZE_OPTIONS } from './constants'
import './TablePagination.scss'

export interface TablePaginationProps {
	page: number
	totalPages: number
	totalCount: number
	pageSize: number
	pageSizeOptions?: number[]
	onPageChange: (page: number) => void
	onPageSizeChange: (pageSize: number) => void
}

export const TablePagination = ({ page, totalPages, totalCount, pageSize, pageSizeOptions = PAGE_SIZE_OPTIONS, onPageChange, onPageSizeChange }: TablePaginationProps) => {
	const { t } = useTranslation()

	if (totalPages <= 1) return null

	return (
		<div className='table-pagination'>
			<label className='table-pagination__size'>
				<span>{t('admin.pagination.perPage')}</span>
				<select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
					{pageSizeOptions.map((option) => (
						<option key={option} value={option}>
							{option}
						</option>
					))}
				</select>
			</label>
			<span className='table-pagination__info'>
				{t('common.page')} {page} {t('common.of')} {totalPages} ({totalCount} {t('admin.pagination.elements')})
			</span>
			<div className='table-pagination__nav'>
				<button type='button' className='table-pagination__btn' disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
					{t('common.previous')}
				</button>
				<button type='button' className='table-pagination__btn' disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
					{t('common.next')}
				</button>
			</div>
		</div>
	)
}

export default TablePagination
