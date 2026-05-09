import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '@/components/elements'
import { selectiveExportGames, downloadBlob, buildExportFileName } from '@/services'
import { useAppSelector } from '@/store/hooks'
import { selectCurrentUser } from '@/store/features/auth/selector'
import type { GameExportConfig, SelectiveExportRequest } from '@/models/api/ImportExport'
import GameSelectorPanel from './shared/GameSelectorPanel'
import PropertyConfigPanel from './shared/PropertyConfigPanel'
import './SelectiveExportModal.scss'

interface Props {
	isOpen: boolean
	onClose: () => void
	/** Games pre-selected when opened from bulk-action or single-game export */
	preSelectedGames?: Array<{ id: number; name: string }>
}

const ITEMS_PER_PAGE = 50

const DEFAULT_GLOBAL_CONFIG: GameExportConfig = { mode: 'simple' }

const SelectiveExportModal: React.FC<Props> = ({ isOpen, onClose, preSelectedGames = [] }) => {
	const { t } = useTranslation()
	const currentUser = useAppSelector(selectCurrentUser)
	const defaultPrefix = currentUser ? `${currentUser.id}-${currentUser.username}` : ''
	const [selectedGames, setSelectedGames] = useState<Array<{ id: number; name: string }>>([])
	const [globalConfig, setGlobalConfig] = useState<GameExportConfig>(DEFAULT_GLOBAL_CONFIG)
	const [perGameConfig, setPerGameConfig] = useState<Record<number, GameExportConfig>>({})
	const [expandedGameId, setExpandedGameId] = useState<number | null>(null)
	const [loading, setLoading] = useState(false)
	const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
	const [perGamePage, setPerGamePage] = useState(0)
	const [filePrefix, setFilePrefix] = useState(defaultPrefix)
	const [fileSuffix, setFileSuffix] = useState('')

	useEffect(() => {
		if (isOpen) {
			setSelectedGames(preSelectedGames)
		}
	}, [isOpen])

	// Reset per-game pagination when the selection changes
	useEffect(() => {
		setPerGamePage(0)
	}, [selectedGames])

	const handleClose = () => {
		setSelectedGames([])
		setGlobalConfig(DEFAULT_GLOBAL_CONFIG)
		setPerGameConfig({})
		setExpandedGameId(null)
		setMessage(null)
		onClose()
	}

	const handleExport = async () => {
		if (selectedGames.length === 0) {
			setMessage({ text: t('home.exportModal.errorNoGames'), type: 'error' })
			return
		}

		setLoading(true)
		setMessage(null)
		try {
			const request: SelectiveExportRequest = {
				gameIds: selectedGames.map((g) => g.id),
				globalConfig,
				perGameConfig: Object.keys(perGameConfig).length > 0 ? perGameConfig : undefined,
			}

			const blob = await selectiveExportGames(request)
			const filename = buildExportFileName({ prefix: filePrefix, suffix: fileSuffix, exportType: 'partial' })
			downloadBlob(blob, filename)
			setMessage({ text: t('home.exportModal.successExport', { count: selectedGames.length }), type: 'success' })
		} catch (err) {
			setMessage({ text: err instanceof Error ? err.message : t('home.exportModal.errorExport'), type: 'error' })
		} finally {
			setLoading(false)
		}
	}

	const togglePerGameExpand = (gameId: number) => {
		setExpandedGameId((prev) => (prev === gameId ? null : gameId))
	}

	const updatePerGameConfig = (gameId: number, config: GameExportConfig | null) => {
		if (config === null) {
			// Remove override
			const next = { ...perGameConfig }
			delete next[gameId]
			setPerGameConfig(next)
		} else {
			setPerGameConfig((prev) => ({ ...prev, [gameId]: config }))
		}
	}

	const hasPerGameOverride = (gameId: number) => !!perGameConfig[gameId]

	const pageCount = Math.ceil(selectedGames.length / ITEMS_PER_PAGE)
	const pagedGames = selectedGames.slice(perGamePage * ITEMS_PER_PAGE, (perGamePage + 1) * ITEMS_PER_PAGE)

	return (
		<Modal
			isOpen={isOpen}
			onClose={handleClose}
			title={t('home.exportModal.title')}
			maxWidth='780px'
			footer={
				<div className='sem__footer'>
					<button type='button' className='sem__btn sem__btn--secondary' onClick={handleClose} disabled={loading}>
						{t('home.exportModal.cancel')}
					</button>
					<button type='button' className='sem__btn sem__btn--primary' onClick={handleExport} disabled={loading || selectedGames.length === 0}>
						{loading
							? t('home.exportModal.exporting')
							: selectedGames.length > 0
								? t('home.exportModal.exportBtn', { count: selectedGames.length })
								: t('home.exportModal.exportBtnNoCount')}
					</button>
				</div>
			}>
			<div className='sem'>
				{message && <div className={`sem__message sem__message--${message.type}`}>{message.text}</div>}

				{/* ── Section 1: Game Selection ───────────────────────────────────── */}
				<section className='sem__section'>
					<h3 className='sem__section-title'>{t('home.exportModal.section1')}</h3>
					<GameSelectorPanel selectedGames={selectedGames} onSelectionChange={setSelectedGames} preSelectedGames={preSelectedGames} />
				</section>

				{/* ── Section 2: Global Export Options ────────────────────────────── */}
				<section className='sem__section'>
					<h3 className='sem__section-title'>{t('home.exportModal.section2')}</h3>
					<p className='sem__section-desc'>{t('home.exportModal.globalDesc')}</p>
					<PropertyConfigPanel panelMode='export' config={globalConfig} onChange={(cfg) => setGlobalConfig(cfg as GameExportConfig)} />
				</section>

				{/* ── Section 3: File Name ─────────────────────────────────────────── */}
				<section className='sem__section'>
					<h3 className='sem__section-title'>{t('home.exportModal.section3')}</h3>
					<div className='filename-controls'>
						<div className='filename-row'>
							<label className='filename-label'>{t('home.exportModal.filePrefix')}</label>
							<input type='text' className='filename-input' value={filePrefix} onChange={(e) => setFilePrefix(e.target.value)} />
						</div>
						<div className='filename-row'>
							<label className='filename-label'>{t('home.exportModal.fileSuffix')}</label>
							<input type='text' className='filename-input' value={fileSuffix} onChange={(e) => setFileSuffix(e.target.value)} />
						</div>
						<p className='filename-preview'>
							<span>{t('home.exportModal.filePreview')}</span> <code>{buildExportFileName({ prefix: filePrefix, suffix: fileSuffix, exportType: 'partial' })}</code>
						</p>
					</div>
				</section>

				{/* ── Section 4: Per-game Overrides ────────────────────────────────── */}
				{selectedGames.length > 0 && (
					<section className='sem__section'>
						<h3 className='sem__section-title'>{t('home.exportModal.section4')}</h3>
						<p className='sem__section-desc'>{t('home.exportModal.overrideDesc')}</p>

						<div className='sem__per-game-list'>
							{pagedGames.map((game) => {
								const hasOverride = hasPerGameOverride(game.id)
								const isExpanded = expandedGameId === game.id
								const gameConfig = perGameConfig[game.id] ?? DEFAULT_GLOBAL_CONFIG

								return (
									<div key={game.id} className={`sem__per-game-item ${hasOverride ? 'sem__per-game-item--overridden' : ''}`}>
										<button
											type='button'
											id={`sem-game-header-${game.id}`}
											className='sem__per-game-header'
											aria-expanded={isExpanded}
											aria-controls={`sem-game-body-${game.id}`}
											onClick={() => togglePerGameExpand(game.id)}>
											<span className='sem__per-game-arrow'>{isExpanded ? '▾' : '▸'}</span>
											<span className='sem__per-game-name'>{game.name}</span>
											<span className='sem__per-game-badge'>{hasOverride ? t('home.exportModal.overrideActive') : t('home.exportModal.usingGlobal')}</span>
											{hasOverride && (
												<button
													type='button'
													className='sem__per-game-reset'
													title={t('home.exportModal.removeOverride')}
													onClick={(e) => {
														e.stopPropagation()
														updatePerGameConfig(game.id, null)
													}}>
													{t('home.exportModal.resetOverride')}
												</button>
											)}
										</button>

										{isExpanded && (
											<div className='sem__per-game-body' role='region' aria-labelledby={`sem-game-header-${game.id}`} id={`sem-game-body-${game.id}`}>
												<PropertyConfigPanel
													panelMode='export'
													config={gameConfig}
													onChange={(cfg) => updatePerGameConfig(game.id, cfg as GameExportConfig)}
													headingLabel={t('home.exportModal.overrideForLabel', { name: game.name })}
												/>
											</div>
										)}
									</div>
								)
							})}
						</div>
						{pageCount > 1 && (
							<div className='sem__pagination'>
								<button className='sem__pagination-btn' onClick={() => setPerGamePage((p) => p - 1)} disabled={perGamePage === 0}>
									{t('home.exportModal.prevPage')}
								</button>
								<span className='sem__pagination-info'>{t('home.exportModal.pageInfo', { page: perGamePage + 1, total: pageCount })}</span>
								<button className='sem__pagination-btn' onClick={() => setPerGamePage((p) => p + 1)} disabled={perGamePage >= pageCount - 1}>
									{t('home.exportModal.nextPage')}
								</button>
							</div>
						)}
					</section>
				)}
			</div>
		</Modal>
	)
}

export default SelectiveExportModal
