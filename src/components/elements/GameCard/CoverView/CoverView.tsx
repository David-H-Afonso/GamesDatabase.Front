import type { Game } from '@/models/api/Game'
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppSelector } from '@/store/hooks'
import { GameArtwork } from '@/components/Collection/GameArtwork'
import { CollectionIcon } from '@/components/Collection/CollectionIcon'
import { GameTitle } from '@/components/Collection/GameTitle'
import { SampleBadge } from '@/components/Collection/SampleBadge'
import { isGameCompleted, isGameFullyCompleted, completionLabelKey, completionTitleKey } from '@/utils/gameCompletion'
import './CoverView.scss'

interface CoverViewProps {
	game: Game
	openDetails: (game: Game) => void
	onAutoFill?: () => void
	isSelected?: boolean
	onSelect?: (gameId: number, isSelected: boolean) => void
	index?: number
	gameStatusColor?: string
	playWithColors?: (string | undefined)[]
	onFieldUpdate?: (gameId: number, field: string, value: number | number[] | boolean | undefined) => Promise<void>
	hideSelection?: boolean
}

const CoverView = ({ game, openDetails, onAutoFill, isSelected = false, onSelect, index = 0, gameStatusColor, onFieldUpdate, hideSelection = false }: CoverViewProps) => {
	const { t } = useTranslation()
	const [editor, setEditor] = useState<'options' | 'status' | 'playWith' | null>(null)
	const [saving, setSaving] = useState(false),
		[error, setError] = useState(false)
	const cover = useRef<HTMLElement>(null),
		panel = useRef<HTMLDivElement>(null),
		opener = useRef<HTMLButtonElement | null>(null)
	const statuses = useAppSelector((state) => state.gameStatus.activeStatuses)
	const playWith = useAppSelector((state) => state.gamePlayWith.playWithOptions)
	const edit = (value: typeof editor, event: MouseEvent<HTMLButtonElement>) => {
		opener.current = event.currentTarget
		setError(false)
		setEditor((current) => (current === value ? null : value))
	}
	const close = () => {
		setEditor(null)
		if (opener.current?.isConnected) opener.current.focus({ preventScroll: true })
	}
	useEffect(() => {
		if (!editor) return
		panel.current?.querySelector<HTMLElement>('button[aria-pressed="true"], button, input')?.focus({ preventScroll: true })
		const outside = (event: PointerEvent) => {
			if (!cover.current?.contains(event.target as Node)) setEditor(null)
		}
		document.addEventListener('pointerdown', outside)
		return () => document.removeEventListener('pointerdown', outside)
	}, [editor])
	const update = async (field: string, value: number | number[] | boolean, closeAfter = false) => {
		if (saving || !onFieldUpdate) return
		setSaving(true)
		setError(false)
		try {
			await onFieldUpdate(game.id, field, value)
			if (closeAfter) close()
		} catch {
			setError(true)
		} finally {
			setSaving(false)
		}
	}
	return (
		<article
			ref={cover}
			className={`game-cover-view ${isSelected ? 'is-selected' : ''}`}
			aria-label={game.name}
			onBlur={(event) => {
				if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) setEditor(null)
			}}>
			{!hideSelection && (
				<label className='game-cover-view__select'>
					<input type='checkbox' checked={isSelected} onChange={(event) => onSelect?.(game.id, event.target.checked)} aria-label={t('game.card.selectGame', { name: game.name })} />
				</label>
			)}
			<div className='game-cover-view__art-frame'>
				<GameTitle
					name={game.name}
					tooltip='hold'
					className='game-cover-view__open-art gdb-image-open'
					onOpen={() => openDetails(game)}
					ariaLabel={t('gallery.home.openGame', { name: game.name })}>
					<GameArtwork game={game} role='cover' className='game-cover-view__art' eager={index < 8} />
					<span className='gdb-art-hover'>
						{t('gallery.detail.open')}
						<CollectionIcon name='arrow' />
					</span>
				</GameTitle>
				<button
					type='button'
					className={`game-cover-view__favorite ${game.favorite ? 'is-active' : ''}`}
					aria-pressed={game.favorite}
					aria-label={t(game.favorite ? 'game.card.removeFavorite' : 'game.card.markFavorite')}
					disabled={!onFieldUpdate || saving}
					onClick={() => {
						void update('favorite', !game.favorite)
					}}>
					<CollectionIcon name='star' />
				</button>
				{isGameCompleted(game) && (
					<span className='game-cover-view__badge gdb-completion-badge' data-completion={isGameFullyCompleted(game) ? 'full' : 'completed'} title={t(completionTitleKey(game))}>
						{t(completionLabelKey(game))}
					</span>
				)}
			</div>
			<footer className='game-cover-view__meta'>
				<h3>
					<GameTitle name={game.name} onOpen={() => openDetails(game)} />
				</h3>
				<SampleBadge game={game} />
				<div className='game-cover-view__meta-line'>
					{game.platformName && <span title={game.platformName}>{game.platformName}</span>}
					{game.statusName && (
						<button
							type='button'
							className='game-cover-view__status'
							style={{ '--gdb-status-color': gameStatusColor || '#81958c' } as CSSProperties}
							onClick={(event) => edit('status', event)}
							disabled={!onFieldUpdate}
							aria-expanded={editor === 'status'}>
							<i aria-hidden='true' />
							{game.statusName}
						</button>
					)}
				</div>
				{onFieldUpdate && (
					<button
						type='button'
						className='game-cover-view__options-trigger'
						aria-label={t('gallery.detail.gameOptions')}
						aria-expanded={editor !== null}
						onClick={(event) => edit('options', event)}>
						<CollectionIcon name='more' />
					</button>
				)}
			</footer>
			{editor && (
				<div
					ref={panel}
					className='game-cover-view__quick-editor'
					role='dialog'
					aria-label={t('gallery.detail.gameOptions')}
					onKeyDown={(event) => {
						if (event.key === 'Escape') {
							event.preventDefault()
							event.stopPropagation()
							close()
						}
					}}>
					<div className='game-cover-view__editor-head'>
						<strong>{t(editor === 'status' ? 'game.details.fieldStatus' : editor === 'playWith' ? 'game.details.fieldPlayWith' : 'gallery.detail.gameOptions')}</strong>
						<button type='button' aria-label={t('common.close')} onClick={close}>
							<CollectionIcon name='close' />
						</button>
					</div>
					{error && (
						<p className='gdb-error' role='alert'>
							{t('gallery.common.saveError')}
						</p>
					)}
					{editor === 'options' ? (
						<>
							{onAutoFill && <button type='button' onClick={() => { close(); onAutoFill() }}>{t('metadata.action')}<CollectionIcon name='auto' /></button>}
							<button type='button' onClick={() => setEditor('status')}>
								{t('game.details.fieldStatus')}
								<span>{game.statusName}</span>
							</button>
							<button type='button' onClick={() => setEditor('playWith')}>
								{t('game.details.fieldPlayWith')}
								<span>{game.playWithNames?.join(', ') || '—'}</span>
							</button>
							<button
								type='button'
								onClick={() => {
									setEditor(null)
									openDetails(game)
								}}>
								{t('gallery.detail.open')}
								<CollectionIcon name='arrow' />
							</button>
						</>
					) : editor === 'status' ? (
						statuses.map((status) => (
							<button
								key={status.id}
								type='button'
								aria-pressed={game.statusId === status.id}
								disabled={saving}
								onClick={() => {
									void update('statusId', status.id, true)
								}}>
								<i style={{ background: status.color }} />
								{status.name}
							</button>
						))
					) : (
						playWith.map((value) => (
							<label key={value.id}>
								<input
									type='checkbox'
									checked={game.playWithIds?.includes(value.id) ?? false}
									disabled={saving}
									onChange={(event) => {
										const ids = game.playWithIds ?? []
										void update('playWithIds', event.target.checked ? [...new Set([...ids, value.id])] : ids.filter((id) => id !== value.id))
									}}
								/>
								{value.name}
							</label>
						))
					)}
				</div>
			)}
		</article>
	)
}

export default CoverView
