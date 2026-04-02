import React, { useEffect, useState, useCallback } from 'react'
import { getHistoryByGameId, deleteHistoryEntry, clearGameHistory } from '@/services/GameHistoryService'
import type { GameHistoryEntry } from '@/models/api/GameHistoryEntry'
import './GameHistoryTab.scss'

interface Props {
	gameId: number
}

const ACTION_LABELS: Record<string, string> = {
	Created: 'Creado',
	Updated: 'Actualizado',
	Deleted: 'Eliminado',
}

const ACTION_CLASS: Record<string, string> = {
	Created: 'action-created',
	Updated: 'action-updated',
	Deleted: 'action-deleted',
}

export const GameHistoryTab: React.FC<Props> = ({ gameId }) => {
	const [entries, setEntries] = useState<GameHistoryEntry[]>([])
	const [loading, setLoading] = useState(false)

	const load = useCallback(async () => {
		setLoading(true)
		try {
			const result = await getHistoryByGameId(gameId)
			setEntries(result.data ?? [])
		} catch {
			setEntries([])
		} finally {
			setLoading(false)
		}
	}, [gameId])

	useEffect(() => {
		void load()
	}, [load])

	const handleDeleteEntry = async (entryId: number) => {
		try {
			await deleteHistoryEntry(gameId, entryId)
			setEntries((prev) => prev.filter((e) => e.id !== entryId))
		} catch {
			// silent — entry may already be gone
		}
	}

	const handleClearAll = async () => {
		if (!window.confirm('¿Borrar todo el historial de este juego?')) return
		try {
			await clearGameHistory(gameId)
			setEntries([])
		} catch {
			// silent
		}
	}

	if (loading) return <div className='ght-loading'>Cargando historial...</div>

	return (
		<div className='game-history-tab'>
			<div className='ght-header'>
				<span className='ght-count'>
					{entries.length} entrada{entries.length !== 1 ? 's' : ''}
				</span>
				{entries.length > 0 && (
					<button className='ght-clear-btn' onClick={handleClearAll}>
						Borrar todo
					</button>
				)}
			</div>

			{entries.length === 0 ? (
				<p className='ght-empty'>Sin historial registrado.</p>
			) : (
				<ul className='ght-list'>
					{entries.map((entry) => (
						<li key={entry.id} className='ght-entry'>
							<div className='ght-entry-main'>
								<span className={`ght-action ${ACTION_CLASS[entry.actionType] ?? ''}`}>{ACTION_LABELS[entry.actionType] ?? entry.actionType}</span>
								<span className='ght-description'>{entry.description}</span>
							</div>
							{(entry.oldValue || entry.newValue) && (
								<div className='ght-values'>
									{entry.oldValue && <span className='ght-old'>{entry.oldValue}</span>}
									{entry.oldValue && entry.newValue && <span className='ght-arrow'>→</span>}
									{entry.newValue && <span className='ght-new'>{entry.newValue}</span>}
								</div>
							)}
							<div className='ght-entry-footer'>
								<span className='ght-date'>{new Date(entry.changedAt).toLocaleString()}</span>
								<button className='ght-delete-btn' onClick={() => handleDeleteEntry(entry.id)} title='Borrar entrada'>
									×
								</button>
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	)
}
