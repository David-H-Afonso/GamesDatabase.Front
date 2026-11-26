import { useEffect, useRef, useState, type FormEvent, type HTMLInputTypeAttribute, type InputHTMLAttributes, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Game, GameUpdateDto } from '@/models/api/Game'
import { useAppSelector } from '@/store/hooks'
import { gameEditorDraft, gameEditorPatch, invalidGameEditorFields, type GameEditorDraft } from '@/utils/gameEditor'
import { gameResearchLink } from '@/utils/gameResearchLinks'
import { CollectionSheet } from './CollectionSheet'
import { CollectionIcon } from './CollectionIcon'
import { GameResearchLink } from './GameResearchLink'
import { GameArtworkPreview } from './GameArtworkPreview'
import { useSteamArtworkDraft } from '@/hooks/useSteamArtworkDraft'
import type { GameArtworkRole } from '@/models/api/SteamArtwork'

export type GameEditorSection = 'personal' | 'game' | 'media' | 'studio'
const sections: GameEditorSection[] = ['personal', 'game', 'media', 'studio']
const sectionFor = (key: keyof GameEditorDraft): GameEditorSection =>
	key === 'developer'
		? 'studio'
		: ['hero', 'cover', 'logo', 'steamAppId', 'isCheaperByKey', 'keyStoreUrl'].includes(key)
			? 'media'
			: ['name', 'platformId', 'released', 'grade', 'critic', 'criticProvider', 'story', 'completion'].includes(key)
				? 'game'
				: 'personal'

