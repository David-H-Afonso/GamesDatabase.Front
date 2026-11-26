import React, { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { getHistoryByGameId, deleteHistoryEntry, clearGameHistory } from '@/services/GameHistoryService'
import { ConfirmDialog } from '@/components/elements'
import type { GameHistoryEntry } from '@/models/api/GameHistoryEntry'
import './GameHistoryTab.scss'
import { CollectionIcon } from '@/components/Collection/CollectionIcon'
import { formatCollectionDate } from '@/utils/collectionFormatting'
import './GalleryGameTabs.scss'

interface Props {
	gameId: number
	gallery?: boolean
}

const ACTION_CLASS: Record<string, string> = {
	Created: 'action-created',
	Updated: 'action-updated',
	Deleted: 'action-deleted',
}

export const GameHistoryTab: React.FC<Props> = ({ gameId, gallery = false }) => {
	const { t, i18n } = useTranslation()
	const [entries, setEntries] = useState<GameHistoryEntry[]>([])
	const [loading, setLoading] = useState(false)
	const [confirmClearOpen, setConfirmClearOpen] = useState(false)
	const [error, setError] = useState<'load' | 'save' | null>(null),
		[saving, setSaving] = useState(false)

	const load = useCallback(async () => {
		setLoading(true)
		setError(null)
		try {
			const result = await getHistoryByGameId(gameId)
			setEntries(result.data ?? [])
		} catch {
			setError('load')
		} finally {
			setLoading(false)
		}
	}, [gameId])

	useEffect(() => {
		void load()
	}, [load])

	const handleDeleteEntry = async (entryId: number) => {
		if (saving) return
		setSaving(true)
		setError(null)
		try {
			await deleteHistoryEntry(gameId, entryId)
			setEntries((prev) => prev.filter((e) => e.id !== entryId))
		} catch {
			setError('save')
		} finally {
			setSaving(false)
		}
	}

	const handleClearAll = () => setConfirmClearOpen(true)

	const confirmClearAll = async () => {
		if (saving) return
		setSaving(true)
		setError(null)
		setConfirmClearOpen(false)
		try {
			await clearGameHistory(gameId)
			setEntries([])
		} catch {
			setError('save')
		} finally {
			setSaving(false)
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
			Cover: t('game.details.fieldCover'),
			Hero: t('game.details.fieldHero'),
			Logo: t('game.details.fieldLogo'),
			Developer: t('gallery.detail.studio'),
			Favorite: t('home.filters.favorite'),
			ManualPlaytimeMinutes: t('gallery.detail.manualTime'),
			ManualPlaytimeIsAdditive: t('gallery.detail.addManualToSteam'),
		}
		return fieldMap[field] ?? field
	}
	const historyValue = (field: string, value: string) => {
		const boolean = value.trim().toLowerCase()
		return ['ManualPlaytimeIsAdditive', 'Favorite', 'IsManuallyCompleted'].includes(field) && ['true', 'false'].includes(boolean) ? t(boolean === 'true' ? 'common.yes' : 'common.no') : value
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
		if (gallery && ['Cover', 'Hero', 'Logo'].includes(entry.field))
			return t(entry.newValue ? (entry.oldValue ? 'gallery.tabs.artworkChanged' : 'gallery.tabs.artworkAdded') : 'gallery.tabs.artworkRemoved')
		return field
	}

	if (loading)
		return (
			<div className='ght-loading' role='status'>
				{t('game.history.loading')}
			</div>
		)
	const values = (entry: GameHistoryEntry) => (
		<div className='ght-values'>
			{entry.oldValue && <span className='ght-old'>{historyValue(entry.field, entry.oldValue)}</span>}
			{entry.oldValue && entry.newValue && <span className='ght-arrow'>{t('game.history.arrow')}</span>}
			{entry.newValue && <span className='ght-new'>{historyValue(entry.field, entry.newValue)}</span>}
		</div>
	)

	return (
		<div className={`game-history-tab ${gallery ? 'gdb-gallery-history' : ''}`} aria-busy={saving}>
			<div className='ght-header'>
				{gallery ? <h3>{t('gallery.tabs.history')}</h3> : <span className='ght-count'>{t('game.history.count', { count: entries.length })}</span>}
				{entries.length > 0 && (
					<button type='button' className={gallery ? 'gdb-text-button' : 'ght-clear-btn'} disabled={saving} onClick={handleClearAll}>
						{t('game.history.clearAll')}
					</button>
				)}
			</div>
			{gallery && (
				<p className='gdb-hint gdb-history-help'>
					{t('game.history.count', { count: entries.length })} · {t('gallery.tabs.historyHelp')}
				</p>
			)}
			{error && (
				<p className='gdb-error' role='alert'>
					{t(error === 'save' ? 'gallery.common.saveError' : 'gallery.common.loadError')}{' '}
					<button
						type='button'
						className='gdb-text-button'
						onClick={() => {
							void load()
						}}>
						{t('gallery.common.refresh')}
					</button>
				</p>
			)}

			{entries.length === 0 ? (
				<p className='ght-empty'>{t('game.history.empty')}</p>
			) : (
				<ul className='ght-list'>
					{entries.map((entry) => (
						<li key={entry.id} className='ght-entry'>
							<div className='ght-entry-main'>
								{gallery && <strong className='ght-field'>{getFieldLabel(entry.field)}</strong>}
								<span className={`ght-action ${ACTION_CLASS[entry.actionType] ?? ''}`}>
									{entry.actionType === 'Created'
										? t('game.history.actionCreated')
										: entry.actionType === 'Updated'
											? t('game.history.actionUpdated')
											: entry.actionType === 'Deleted'
												? t('game.history.actionDeleted')
												: entry.actionType}
								</span>
								{!gallery && <span className='ght-description'>{formatEntry(entry)}</span>}
							</div>
							{gallery && <p className='ght-description'>{formatEntry(entry)}</p>}
							{(entry.oldValue || entry.newValue) &&
								(gallery
									? entry.field !== 'Status' && (
											<details className='gdb-history-values'>
												<summary>{t('gallery.tabs.values')}</summary>
												{values(entry)}
											</details>
										)
									: values(entry))}
							<div className='ght-entry-footer'>
								<time className='ght-date' dateTime={entry.changedAt}>
									{gallery
										? `${formatCollectionDate(entry.changedAt, i18n.language)} · ${new Date(entry.changedAt).toLocaleTimeString(i18n.language)}`
										: new Date(entry.changedAt).toLocaleString()}
								</time>
								<button
									type='button'
									className={gallery ? 'gdb-icon-button ght-delete-btn' : 'ght-delete-btn'}
									disabled={saving}
									onClick={() => handleDeleteEntry(entry.id)}
									aria-label={t('game.history.deleteEntry')}
									title={t('game.history.deleteEntry')}>
									{gallery ? <CollectionIcon name='trash' /> : '×'}
								</button>
							</div>
						</li>
					))}
				</ul>
			)}

			<ConfirmDialog
				isOpen={confirmClearOpen}
				title={t('common.confirmDeleteTitle')}
				message={t('game.history.confirmClearAll')}
				variant='danger'
				confirmLabel={t('common.delete')}
				isConfirming={saving}
				onConfirm={confirmClearAll}
				onCancel={() => setConfirmClearOpen(false)}
			/>
		</div>
	)
}
