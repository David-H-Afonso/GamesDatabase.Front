import React, { useState, useRef } from 'react'
import { Modal } from '@/components/elements'
import { selectiveImportGames, parseCSVGameNames } from '@/services'
import type { GameImportConfig, SelectiveImportRequest } from '@/models/api/ImportExport'
import PropertyConfigPanel from './shared/PropertyConfigPanel'
import './SelectiveImportModal.scss'

interface Props {
	isOpen: boolean
	onClose: () => void
	/** Called after a successful import to allow parent to refresh the game list */
	onImportComplete?: () => void
}

const DEFAULT_GLOBAL_CONFIG: GameImportConfig = { mode: 'simple' }

const SelectiveImportModal: React.FC<Props> = ({ isOpen, onClose, onImportComplete }) => {
	const fileInputRef = useRef<HTMLInputElement>(null)

	const [sourceType, setSourceType] = useState<'file' | 'text'>('file')
	const [csvFile, setCsvFile] = useState<File | null>(null)
	const [csvText, setCsvText] = useState('')
	const [parsedGameNames, setParsedGameNames] = useState<string[]>([])
	const [parsing, setParsing] = useState(false)

	const [globalConfig, setGlobalConfig] = useState<GameImportConfig>(DEFAULT_GLOBAL_CONFIG)
	const [perGameConfig, setPerGameConfig] = useState<Record<string, GameImportConfig>>({})
	const [expandedGameName, setExpandedGameName] = useState<string | null>(null)

	const [loading, setLoading] = useState(false)
	const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

	// ── Reset / close ──────────────────────────────────────────────────────────

	const resetState = () => {
		setSourceType('file')
		setCsvFile(null)
		setCsvText('')
		setParsedGameNames([])
		setGlobalConfig(DEFAULT_GLOBAL_CONFIG)
		setPerGameConfig({})
		setExpandedGameName(null)
		setMessage(null)
		if (fileInputRef.current) fileInputRef.current.value = ''
	}

	const handleClose = () => {
		resetState()
		onClose()
	}

	// ── Source handling ────────────────────────────────────────────────────────

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0] ?? null
		setCsvFile(file)
		setParsedGameNames([])
		setMessage(null)
		if (!file) return

		setParsing(true)
		try {
			const names = await parseCSVGameNames(file)
			setParsedGameNames(names)
			if (names.length === 0) {
				setMessage({ text: 'No games found in the uploaded CSV.', type: 'error' })
			}
		} catch {
			setMessage({ text: 'Failed to parse the CSV file.', type: 'error' })
		} finally {
			setParsing(false)
		}
	}

	const handleTextChange = async (text: string) => {
		setCsvText(text)
		setMessage(null)
		if (!text.trim()) {
			setParsedGameNames([])
			return
		}
		// Debounce-free: parse on every change (text can be large, but this is lightweight)
		setParsing(true)
		try {
			const names = await parseCSVGameNames(text)
			setParsedGameNames(names)
		} catch {
			setParsedGameNames([])
		} finally {
			setParsing(false)
		}
	}

	// ── Per-game overrides ─────────────────────────────────────────────────────

	const toggleExpand = (gameName: string) => {
		setExpandedGameName((prev) => (prev === gameName ? null : gameName))
	}

	const updatePerGameConfig = (gameName: string, cfg: GameImportConfig | null) => {
		if (cfg === null) {
			const next = { ...perGameConfig }
			delete next[gameName]
			setPerGameConfig(next)
		} else {
			setPerGameConfig((prev) => ({ ...prev, [gameName]: cfg }))
		}
	}

	// ── Import ─────────────────────────────────────────────────────────────────

	const handleImport = async () => {
		const source = sourceType === 'file' ? csvFile : csvText
		if (!source || (typeof source === 'string' && !source.trim())) {
			setMessage({ text: 'Please provide a CSV source.', type: 'error' })
			return
		}
		if (parsedGameNames.length === 0) {
			setMessage({ text: 'No games to import. Please check your CSV.', type: 'error' })
			return
		}

		setLoading(true)
		setMessage(null)
		try {
			const request: SelectiveImportRequest = {
				globalConfig,
				perGameConfig: Object.keys(perGameConfig).length > 0 ? perGameConfig : undefined,
			}

			const result = await selectiveImportGames(source, request)
			const hasErrors = result.errors && result.errors.length > 0

			setMessage({
				text: `Import complete. Imported: ${result.imported}, Updated: ${result.updated}.${hasErrors ? ` Errors: ${result.errors!.join('; ')}` : ''}`,
				type: hasErrors ? 'error' : 'success',
			})

			onImportComplete?.()
		} catch (err) {
			setMessage({ text: err instanceof Error ? err.message : 'Import failed.', type: 'error' })
		} finally {
			setLoading(false)
		}
	}

	// ── Render ─────────────────────────────────────────────────────────────────

	const canImport = parsedGameNames.length > 0 && !loading

	return (
		<Modal
			isOpen={isOpen}
			onClose={handleClose}
			title='Import Games'
			maxWidth='780px'
			footer={
				<div className='sim__footer'>
					<button type='button' className='sim__btn sim__btn--secondary' onClick={handleClose} disabled={loading}>
						Cancel
					</button>
					<button type='button' className='sim__btn sim__btn--primary' onClick={handleImport} disabled={!canImport}>
						{loading ? 'Importing…' : `Import${parsedGameNames.length > 0 ? ` (${parsedGameNames.length} games)` : ''}`}
					</button>
				</div>
			}>
			<div className='sim'>
				{message && (
					<div className={`sim__message sim__message--${message.type}`}>
						<span>{message.text}</span>
					</div>
				)}

				{/* ── Section 1: Source ─────────────────────────────────────────── */}
				<section className='sim__section'>
					<h3 className='sim__section-title'>1. CSV Source</h3>

					<div className='sim__source-toggle'>
						<label className={`sim__source-btn ${sourceType === 'file' ? 'is-active' : ''}`}>
							<input type='radio' name='sim-source' checked={sourceType === 'file'} onChange={() => setSourceType('file')} />
							Upload File
						</label>
						<label className={`sim__source-btn ${sourceType === 'text' ? 'is-active' : ''}`}>
							<input type='radio' name='sim-source' checked={sourceType === 'text'} onChange={() => setSourceType('text')} />
							Paste Text
						</label>
					</div>

					{sourceType === 'file' && (
						<div className='sim__file-input-wrapper'>
							<input ref={fileInputRef} type='file' accept='.csv' className='sim__file-input' id='sim-file' onChange={handleFileChange} />
							<label htmlFor='sim-file' className='sim__file-label'>
								{csvFile ? csvFile.name : 'Choose a CSV file…'}
							</label>
						</div>
					)}

					{sourceType === 'text' && (
						<textarea className='sim__text-input' placeholder='Paste CSV content here…' rows={6} value={csvText} onChange={(e) => handleTextChange(e.target.value)} />
					)}

					{parsing && <p className='sim__parsing-indicator'>Parsing CSV…</p>}
				</section>

				{/* ── Section 2: Preview ────────────────────────────────────────── */}
				{parsedGameNames.length > 0 && (
					<section className='sim__section'>
						<h3 className='sim__section-title'>2. Games Found ({parsedGameNames.length})</h3>
						<div className='sim__preview-list'>
							{parsedGameNames.map((name) => (
								<span key={name} className='sim__preview-chip'>
									{name}
								</span>
							))}
						</div>
					</section>
				)}

				{/* ── Section 3: Global Import Options ─────────────────────────── */}
				{parsedGameNames.length > 0 && (
					<section className='sim__section'>
						<h3 className='sim__section-title'>3. Global Import Options</h3>
						<p className='sim__section-desc'>
							These rules apply to all games in the CSV unless a per-game override is configured below.
							<br />
							<strong>Status</strong> cannot be cleaned — games with no matching status will automatically receive the <em>Not Fulfilled</em> status.
						</p>
						<PropertyConfigPanel panelMode='import' config={globalConfig} onChange={(cfg) => setGlobalConfig(cfg as GameImportConfig)} />
					</section>
				)}

				{/* ── Section 4: Per-game Overrides ────────────────────────────── */}
				{parsedGameNames.length > 0 && (
					<section className='sim__section'>
						<h3 className='sim__section-title'>4. Per-Game Overrides (optional)</h3>
						<p className='sim__section-desc'>Expand a game to set rules that override the global import options for that game only.</p>

						<div className='sim__per-game-list'>
							{parsedGameNames.map((name) => {
								const hasOverride = !!perGameConfig[name]
								const isExpanded = expandedGameName === name
								const gameCfg = perGameConfig[name] ?? DEFAULT_GLOBAL_CONFIG

								return (
									<div key={name} className={`sim__per-game-item ${hasOverride ? 'sim__per-game-item--overridden' : ''}`}>
										<button type='button' className='sim__per-game-header' onClick={() => toggleExpand(name)}>
											<span className='sim__per-game-arrow'>{isExpanded ? '▾' : '▸'}</span>
											<span className='sim__per-game-name'>{name}</span>
											<span className='sim__per-game-badge'>{hasOverride ? 'Override active' : 'Using global'}</span>
											{hasOverride && (
												<button
													type='button'
													className='sim__per-game-reset'
													title='Remove override'
													onClick={(e) => {
														e.stopPropagation()
														updatePerGameConfig(name, null)
													}}>
													Reset
												</button>
											)}
										</button>

										{isExpanded && (
											<div className='sim__per-game-body'>
												<PropertyConfigPanel
													panelMode='import'
													config={gameCfg}
													onChange={(cfg) => updatePerGameConfig(name, cfg as GameImportConfig)}
													headingLabel={`Override for: ${name}`}
												/>
											</div>
										)}
									</div>
								)
							})}
						</div>
					</section>
				)}
			</div>
		</Modal>
	)
}

export default SelectiveImportModal