export const CollectionGameEditor = ({
	game,
	initialSection = 'personal',
	initialField,
	onClose,
	onSave,
}: {
	game: Game
	initialSection?: GameEditorSection
	initialField?: keyof GameEditorDraft
	onClose: () => void
	onSave: (patch: GameUpdateDto) => Promise<void>
}) => {
	const { t } = useTranslation(),
		base = useRef(game)
	const [draft, setDraft] = useState(() => gameEditorDraft(game)),
		[section, setSection] = useState(initialSection)
	const [saving, setSaving] = useState(false),
		[error, setError] = useState(false),
		[invalid, setInvalid] = useState<Array<keyof GameEditorDraft>>([])
	const [steamIdLocked, setSteamIdLocked] = useState(game.steamAppId != null)
	const [artworkRevision, setArtworkRevision] = useState<Record<GameArtworkRole, number>>({ logo: 0, hero: 0, cover: 0 })
	const artwork = useSteamArtworkDraft(draft, (role, url) => {
		setDraft(current => ({ ...current, [role]: url }))
		setArtworkRevision(current => ({ ...current, [role]: current[role] + 1 }))
	})
	const validAppId = Number.isSafeInteger(Number(draft.steamAppId)) && Number(draft.steamAppId) > 0 && Number(draft.steamAppId) <= 2147483647
	const form = useRef<HTMLFormElement>(null),
		pendingFocus = useRef(initialField),
		tabs = useRef<Array<HTMLButtonElement | null>>([])
	const statuses = useAppSelector((state) => (state.gameStatus.statuses.length ? state.gameStatus.statuses : state.gameStatus.activeStatuses))
	const platforms = useAppSelector((state) => (state.gamePlatform.platforms.length ? state.gamePlatform.platforms : state.gamePlatform.activePlatforms))
	const played = useAppSelector((state) => state.gamePlayedStatus.playedStatuses),
		people = useAppSelector((state) => state.gamePlayWith.playWithOptions)
	const scoreProvider = useAppSelector((state) => state.auth.user?.scoreProvider)
	const researchGame = {
		name: draft.name,
		criticProvider: draft.criticProvider,
		platformName: platforms.find(value => String(value.id) === draft.platformId)?.name ?? (draft.platformId === String(base.current.platformId ?? '') ? base.current.platformName : undefined),
		steamAppId: draft.steamAppId ? Number(draft.steamAppId) : undefined,
	}
	const fieldHeading = (key: keyof GameEditorDraft, label: string) => <div className='gdb-editor-field-heading'>
		<label htmlFor={`gdb-editor-field-${game.id}-${key}`}>{label}</label>
		<GameResearchLink fieldLabel={label} link={gameResearchLink(key, researchGame, scoreProvider)} />
	</div>
	useEffect(() => {
		const field = pendingFocus.current && form.current?.elements.namedItem(pendingFocus.current)
		if (field instanceof HTMLElement) {
			field.focus({ preventScroll: true })
			pendingFocus.current = undefined
		}
	}, [section, invalid])
	const update = <K extends keyof GameEditorDraft>(key: K, value: GameEditorDraft[K]) => {
		setDraft((current) => ({ ...current, [key]: value }))
		setInvalid((current) => current.filter((field) => field !== key))
	}
	const submit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		event.stopPropagation()
		if (saving || artwork.loading) return
		const fields = invalidGameEditorFields(base.current, draft)
		if (fields.length) {
			pendingFocus.current = fields[0]
			setInvalid(fields)
			setSection(sectionFor(fields[0]))
			return
		}
		if (!event.currentTarget.reportValidity()) return
		setSaving(true)
		setError(false)
		try {
			const patch = gameEditorPatch(base.current, draft)
			if (Object.keys(patch).length) await onSave(patch)
			onClose()
		} catch {
			setError(true)
		} finally {
			setSaving(false)
		}
	}
	const input = (
		key: keyof GameEditorDraft,
		label: string,
		type: HTMLInputTypeAttribute = 'text',
		options: Pick<InputHTMLAttributes<HTMLInputElement>, 'min' | 'max' | 'maxLength' | 'step' | 'required' | 'pattern' | 'readOnly' | 'disabled'> = {},
		action?: ReactNode
	) => {
		const control = <input
				id={`gdb-editor-field-${game.id}-${key}`}
				name={key}
				aria-label={label}
				type={type}
				value={String(draft[key])}
				aria-invalid={invalid.includes(key) || undefined}
				onChange={(event) => { if (!options.readOnly && !options.disabled) update(key, event.target.value as never) }}
				{...options}
			/>
		return <div className='gdb-editor-field'>{fieldHeading(key, label)}{action ? <div className='gdb-editor-input-action'>{control}{action}</div> : control}</div>
	}
	const artworkField = (role: GameArtworkRole) => {
		const label = t(`game.details.field${role[0].toUpperCase()}${role.slice(1)}`)
		return <div className='gdb-editor-artwork-field' key={role} aria-busy={artwork.loading === role}>
			{input(role, label, 'text', { disabled: Boolean(artwork.loading) })}
			<div className='gdb-editor-artwork-result'>
				<GameArtworkPreview key={`${role}:${draft[role]}:${artworkRevision[role]}`} role={role} value={draft[role]} label={label} name={draft.name} />
				<div className='gdb-editor-artwork-actions'>
					<button type='button' className='gdb-text-button' disabled={!validAppId || Boolean(artwork.loading)} onClick={() => { void artwork.refresh(role) }} aria-label={t(`game.details.refreshSteam${role[0].toUpperCase()}${role.slice(1)}`)}>
						<CollectionIcon name='refresh' />{artwork.loading === role ? t('gallery.detail.checkingArtwork') : t(`game.details.refreshSteam${role[0].toUpperCase()}${role.slice(1)}`)}
					</button>
					{artwork.failed === role && <p className='gdb-error' role='alert'>{t('gallery.detail.artworkFailed', { role: label })}</p>}
				</div>
			</div>
		</div>
	}
	const catalog = (key: 'platformId' | 'playedStatusId', label: string, values: Array<{ id: number; name: string }>) => (
		<div className='gdb-editor-field'>
			{fieldHeading(key, label)}
			<select id={`gdb-editor-field-${game.id}-${key}`} name={key} aria-label={label} value={draft[key]} onChange={(event) => update(key, event.target.value)}>
				<option value=''>—</option>
				{draft[key] && !values.some((value) => String(value.id) === draft[key]) && (
					<option value={draft[key]}>{key === 'platformId' ? base.current.platformName : base.current.playedStatusName}</option>
				)}
				{values.map((value) => (
					<option key={value.id} value={value.id}>
						{value.name}
					</option>
				))}
			</select>
		</div>
	)
	const labelFor = (value: GameEditorSection) =>
		t(value === 'personal' ? 'gallery.detail.personal' : value === 'game' ? 'gallery.detail.game' : value === 'media' ? 'gallery.detail.images' : 'gallery.detail.studio')
	return (
		<CollectionSheet
			open
			onClose={() => !saving && onClose()}
			title={t('gallery.detail.edit')}
			subtitle={base.current.name}
			className='gdb-game-editor'
			footer={
				<>
					<button type='button' className='gdb-button' disabled={saving} onClick={onClose}>
						{t('gallery.common.cancel')}
					</button>
					<button type='submit' form={`gdb-game-editor-${game.id}`} className='gdb-button gdb-button--primary' disabled={saving || Boolean(artwork.loading)}>
						{t('gallery.detail.save')}
						<CollectionIcon name='check' />
					</button>
				</>
			}>
			<nav className='gdb-editor-tabs' role='tablist' aria-label={t('gallery.detail.chooseSection')}>
				{sections.map((value, index) => (
					<button
						key={value}
						ref={(element) => {
							tabs.current[index] = element
						}}
						id={`gdb-editor-${game.id}-${value}`}
						type='button'
						role='tab'
						aria-selected={value === section}
						aria-controls={`gdb-editor-panel-${game.id}`}
						tabIndex={value === section ? 0 : -1}
						onClick={() => setSection(value)}
						onKeyDown={(event) => {
							const next =
								event.key === 'Home'
									? 0
									: event.key === 'End'
										? sections.length - 1
										: event.key === 'ArrowRight'
											? (index + 1) % sections.length
											: event.key === 'ArrowLeft'
												? (index + sections.length - 1) % sections.length
												: -1
							if (next >= 0) {
								event.preventDefault()
								setSection(sections[next])
								tabs.current[next]?.focus()
							}
						}}>
						{labelFor(value)}
					</button>
				))}
			</nav>
			<form
				ref={form}
				id={`gdb-game-editor-${game.id}`}
				className='gdb-form gdb-editor-form'
				onSubmit={(event) => {
					void submit(event)
				}}>
				{invalid.length > 0 && (
					<p className='gdb-error' role='alert'>
						{t('gallery.detail.validation')}
					</p>
				)}
				{error && (
					<p className='gdb-error' role='alert'>
						{t('gallery.common.saveError')}
					</p>
				)}
				<fieldset disabled={saving} className='gdb-editor-panel' id={`gdb-editor-panel-${game.id}`} role='tabpanel' aria-labelledby={`gdb-editor-${game.id}-${section}`}>
					{section === 'personal' ? (
						<>
							<div className='gdb-form-grid'>
								<label>
									{t('game.details.fieldStatus')}
									<select name='statusId' aria-label={t('game.details.fieldStatus')} value={draft.statusId} onChange={(event) => update('statusId', Number(event.target.value))} required>
										{!statuses.some((value) => value.id === draft.statusId) && <option value={draft.statusId}>{base.current.statusName}</option>}
										{statuses.map((value) => (
											<option key={value.id} value={value.id}>
												{value.name}
											</option>
										))}
									</select>
								</label>
								{catalog('playedStatusId', t('game.details.fieldPlayed'), played)}
								{input('started', t('gallery.detail.startDate'), 'date')}
								{input('finished', t('gallery.detail.finishDate'), 'date')}
							</div>
							{people.length > 0 && <fieldset className='gdb-editor-people'>
								<legend>{t('gallery.detail.people')}</legend>
								{people.map((value) => (
									<label key={value.id}>
										<input
											type='checkbox'
											name='playWithIds'
											value={value.id}
											checked={draft.playWithIds.includes(value.id)}
											onChange={(event) =>
												update('playWithIds', event.target.checked ? [...new Set([...draft.playWithIds, value.id])] : draft.playWithIds.filter((id) => id !== value.id))
											}
										/>
										{value.name}
									</label>
								))}
							</fieldset>}
							<fieldset className='gdb-editor-manual'>
								<legend>{t('gallery.detail.manualTime')}</legend>
								<div className='gdb-form-grid'>
									{input('manualHours', t('gallery.detail.hours'), 'number', { min: 0, max: 10000, step: 1 })}
									{input('manualMinutes', t('gallery.detail.minutes'), 'number', { min: 0, max: 59, step: 1 })}
								</div>
								<p className='gdb-hint'>{t('gallery.detail.manualTimeHelp')}</p>
								<label className='gdb-check-label'><input name='manualPlaytimeIsAdditive' type='checkbox' checked={draft.manualPlaytimeIsAdditive} onChange={event => update('manualPlaytimeIsAdditive', event.target.checked)} />{t('gallery.detail.addManualToSteam')}</label>
							</fieldset>
							<label>
								{t('gallery.detail.notes')}
								<textarea name='comment' aria-label={t('gallery.detail.notes')} rows={5} value={draft.comment} onChange={(event) => update('comment', event.target.value)} />
							</label>
							<div className='gdb-form-grid'>
								<label className='gdb-check-label'>
									<input name='favorite' type='checkbox' checked={draft.favorite} onChange={(event) => update('favorite', event.target.checked)} />
									{t('home.filters.favorite')}
									<CollectionIcon name='star' />
								</label>
								<label className='gdb-check-label'>
									<input name='isManuallyCompleted' type='checkbox' checked={draft.isManuallyCompleted} onChange={(event) => update('isManuallyCompleted', event.target.checked)} />
									{t('gallery.detail.manualCompleted')}
								</label>
							</div>
						</>
					) : section === 'game' ? (
						<>
							{input('name', t('gallery.create.titleLabel'), 'text', { required: true, pattern: '.*\\S.*' })}
							<div className='gdb-form-grid'>
								{catalog('platformId', t('game.details.fieldPlatform'), platforms)}
								{input('released', t('game.details.fieldReleased'), 'date')}
								{input('grade', t('gallery.detail.grade'), 'number', { min: 0, max: 100, step: 1 })}
								{input('critic', t('gallery.detail.critic'), 'number', { min: 0, max: 100, step: 1 })}
								<label>
									{t('game.details.fieldCriticLogo')}
									<select name='criticProvider' value={draft.criticProvider} onChange={(event) => update('criticProvider', event.target.value)}>
										<option value=''>{t('game.details.criticDefault')}</option>
										{draft.criticProvider && !['Metacritic', 'OpenCritic', 'SteamDB'].includes(draft.criticProvider) && (
											<option value={draft.criticProvider}>{draft.criticProvider}</option>
										)}
										{['Metacritic', 'OpenCritic', 'SteamDB'].map((value) => (
											<option key={value}>{value}</option>
										))}
									</select>
								</label>
								<div className='gdb-editor-readonly'>
									<span>{t('gallery.detail.score')}</span>
									<strong>{base.current.score ?? '—'}</strong>
								</div>
								{input('story', t('gallery.detail.story'), 'number', { min: 0, step: 1 })}
								{input('completion', t('gallery.detail.completionist'), 'number', { min: 0, step: 1 })}
							</div>
							<p className='gdb-hint'>
								{t('gallery.detail.scoreHelp')} {t('gallery.detail.notProgress')}
							</p>
						</>
					) : section === 'media' ? (
						<>
							<p className='gdb-hint'>{t('gallery.detail.artworkDraftHelp')}</p>
							{(['logo', 'hero', 'cover'] as const).map(artworkField)}
							<div className='gdb-form-grid'>
								{input('steamAppId', t('game.details.fieldSteamAppId'), 'number', { min: 1, max: 2147483647, step: 1, readOnly: steamIdLocked || Boolean(artwork.loading) }, <button type='button' className='gdb-icon-button' disabled={Boolean(artwork.loading)} aria-label={t(steamIdLocked ? 'game.details.unlockSteamId' : 'game.details.lockSteamId')} title={t(steamIdLocked ? 'game.details.unlockSteamId' : 'game.details.lockSteamId')} aria-pressed={!steamIdLocked} aria-controls={`gdb-editor-field-${game.id}-steamAppId`} onClick={() => setSteamIdLocked(current => !current)}><CollectionIcon name={steamIdLocked ? 'lock' : 'unlock'} /></button>)}
								<label>
									{t('game.details.fieldCheaper')}
									<select name='isCheaperByKey' value={draft.isCheaperByKey} onChange={(event) => update('isCheaperByKey', event.target.value)}>
										<option value=''>—</option>
										<option value='true'>{t('game.details.cheaperKey')}</option>
										<option value='false'>{t('game.details.cheaperStore')}</option>
									</select>
								</label>
							</div>
							{input('keyStoreUrl', t('game.details.fieldKeyUrl'))}
							<p className='gdb-hint'>{t('gallery.detail.artworkHelp')}</p>
						</>
					) : (
						<>
							{input('developer', t('gallery.detail.studio'), 'text', { maxLength: 150 })}
							<p className='gdb-hint'>{t('gallery.detail.developerHelp')}</p>
						</>
					)}
				</fieldset>
			</form>
		</CollectionSheet>
	)
}
