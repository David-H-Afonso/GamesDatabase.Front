import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Game, GameUpdateDto } from '@/models/api/Game'
import { useAppSelector } from '@/store/hooks'
import { useGames } from '@/hooks/useGames/useGames'
import { useCollectionResource } from '@/hooks/useCollectionResource'
import { getGameById, deleteGame } from '@/services/GamesService/GamesService'
import { GameReplaysTab } from '@/components/elements/GameDetails/GameReplaysTab'
import { GameHistoryTab } from '@/components/elements/GameDetails/GameHistoryTab'
import { SteamTab } from '@/components/elements/GameDetails/SteamTab'
import { ConfirmDialog } from '@/components/elements/ConfirmDialog/ConfirmDialog'
import { CollectionSheet } from './CollectionSheet'
import { CollectionIcon } from './CollectionIcon'
import { useGameMetadata } from './gameMetadataContext'
import { SampleBadge } from './SampleBadge'
import { GameArtwork } from './GameArtwork'
import { CollectionGameEditor, type GameEditorSection } from './CollectionGameEditor'
import { effectivePlaytime, formatCollectionDate, formatCollectionNumber, playtimeSourceKey } from '@/utils/collectionFormatting'
import { isGameCompleted, isGameFullyCompleted } from '@/utils/gameCompletion'
import type { GameEditorDraft } from '@/utils/gameEditor'
import { gameResearchLink } from '@/utils/gameResearchLinks'
import { GameResearchLink } from './GameResearchLink'
import { CollectionFocusAction } from './CollectionFocusAction'
import { steamLaunchUrl } from '@/utils/steamLaunch'
import './CollectionGameDetails.scss'

interface Props {
	game: Game
	closeDetails: () => void
	onDelete?: (game: Game) => void
}
type Tab = 'info' | 'replays' | 'history' | 'steam'

