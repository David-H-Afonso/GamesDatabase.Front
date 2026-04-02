import React, { useEffect, useState, useCallback } from 'react'
import { getReplaysByGameId, createGameReplay, updateGameReplay, deleteGameReplay } from '@/services/GameReplayService'
import { getActiveGameReplayTypes, getSpecialGameReplayType } from '@/services/GameReplayTypeService'
import type { GameReplay, GameReplayCreateDto } from '@/models/api/GameReplay'
import type { GameReplayType } from '@/models/api/GameReplayType'
import { formatToLocaleDate } from '@/utils'
import './GameReplaysTab.scss'

interface Props {
	gameId: number
}

const emptyForm = (defaultTypeId?: number): GameReplayCreateDto => ({
	gameId: 0,
	replayTypeId: defaultTypeId,
	started: '',
	finished: '',
	grade: undefined,
	notes: '',
})

export const GameReplaysTab: React.FC<Props> = ({ gameId }) => {
	const [replays, setReplays] = useState<GameReplay[]>([])
	const [replayTypes, setReplayTypes] = useState<GameReplayType[]>([])
	const [defaultTypeId, setDefaultTypeId] = useState<number | undefined>()
	const [loading, setLoading] = useState(false)
	const [isFormOpen, setIsFormOpen] = useState(false)
	const [editingReplay, setEditingReplay] = useState<GameReplay | null>(null)
	const [formData, setFormData] = useState<GameReplayCreateDto>(emptyForm())
	const [saving, setSaving] = useState(false)

	const loadReplays = useCallback(async () => {
		setLoading(true)
		try {
			const data = await getReplaysByGameId(gameId)
			setReplays(data)
		} catch {
			setReplays([])
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
		setFormData(emptyForm(defaultTypeId))
		setIsFormOpen(true)
	}

	const openEditForm = (replay: GameReplay) => {
		setEditingReplay(replay)
		setFormData({
			gameId,
			replayTypeId: replay.replayTypeId,
			started: replay.started ?? '',
			finished: replay.finished ?? '',
			grade: replay.grade ?? undefined,
			notes: replay.notes ?? '',
		})
		setIsFormOpen(true)
	}

	const handleCloseForm = () => {
		setIsFormOpen(false)
		setEditingReplay(null)
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setSaving(true)
		try {
			const payload = {
				...formData,
				gameId,
				started: formData.started || undefined,
				finished: formData.finished || undefined,
				grade: formData.grade !== undefined && formData.grade !== null && String(formData.grade) !== '' ? Number(formData.grade) : undefined,
				notes: formData.notes || undefined,
			}
			if (editingReplay) {
				await updateGameReplay(gameId, editingReplay.id, { ...payload, id: editingReplay.id })
			} else {
				await createGameReplay(gameId, payload)
			}
			handleCloseForm()
			await loadReplays()
		} catch {
			// silent — user sees nothing changed
		} finally {
			setSaving(false)
		}
	}

	const handleDelete = async (id: number) => {
		if (!window.confirm('¿Eliminar esta rejugada?')) return
		try {
			await deleteGameReplay(gameId, id)
			setReplays((prev) => prev.filter((r) => r.id !== id))
		} catch {
			// silent
		}
	}

	if (loading) return <div className='grt-loading'>Cargando rejugadas...</div>

	return (
		<div className='game-replays-tab'>
			<div className='grt-header'>
				<span className='grt-count'>
					{replays.length} rejugada{replays.length !== 1 ? 's' : ''}
				</span>
				<button className='grt-add-btn' onClick={openNewForm}>
					+ Añadir rejugada
				</button>
			</div>

			{replays.length === 0 && !isFormOpen && <p className='grt-empty'>Sin rejugadas registradas.</p>}

			{replays.length > 0 && (
				<ul className='grt-list'>
					{replays.map((replay) => (
						<li key={replay.id} className='grt-item'>
							<div className='grt-item-header'>
								<span className='grt-type-badge' style={{ backgroundColor: replay.replayTypeColor ?? 'var(--primary)', color: '#fff' }}>
									{replay.replayTypeName ?? 'Rejugado'}
								</span>
								{replay.grade !== undefined && replay.grade !== null && <span className='grt-grade'>{replay.grade}/100</span>}
							</div>
							<div className='grt-dates'>
								{replay.started && <span>{formatToLocaleDate(replay.started)}</span>}
								{replay.started && replay.finished && <span> – </span>}
								{replay.finished && <span>{formatToLocaleDate(replay.finished)}</span>}
							</div>
							{replay.notes && <p className='grt-notes'>{replay.notes}</p>}
							<div className='grt-actions'>
								<button className='grt-edit-btn' onClick={() => openEditForm(replay)}>
									Editar
								</button>
								<button className='grt-delete-btn' onClick={() => handleDelete(replay.id)}>
									Eliminar
								</button>
							</div>
						</li>
					))}
				</ul>
			)}

			{isFormOpen && (
				<div className='grt-form'>
					<div className='grt-form-header'>
						<h3>{editingReplay ? 'Editar rejugada' : 'Nueva rejugada'}</h3>
						<button className='grt-form-close' onClick={handleCloseForm}>
							×
						</button>
					</div>
					<form onSubmit={handleSubmit}>
						<div className='grt-form-field'>
							<label htmlFor='grt-type'>Tipo</label>
							<select
								id='grt-type'
								value={formData.replayTypeId ?? ''}
								onChange={(e) => setFormData({ ...formData, replayTypeId: e.target.value ? Number(e.target.value) : undefined })}>
								<option value=''> Sin tipo </option>
								{replayTypes.map((t) => (
									<option key={t.id} value={t.id}>
										{t.name}
									</option>
								))}
							</select>
						</div>
						<div className='grt-form-row'>
							<div className='grt-form-field'>
								<label htmlFor='grt-started'>Inicio</label>
								<input id='grt-started' type='date' value={formData.started ?? ''} onChange={(e) => setFormData({ ...formData, started: e.target.value })} />
							</div>
							<div className='grt-form-field'>
								<label htmlFor='grt-finished'>Fin</label>
								<input id='grt-finished' type='date' value={formData.finished ?? ''} onChange={(e) => setFormData({ ...formData, finished: e.target.value })} />
							</div>
						</div>
						<div className='grt-form-field'>
							<label htmlFor='grt-grade'>Nota (0-100)</label>
							<input
								id='grt-grade'
								type='number'
								min={0}
								max={100}
								value={formData.grade ?? ''}
								onChange={(e) => setFormData({ ...formData, grade: e.target.value ? Number(e.target.value) : undefined })}
								placeholder='Opcional'
							/>
						</div>
						<div className='grt-form-field'>
							<label htmlFor='grt-notes'>Notas</label>
							<textarea id='grt-notes' rows={3} value={formData.notes ?? ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder='Opcional' />
						</div>
						<div className='grt-form-actions'>
							<button type='button' className='grt-cancel-btn' onClick={handleCloseForm}>
								Cancelar
							</button>
							<button type='submit' className='grt-submit-btn' disabled={saving}>
								{saving ? 'Guardando...' : editingReplay ? 'Guardar cambios' : 'Crear'}
							</button>
						</div>
					</form>
				</div>
			)}
		</div>
	)
}
