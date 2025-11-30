import React, { useState, useEffect } from 'react'
import { useGameStatus, useGamePlatform, useGamePlayWith } from '@/hooks'
import './BulkEditModal.scss'

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
}

const BulkEditModal: React.FC<Props> = ({ isOpen, onClose, selectedCount, onSave }) => {
	const { fetchActiveStatusList } = useGameStatus()
	const { fetchList: fetchPlatforms } = useGamePlatform()
	const { fetchOptions: fetchPlayWithList } = useGamePlayWith()

	const [statusId, setStatusId] = useState<number | undefined>()
	const [platformId, setPlatformId] = useState<number | undefined>()
	const [playWithIds, setPlayWithIds] = useState<number[]>([])

	const [statusOptions, setStatusOptions] = useState<{ value: number; label: string }[]>([])
	const [platformOptions, setPlatformOptions] = useState<{ value: number; label: string }[]>([])
	const [playWithOptions, setPlayWithOptions] = useState<{ value: number; label: string }[]>([])

	const [isSaving, setIsSaving] = useState(false)

	useEffect(() => {
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
				setPlatformOptions(
					platList.map((p: any) => ({ value: p.id as number, label: String(p.name) }))
				)

				const pw = await fetchPlayWithList()
				const pwList = normalize(pw)
				setPlayWithOptions(
					pwList.map((p: any) => ({ value: p.id as number, label: String(p.name) }))
				)
			} catch (err) {
				console.error('Error loading options', err)
			}
		})()
	}, [fetchActiveStatusList, fetchPlatforms, fetchPlayWithList])

	const handleSave = async () => {
		const updates: BulkEditData = {}
		if (statusId !== undefined) updates.statusId = statusId
		if (platformId !== undefined) updates.platformId = platformId
		if (playWithIds.length > 0) updates.playWithIds = playWithIds

		if (Object.keys(updates).length === 0) {
			alert('No changes to save')
			return
		}

		setIsSaving(true)
		try {
			await onSave(updates)
			handleClose()
		} catch (err) {
			console.error('Error saving bulk edit', err)
			alert('Error saving changes')
		} finally {
			setIsSaving(false)
		}
	}

	const handleClose = () => {
		setStatusId(undefined)
		setPlatformId(undefined)
		setPlayWithIds([])
		onClose()
	}

	const handlePlayWithToggle = (id: number) => {
		setPlayWithIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))
	}

	if (!isOpen) return null

	return (
		<div className='bulk-edit-modal-overlay' onClick={handleClose}>
			<div className='bulk-edit-modal' onClick={(e) => e.stopPropagation()}>
				<div className='bulk-edit-modal__header'>
					<h2>Bulk Edit Games</h2>
					<button className='bulk-edit-modal__close' onClick={handleClose}>
						×
					</button>
				</div>

				<div className='bulk-edit-modal__content'>
					<p className='bulk-edit-modal__info'>
						Editing {selectedCount} game{selectedCount !== 1 ? 's' : ''}
					</p>

					<div className='bulk-edit-modal__field'>
						<label>Status</label>
						<select
							value={statusId ?? ''}
							onChange={(e) => setStatusId(e.target.value ? Number(e.target.value) : undefined)}>
							<option value=''>-- No change --</option>
							{statusOptions.map((s) => (
								<option key={s.value} value={s.value}>
									{s.label}
								</option>
							))}
						</select>
					</div>

					<div className='bulk-edit-modal__field'>
						<label>Platform</label>
						<select
							value={platformId ?? ''}
							onChange={(e) => setPlatformId(e.target.value ? Number(e.target.value) : undefined)}>
							<option value=''>-- No change --</option>
							{platformOptions.map((p) => (
								<option key={p.value} value={p.value}>
									{p.label}
								</option>
							))}
						</select>
					</div>

					<div className='bulk-edit-modal__field'>
						<label>Play With</label>
						<div className='bulk-edit-modal__checkboxes'>
							{playWithOptions.map((pw) => (
								<label key={pw.value} className='bulk-edit-modal__checkbox'>
									<input
										type='checkbox'
										checked={playWithIds.includes(pw.value)}
										onChange={() => handlePlayWithToggle(pw.value)}
									/>
									<span>{pw.label}</span>
								</label>
							))}
						</div>
						{playWithIds.length > 0 && (
							<button
								type='button'
								className='bulk-edit-modal__clear-playwith'
								onClick={() => setPlayWithIds([])}>
								Clear selection
							</button>
						)}
					</div>
				</div>

				<div className='bulk-edit-modal__footer'>
					<button
						className='bulk-edit-modal__button bulk-edit-modal__button--cancel'
						onClick={handleClose}>
						Cancel
					</button>
					<button
						className='bulk-edit-modal__button bulk-edit-modal__button--save'
						onClick={handleSave}
						disabled={isSaving}>
						{isSaving ? 'Saving...' : 'Save Changes'}
					</button>
				</div>
			</div>
		</div>
	)
}

export default BulkEditModal
