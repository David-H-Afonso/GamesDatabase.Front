import { forwardRef, useEffect, useId, useImperativeHandle, useMemo, useRef, useState, type InputHTMLAttributes, type Ref } from 'react'
import { useTranslation } from 'react-i18next'
import type { NameSearch } from '@/models/api/NameSearch'
import { createNameSearch } from '@/utils/nameSearch'
import { CollectionIcon } from './CollectionIcon'
import './CollectionControls.scss'

export interface NameSearchFieldHandle {
	getValue: () => NameSearch
}
interface Props {
	value: NameSearch
	onChange: (value: NameSearch) => void
	onEffectiveChange?: (value: NameSearch) => void
	global?: boolean
	exact?: boolean
	initiallyExpanded?: boolean
	mainInputRef?: Ref<HTMLInputElement>
	mainInputProps?: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'id' | 'maxLength' | 'placeholder'>
}
export const NameSearchField = forwardRef<NameSearchFieldHandle, Props>(function NameSearchField(
	{ value, onChange, onEffectiveChange, global = false, exact = false, initiallyExpanded = false, mainInputRef, mainInputProps },
	ref
) {
	const { t } = useTranslation(),
		id = useId()
	const [include, setInclude] = useState(''),
		[exclude, setExclude] = useState('')
	const effective = useMemo(
		() => createNameSearch({ ...value, includeTerms: [...value.includeTerms, include], excludeTerms: [...value.excludeTerms, exclude] }),
		[value, include, exclude]
	)
	const effectiveKey = JSON.stringify(effective),
		callback = useRef(onEffectiveChange)
	callback.current = onEffectiveChange
	useImperativeHandle(ref, () => ({ getValue: () => effective }), [effective])
	useEffect(() => {
		callback.current?.(JSON.parse(effectiveKey) as NameSearch)
	}, [effectiveKey])
	const commit = (kind: 'includeTerms' | 'excludeTerms') => {
		const pending = kind === 'includeTerms' ? include : exclude
		if (!pending.trim() || value[kind].length >= 20) return
		onChange(createNameSearch({ ...value, [kind]: [...value[kind], pending] }))
		if (kind === 'includeTerms') setInclude('')
		else setExclude('')
	}
	const entry = (kind: 'includeTerms' | 'excludeTerms', label: string) => (
		<div className='gdb-name-terms'>
			<label htmlFor={`${id}-${kind}`}>{label}</label>
			{value[kind].length > 0 && (
				<div className='gdb-term-chips'>
					{value[kind].map((term, index) => (
						<span key={`${index}:${term}`}>
							{term}
							<button
								type='button'
								aria-label={t('gallery.search.removeTerm', { term })}
								onClick={() => onChange(createNameSearch({ ...value, [kind]: value[kind].filter((_, current) => current !== index) }))}>
								<CollectionIcon name='close' />
							</button>
						</span>
					))}
				</div>
			)}
			<div className='gdb-term-add'>
				<input
					{...(kind === 'includeTerms' ? mainInputProps : {})}
					ref={kind === 'includeTerms' ? mainInputRef : undefined}
					id={`${id}-${kind}`}
					type='search'
					value={kind === 'includeTerms' ? include : exclude}
					maxLength={250}
					placeholder={t(global && kind === 'includeTerms' ? 'gallery.search.globalPlaceholder' : 'gallery.search.phrasePlaceholder')}
					autoComplete='off'
					onChange={(event) => (kind === 'includeTerms' ? setInclude(event.target.value) : setExclude(event.target.value))}
					onKeyDown={(event) => {
						if (kind === 'includeTerms') mainInputProps?.onKeyDown?.(event)
						if (!event.defaultPrevented && event.key === 'Enter') {
							event.preventDefault()
							event.stopPropagation()
							commit(kind)
						}
					}}
				/>
				<button type='button' className='gdb-icon-button' onClick={() => commit(kind)} disabled={value[kind].length >= 20} aria-label={t('gallery.search.addTerm')}>
					<CollectionIcon name='plus' />
				</button>
			</div>
		</div>
	)
	return (
		<section className='gdb-name-search'>
			{entry('includeTerms', t(global ? 'gallery.search.globalLabel' : 'gallery.search.nameLabel'))}
			<details className='gdb-search-options' open={initiallyExpanded || undefined}>
				<summary>
					{t('gallery.search.advanced')}
					<CollectionIcon name='down' />
				</summary>
				<div className='gdb-form-grid'>
					<label>
						{t('gallery.search.matchMode')}
						<select
							aria-label={t('gallery.search.matchMode')}
							value={value.matchMode}
							onChange={(event) => onChange({ ...value, matchMode: event.target.value as NameSearch['matchMode'] })}>
							<option value='any'>{t('gallery.search.anyTerms')}</option>
							<option value='all'>{t('gallery.search.allTerms')}</option>
						</select>
					</label>
					{exact && (
						<label>
							{t('gallery.search.matchType')}
							<select
								aria-label={t('gallery.search.matchType')}
								value={value.matchType}
								onChange={(event) => onChange({ ...value, matchType: event.target.value as NameSearch['matchType'] })}>
								<option value='contains'>{t('gallery.search.contains')}</option>
								<option value='exact'>{t('gallery.search.exact')}</option>
							</select>
						</label>
					)}
				</div>
				{entry('excludeTerms', t('gallery.search.excludedTerms'))}
				<div className='gdb-check-options'>
					<label>
						<input type='checkbox' checked={value.caseSensitive} onChange={(event) => onChange({ ...value, caseSensitive: event.target.checked })} />
						{t('gallery.search.caseSensitive')}
					</label>
					<label>
						<input type='checkbox' checked={value.accentSensitive} onChange={(event) => onChange({ ...value, accentSensitive: event.target.checked })} />
						{t('gallery.search.accentSensitive')}
					</label>
				</div>
				<p className='gdb-hint'>{t('gallery.search.termHelp')}</p>
			</details>
		</section>
	)
})
