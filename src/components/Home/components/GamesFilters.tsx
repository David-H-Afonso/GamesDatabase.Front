import React, { useEffect, useState } from 'react'
import type { GameQueryParameters } from '@/models/api/Game'
import { useGamePlatform, useGamePlayedStatus, useGamePlayWith, useGameStatus } from '@/hooks'
import './GamesFilters.scss'

interface Props {
	value: GameQueryParameters
	onChange: (next: Partial<GameQueryParameters>) => void
	isOpen?: boolean
	onClear?: () => void
}

const GamesFilters: React.FC<Props> = ({ value, onChange, isOpen = true, onClear }) => {
	const { fetchList: fetchPlatforms } = useGamePlatform()
	const { fetchOptions: fetchPlayWithList } = useGamePlayWith()
	const { fetchActiveStatusList } = useGameStatus()
	const { fetchList: fetchPlayedStatusList } = useGamePlayedStatus()

	const [platformOptions, setPlatformOptions] = useState<{ value: number; label: string }[]>([])
	const [playWithOptions, setPlayWithOptions] = useState<{ value: number; label: string }[]>([])
	const [statusOptions, setStatusOptions] = useState<{ value: number; label: string }[]>([])
	const [playedStatusOptions, setPlayedStatusOptions] = useState<
		{ value: number; label: string }[]
	>([])

	useEffect(() => {
		const normalize = (res: any) => {
			if (!res) return []
			if (Array.isArray(res)) return res
			if (res.data && Array.isArray(res.data)) return res.data
			return []
		}

		void (async () => {
			try {
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

				const st = await fetchActiveStatusList()
				const stList = normalize(st)
				setStatusOptions(stList.map((s: any) => ({ value: s.id as number, label: String(s.name) })))

				const ps = await fetchPlayedStatusList()
				const psList = normalize(ps)
				setPlayedStatusOptions(
					psList.map((s: any) => ({ value: s.id as number, label: String(s.name) }))
				)
			} catch (err) {
				console.error('Error loading filter options', err)
			}
		})()
	}, [fetchPlatforms, fetchPlayWithList, fetchActiveStatusList, fetchPlayedStatusList])

	const update = (patch: Partial<GameQueryParameters>) => onChange({ ...patch, page: 1 })

	const handleClear = () => {
		if (onClear) onClear()
		else onChange({})
	}

	const handleExcludeStatusChange = (statusId: number, isExcluded: boolean) => {
		const currentExcluded = value.excludeStatusIds || []
		let newExcluded: number[]

		if (isExcluded) {
			newExcluded = [...currentExcluded, statusId]
		} else {
			newExcluded = currentExcluded.filter((id) => id !== statusId)
		}

		update({ excludeStatusIds: newExcluded.length > 0 ? newExcluded : undefined })
	}

	return (
		<div className={`games-filters ${isOpen ? 'open' : 'closed'}`}>
			<input
				type='number'
				placeholder='Min grade'
				value={value.minGrade ?? ''}
				onChange={(e) => update({ minGrade: e.target.value ? Number(e.target.value) : undefined })}
				className='gf-input'
			/>
			<input
				type='number'
				placeholder='Max grade'
				value={value.maxGrade ?? ''}
				onChange={(e) => update({ maxGrade: e.target.value ? Number(e.target.value) : undefined })}
				className='gf-input'
			/>

			<select
				value={value.platformId?.toString() ?? ''}
				onChange={(e) =>
					update({ platformId: e.target.value ? Number(e.target.value) : undefined })
				}
				className='gf-select'>
				<option value=''>All Platforms</option>
				{platformOptions.map((p) => (
					<option key={p.value} value={String(p.value)}>
						{p.label}
					</option>
				))}
			</select>

			<select
				value={value.playWithId?.toString() ?? ''}
				onChange={(e) =>
					update({ playWithId: e.target.value ? Number(e.target.value) : undefined })
				}
				className='gf-select'>
				<option value=''>All Play With</option>
				{playWithOptions.map((p) => (
					<option key={p.value} value={String(p.value)}>
						{p.label}
					</option>
				))}
			</select>

			<select
				value={value.statusId?.toString() ?? ''}
				onChange={(e) => update({ statusId: e.target.value ? Number(e.target.value) : undefined })}
				className='gf-select'>
				<option value=''>All Status</option>
				{statusOptions.map((s) => (
					<option key={s.value} value={String(s.value)}>
						{s.label}
					</option>
				))}
			</select>

			<select
				value={value.playedStatusId?.toString() ?? ''}
				onChange={(e) =>
					update({ playedStatusId: e.target.value ? Number(e.target.value) : undefined })
				}
				className='gf-select'>
				<option value=''>All Played Status</option>
				{playedStatusOptions.map((s) => (
					<option key={s.value} value={String(s.value)}>
						{s.label}
					</option>
				))}
			</select>

			<input
				type='number'
				placeholder='Released Year'
				value={value.releasedYear ?? ''}
				onChange={(e) =>
					update({ releasedYear: e.target.value ? Number(e.target.value) : undefined })
				}
				className='gf-input'
			/>
			<input
				type='number'
				placeholder='Started Year'
				value={value.startedYear ?? ''}
				onChange={(e) =>
					update({ startedYear: e.target.value ? Number(e.target.value) : undefined })
				}
				className='gf-input'
			/>
			<input
				type='number'
				placeholder='Finished Year'
				value={value.finishedYear ?? ''}
				onChange={(e) =>
					update({ finishedYear: e.target.value ? Number(e.target.value) : undefined })
				}
				className='gf-input'
			/>

			<select
				value={value.pageSize?.toString() ?? ''}
				onChange={(e) => update({ pageSize: e.target.value ? Number(e.target.value) : undefined })}
				className='gf-select'>
				<option value=''>Page Size</option>
				<option value='10'>10</option>
				<option value='25'>25</option>
				<option value='50'>50</option>
				<option value='100'>100</option>
				<option value='200'>200</option>
			</select>

			{/* Exclude Status IDs filter */}
			<div className='gf-exclude-status'>
				<label
					style={{ marginBottom: '4px', display: 'block', fontSize: '12px', fontWeight: 'bold' }}>
					Exclude Status:
				</label>
				{statusOptions.map((status) => {
					const isExcluded = (value.excludeStatusIds || []).includes(status.value)
					return (
						<label
							key={status.value}
							style={{ display: 'flex', alignItems: 'center', marginBottom: '2px' }}>
							<input
								type='checkbox'
								checked={isExcluded}
								onChange={(e) => handleExcludeStatusChange(status.value, e.target.checked)}
								style={{ marginRight: '6px' }}
							/>
							<span style={{ fontSize: '12px' }}>{status.label}</span>
						</label>
					)
				})}
			</div>

			<select
				value={
					value.isCheaperByKey === true ? 'true' : value.isCheaperByKey === false ? 'false' : ''
				}
				onChange={(e) => {
					const val = e.target.value
					update({ isCheaperByKey: val === '' ? undefined : val === 'true' })
				}}
				className='gf-select'>
				<option value=''>All Prices</option>
				<option value='true'>Cheaper by Key</option>
				<option value='false'>Cheaper in Store</option>
			</select>

			<div className='gf-row gf-row--compact'>
				<button type='button' className='gf-clear-btn' onClick={handleClear}>
					Clear filters
				</button>
			</div>
		</div>
	)
}

export default GamesFilters
