import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { getBackupSchedule, updateBackupSchedule, runBackupNow } from '@/services/BackupScheduleService'
import type { BackupScheduleDto, UpdateBackupScheduleRequest } from '@/services/BackupScheduleService'
import './AdminBackupSchedule.scss'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

const AdminBackupSchedule: React.FC = () => {
	const { t } = useTranslation()

	const [schedule, setSchedule] = useState<BackupScheduleDto | null>(null)
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [runningNow, setRunningNow] = useState(false)
	const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

	// Form state
	const [isEnabled, setIsEnabled] = useState(false)
	const [backupHour, setBackupHour] = useState(3)
	const [backupMinute, setBackupMinute] = useState(0)
	const [backupType, setBackupType] = useState<'full' | 'partial'>('full')
	const [destinationPath, setDestinationPath] = useState('/backups')
	const [retentionCount, setRetentionCount] = useState(7)

	const showMessage = (text: string, type: 'success' | 'error') => {
		setMessage({ text, type })
		setTimeout(() => setMessage(null), 5000)
	}

	useEffect(() => {
		const load = async () => {
			try {
				const data = await getBackupSchedule()
				setSchedule(data)
				setIsEnabled(data.isEnabled)
				setBackupHour(data.backupHour)
				setBackupMinute(data.backupMinute)
				setBackupType(data.backupType)
				setDestinationPath(data.destinationPath)
				setRetentionCount(data.retentionCount)
			} catch (err) {
				showMessage(t('admin.backupSchedule.errorLoad'), 'error')
			} finally {
				setLoading(false)
			}
		}
		load()
	}, [t])

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
			}
			const updated = await updateBackupSchedule(req)
			setSchedule(updated)
			showMessage(t('admin.backupSchedule.savedSuccess'), 'success')
		} catch (err) {
			showMessage(t('admin.backupSchedule.errorSave'), 'error')
		} finally {
			setSaving(false)
		}
	}

	const handleRunNow = async () => {
		setRunningNow(true)
		try {
			await runBackupNow()
			showMessage(t('admin.backupSchedule.runNowStarted'), 'success')
			// Refresh status after a moment
			setTimeout(async () => {
				try {
					const data = await getBackupSchedule()
					setSchedule(data)
				} catch {
					/* ignore */
				}
			}, 3000)
		} catch (err) {
			showMessage(t('admin.backupSchedule.errorRunNow'), 'error')
		} finally {
			setRunningNow(false)
		}
	}

	const pad = (n: number) => String(n).padStart(2, '0')

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

	if (loading) {
		return (
			<div className='admin-backup-schedule'>
				<p className='admin-backup-schedule__loading'>{t('common.loading')}</p>
			</div>
		)
	}

	return (
		<div className='admin-backup-schedule'>
			<div className='admin-backup-schedule__header'>
				<h1>{t('admin.backupSchedule.title')}</h1>
				<p className='admin-backup-schedule__subtitle'>{t('admin.backupSchedule.subtitle')}</p>
			</div>

			{message && (
				<div className={`backup-alert backup-alert--${message.type}`}>
					{message.text}
					<button className='backup-alert__close' onClick={() => setMessage(null)} aria-label={t('common.close')}>
						×
					</button>
				</div>
			)}

			{/* Last run status */}
			{schedule && (
				<div className='admin-backup-schedule__status-card'>
					<h2>{t('admin.backupSchedule.lastRunTitle')}</h2>
					<div className='admin-backup-schedule__status-row'>
						<span className={statusClass(schedule.lastRunStatus)}>{t(`admin.backupSchedule.status_${schedule.lastRunStatus}`)}</span>
						{schedule.lastRunAt && <span className='admin-backup-schedule__status-date'>{new Date(schedule.lastRunAt).toLocaleString()}</span>}
					</div>
					{schedule.lastRunMessage && <p className='admin-backup-schedule__status-message'>{schedule.lastRunMessage}</p>}
				</div>
			)}

			<form className='admin-backup-schedule__form' onSubmit={handleSave}>
				<div className='admin-backup-schedule__section'>
					<h2>{t('admin.backupSchedule.scheduleTitle')}</h2>

					{/* Enable toggle */}
					<div className='admin-backup-schedule__field admin-backup-schedule__field--toggle'>
						<label className='admin-backup-schedule__toggle-label'>
							<input type='checkbox' checked={isEnabled} onChange={(e) => setIsEnabled(e.target.checked)} className='admin-backup-schedule__toggle-input' />
							<span className='admin-backup-schedule__toggle-text'>{t('admin.backupSchedule.enableLabel')}</span>
						</label>
						<p className='admin-backup-schedule__field-hint'>{t('admin.backupSchedule.enableHint')}</p>
					</div>

					{/* Time picker */}
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
							</span>{' '}
						</div>
						<p className='admin-backup-schedule__field-hint'>{t('admin.backupSchedule.timeHint')}</p>
					</div>

					{/* Backup type */}
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
						<p className='admin-backup-schedule__field-hint'>{backupType === 'full' ? t('admin.backupSchedule.typeFullHint') : t('admin.backupSchedule.typePartialHint')}</p>
					</div>

					{/* Destination path */}
					<div className='admin-backup-schedule__field'>
						<label className='admin-backup-schedule__label' htmlFor='dest-path'>
							{t('admin.backupSchedule.destPathLabel')}
						</label>
						<input
							id='dest-path'
							type='text'
							value={destinationPath}
							onChange={(e) => setDestinationPath(e.target.value)}
							className='admin-backup-schedule__input'
							placeholder='/backups'
						/>
						<p className='admin-backup-schedule__field-hint'>{t('admin.backupSchedule.destPathHint')}</p>
					</div>

					{/* Retention count */}
					<div className='admin-backup-schedule__field'>
						<label className='admin-backup-schedule__label' htmlFor='retention'>
							{t('admin.backupSchedule.retentionLabel')}
						</label>
						<input
							id='retention'
							type='number'
							min={0}
							max={365}
							value={retentionCount}
							onChange={(e) => setRetentionCount(Number(e.target.value))}
							className='admin-backup-schedule__input admin-backup-schedule__input--short'
						/>
						<p className='admin-backup-schedule__field-hint'>{t('admin.backupSchedule.retentionHint')}</p>
					</div>
				</div>

				{/* Action buttons */}
				<div className='admin-backup-schedule__actions'>
					<button type='submit' className='btn btn-primary' disabled={saving}>
						{saving ? t('common.saving') : `💾 ${t('common.saveChanges')}`}
					</button>
					<button type='button' className='btn btn-secondary' onClick={handleRunNow} disabled={runningNow}>
						{runningNow ? t('admin.backupSchedule.running') : `▶ ${t('admin.backupSchedule.runNowBtn')}`}
					</button>
				</div>
			</form>

			{/* Instructions */}
			<div className='admin-backup-schedule__info-card'>
				<h3>{t('admin.backupSchedule.infoTitle')}</h3>
				<ul>
					<li dangerouslySetInnerHTML={{ __html: t('admin.backupSchedule.infoNote1') }} />
					<li dangerouslySetInnerHTML={{ __html: t('admin.backupSchedule.infoNote2') }} />
					<li dangerouslySetInnerHTML={{ __html: t('admin.backupSchedule.infoNote3') }} />
					<li dangerouslySetInnerHTML={{ __html: t('admin.backupSchedule.infoNote4') }} />
				</ul>
			</div>
		</div>
	)
}

export default AdminBackupSchedule
