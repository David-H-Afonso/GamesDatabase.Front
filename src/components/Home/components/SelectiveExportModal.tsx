import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/elements'
import { selectiveExportGames, downloadBlob } from '@/services'
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

const DEFAULT_GLOBAL_CONFIG: GameExportConfig = { mode: 'simple' }

const SelectiveExportModal: React.FC<Props> = ({ isOpen, onClose, preSelectedGames = [] }) => {
	const [selectedGames, setSelectedGames] = useState<Array<{ id: number; name: string }>>([])
	const [globalConfig, setGlobalConfig] = useState<GameExportConfig>(DEFAULT_GLOBAL_CONFIG)
	const [perGameConfig, setPerGameConfig] = useState<Record<number, GameExportConfig>>({})
	const [expandedGameId, setExpandedGameId] = useState<number | null>(null)
	const [loading, setLoading] = useState(false)
	const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

	useEffect(() => {
		if (isOpen) {
			setSelectedGames(preSelectedGames)
		}
	}, [isOpen])

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
			setMessage({ text: 'Please select at least one game to export.', type: 'error' })
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
			const filename = `games_export_${new Date().toISOString().split('T')[0]}.csv`
			downloadBlob(blob, filename)
			setMessage({ text: `Exported ${selectedGames.length} game(s) successfully.`, type: 'success' })
		} catch (err) {
			setMessage({ text: err instanceof Error ? err.message : 'Export failed.', type: 'error' })
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

	return (
		<Modal
			isOpen={isOpen}
			onClose={handleClose}
			title='Export Games'
			maxWidth='780px'
			footer={
				<div className='sem__footer'>
					<button type='button' className='sem__btn sem__btn--secondary' onClick={handleClose} disabled={loading}>
						Cancel
					</button>
					<button type='button' className='sem__btn sem__btn--primary' onClick={handleExport} disabled={loading || selectedGames.length === 0}>
						{loading ? 'Exporting…' : `Export ${selectedGames.length > 0 ? `(${selectedGames.length})` : ''}`}
					</button>
				</div>
			}>
			<div className='sem'>
				{message && <div className={`sem__message sem__message--${message.type}`}>{message.text}</div>}

				{/* ── Section 1: Game Selection ───────────────────────────────────── */}
				<section className='sem__section'>
					<h3 className='sem__section-title'>1. Select Games</h3>
					<GameSelectorPanel selectedGames={selectedGames} onSelectionChange={setSelectedGames} preSelectedGames={preSelectedGames} />
				</section>

				{/* ── Section 2: Global Export Options ────────────────────────────── */}
				<section className='sem__section'>
					<h3 className='sem__section-title'>2. Global Export Options</h3>
					<p className='sem__section-desc'>These rules apply to all selected games unless a per-game override is configured below.</p>
					<PropertyConfigPanel panelMode='export' config={globalConfig} onChange={(cfg) => setGlobalConfig(cfg as GameExportConfig)} />
				</section>

				{/* ── Section 3: Per-game Overrides ────────────────────────────────── */}
				{selectedGames.length > 0 && (
					<section className='sem__section'>
						<h3 className='sem__section-title'>3. Per-Game Overrides (optional)</h3>
						<p className='sem__section-desc'>Expand a game to configure export rules that override the global settings for that game only.</p>

						<div className='sem__per-game-list'>
							{selectedGames.map((game) => {
								const hasOverride = hasPerGameOverride(game.id)
								const isExpanded = expandedGameId === game.id
								const gameConfig = perGameConfig[game.id] ?? DEFAULT_GLOBAL_CONFIG

								return (
									<div key={game.id} className={`sem__per-game-item ${hasOverride ? 'sem__per-game-item--overridden' : ''}`}>
										<button type='button' className='sem__per-game-header' onClick={() => togglePerGameExpand(game.id)}>
											<span className='sem__per-game-arrow'>{isExpanded ? '▾' : '▸'}</span>
											<span className='sem__per-game-name'>{game.name}</span>
											<span className='sem__per-game-badge'>{hasOverride ? 'Override active' : 'Using global'}</span>
											{hasOverride && (
												<button
													type='button'
													className='sem__per-game-reset'
													title='Remove override'
													onClick={(e) => {
														e.stopPropagation()
														updatePerGameConfig(game.id, null)
													}}>
													Reset
												</button>
											)}
										</button>

										{isExpanded && (
											<div className='sem__per-game-body'>
												<PropertyConfigPanel
													panelMode='export'
													config={gameConfig}
													onChange={(cfg) => updatePerGameConfig(game.id, cfg as GameExportConfig)}
													headingLabel={`Override for: ${game.name}`}
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

export default SelectiveExportModal
