import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { normalizeSearchText } from '@/utils/nameSearch'
import { CollectionIcon } from './CollectionIcon'
import './CollectionControls.scss'

interface Props { label: string; options: Array<{ id: number; label: string }>; selected: number[]; onChange: (ids: number[]) => void; emptyLabel?: string }
export const MultiSelectField = ({ label, options, selected, onChange, emptyLabel }: Props) => {
	const { t } = useTranslation(), id = useId(), [query, setQuery] = useState('')
	const visible = options.filter(option => normalizeSearchText(option.label).includes(normalizeSearchText(query)))
	const names = options.filter(option => selected.includes(option.id)).map(option => option.label)
	return <details className='gdb-multi-select'><summary><span>{label}</span><b>{names.length ? names.slice(0, 2).join(', ') + (names.length > 2 ? ` +${names.length - 2}` : '') : emptyLabel ?? t('gallery.rules.any')}</b><CollectionIcon name='down' /></summary>
		<div className='gdb-multi-select__panel'><label className='gdb-search-input' htmlFor={id}><CollectionIcon name='search' /><span className='sr-only'>{t('gallery.rules.searchOptions', { label })}</span><input id={id} type='search' value={query} onChange={event => setQuery(event.target.value)} placeholder={t('gallery.rules.searchPlaceholder')} /></label>
			<div className='gdb-multi-select__tools'><button type='button' className='gdb-text-button' disabled={!visible.length} onClick={() => onChange([...new Set([...selected, ...visible.map(option => option.id)])])}>{t('gallery.rules.selectVisible')}</button><button type='button' className='gdb-text-button' onClick={() => onChange([])}>{t('gallery.rules.clearSelection')}</button><span aria-live='polite'>{t('gallery.rules.selectedCount', { count: selected.length })}</span></div>
			<fieldset><legend className='sr-only'>{label}</legend>{visible.map(option => <label key={option.id}><input type='checkbox' value={option.id} checked={selected.includes(option.id)} onChange={event => onChange(event.target.checked ? [...new Set([...selected, option.id])] : selected.filter(value => value !== option.id))} />{option.label}</label>)}{!visible.length && <p className='gdb-hint'>{t('gallery.rules.noOptions')}</p>}</fieldset>
		</div>
	</details>
}
