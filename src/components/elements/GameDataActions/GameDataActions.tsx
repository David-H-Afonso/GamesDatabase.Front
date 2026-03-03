import React, { useState } from 'react'
import SelectiveExportModal from '@/components/Home/components/SelectiveExportModal'
import SelectiveImportModal from '@/components/Home/components/SelectiveImportModal'
import { useAppDispatch } from '@/store/hooks'
import { triggerGamesRefresh } from '@/store/features/games/gamesSlice'
import './GameDataActions.scss'

const ExportIcon = () => (
	<svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
		<path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' />
		<polyline points='17 8 12 3 7 8' />
		<line x1='12' y1='3' x2='12' y2='15' />
	</svg>
)

const ImportIcon = () => (
	<svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
		<path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' />
		<polyline points='7 10 12 15 17 10' />
		<line x1='12' y1='15' x2='12' y2='3' />
	</svg>
)

const GameDataActions: React.FC = () => {
	const dispatch = useAppDispatch()
	const [exportOpen, setExportOpen] = useState(false)
	const [importOpen, setImportOpen] = useState(false)

	const handleImportComplete = () => {
		dispatch(triggerGamesRefresh())
	}

	return (
		<>
			<button className='game-data-actions__btn' onClick={() => setExportOpen(true)} title='Export games to CSV'>
				<ExportIcon />
				<span className='game-data-actions__btn-text'>Export</span>
			</button>
			<button className='game-data-actions__btn' onClick={() => setImportOpen(true)} title='Import games from CSV'>
				<ImportIcon />
				<span className='game-data-actions__btn-text'>Import</span>
			</button>
			<SelectiveExportModal isOpen={exportOpen} onClose={() => setExportOpen(false)} />

			<SelectiveImportModal isOpen={importOpen} onClose={() => setImportOpen(false)} onImportComplete={handleImportComplete} />
		</>
	)
}

export default GameDataActions
