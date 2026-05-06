import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { getAdminUserSchedules, updateAdminUserSchedule, runAdminUserBackupNow } from '@/services/BackupScheduleService'
import type { UserBackupScheduleDto, UpdateBackupScheduleRequest } from '@/services/BackupScheduleService'
import './AdminBackupSchedule.scss'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]
const pad = (n: number) => String(n).padStart(2, '0')

interface UserRowProps {
	entry: UserBackupScheduleDto
	onUpdated: (entry: UserBackupScheduleDto) => void
}

const UserRow: React.FC<UserRowProps> = ({ entry, onUpdated }) => {
	const { t } = useTranslation()
	const [expanded, setExpanded] = useState(false)
	const [saving, setSaving] = useState(false)
	const [runningNow, setRunningNow] = useState(false)
	const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

	const [isEnabled, setIsEnabled] = useState(entry.schedule.isEnabled)
	const [backupHour, setBackupHour] = useState(entry.schedule.backupHour)
	const [backupMinute, setBackupMinute] = useState(entry.schedule.backupMinute)
	const [backupType, setBackupType] = useState<'full' | 'partial'>(entry.schedule.backupType)
	const [destinationPath, setDestinationPath] = useState(entry.schedule.destinationPath)
	const [retentionCount, setRetentionCount] = useState(entry.schedule.retentionCount)
	const [fileNamePrefix, setFileNamePrefix] = useState(entry.schedule.fileNamePrefix)
	const [fileNameSuffix, setFileNameSuffix] = useState(entry.schedule.fileNameSuffix)

	const showMessage = (text: string, type: 'success' | 'error') => {
		setMessage({ text, type })
		setTimeout(() => setMessage(null), 5000)
	}

	const localTimeEquivalent = useMemo(() => {
		const d = new Date()
		d.setUTCHours(backupHour, backupMinute, 0, 0)
		return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
	}, [backupHour, backupMinute])

	const statusClass = (status: string) => {
		if (status === 'success') return 'status-badge status-badge--success'
		if (status === 'failed') return 'status-badge status-badge--error'
		if (status === 'running') return 'status-badge status-badge--running'
		return 'status-badge status-badge--never'
	}

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault()
		setSaving(true)
		try {
			const req: UpdateBackupScheduleRequest = {
				isEnabled,
				backupHour,
				backupMinute,
				backupType,
				destinationPath,
				retentionCount,
				fileNamePrefix,
				fileNameSuffix,
			}
			const updated = await updateAdminUserSchedule(entry.userId, req)
			onUpdated(updated)
			showMessage(t('admin.backupSchedule.savedSuccess'), 'success')
		} catch {
			showMessage(t('admin.backupSchedule.errorSave'), 'error')
		} finally {
			setSaving(false)
		}
	}

	const handleRunNow = async () => {
		setRunningNow(true)
		try {
			await runAdminUserBackupNow(entry.userId)
			showMessage(t('admin.backupSchedule.runNowStarted'), 'success')
		} catch {
			showMessage(t('admin.backupSchedule.errorRunNow'), 'error')
		} finally {
			setRunningNow(false)
		}
	}

	return (
		<div className='admin-backup-schedule__user-row'>
			<button type='button' className='admin-backup-schedule__user-row-header' onClick={() => setExpanded((v) => !v)}>
				<span className='admin-backup-schedule__user-name'>{entry.username}</span>
				<span className={statusClass(entry.schedule.lastRunStatus)}>{t(`admin.backupSchedule.status_${entry.schedule.lastRunStatus}`)}</span>
				<span className='admin-backup-schedule__user-enabled'>{entry.schedule.isEnabled ? t('admin.backupScheduleUsers.enabled') : t('admin.backupScheduleUsers.disabled')}</span>
				<span className='admin-backup-schedule__user-chevron'>{expanded ? '▲' : '▼'}</span>
			</button>

			{expanded && (
				<div className='admin-backup-schedule__user-body'>
					{message && (
						<div className={`backup-alert backup-alert--${message.type}`}>
							{message.text}
							<button className='backup-alert__close' onClick={() => setMessage(null)} aria-label='×'></button>
						</div>
					)}

					{entry.schedule.lastRunAt && (
						<div className='admin-backup-schedule__last-run'>
							<span className='admin-backup-schedule__last-run-label'>{t('admin.backupSchedule.lastRunTitle')}: </span>
							<span className={statusClass(entry.schedule.lastRunStatus)}>{t(`admin.backupSchedule.status_${entry.schedule.lastRunStatus}`)}</span>
							<span className='admin-backup-schedule__last-run-date'>{new Date(entry.schedule.lastRunAt).toLocaleString()}</span>
							{entry.schedule.lastRunMessage && <span className='admin-backup-schedule__last-run-message'>{entry.schedule.lastRunMessage}</span>}
						</div>
					)}

					<form className='admin-backup-schedule__form' onSubmit={handleSave}>
						<div className='admin-backup-schedule__section'>
							<div className='admin-backup-schedule__field admin-backup-schedule__field--toggle'>
								<label className='admin-backup-schedule__toggle-label'>
									<input type='checkbox' checked={isEnabled} onChange={(e) => setIsEnabled(e.target.checked)} className='admin-backup-schedule__toggle-input' />
									<span className='admin-backup-schedule__toggle-text'>{t('admin.backupSchedule.enableLabel')}</span>
								</label>
							</div>

							<div className='admin-backup-schedule__field'>
								<label className='admin-backup-schedule__label'>{t('admin.backupSchedule.timeLabel')}</label>
								<div className='admin-backup-schedule__time-row'>
									<select value={backupHour} onChange={(e) => setBackupHour(Number(e.target.value))} className='admin-backup-schedule__select'>
										{HOURS.map((h) => (
											<option key={h} value={h}>
												{pad(h)}
											</option>
										))}
									</select>
									<span className='admin-backup-schedule__time-sep'>:</span>
									<select value={backupMinute} onChange={(e) => setBackupMinute(Number(e.target.value))} className='admin-backup-schedule__select'>
										{MINUTES.map((m) => (
											<option key={m} value={m}>
												{pad(m)}
											</option>
										))}
									</select>
									<span className='admin-backup-schedule__time-utc'>UTC</span>{' '}
									<span className='admin-backup-schedule__time-local' title={t('admin.backupSchedule.timeLocalTooltip', { time: localTimeEquivalent })}>
										≈ {localTimeEquivalent} {t('admin.backupSchedule.timeLocalShort')}
									</span>
								</div>
							</div>

							<div className='admin-backup-schedule__field'>
								<label className='admin-backup-schedule__label'>{t('admin.backupSchedule.typeLabel')}</label>
								<div className='admin-backup-schedule__radio-group'>
									<label className='admin-backup-schedule__radio-label'>
										<input type='radio' value='full' checked={backupType === 'full'} onChange={() => setBackupType('full')} />
										<span>{t('admin.backupSchedule.typeFull')}</span>
									</label>
									<label className='admin-backup-schedule__radio-label'>
										<input type='radio' value='partial' checked={backupType === 'partial'} onChange={() => setBackupType('partial')} />
										<span>{t('admin.backupSchedule.typePartial')}</span>
									</label>
								</div>
							</div>

							<div className='admin-backup-schedule__field'>
								<label className='admin-backup-schedule__label' htmlFor={`dest-${entry.userId}`}>
									{t('admin.backupSchedule.destPathLabel')}
								</label>
								<input
									id={`dest-${entry.userId}`}
									type='text'
									value={destinationPath}
									onChange={(e) => setDestinationPath(e.target.value)}
									className='admin-backup-schedule__input'
									placeholder='/backups'
								/>
							</div>

							<div className='admin-backup-schedule__field'>
								<label className='admin-backup-schedule__label' htmlFor={`retention-${entry.userId}`}>
									{t('admin.backupSchedule.retentionLabel')}
								</label>
								<input
									id={`retention-${entry.userId}`}
									type='number'
									min={0}
									max={365}
									value={retentionCount}
									onChange={(e) => setRetentionCount(Number(e.target.value))}
									className='admin-backup-schedule__input admin-backup-schedule__input--short'
								/>
							</div>

							<div className='admin-backup-schedule__field'>
								<label className='admin-backup-schedule__label' htmlFor={`prefix-${entry.userId}`}>
									{t('admin.backupSchedule.fileNamePrefix')}
								</label>
								<input
									id={`prefix-${entry.userId}`}
									type='text'
									value={fileNamePrefix}
									onChange={(e) => setFileNamePrefix(e.target.value)}
									className='admin-backup-schedule__input'
								/>
							</div>

							<div className='admin-backup-schedule__field'>
								<label className='admin-backup-schedule__label' htmlFor={`suffix-${entry.userId}`}>
									{t('admin.backupSchedule.fileNameSuffix')}
								</label>
								<input
									id={`suffix-${entry.userId}`}
									type='text'
									value={fileNameSuffix}
									onChange={(e) => setFileNameSuffix(e.target.value)}
									className='admin-backup-schedule__input'
								/>
							</div>
						</div>

						<div className='admin-backup-schedule__actions'>
							<button type='submit' className='btn btn-primary' disabled={saving}>
								{saving ? t('common.saving') : `💾 ${t('common.saveChanges')}`}
							</button>
							<button type='button' className='btn btn-secondary' onClick={handleRunNow} disabled={runningNow}>
								{runningNow ? t('admin.backupSchedule.running') : `▶ ${t('admin.backupSchedule.runNowBtn')}`}
							</button>
						</div>
					</form>
				</div>
			)}
		</div>
	)
}

