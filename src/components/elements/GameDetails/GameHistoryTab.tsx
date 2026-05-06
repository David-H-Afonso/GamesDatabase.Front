import React, { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { getHistoryByGameId, deleteHistoryEntry, clearGameHistory } from '@/services/GameHistoryService'
import type { GameHistoryEntry } from '@/models/api/GameHistoryEntry'
import './GameHistoryTab.scss'

interface Props {
	gameId: number
}

const ACTION_CLASS: Record<string, string> = {
	Created: 'action-created',
	Updated: 'action-updated',
	Deleted: 'action-deleted',
}

export const GameHistoryTab: React.FC<Props> = ({ gameId }) => {
	const { t } = useTranslation()
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
		if (!window.confirm(t('game.history.confirmClearAll'))) return
		try {
			await clearGameHistory(gameId)
			setEntries([])
		} catch {
			// silent
		}
	}

	const getFieldLabel = (field: string): string => {
		const fieldMap: Record<string, string> = {
			Name: t('game.filters.fieldName'),
			Status: t('game.filters.fieldStatus'),
			Grade: t('game.filters.fieldGrade'),
			Critic: t('game.filters.fieldCritic'),
			CriticProvider: t('game.filters.fieldCritic'),
			Released: t('game.filters.fieldReleased'),
			Started: t('game.filters.fieldStarted'),
			Finished: t('game.filters.fieldFinished'),
			Comment: t('game.filters.fieldComment'),
			PlayedStatus: t('game.filters.fieldPlayedStatus'),
			Platform: t('game.filters.fieldPlatform'),
			PlayWith: t('game.filters.fieldPlayWith'),
			Score: t('game.filters.fieldScore'),
			Description: t('game.filters.fieldDescription'),
		}
		return fieldMap[field] ?? field
	}

	const formatEntry = (entry: GameHistoryEntry): string => {
		const field = getFieldLabel(entry.field)
		if (entry.actionType === 'Deleted') {
			return t('game.history.descriptionDeleted')
		}
		if (entry.actionType === 'Created') {
			return t('game.history.descriptionCreated', { field, value: entry.newValue ?? '' })
		}
		if (entry.field === 'Status') {
			return t('game.history.descriptionStatusChanged', {
				from: entry.oldValue ?? '?',
				to: entry.newValue ?? '?',
			})
		}
		return field
	}

	if (loading) return <div className='ght-loading'>{t('game.history.loading')}</div>

	return (
		<div className='game-history-tab'>
			<div className='ght-header'>
				<span className='ght-count'>{t('game.history.count', { count: entries.length })}</span>
				{entries.length > 0 && (
					<button className='ght-clear-btn' onClick={handleClearAll}>
						{t('game.history.clearAll')}
					</button>
				)}
			</div>

			{entries.length === 0 ? (
				<p className='ght-empty'>{t('game.history.empty')}</p>
			) : (
				<ul className='ght-list'>
					{entries.map((entry) => (
						<li key={entry.id} className='ght-entry'>
							<div className='ght-entry-main'>
								<span className={`ght-action ${ACTION_CLASS[entry.actionType] ?? ''}`}>
									{entry.actionType === 'Created'
										? t('game.history.actionCreated')
										: entry.actionType === 'Updated'
											? t('game.history.actionUpdated')
											: entry.actionType === 'Deleted'
												? t('game.history.actionDeleted')
												: entry.actionType}
								</span>
								<span className='ght-description'>{formatEntry(entry)}</span>
							</div>
							{(entry.oldValue || entry.newValue) && (
								<div className='ght-values'>
									{entry.oldValue && <span className='ght-old'>{entry.oldValue}</span>}
									{entry.oldValue && entry.newValue && <span className='ght-arrow'>{t('game.history.arrow')}</span>}
									{entry.newValue && <span className='ght-new'>{entry.newValue}</span>}
								</div>
							)}
							<div className='ght-entry-footer'>
								<span className='ght-date'>{new Date(entry.changedAt).toLocaleString()}</span>
								<button className='ght-delete-btn' onClick={() => handleDeleteEntry(entry.id)} title={t('game.history.deleteEntry')}>
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
