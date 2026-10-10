import { useTranslation } from 'react-i18next'
import type { PlaylistRules } from '@/models/api/Playlist'
import type { GameStatus } from '@/models/api/GameStatus'

export default function PlaylistOrdering({ rules, statuses, onChange }: { rules: PlaylistRules; statuses: GameStatus[]; onChange: (rules: PlaylistRules) => void }) {
	const { t } = useTranslation()
	const priorityIds = [...(rules.statusPriorityIds ?? []).filter(id => rules.statusIds.includes(id)), ...rules.statusIds.filter(id => !(rules.statusPriorityIds ?? []).includes(id))]
	const move = (index: number, direction: number) => {
		const next = [...priorityIds]
		;[next[index], next[index + direction]] = [next[index + direction], next[index]]
		onChange({ ...rules, statusPriorityIds: next })
	}
	return <fieldset className='playlist-ordering'>
		<legend>{t('playlists.orderTitle')}</legend>
		<label>{t('playlists.orderMode')}<select value={rules.groupByStatus ? 'status' : 'free'} onChange={event => onChange({ ...rules, groupByStatus: event.target.value === 'status' })}>
			<option value='free'>{t('playlists.orderFree')}</option><option value='status'>{t('playlists.orderGrouped')}</option>
		</select></label>
		<p>{t(rules.groupByStatus ? 'playlists.orderGroupedHint' : 'playlists.orderFreeHint')}</p>
		{rules.groupByStatus && <ol>{priorityIds.map((id, index) => <li key={id}><span>{statuses.find(status => status.id === id)?.name ?? String(id)}</span><button type='button' disabled={index === 0} onClick={() => move(index, -1)} aria-label={`${t('common.moveUp')}: ${statuses.find(status => status.id === id)?.name}`}>↑</button><button type='button' disabled={index === priorityIds.length - 1} onClick={() => move(index, 1)} aria-label={`${t('common.moveDown')}: ${statuses.find(status => status.id === id)?.name}`}>↓</button></li>)}</ol>}
		{rules.orderedGameIds.length > 0 && <button type='button' className='playlist-button playlist-button--quiet' onClick={() => onChange({ ...rules, orderedGameIds: [] })}>{t('playlists.resetOrder')}</button>}
		{(rules.excludedGameIds?.length ?? 0) > 0 && <button type='button' className='playlist-button playlist-button--quiet' onClick={() => onChange({ ...rules, excludedGameIds: [] })}>{t('playlists.restoreExcluded', { count: rules.excludedGameIds!.length })}</button>}
	</fieldset>
}
