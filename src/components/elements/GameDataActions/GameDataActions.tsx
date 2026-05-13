import React, { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import SelectiveExportModal from '@/components/Home/components/SelectiveExportModal'
import SelectiveImportModal from '@/components/Home/components/SelectiveImportModal'
import { useAppDispatch } from '@/store/hooks'
import { triggerGamesRefresh } from '@/store/features/games/gamesSlice'
import './GameDataActions.scss'

const DataActionsIcon = () => (
	<svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
		<ellipse cx='12' cy='5' rx='9' ry='3' />
		<path d='M3 5v6c0 1.66 4.03 3 9 3s9-1.34 9-3V5' />
		<path d='M3 11v6c0 1.66 4.03 3 9 3s9-1.34 9-3v-6' />
		<polyline points='16 3 20 7 16 11' />
		<line x1='20' y1='7' x2='10' y2='7' />
	</svg>
)

const GameDataActions: React.FC = () => {
	const { t } = useTranslation()
	const dispatch = useAppDispatch()
	const [exportOpen, setExportOpen] = useState(false)
	const [importOpen, setImportOpen] = useState(false)
	const [menuOpen, setMenuOpen] = useState(false)
	const btnRef = useRef<HTMLButtonElement>(null)

	const handleImportComplete = () => {
		dispatch(triggerGamesRefresh())
	}

	const openExport = () => {
		setMenuOpen(false)
		setExportOpen(true)
	}

	const openImport = () => {
		setMenuOpen(false)
		setImportOpen(true)
	}

	return (
		<>
			<div className='game-data-actions'>
				<button
					ref={btnRef}
					className='game-data-actions__btn'
					title={t('game.dataActions.title')}
					onClick={() => setMenuOpen((v) => !v)}
					aria-haspopup='true'
					aria-expanded={menuOpen}>
					<DataActionsIcon />
				</button>
				{menuOpen && (
					<>
						<div className='game-data-actions__backdrop' onClick={() => setMenuOpen(false)} />
						<div className='game-data-actions__menu'>
							<button className='game-data-actions__menu-item' onClick={openExport}>
								<svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
									<path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' />
									<polyline points='17 8 12 3 7 8' />
									<line x1='12' y1='3' x2='12' y2='15' />
								</svg>
								{t('game.dataActions.export')}
							</button>
							<button className='game-data-actions__menu-item' onClick={openImport}>
								<svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
									<path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' />
									<polyline points='7 10 12 15 17 10' />
									<line x1='12' y1='15' x2='12' y2='3' />
								</svg>
								{t('game.dataActions.import')}
							</button>
						</div>
					</>
				)}
			</div>

			<SelectiveExportModal isOpen={exportOpen} onClose={() => setExportOpen(false)} />
			<SelectiveImportModal isOpen={importOpen} onClose={() => setImportOpen(false)} onImportComplete={handleImportComplete} />
		</>
	)
}

export default GameDataActions
