import React, { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
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

const ITEMS_PER_PAGE = 50

const DEFAULT_GLOBAL_CONFIG: GameImportConfig = { mode: 'simple' }

const SelectiveImportModal: React.FC<Props> = ({ isOpen, onClose, onImportComplete }) => {
	const { t } = useTranslation()
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
	const [perGamePage, setPerGamePage] = useState(0)

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
				setMessage({ text: t('home.importModal.errorEmpty'), type: 'error' })
			}
		} catch {
			setMessage({ text: t('home.importModal.errorParse'), type: 'error' })
		} finally {
			setParsing(false)
		}
	}

	const handleTextChange = (text: string) => {
		setCsvText(text)
		setMessage(null)
		if (!text.trim()) setParsedGameNames([])
	}

	// Debounce CSV text parsing: waits 400 ms after the last keystroke before parsing
	useEffect(() => {
		if (!csvText.trim()) return
		const timer = setTimeout(async () => {
			setParsing(true)
			try {
				const names = await parseCSVGameNames(csvText)
				setParsedGameNames(names)
			} catch {
				setParsedGameNames([])
			} finally {
				setParsing(false)
			}
		}, 400)
		return () => clearTimeout(timer)
	}, [csvText])

	// Reset per-game pagination when the game list changes
	useEffect(() => {
		setPerGamePage(0)
	}, [parsedGameNames])

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
			setMessage({ text: t('home.importModal.errorNoSource'), type: 'error' })
			return
		}
		if (parsedGameNames.length === 0) {
			setMessage({ text: t('home.importModal.errorNoGames'), type: 'error' })
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
				text: t('home.importModal.successImport', {
					imported: result.imported,
					updated: result.updated,
					errors: hasErrors ? t('home.importModal.successErrors', { errors: result.errors!.join('; ') }) : '',
				}),
				type: hasErrors ? 'error' : 'success',
			})

			onImportComplete?.()
		} catch (err) {
			setMessage({ text: err instanceof Error ? err.message : t('home.importModal.errorImport'), type: 'error' })
		} finally {
			setLoading(false)
		}
	}

	// ── Render ─────────────────────────────────────────────────────────────────

	const pageCount = Math.ceil(parsedGameNames.length / ITEMS_PER_PAGE)
	const pagedGameNames = parsedGameNames.slice(perGamePage * ITEMS_PER_PAGE, (perGamePage + 1) * ITEMS_PER_PAGE)
	const canImport = parsedGameNames.length > 0 && !loading

	return (
		<Modal
			isOpen={isOpen}
			onClose={handleClose}
			title={t('home.importModal.title')}
			maxWidth='780px'
			footer={
				<div className='sim__footer'>
					<button type='button' className='sim__btn sim__btn--secondary' onClick={handleClose} disabled={loading}>
						{t('home.importModal.cancel')}
					</button>
					<button type='button' className='sim__btn sim__btn--primary' onClick={handleImport} disabled={!canImport}>
						{loading ? t('home.importModal.importing') : parsedGameNames.length > 0 ? t('home.importModal.importBtn', { count: parsedGameNames.length }) : t('home.importModal.importBtnNoCount')}
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
					<h3 className='sim__section-title'>{t('home.importModal.section1')}</h3>

					<div className='sim__source-toggle'>
						<label className={`sim__source-btn ${sourceType === 'file' ? 'is-active' : ''}`}>
							<input type='radio' name='sim-source' checked={sourceType === 'file'} onChange={() => setSourceType('file')} />
							{t('home.importModal.uploadFile')}
						</label>
						<label className={`sim__source-btn ${sourceType === 'text' ? 'is-active' : ''}`}>
							<input type='radio' name='sim-source' checked={sourceType === 'text'} onChange={() => setSourceType('text')} />
							{t('home.importModal.pasteText')}
						</label>
					</div>

					{sourceType === 'file' && (
						<div className='sim__file-input-wrapper'>
							<input ref={fileInputRef} type='file' accept='.csv' className='sim__file-input' id='sim-file' onChange={handleFileChange} />
							<label htmlFor='sim-file' className='sim__file-label'>
								{csvFile ? csvFile.name : t('home.importModal.chooseFile')}
							</label>
						</div>
					)}

					{sourceType === 'text' && (
						<textarea className='sim__text-input' placeholder={t('home.importModal.textareaPlaceholder')} rows={6} value={csvText} onChange={(e) => handleTextChange(e.target.value)} />
					)}

					{parsing && <p className='sim__parsing-indicator'>{t('home.importModal.parsing')}</p>}
				</section>

				{/* ── Section 2: Preview ────────────────────────────────────────── */}
				{parsedGameNames.length > 0 && (
					<section className='sim__section'>
						<h3 className='sim__section-title'>{t('home.importModal.section2', { count: parsedGameNames.length })}</h3>
						<div className='sim__preview-list'>
							{parsedGameNames.map((name, index) => (
								<span key={`${name}-${index}`} className='sim__preview-chip'>
									{name}
								</span>
							))}
						</div>
					</section>
				)}

				{/* ── Section 3: Global Import Options ─────────────────────────── */}
				{parsedGameNames.length > 0 && (
					<section className='sim__section'>
						<h3 className='sim__section-title'>{t('home.importModal.section3')}</h3>
						<p className='sim__section-desc'>
							{t('home.importModal.globalDesc')}
							<br />
							<strong>{t('home.importModal.statusNoteStrong')}</strong> {t('home.importModal.statusNote1')} <em>{t('home.importModal.statusNoteEm')}</em> {t('home.importModal.statusNote2')}
						</p>
						<PropertyConfigPanel panelMode='import' config={globalConfig} onChange={(cfg) => setGlobalConfig(cfg as GameImportConfig)} />
					</section>
				)}

				{/* ── Section 4: Per-game Overrides ────────────────────────────── */}
				{parsedGameNames.length > 0 && (
					<section className='sim__section'>
						<h3 className='sim__section-title'>{t('home.importModal.section4')}</h3>
						<p className='sim__section-desc'>{t('home.importModal.overrideDesc')}</p>

						<div className='sim__per-game-list'>
							{pagedGameNames.map((name) => {
								const hasOverride = !!perGameConfig[name]
								const isExpanded = expandedGameName === name
								const gameCfg = perGameConfig[name] ?? DEFAULT_GLOBAL_CONFIG

								return (
									<div key={name} className={`sim__per-game-item ${hasOverride ? 'sim__per-game-item--overridden' : ''}`}>
										<button type='button' className='sim__per-game-header' onClick={() => toggleExpand(name)}>
											<span className='sim__per-game-arrow'>{isExpanded ? '▾' : '▸'}</span>
											<span className='sim__per-game-name'>{name}</span>
											<span className='sim__per-game-badge'>{hasOverride ? t('home.importModal.overrideActive') : t('home.importModal.usingGlobal')}</span>
											{hasOverride && (
												<button
													type='button'
													className='sim__per-game-reset'
													title={t('home.importModal.removeOverride')}
													onClick={(e) => {
														e.stopPropagation()
														updatePerGameConfig(name, null)
													}}>
													{t('home.importModal.resetOverride')}
												</button>
											)}
										</button>

										{isExpanded && (
											<div className='sim__per-game-body'>
												<PropertyConfigPanel
													panelMode='import'
													config={gameCfg}
													onChange={(cfg) => updatePerGameConfig(name, cfg as GameImportConfig)}
													headingLabel={t('home.importModal.overrideForLabel', { name })}
												/>
											</div>
										)}
									</div>
								)
							})}
						</div>
						{pageCount > 1 && (
							<div className='sim__pagination'>
								<button className='sim__pagination-btn' onClick={() => setPerGamePage((p) => p - 1)} disabled={perGamePage === 0}>
									{t('home.importModal.prevPage')}
								</button>
								<span className='sim__pagination-info'>
									{t('home.importModal.pageInfo', { page: perGamePage + 1, total: pageCount })}
								</span>
								<button className='sim__pagination-btn' onClick={() => setPerGamePage((p) => p + 1)} disabled={perGamePage >= pageCount - 1}>
									{t('home.importModal.nextPage')}
								</button>
							</div>
						)}
					</section>
				)}
			</div>
		</Modal>
	)
}

export default SelectiveImportModal
