import { useTranslation } from 'react-i18next'
import { useAppSelector } from '@/store/hooks'
import type { RecommendationFilters } from '@/models/api/Discovery'
import { MultiSelectField } from './MultiSelectField'

export const RecommendationFiltersFields = ({ value, onChange }: { value: RecommendationFilters; onChange: (value: RecommendationFilters) => void }) => {
	const { t } = useTranslation()
	const statuses = useAppSelector(state => [...state.gameStatus.statuses, ...state.gameStatus.activeStatuses])
	const byId = new Map(statuses.map(status => [status.id, { id: status.id, label: status.name }]))
	for (const id of [...value.includedStatusIds, ...value.excludedStatusIds]) if (!byId.has(id)) byId.set(id, { id, label: t('gallery.home.unavailable') })
	const options = [...byId.values()]
	return <div className='gdb-recommendation-filters'>
		<p className='gdb-hint'>{t('gallery.discovery.filterHelp')}</p>
		<MultiSelectField label={t('gallery.discovery.included')} options={options} selected={value.includedStatusIds} emptyLabel={t('gallery.discovery.regular')} onChange={ids => onChange({ ...value, includedStatusIds: ids })} />
		<MultiSelectField label={t('gallery.discovery.excluded')} options={options} selected={value.excludedStatusIds} emptyLabel={t('gallery.discovery.none')} onChange={ids => onChange({ ...value, excludedStatusIds: ids })} />
	</div>
}
