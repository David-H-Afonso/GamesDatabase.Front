import React, { useEffect, useState, useCallback } from 'react'
import { useGameStatus, useGamePlatform, useGamePlayWith, useGamePlayedStatus } from '@/hooks'
import { GAME_PROPERTY_FIELDS } from '@/models/api/ImportExport'
import type { ConfigurableGameProperty, GameImportConfig, GameExportConfig, ImportPropertyOverride, ExportPropertyOverride } from '@/models/api/ImportExport'
import './PropertyConfigPanel.scss'

interface Option {
	value: string
	label: string
}

interface PropertyConfigPanelProps {
	/** Whether this panel is used for import or export */
	panelMode: 'import' | 'export'
	/** Current config value */
	config: GameImportConfig | GameExportConfig
	/** Called when the config changes */
	onChange: (config: GameImportConfig | GameExportConfig) => void
	/** Optional label shown above the panel */
	headingLabel?: string
}

const PropertyConfigPanel: React.FC<PropertyConfigPanelProps> = ({ panelMode, config, onChange, headingLabel }) => {
	const { fetchActiveStatusList } = useGameStatus()
	const { fetchList: fetchPlatforms } = useGamePlatform()
	const { fetchOptions: fetchPlayWithList } = useGamePlayWith()
	const { fetchActiveList: fetchPlayedStatusList } = useGamePlayedStatus()

	const [statusOptions, setStatusOptions] = useState<Option[]>([])
	const [platformOptions, setPlatformOptions] = useState<Option[]>([])
	const [playWithOptions, setPlayWithOptions] = useState<Option[]>([])
	const [playedStatusOptions, setPlayedStatusOptions] = useState<Option[]>([])

	const normalize = (res: any): any[] => {
		if (!res) return []
		if (Array.isArray(res)) return res
		if (res.data && Array.isArray(res.data)) return res.data
		return []
	}

	const loadOptions = useCallback(async () => {
		try {
			const [st, plat, pw, ps] = await Promise.all([fetchActiveStatusList(), fetchPlatforms(), fetchPlayWithList(), fetchPlayedStatusList()])
			setStatusOptions(normalize(st).map((s: any) => ({ value: String(s.name), label: String(s.name) })))
			setPlatformOptions(normalize(plat).map((p: any) => ({ value: String(p.name), label: String(p.name) })))
			setPlayWithOptions(normalize(pw).map((p: any) => ({ value: String(p.name), label: String(p.name) })))
			setPlayedStatusOptions(normalize(ps).map((p: any) => ({ value: String(p.name), label: String(p.name) })))
		} catch (err) {
			console.error('PropertyConfigPanel: Failed to load options', err)
		}
	}, [fetchActiveStatusList, fetchPlatforms, fetchPlayWithList, fetchPlayedStatusList])

	// Load entity options as soon as we switch to custom mode
	useEffect(() => {
		if (config.mode === 'custom') {
			void loadOptions()
		}
	}, [config.mode, loadOptions])

	// ── Mode toggle (Simple / Custom Cleared / Custom) ─────────────────────────────────

	const handleModeToggle = (newMode: 'simple' | 'custom' | 'customCleared') => {
		if (panelMode === 'import') {
			onChange({ ...config, mode: newMode } as GameImportConfig)
		} else {
			onChange({ ...config, mode: newMode } as GameExportConfig)
		}
	}

	// ── Property mode change ────────────────────────────────────────────────────

	const handlePropertyModeChange = (propKey: ConfigurableGameProperty, newPropMode: string) => {
		if (panelMode === 'import') {
			const importCfg = config as GameImportConfig
			const existing = importCfg.properties?.[propKey]
			const updated: ImportPropertyOverride = {
				...existing,
				mode: newPropMode as ImportPropertyOverride['mode'],
				// Reset customValue when switching away from custom mode
				customValue: newPropMode === 'custom' ? (existing?.customValue ?? null) : undefined,
			}
			onChange({
				...importCfg,
				properties: { ...importCfg.properties, [propKey]: updated },
			} as GameImportConfig)
		} else {
			const exportCfg = config as GameExportConfig
			const updated: ExportPropertyOverride = { mode: newPropMode as ExportPropertyOverride['mode'] }
			onChange({
				...exportCfg,
				properties: { ...exportCfg.properties, [propKey]: updated },
			} as GameExportConfig)
		}
	}

	// ── Custom value change (import only) ───────────────────────────────────────

	const handleCustomValueChange = (propKey: ConfigurableGameProperty, value: string | null) => {
		const importCfg = config as GameImportConfig
		const existing = importCfg.properties?.[propKey]
		onChange({
			...importCfg,
			properties: {
				...importCfg.properties,
				[propKey]: { ...existing, mode: 'custom', customValue: value } as ImportPropertyOverride,
			},
		} as GameImportConfig)
	}

	// ── Helpers ─────────────────────────────────────────────────────────────────

	const getImportPropMode = (propKey: ConfigurableGameProperty): string => {
		const importCfg = config as GameImportConfig
		return importCfg.properties?.[propKey]?.mode ?? 'asImported'
	}

	const getExportPropMode = (propKey: ConfigurableGameProperty): string => {
		const exportCfg = config as GameExportConfig
		return exportCfg.properties?.[propKey]?.mode ?? 'asStored'
	}

	const getCustomValue = (propKey: ConfigurableGameProperty): string => {
		const importCfg = config as GameImportConfig
		return importCfg.properties?.[propKey]?.customValue ?? ''
	}

	// ── Custom value editor ─────────────────────────────────────────────────────

	const renderCustomEditor = (propKey: ConfigurableGameProperty) => {
		const field = GAME_PROPERTY_FIELDS.find((f) => f.key === propKey)
		if (!field || !field.canCustomOnImport) return null

		const currentValue = getCustomValue(propKey)

		const selectEditor = (options: Option[]) => (
			<select
				aria-label={`${field.label} custom value`}
				className='pcp__custom-select'
				value={currentValue}
				onChange={(e) => handleCustomValueChange(propKey, e.target.value || null)}>
				<option value=''>— select —</option>
				{options.map((o) => (
					<option key={o.value} value={o.value}>
						{o.label}
					</option>
				))}
			</select>
		)

		switch (field.inputType) {
			case 'status':
				return selectEditor(statusOptions)
			case 'platform':
				return selectEditor(platformOptions)
			case 'playedStatus':
				return selectEditor(playedStatusOptions)
			case 'playWith':
				// Multi-select: store comma-separated names
				return (
					<div className='pcp__custom-multiselect'>
						{playWithOptions.map((o) => {
							const selected = currentValue
								.split(',')
								.map((s) => s.trim())
								.filter(Boolean)
								.includes(o.value)
							return (
								<label key={o.value} className='pcp__custom-multiselect-item'>
									<input
										type='checkbox'
										checked={selected}
										onChange={(e) => {
											const current = currentValue
												.split(',')
												.map((s) => s.trim())
												.filter(Boolean)
											const updated = e.target.checked ? [...current, o.value] : current.filter((v) => v !== o.value)
											handleCustomValueChange(propKey, updated.join(', ') || null)
										}}
									/>
									<span>{o.label}</span>
								</label>
							)
						})}
					</div>
				)
			case 'criticProvider':
				return selectEditor([
					{ value: 'Metacritic', label: 'Metacritic' },
					{ value: 'OpenCritic', label: 'OpenCritic' },
					{ value: 'SteamDB', label: 'SteamDB' },
				])
			case 'number':
				return (
					<input
						type='number'
						className='pcp__custom-input'
						min={0}
						max={100}
						placeholder='0-100'
						value={currentValue}
						onChange={(e) => handleCustomValueChange(propKey, e.target.value || null)}
					/>
				)
			case 'date':
				return <input type='date' className='pcp__custom-input' value={currentValue} onChange={(e) => handleCustomValueChange(propKey, e.target.value || null)} />
			case 'boolean':
				return selectEditor([
					{ value: 'true', label: 'True (cheaper by key)' },
					{ value: 'false', label: 'False (cheaper in store)' },
				])
			case 'text':
				return (
					<input
						type='text'
						className='pcp__custom-input'
						placeholder='Enter value…'
						value={currentValue}
						onChange={(e) => handleCustomValueChange(propKey, e.target.value || null)}
					/>
				)
			default:
				return null
		}
	}

	// ── Render ──────────────────────────────────────────────────────────────────

	return (
		<div className='pcp'>
			{headingLabel && <p className='pcp__heading'>{headingLabel}</p>}

			{/* Mode toggle */}
			<div className='pcp__mode-toggle'>
				<label className={`pcp__mode-btn ${config.mode === 'simple' ? 'is-active' : ''}`}>
					<input type='radio' name={`pcp-mode-${headingLabel ?? 'global'}`} checked={config.mode === 'simple'} onChange={() => handleModeToggle('simple')} />
					{panelMode === 'import' ? 'As Imported (all)' : 'As Stored (all)'}
				</label>
				<label className={`pcp__mode-btn ${config.mode === 'customCleared' ? 'is-active' : ''}`}>
					<input type='radio' name={`pcp-mode-${headingLabel ?? 'global'}`} checked={config.mode === 'customCleared'} onChange={() => handleModeToggle('customCleared')} />
					Custom Cleared
				</label>
				<label className={`pcp__mode-btn ${config.mode === 'custom' ? 'is-active' : ''}`}>
					<input type='radio' name={`pcp-mode-${headingLabel ?? 'global'}`} checked={config.mode === 'custom'} onChange={() => handleModeToggle('custom')} />
					Custom (per property)
				</label>
			</div>

			{/* Explanation for Custom Cleared */}
			{config.mode === 'customCleared' && (
				<p className='pcp__mode-desc'>
					{panelMode === 'export' ? (
						<>
							Clears personal fields (<strong>Started, Finished, Grade, Comment, Status, Play With</strong>) and keeps all other fields as stored. Useful for sharing a clean copy.
						</>
					) : (
						<>
							Ignores personal fields from the CSV (<strong>Started, Finished, Grade, Comment, Status, Play With</strong>) and keeps all other values as imported. Status falls back
							to <em>Not Fulfilled</em>.
						</>
					)}
				</p>
			)}

			{/* Per-property configuration (only shown in custom mode) */}
			{config.mode === 'custom' && (
				<table className='pcp__table'>
					<thead>
						<tr>
							<th>Property</th>
							<th>Mode</th>
							{panelMode === 'import' && <th>Custom Value</th>}
						</tr>
					</thead>
					<tbody>
						{GAME_PROPERTY_FIELDS.map((field) => {
							const propMode = panelMode === 'import' ? getImportPropMode(field.key) : getExportPropMode(field.key)

							const modeOptions =
								panelMode === 'import'
									? [
											{ value: 'asImported', label: 'As Imported' },
											...(field.canCleanOnImport ? [{ value: 'clean', label: 'Clean' }] : []),
											...(field.canCustomOnImport ? [{ value: 'custom', label: 'Custom Value' }] : []),
										]
									: [{ value: 'asStored', label: 'As Stored' }, ...(field.canCleanOnExport ? [{ value: 'clean', label: 'Clean' }] : [])]

							return (
								<tr key={field.key} className={`pcp__row ${propMode !== 'asImported' && propMode !== 'asStored' ? 'pcp__row--modified' : ''}`}>
									<td className='pcp__label'>{field.label}</td>
									<td className='pcp__mode-cell'>
										<select
											aria-label={`${field.label} import/export mode`}
											className='pcp__mode-select'
											value={propMode}
											onChange={(e) => handlePropertyModeChange(field.key, e.target.value)}>
											{modeOptions.map((o) => (
												<option key={o.value} value={o.value}>
													{o.label}
												</option>
											))}
										</select>
									</td>
									{panelMode === 'import' && <td className='pcp__custom-cell'>{propMode === 'custom' ? renderCustomEditor(field.key) : null}</td>}
								</tr>
							)
						})}
					</tbody>
				</table>
			)}
		</div>
	)
}

export default PropertyConfigPanel
