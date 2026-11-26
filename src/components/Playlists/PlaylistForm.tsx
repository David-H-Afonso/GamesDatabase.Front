import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { Playlist, PlaylistCreateDto, PlaylistGroup } from '@/models/api/Playlist'
import { PlaylistRulesFields, type PlaylistRulesFieldsHandle } from '@/components/Collection/PlaylistRulesFields'
import { CollectionTemplatePicker } from '@/components/Collection/CollectionTemplatePicker'
import { CollectionIcon } from '@/components/Collection/CollectionIcon'
import { blankPlaylistRules } from '@/utils/playlistRules'
import { playlistFromTemplate } from '@/utils/collectionTemplates'

const emptyDraft = (): PlaylistCreateDto => ({ name: '', description: '', isAutomatic: false, maxLength: null, heroUrl: '', coverUrl: '', logoUrl: '', rules: blankPlaylistRules() })

export const PlaylistForm = ({ initial, groups, onClose, onSave }: {
	initial?: Playlist | null
	groups: PlaylistGroup[]
	onClose: () => void
	onSave: (data: PlaylistCreateDto, groupId: number | null) => Promise<void>
}) => {
	const { t } = useTranslation()
	const [form, setForm] = useState<PlaylistCreateDto>(() => ({
		maxLength: initial?.maxLength ?? null,
		name: initial?.name ?? '',
		description: initial?.description ?? '',
		heroUrl: initial?.heroUrlOverride ?? '',
		coverUrl: initial?.coverUrlOverride ?? '',
		logoUrl: initial?.logoUrlOverride ?? '',
		isAutomatic: initial?.isAutomatic ?? false,
		rules: initial?.rules ? structuredClone(initial.rules) : blankPlaylistRules(),
	}))
	const [saving, setSaving] = useState(false), [error, setError] = useState(false)
	const [groupId, setGroupId] = useState(initial?.groupId ?? null)
	const [choosingTemplate, setChoosingTemplate] = useState(!initial), [hasDraft, setHasDraft] = useState(Boolean(initial))
	const rulesFields = useRef<PlaylistRulesFieldsHandle>(null)
	const titleInput = useRef<HTMLInputElement>(null), chooser = useRef<HTMLDivElement>(null)
	useEffect(() => {
		if (initial) return
		if (choosingTemplate) chooser.current?.querySelector<HTMLButtonElement>('[data-template]')?.focus()
		else titleInput.current?.focus()
	}, [choosingTemplate, initial])
	const update = (key: keyof PlaylistCreateDto, value: string) => setForm(current => ({ ...current, [key]: value }))
	const beginDraft = (draft: PlaylistCreateDto) => { setForm(draft); setHasDraft(true); setChoosingTemplate(false); setError(false) }
	const submit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		if (!form.name.trim() || saving || !event.currentTarget.checkValidity()) return
		setSaving(true); setError(false)
		try { await onSave({ ...form, name: form.name.trim(), ...(form.isAutomatic ? { rules: rulesFields.current?.getValue() ?? form.rules } : {}) }, groupId) }
		catch { setError(true) }
		finally { setSaving(false) }
	}
	if (choosingTemplate) return <div ref={chooser}>
		{hasDraft && <><button type='button' className='gdb-text-button gdb-template-back' onClick={() => setChoosingTemplate(false)}><CollectionIcon name='back' />{t('gallery.templates.resume')}</button><p className='gdb-hint'>{t('gallery.templates.replaceDraft')}</p></>}
		<CollectionTemplatePicker scope='playlist' onSelect={id => beginDraft(playlistFromTemplate(id, t))} onCustom={() => beginDraft(emptyDraft())} />
		<button type='button' className='gdb-button gdb-template-cancel' onClick={onClose}>{t('common.cancel')}</button>
	</div>
	return <form className='playlist-form gdb-form' onSubmit={submit}>
		{error && <p className='gdb-error' role='alert'>{t('gallery.common.saveError')}</p>}
		{!initial && <button type='button' className='gdb-text-button gdb-template-back' disabled={saving} onClick={() => {
			const rules = form.isAutomatic ? rulesFields.current?.getValue() ?? form.rules : form.rules
			setForm(current => ({ ...current, rules })); setChoosingTemplate(true)
		}}><CollectionIcon name='back' />{t('gallery.templates.change')}</button>}
		<h3>{t('gallery.playlist.yourPlaylist')}</h3>
		<label>{t('playlists.name')}<input ref={titleInput} value={form.name} maxLength={150} onChange={event => update('name', event.target.value)} required /></label>
		<label>{t('playlists.description')}<textarea value={form.description} onChange={event => update('description', event.target.value)} rows={3} /></label>
		<div className='gdb-form-grid'>
			<label>{t('gallery.rules.type')}<select aria-label={t('gallery.rules.type')} value={form.isAutomatic ? 'automatic' : 'manual'} onChange={event => setForm(current => ({ ...current, isAutomatic: event.target.value === 'automatic' }))}><option value='manual'>{t('gallery.rules.manual')}</option><option value='automatic'>{t('gallery.rules.automatic')}</option></select></label>
			<label>{t('gallery.rules.folder')}<select aria-label={t('gallery.rules.folder')} value={groupId ?? ''} onChange={event => setGroupId(event.target.value ? Number(event.target.value) : null)}><option value=''>{t('gallery.rules.noFolder')}</option>{groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
		</div>
		<label>{t('playlists.maxLength')}<input type='number' min='1' step='1' value={form.maxLength ?? ''} placeholder={t('playlists.unlimited')} onChange={event => setForm(current => ({ ...current, maxLength: event.target.value === '' ? null : Number(event.target.value) }))} /><small>{t('playlists.maxLengthHint')}</small></label>
		<details className='gdb-rules-advanced'><summary>{t('gallery.rules.artwork')}<CollectionIcon name='down' /></summary><div className='playlist-form__grid'>
			<label>{t('playlists.heroUrl')}<input type='url' value={form.heroUrl ?? ''} onChange={event => update('heroUrl', event.target.value)} placeholder={t('playlists.urlPlaceholder')} /></label>
			<label>{t('playlists.coverUrl')}<input type='url' value={form.coverUrl ?? ''} onChange={event => update('coverUrl', event.target.value)} placeholder={t('playlists.urlPlaceholder')} /></label>
			<label>{t('playlists.logoUrl')}<input type='url' value={form.logoUrl ?? ''} onChange={event => update('logoUrl', event.target.value)} placeholder={t('playlists.urlPlaceholder')} /></label>
		</div></details>
		{form.isAutomatic && <PlaylistRulesFields ref={rulesFields} rules={form.rules!} maxLength={form.maxLength} onChange={rules => setForm(current => ({ ...current, rules }))} />}
		<div className='playlist-form__actions'><button type='button' className='gdb-button' disabled={saving} onClick={onClose}>{t('common.cancel')}</button><button type='submit' className='gdb-button gdb-button--primary' disabled={saving}>{saving ? t('common.saving') : t('gallery.rules.savePlaylist')}<CollectionIcon name='check' /></button></div>
	</form>
}