export const CollectionGameDetails = ({ game: initial, closeDetails, onDelete }: Props) => {
	const { t, i18n } = useTranslation(),
		{ updateGameById } = useGames()
	const [unavailable, setUnavailable] = useState(false)
	const resource = useCollectionResource(`detail:${initial.id}`, async (signal) => {
		try {
			return await getGameById(initial.id, signal)
		} catch (error) {
			if (!signal.aborted && error instanceof Error && 'status' in error && error.status === 404) setUnavailable(true)
			throw error
		}
	})
	useEffect(() => {
		if (unavailable) closeDetails()
	}, [unavailable, closeDetails])
	const game = resource.data ?? initial
	const metadata = useGameMetadata()
	const [tab, setTab] = useState<Tab>('info'), [options, setOptions] = useState(false)
	const [editing, setEditing] = useState<{ section: GameEditorSection; field?: keyof GameEditorDraft } | null>(null)
	const [saving, setSaving] = useState(false),
		[error, setError] = useState(false),
		[confirmDelete, setConfirmDelete] = useState(false)
	const trigger = useRef<HTMLButtonElement>(null),
		menu = useRef<HTMLDivElement>(null)
	const statuses = useAppSelector((state) => (state.gameStatus.statuses.length ? state.gameStatus.statuses : state.gameStatus.activeStatuses))
	const scoreProvider = useAppSelector((state) => state.auth.user?.scoreProvider)
	const activeTab = tab === 'steam' && !game.steamAppId ? 'info' : tab
	const edit = (section: GameEditorSection = 'personal', field?: keyof GameEditorDraft) => {
		if (options) trigger.current?.focus()
		setOptions(false)
		setError(false)
		setEditing({ section, field })
	}
	const savePatch = async (patch: GameUpdateDto) => {
		const result = await updateGameById(game.id, patch)
		if (result && typeof result === 'object' && 'id' in result && result.id === game.id) resource.replaceData(result as Game)
	}
	const quickSave = async (patch: GameUpdateDto) => {
		if (saving) return
		setSaving(true)
		setError(false)
		try {
			await savePatch(patch)
		} catch {
			setError(true)
		} finally {
			setSaving(false)
		}
	}
	const requestDelete = () => {
		trigger.current?.focus()
		setOptions(false)
		if (onDelete) onDelete(game)
		else setConfirmDelete(true)
	}
	useEffect(() => {
		if (!options) return
		menu.current?.querySelector<HTMLElement>('button')?.focus()
		const outside = (event: PointerEvent) => {
			if (!menu.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setOptions(false)
		}
		document.addEventListener('pointerdown', outside)
		return () => document.removeEventListener('pointerdown', outside)
	}, [options])
	const remove = async () => {
		if (saving) return
		setSaving(true)
		setError(false)
		try {
			await deleteGame(game.id)
			closeDetails()
		} catch {
			setError(true)
		} finally {
			setSaving(false)
		}
	}
	const minutes = effectivePlaytime(game),
		number = (value: number) => formatCollectionNumber(value, i18n.language)
	const hours = (value: number | null | undefined) => (value == null ? '—' : `${number(value)} h`)
	const timeSource = minutes == null ? '—' : t(playtimeSourceKey(game))
	const fact = (label: string, value: string | number, section: GameEditorSection, field?: keyof GameEditorDraft) => (
		<div>
			<dt>{label}{field && <GameResearchLink fieldLabel={label} link={gameResearchLink(field, game, scoreProvider)} />}</dt>
			<dd>
				<button type='button' onClick={() => edit(section, field)}>
					{value}
					<CollectionIcon name='edit' />
				</button>
			</dd>
		</div>
	)
	return (
		<>
			<CollectionSheet
				open
				onClose={closeDetails}
				title={game.name}
				className='gdb-game-sheet'
				header={
					<>
						<div className='gdb-detail-breadcrumb'>
							<span>{t('gallery.library.title')}</span>
							<span aria-hidden='true'>/</span>
							<span>{t('gallery.detail.source')}</span>
						</div>
						<button
							ref={trigger}
							type='button'
							className='gdb-icon-button'
							aria-label={t('gallery.detail.gameOptions')}
							aria-expanded={options}
							aria-haspopup='dialog'
							onClick={() => setOptions((value) => !value)}>
							<CollectionIcon name='more' />
						</button>
						{options && (
							<div
								ref={menu}
								className='gdb-detail-options'
								role='dialog'
								aria-label={t('gallery.detail.gameOptions')}
								onKeyDown={(event) => {
									if (event.key === 'Escape') {
										event.preventDefault()
										event.stopPropagation()
										setOptions(false)
										trigger.current?.focus()
									}
								}}>
								<button type='button' onClick={() => edit()}>
									<CollectionIcon name='edit' />
									{t('gallery.detail.edit')}
								</button>
								{metadata && <button type='button' onClick={() => { setOptions(false); trigger.current?.focus(); metadata.open(game) }}><CollectionIcon name='auto' />{t('metadata.action')}</button>}
								<button type='button' className='gdb-detail-delete' onClick={requestDelete}>
									<CollectionIcon name='trash' />
									{t('game.details.deleteGame')}
								</button>
							</div>
						)}
					</>
				}>
				<div className='gdb-detail-hero'>
					<GameArtwork game={game} role='hero' eager />
					<div className='gdb-detail-hero__shade' />
				</div>
				<div className='gdb-detail-identity'>
					<span className='gdb-detail-cover'>
						<GameArtwork game={game} eager />
					</span>
					<div>
						<div className='gdb-detail-provenance'>
							{game.platformName}
							{game.released ? ` · ${formatCollectionDate(game.released, i18n.language)}` : ''}
						</div>
						<h3>{game.name}</h3>
						<SampleBadge game={game} />
						<div className='gdb-detail-identity-meta'>{[game.playedStatusName, game.playWithNames?.join(', ')].filter(Boolean).join(' · ') || t('gallery.detail.yourGame')}</div>
					</div>
				</div>
				<div className='gdb-detail-actions'>
					{steamLaunchUrl(game.steamAppId) && <a className='gdb-button gdb-button--primary gdb-detail-play' href={steamLaunchUrl(game.steamAppId)!} title={t('gallery.detail.steamRequired')}><CollectionIcon name='play' />{t('gallery.detail.playSteam')}</a>}
					<label className='gdb-detail-status'>
						<i style={{ background: statuses.find((value) => value.id === game.statusId)?.color }} />
						<span className='sr-only'>{t('game.details.fieldStatus')}</span>
						<select
							value={game.statusId}
							disabled={saving}
							onChange={(event) => {
								void quickSave({ statusId: Number(event.target.value) })
							}}>
							{!statuses.some((value) => value.id === game.statusId) && <option value={game.statusId}>{game.statusName}</option>}
							{statuses.map((value) => (
								<option key={value.id} value={value.id}>
									{value.name}
								</option>
							))}
						</select>
						<CollectionIcon name='down' />
					</label>
					<span className='gdb-detail-platform'>{game.platformName}</span>
					<button
						type='button'
						className={`gdb-detail-favorite ${game.favorite ? 'is-active' : ''}`}
						aria-label={t(game.favorite ? 'game.card.removeFavorite' : 'game.card.markFavorite')}
						aria-pressed={game.favorite}
						disabled={saving}
						onClick={() => {
							void quickSave({ favorite: !game.favorite })
						}}>
						<CollectionIcon name='star' />
						{t('home.filters.favorite')}
					</button>
					<CollectionFocusAction game={game} />
				</div>
				{error && (
					<p className='gdb-error' role='alert'>
						{t('gallery.common.saveError')}
					</p>
				)}
				<nav className='gdb-detail-tabs' aria-label={t('gallery.detail.yourGame')}>
					{(['info', 'replays', 'history', ...(game.steamAppId ? ['steam'] : [])] as Tab[]).map((value) => (
						<button type='button' key={value} aria-current={activeTab === value ? 'page' : undefined} onClick={() => setTab(value)}>
							{value === 'steam' ? 'Steam' : t(`game.details.tab${value[0].toUpperCase()}${value.slice(1)}`)}
						</button>
					))}
				</nav>
				<div className='gdb-detail-tab-content'>
					{activeTab === 'info' ? (
						<>
							<section className='gdb-detail-personal'>
								<div className='gdb-detail-section-title'>
									<h3>{t('gallery.detail.yourGame')}</h3>
									<button type='button' className='gdb-text-button' onClick={() => edit()}>
										<CollectionIcon name='edit' />
										{t('gallery.detail.edit')}
									</button>
								</div>
								<div className='gdb-detail-metrics'>
									<div>
										<span>{t('gallery.library.rowGrade')}</span>
										<button type='button' onClick={() => edit('game', 'grade')}>
											<strong>{game.grade ?? '—'}</strong>
											<small>{game.grade == null ? t('gallery.common.noRating') : '/100'}</small>
										</button>
									</div>
									<div>
										<span>{t('focus.timePlayed')}</span>
										<button type='button' onClick={() => edit('personal', 'manualHours')}>
											<strong>{hours(minutes == null ? null : minutes / 60)}</strong>
										</button>
									</div>
									<div>
										<span>{t('gallery.detail.timeSource')}</span>
										<strong className='gdb-detail-source-value'>{timeSource}</strong>
									</div>
								</div>
								{minutes != null && (
									<p className='gdb-detail-exact-time'>
										{Math.floor(minutes / 60)} h {minutes % 60} min · {t(playtimeSourceKey(game))}
									</p>
								)}
								<dl className='gdb-detail-facts'>
									{fact(t('game.details.fieldPlayed'), game.playedStatusName || '—', 'personal', 'playedStatusId')}
									{fact(t('gallery.detail.companions'), game.playWithNames?.join(', ') || '—', 'personal')}
									{fact(t('gallery.statCopy.started'), formatCollectionDate(game.started, i18n.language), 'personal', 'started')}
									{fact(t('gallery.statCopy.finished'), formatCollectionDate(game.finished, i18n.language), 'personal', 'finished')}
									{fact(t('gallery.detail.manualTime'), (game.manualPlaytimeMinutes ?? 0) > 0 ? hours(game.manualPlaytimeMinutes! / 60) : t('gallery.detail.useSteam'), 'personal', 'manualHours')}
									{fact(t('gallery.detail.manualCompleted'), t(game.isManuallyCompleted ? 'gallery.rules.yes' : 'gallery.rules.no'), 'personal')}
								</dl>
							</section>
							{game.comment && (
								<section className='gdb-detail-section'>
									<div className='gdb-detail-section-title'>
										<h3>{t('gallery.detail.notes')}</h3>
										<button type='button' className='gdb-text-button' onClick={() => edit('personal', 'comment')}>
											<CollectionIcon name='edit' />
											{t('gallery.common.edit')}
										</button>
									</div>
									<p className='gdb-detail-comment'>{game.comment}</p>
								</section>
							)}
							<section className='gdb-detail-section'>
								<div className='gdb-detail-section-title'>
									<h3>{t('gallery.detail.estimated')}</h3>
									<span>{t('gallery.detail.notProgress')}</span>
								</div>
								<div className='gdb-duration-estimates'>
									<div><button type='button' onClick={() => edit('game', 'story')}>
										<span>{t('gallery.detail.story')}</span>
										<strong>{hours(game.story)}</strong>
									</button><GameResearchLink fieldLabel={t('gallery.detail.story')} link={gameResearchLink('story', game)} /></div>
									<div><button type='button' onClick={() => edit('game', 'completion')}>
										<span>{t('gallery.detail.completionist')}</span>
										<strong>{hours(game.completion)}</strong>
									</button><GameResearchLink fieldLabel={t('gallery.detail.completionist')} link={gameResearchLink('completion', game)} /></div>
								</div>
							</section>
							<section className='gdb-detail-section'>
								<div className='gdb-detail-section-title'>
									<h3>{t('gallery.detail.metadata')}</h3>
									<button type='button' className='gdb-text-button' onClick={() => edit('game')}>
										<CollectionIcon name='edit' />
										{t('gallery.common.edit')}
									</button>
								</div>
								<dl className='gdb-detail-facts'>
									{fact(t('game.details.fieldPlatform'), game.platformName || '—', 'game', 'platformId')}
									{fact(t('game.details.fieldReleased'), formatCollectionDate(game.released, i18n.language), 'game', 'released')}
									{fact(t('gallery.detail.critic'), game.critic ?? '—', 'game', 'critic')}
									{fact(t('gallery.detail.score'), game.score ?? '—', 'game')}
									{fact(t('gallery.detail.studio'), game.developer || '—', 'studio', 'developer')}
									<div>
										<dt>
											{t('gallery.statistics.completed')} / {t('gallery.statistics.strict')}
										</dt>
										<dd>
											{t(isGameCompleted(game) ? 'gallery.rules.yes' : 'gallery.rules.no')} / {t(isGameFullyCompleted(game) ? 'gallery.rules.yes' : 'gallery.rules.no')}
										</dd>
									</div>
								</dl>
							</section>
							<section className='gdb-detail-section'>
								<div className='gdb-detail-section-title'>
									<h3>{t('gallery.detail.images')}</h3>
									<button type='button' className='gdb-text-button' onClick={() => edit('media')}>
										<CollectionIcon name='edit' />
										{t('gallery.common.edit')}
									</button>
								</div>
								<div className='gdb-detail-artwork'>
									{(['logo', 'hero', 'cover'] as const).map((role) => (
										<div key={role}><button type='button' onClick={() => edit('media', role)}>
											<span className={`gdb-detail-artwork-mini is-${role}`}>
												<GameArtwork game={game} role={role} width={180} />
											</span>
											<span>
												<b>{t(`game.details.field${role[0].toUpperCase()}${role.slice(1)}`)}</b>
												<code>{game[role] || '—'}</code>
											</span>
											<CollectionIcon name='edit' />
										</button><GameResearchLink fieldLabel={t(`game.details.field${role[0].toUpperCase()}${role.slice(1)}`)} link={gameResearchLink(role, game)} /></div>
									))}
								</div>
							</section>
						</>
					) : activeTab === 'replays' ? (
						<GameReplaysTab gameId={game.id} gallery />
					) : activeTab === 'history' ? (
						<GameHistoryTab gameId={game.id} gallery />
					) : game.steamAppId ? (
						<SteamTab game={game} gallery />
					) : null}
				</div>
			</CollectionSheet>
			{editing && <CollectionGameEditor game={game} initialSection={editing.section} initialField={editing.field} onClose={() => setEditing(null)} onSave={savePatch} />}
			<ConfirmDialog
				isOpen={confirmDelete}
				title={t('common.confirmDeleteTitle')}
				message={t('home.confirmDeleteGame')}
				variant='danger'
				confirmLabel={t('common.delete')}
				isConfirming={saving}
				onCancel={() => !saving && setConfirmDelete(false)}
				onConfirm={() => {
					void remove()
				}}
			/>
		</>
	)
}
