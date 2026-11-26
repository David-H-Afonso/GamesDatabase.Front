import React, { useEffect, useState, useCallback, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { getReplaysByGameId, createGameReplay, updateGameReplay, deleteGameReplay } from '@/services/GameReplayService'
import { getActiveGameReplayTypes, getSpecialGameReplayType } from '@/services/GameReplayTypeService'
import { ConfirmDialog } from '@/components/elements'
import type { GameReplay, GameReplayCreateDto } from '@/models/api/GameReplay'
import type { GameReplayType } from '@/models/api/GameReplayType'
import { formatToLocaleDate } from '@/utils'
import { useAppDispatch } from '@/store/hooks'
import { triggerGamesRefresh } from '@/store/features/games/gamesSlice'
import './GameReplaysTab.scss'
import { CollectionSheet } from '@/components/Collection/CollectionSheet'
import { CollectionIcon } from '@/components/Collection/CollectionIcon'
import { formatCollectionDate } from '@/utils/collectionFormatting'
import './GalleryGameTabs.scss'

interface Props {
	gameId: number
	gallery?: boolean
}

const ReplayEditorFrame = ({ gallery, title, onClose, footer, children }: { gallery: boolean; title: string; onClose: () => void; footer: ReactNode; children: ReactNode }) =>
	gallery ? (
		<CollectionSheet open onClose={onClose} title={title} className='gdb-replay-editor' footer={footer}>
			{children}
		</CollectionSheet>
	) : (
		<div className='grt-form'>{children}</div>
	)

const emptyForm = (defaultTypeId?: number): GameReplayCreateDto => ({
	gameId: 0,
	replayTypeId: defaultTypeId,
	started: '',
	finished: '',
	grade: undefined,
	notes: '',
	released: '',
})

export const GameReplaysTab: React.FC<Props> = ({ gameId, gallery = false }) => {
	const { t, i18n } = useTranslation()
	const dispatch = useAppDispatch()
	const [replays, setReplays] = useState<GameReplay[]>([])
	const [replayTypes, setReplayTypes] = useState<GameReplayType[]>([])
	const [defaultTypeId, setDefaultTypeId] = useState<number | undefined>()
	const [loading, setLoading] = useState(false)
	const [isFormOpen, setIsFormOpen] = useState(false)
	const [editingReplay, setEditingReplay] = useState<GameReplay | null>(null)
	const [formData, setFormData] = useState<GameReplayCreateDto>(emptyForm())
	const [saving, setSaving] = useState(false)
	const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null)
	const [loadError, setLoadError] = useState(false),
		[saveError, setSaveError] = useState(false)

	const loadReplays = useCallback(async () => {
		setLoading(true)
		setLoadError(false)
		try {
			const data = await getReplaysByGameId(gameId)
			setReplays(data)
		} catch {
			setLoadError(true)
		} finally {
			setLoading(false)
		}
	}, [gameId])

	useEffect(() => {
		void (async () => {
			try {
				const [types, special] = await Promise.all([getActiveGameReplayTypes(), getSpecialGameReplayType().catch(() => null)])
				setReplayTypes(types)
				if (special) setDefaultTypeId(special.id)
			} catch {
				// types can be empty
			}
		})()
		void loadReplays()
	}, [loadReplays])

	const openNewForm = () => {
		setEditingReplay(null)
		setSaveError(false)
		setFormData(emptyForm(defaultTypeId))
		setIsFormOpen(true)
	}

	const openEditForm = (replay: GameReplay) => {
		setEditingReplay(replay)
		setSaveError(false)
		setFormData({
			gameId,
			replayTypeId: replay.replayTypeId,
			started: replay.started ?? '',
			finished: replay.finished ?? '',
			grade: replay.grade ?? undefined,
			notes: replay.notes ?? '',
			released: replay.released ?? '',
		})
		setIsFormOpen(true)
	}

	const handleCloseForm = () => {
		if (saving) return
		setIsFormOpen(false)
		setEditingReplay(null)
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		e.stopPropagation()
		if (saving) return
		setSaving(true)
		setSaveError(false)
		try {
			const payload = {
				...formData,
				gameId,
				started: formData.started || undefined,
				finished: formData.finished || undefined,
				grade: formData.grade !== undefined && formData.grade !== null && String(formData.grade) !== '' ? Number(formData.grade) : undefined,
				notes: formData.notes || undefined,
				released: formData.released || undefined,
			}
			if (editingReplay) {
				await updateGameReplay(gameId, editingReplay.id, { ...payload, id: editingReplay.id })
			} else {
				await createGameReplay(gameId, payload)
			}
			setIsFormOpen(false)
			setEditingReplay(null)
			await loadReplays()
			dispatch(triggerGamesRefresh())
		} catch {
			setSaveError(true)
		} finally {
			setSaving(false)
		}
	}

	const handleDelete = (id: number) => setDeleteTargetId(id)

	const confirmDelete = async () => {
		if (deleteTargetId === null || saving) return
		const id = deleteTargetId
		setSaving(true)
		setSaveError(false)
		try {
			await deleteGameReplay(gameId, id)
			setReplays((prev) => prev.filter((r) => r.id !== id))
			setDeleteTargetId(null)
			setIsFormOpen(false)
			setEditingReplay(null)
			dispatch(triggerGamesRefresh())
		} catch {
			setSaveError(true)
		} finally {
			setSaving(false)
		}
	}

	if (loading)
		return (
			<div className='grt-loading' role='status'>
				{t('game.replays.loading')}
			</div>
		)

	return (
		<div className={`game-replays-tab ${gallery ? 'gdb-gallery-replays' : ''}`}>
			<div className='grt-header'>
				{gallery ? <h3>{t('gallery.tabs.playthroughs')}</h3> : <span className='grt-count'>{t('game.replays.count', { count: replays.length })}</span>}
				<button type='button' className={gallery ? 'gdb-button' : 'grt-add-btn'} onClick={openNewForm}>
					{gallery ? <CollectionIcon name='plus' /> : '+ '}
					{t(gallery ? 'gallery.tabs.addPlaythrough' : 'game.replays.addReplay')}
				</button>
			</div>
			{gallery && <p className='gdb-hint gdb-replays-help'>{t('gallery.tabs.replayHelp')}</p>}
			{loadError && (
				<p className='gdb-error' role='alert'>
					{t('gallery.common.loadError')}{' '}
					<button
						type='button'
						className='gdb-text-button'
						onClick={() => {
							void loadReplays()
						}}>
						{t('gallery.common.retry')}
					</button>
				</p>
			)}
			{saveError && !isFormOpen && (
				<p className='gdb-error' role='alert'>
					{t('gallery.common.saveError')}
				</p>
			)}

			{replays.length === 0 && !isFormOpen && <p className='grt-empty'>{t('game.replays.noReplays')}</p>}

			{replays.length > 0 && (
				<ul className='grt-list'>
					{replays.map((replay, index) => (
						<li key={replay.id} className='grt-item'>
							{gallery && <span className='grt-number'>{String(index + 1).padStart(2, '0')}</span>}
							<div className='grt-item-header'>
								<span className='grt-type-badge' style={gallery ? undefined : { backgroundColor: replay.replayTypeColor ?? 'var(--primary)', color: '#fff' }}>
									{replay.replayTypeName ?? 'Rejugado'}
								</span>
								{replay.grade !== undefined && replay.grade !== null && <span className='grt-grade'>{replay.grade}/100</span>}
							</div>
							<div className='grt-dates'>
								{gallery ? (
									`${formatCollectionDate(replay.started, i18n.language)} → ${formatCollectionDate(replay.finished, i18n.language)}`
								) : (
									<>
										{replay.started && <span>{formatToLocaleDate(replay.started)}</span>}
										{replay.started && replay.finished && <span> – </span>}
										{replay.finished && <span>{formatToLocaleDate(replay.finished)}</span>}
									</>
								)}
							</div>
							{replay.released && (
								<p className='grt-released'>
									{t('game.replays.released')}: {formatToLocaleDate(replay.released)}
								</p>
							)}
							{replay.notes && <p className='grt-notes'>{replay.notes}</p>}
							<div className='grt-actions'>
								<button type='button' className={gallery ? 'gdb-icon-button' : 'grt-edit-btn'} aria-label={t('common.edit')} onClick={() => openEditForm(replay)}>
									{gallery ? <CollectionIcon name='edit' /> : t('common.edit')}
								</button>
								{!gallery && (
									<button className='grt-delete-btn' onClick={() => handleDelete(replay.id)}>
										{t('common.delete')}
									</button>
								)}
							</div>
						</li>
					))}
				</ul>
			)}

			{isFormOpen && (
				<ReplayEditorFrame
					gallery={gallery}
					title={editingReplay ? t('game.replays.editReplay') : t('game.replays.newReplay')}
					onClose={handleCloseForm}
					footer={
						<>
							{editingReplay && (
								<button
									type='button'
									className='gdb-icon-button gdb-replay-delete'
									disabled={saving}
									aria-label={t('common.delete')}
									onClick={() => handleDelete(editingReplay.id)}>
									<CollectionIcon name='trash' />
								</button>
							)}
							<button type='button' className='gdb-button' disabled={saving} onClick={handleCloseForm}>
								{t('common.cancel')}
							</button>
							<button type='submit' form={`gdb-replay-form-${gameId}`} className='gdb-button gdb-button--primary' disabled={saving}>
								{t('common.saveChanges')}
								<CollectionIcon name='check' />
							</button>
						</>
					}>
					{!gallery && (
						<div className='grt-form-header'>
							<h3>{editingReplay ? t('game.replays.editReplay') : t('game.replays.newReplay')}</h3>
							<button className='grt-form-close' onClick={handleCloseForm}>
								×
							</button>
						</div>
					)}
					{saveError && (
						<p className='gdb-error' role='alert'>
							{t('gallery.common.saveError')}
						</p>
					)}
					<form id={`gdb-replay-form-${gameId}`} className={gallery ? 'gdb-form' : ''} onSubmit={handleSubmit}>
						<div className='grt-form-field'>
							<label htmlFor='grt-type'>{t('game.replays.type')}</label>
							<select
								id='grt-type'
								value={formData.replayTypeId ?? ''}
								onChange={(e) => setFormData({ ...formData, replayTypeId: e.target.value ? Number(e.target.value) : undefined })}>
								<option value=''> {t('game.replays.noType')} </option>
								{replayTypes.map((t) => (
									<option key={t.id} value={t.id}>
										{t.name}
									</option>
								))}
							</select>
						</div>
						<div className='grt-form-row'>
							<div className='grt-form-field'>
								<label htmlFor='grt-started'>{t('game.replays.started')}</label>
								<input id='grt-started' type='date' value={formData.started ?? ''} onChange={(e) => setFormData({ ...formData, started: e.target.value })} />
							</div>
							<div className='grt-form-field'>
								<label htmlFor='grt-finished'>{t('game.replays.finished')}</label>
								<input id='grt-finished' type='date' value={formData.finished ?? ''} onChange={(e) => setFormData({ ...formData, finished: e.target.value })} />
							</div>
							<div className='grt-form-field'>
								<label htmlFor='grt-released'>{t('game.replays.released')}</label>
								<input id='grt-released' type='date' value={formData.released ?? ''} onChange={(e) => setFormData({ ...formData, released: e.target.value })} />
							</div>
						</div>
						<div className='grt-form-field'>
							<label htmlFor='grt-grade'>{t('game.replays.grade')}</label>
							<input
								id='grt-grade'
								type='number'
								min={0}
								max={100}
								value={formData.grade ?? ''}
								onChange={(e) => setFormData({ ...formData, grade: e.target.value ? Number(e.target.value) : undefined })}
								placeholder={t('common.optional')}
							/>
						</div>
						<div className='grt-form-field'>
							<label htmlFor='grt-notes'>{t('game.replays.notes')}</label>
							<textarea
								id='grt-notes'
								rows={3}
								value={formData.notes ?? ''}
								onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
								placeholder={t('common.optional')}
							/>
						</div>
						{!gallery && (
							<div className='grt-form-actions'>
								<button type='button' className='grt-cancel-btn' onClick={handleCloseForm}>
									{t('common.cancel')}
								</button>
								<button type='submit' className='grt-submit-btn' disabled={saving}>
									{saving ? t('common.saving') : editingReplay ? t('common.saveChanges') : t('common.create')}
								</button>
							</div>
						)}
					</form>
				</ReplayEditorFrame>
			)}

			<ConfirmDialog
				isOpen={deleteTargetId !== null}
				title={t('common.confirmDeleteTitle')}
				message={t('game.replays.confirmDelete')}
				variant='danger'
				confirmLabel={t('common.delete')}
				isConfirming={saving}
				onConfirm={confirmDelete}
				onCancel={() => !saving && setDeleteTargetId(null)}
			/>
		</div>
	)
}