const AdminBackupScheduleUsers: React.FC = () => {
	const { t } = useTranslation()
	const [users, setUsers] = useState<UserBackupScheduleDto[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		const load = async () => {
			try {
				const data = await getAdminUserSchedules()
				setUsers(data)
			} catch {
				setError(t('admin.backupSchedule.errorLoad'))
			} finally {
				setLoading(false)
			}
		}
		load()
	}, [t])

	const handleUpdated = (updated: UserBackupScheduleDto) => {
		setUsers((prev) => prev.map((u) => (u.userId === updated.userId ? updated : u)))
	}

	if (loading)
		return (
			<div className='admin-backup-schedule'>
				<p>{t('common.loading')}</p>
			</div>
		)

	if (error)
		return (
			<div className='admin-backup-schedule'>
				<p className='backup-alert backup-alert--error'>{error}</p>
			</div>
		)

	return (
		<div className='admin-backup-schedule'>
			<div className='admin-backup-schedule__header'>
				<h1 className='admin-backup-schedule__title'>{t('admin.backupScheduleUsers.title')}</h1>
				<p className='admin-backup-schedule__subtitle'>{t('admin.backupScheduleUsers.subtitle')}</p>
			</div>

			<div className='admin-backup-schedule__users-list'>
				{users.map((entry) => (
					<UserRow key={entry.userId} entry={entry} onUpdated={handleUpdated} />
				))}
			</div>
		</div>
	)
}

export default AdminBackupScheduleUsers
