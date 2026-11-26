import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useGamePlatform, useGamePlayWith, useGamePlayedStatus } from '@/hooks'
import { useGameStatus } from '@/hooks/useGameStatus/useGameStatus'
import { CollectionSheet } from '@/components/Collection/CollectionSheet'
import { CollectionIcon } from '@/components/Collection/CollectionIcon'
import './GalleryBulkEdit.scss'

interface Props {
	isOpen: boolean
	onClose: () => void
	selectedCount: number
	onSave: (updates: BulkEditData) => Promise<void>
}

export interface BulkEditData {
	statusId?: number
	platformId?: number
	playWithIds?: number[]
	playedStatusId?: number
	isCheaperByKey?: boolean
}

const BulkEditModal: React.FC<Props> = ({ isOpen, onClose, selectedCount, onSave }) => {
	const { t } = useTranslation()
	const { fetchActiveStatusList } = useGameStatus()
	const { fetchList: fetchPlatforms } = useGamePlatform()
	const { fetchOptions: fetchPlayWithList } = useGamePlayWith()
	const { fetchActiveList: fetchPlayedStatusList } = useGamePlayedStatus()

	const [statusId, setStatusId] = useState<number | undefined>()
	const [platformId, setPlatformId] = useState<number | undefined>()
	const [playWithIds, setPlayWithIds] = useState<number[]>([])
	const [playedStatusId, setPlayedStatusId] = useState<number | undefined>()
	const [isCheaperByKey, setIsCheaperByKey] = useState<boolean | undefined>()

	const [statusOptions, setStatusOptions] = useState<{ value: number; label: string }[]>([])
	const [platformOptions, setPlatformOptions] = useState<{ value: number; label: string }[]>([])
	const [playWithOptions, setPlayWithOptions] = useState<{ value: number; label: string }[]>([])
	const [playedStatusOptions, setPlayedStatusOptions] = useState<{ value: number; label: string }[]>([])

	const [isSaving, setIsSaving] = useState(false)
	const [toast, setToast] = useState<{ message: string; type: 'warning' | 'error' } | null>(null)

	useEffect(() => {
		if (!isOpen) return

		const normalize = (res: any) => {
			if (!res) return []
			if (Array.isArray(res)) return res
			if (res.data && Array.isArray(res.data)) return res.data
			return []
		}

		void (async () => {
			try {
				const st = await fetchActiveStatusList()
				const stList = normalize(st)
				setStatusOptions(stList.map((s: any) => ({ value: s.id as number, label: String(s.name) })))

				const plat = await fetchPlatforms()
				const platList = normalize(plat)
				setPlatformOptions(platList.map((p: any) => ({ value: p.id as number, label: String(p.name) })))

				const pw = await fetchPlayWithList()
				const pwList = normalize(pw)
				setPlayWithOptions(pwList.map((p: any) => ({ value: p.id as number, label: String(p.name) })))

				const ps = await fetchPlayedStatusList()
				const psList = normalize(ps)
				setPlayedStatusOptions(psList.map((p: any) => ({ value: p.id as number, label: String(p.name) })))
			} catch (err) {
				console.error('Error loading options', err)
			}
		})()
	}, [isOpen, fetchActiveStatusList, fetchPlatforms, fetchPlayWithList, fetchPlayedStatusList])

	const handleSave = async () => {
		if (isSaving) return
		const updates: BulkEditData = {}
		if (statusId !== undefined) updates.statusId = statusId
		if (platformId !== undefined) updates.platformId = platformId
		if (playWithIds.length > 0) updates.playWithIds = playWithIds
		if (playedStatusId !== undefined) updates.playedStatusId = playedStatusId
		if (isCheaperByKey !== undefined) updates.isCheaperByKey = isCheaperByKey

		if (Object.keys(updates).length === 0) {
			setToast({ message: t('home.bulk.alertNoChanges'), type: 'warning' })
			return
		}

		setIsSaving(true)
		try {
			await onSave(updates)
			handleClose()
		} catch (err) {
			console.error('Error saving bulk edit', err)
			setToast({ message: t('home.bulk.alertError'), type: 'error' })
		} finally {
			setIsSaving(false)
		}
	}

	const handleClose = () => {
		setStatusId(undefined)
		setPlatformId(undefined)
		setPlayWithIds([])
		setPlayedStatusId(undefined)
		setIsCheaperByKey(undefined)
		setToast(null)
		onClose()
	}

	const handlePlayWithToggle = (id: number) => {
		setPlayWithIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))
	}

	if (!isOpen) return null

	return (
		<CollectionSheet open={isOpen} onClose={() => { if (!isSaving) handleClose() }} title={t('home.bulk.title')} subtitle={t('home.bulk.editing', { count: selectedCount })} className='bulk-edit-modal'
			footer={<><button type='button' className='gdb-button' onClick={handleClose} disabled={isSaving}>{t('home.bulk.cancel')}</button><button type='submit' form='gdb-bulk-edit-form' className='gdb-button gdb-button--primary' disabled={isSaving}>{t(isSaving ? 'home.bulk.saving' : 'home.bulk.save')}<CollectionIcon name='check' /></button></>}>
				<form id='gdb-bulk-edit-form' className='gdb-form' onSubmit={event => { event.preventDefault(); void handleSave() }}>
					{toast && <p className='gdb-error' role={toast.type === 'error' ? 'alert' : 'status'}>{toast.message}</p>}
					<fieldset disabled={isSaving} className='bulk-edit-modal__fields'>
					<div className='bulk-edit-modal__field'>
						<label htmlFor='bulk-status'>{t('home.bulk.fieldStatus')}</label>
						<select id='bulk-status' value={statusId ?? ''} onChange={(e) => setStatusId(e.target.value ? Number(e.target.value) : undefined)}>
							<option value=''>{t('home.bulk.noChange')}</option>
							{statusOptions.map((s) => (
								<option key={s.value} value={s.value}>
									{s.label}
								</option>
							))}
						</select>
					</div>

					<div className='bulk-edit-modal__field'>
						<label htmlFor='bulk-platform'>{t('home.bulk.fieldPlatform')}</label>
						<select id='bulk-platform' value={platformId ?? ''} onChange={(e) => setPlatformId(e.target.value ? Number(e.target.value) : undefined)}>
							<option value=''>{t('home.bulk.noChange')}</option>
							{platformOptions.map((p) => (
								<option key={p.value} value={p.value}>
									{p.label}
								</option>
							))}
						</select>
					</div>

					<div className='bulk-edit-modal__field'>
						<label htmlFor='bulk-played-status'>{t('home.bulk.fieldPlayedStatus')}</label>
						<select id='bulk-played-status' value={playedStatusId ?? ''} onChange={(e) => setPlayedStatusId(e.target.value ? Number(e.target.value) : undefined)}>
							<option value=''>{t('home.bulk.noChange')}</option>
							{playedStatusOptions.map((ps) => (
								<option key={ps.value} value={ps.value}>
									{ps.label}
								</option>
							))}
						</select>
					</div>

					<div className='bulk-edit-modal__field'>
						<label htmlFor='bulk-cheaper-by'>{t('home.bulk.fieldCheaperBy')}</label>
						<select
							id='bulk-cheaper-by'
							value={isCheaperByKey === undefined ? '' : isCheaperByKey ? 'key' : 'store'}
							onChange={(e) => {
								const val = e.target.value
								setIsCheaperByKey(val === '' ? undefined : val === 'key')
							}}>
							<option value=''>{t('home.bulk.noChange')}</option>
							<option value='key'>{t('home.bulk.cheaperKey')}</option>
							<option value='store'>{t('home.bulk.cheaperStore')}</option>
						</select>
					</div>

					<div className='bulk-edit-modal__field'>
						<fieldset className='bulk-edit-modal__checkboxes'><legend>{t('home.bulk.fieldPlayWith')}</legend>
							{playWithOptions.map((pw) => (
								<label key={pw.value} className='gdb-check-label'>
									<input type='checkbox' checked={playWithIds.includes(pw.value)} onChange={() => handlePlayWithToggle(pw.value)} />
									<span>{pw.label}</span>
								</label>
							))}
						</fieldset>
						{playWithIds.length > 0 && (
							<button type='button' className='gdb-text-button' onClick={() => setPlayWithIds([])}>
								{t('home.bulk.clearSelection')}
							</button>
						)}
					</div>
					</fieldset>
				</form>
		</CollectionSheet>
	)
}

export default BulkEditModal
