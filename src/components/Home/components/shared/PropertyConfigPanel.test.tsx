import { render, screen, fireEvent } from '@testing-library/react'
import PropertyConfigPanel from './PropertyConfigPanel'
import type { GameImportConfig, GameExportConfig } from '@/models/api/ImportExport'

vi.mock('@/hooks', () => ({
	useGameStatus: () => ({ fetchActiveStatusList: vi.fn().mockResolvedValue([]) }),
	useGamePlatform: () => ({ fetchList: vi.fn().mockResolvedValue([]) }),
	useGamePlayWith: () => ({ fetchOptions: vi.fn().mockResolvedValue([]) }),
	useGamePlayedStatus: () => ({ fetchActiveList: vi.fn().mockResolvedValue([]) }),
}))

vi.mock('./PropertyConfigPanel.scss', () => ({}))

describe('PropertyConfigPanel', () => {
	const defaultImportConfig: GameImportConfig = { mode: 'simple' } as any
	const defaultExportConfig: GameExportConfig = { mode: 'simple' } as any

	it('renders heading label when provided', () => {
		render(<PropertyConfigPanel panelMode='import' config={defaultImportConfig} onChange={vi.fn()} headingLabel='Import Settings' />)
		expect(screen.getByText('Import Settings')).toBeInTheDocument()
	})

	it('renders mode radio buttons for import', () => {
		render(<PropertyConfigPanel panelMode='import' config={defaultImportConfig} onChange={vi.fn()} />)
		expect(screen.getByText('As Imported (all)')).toBeInTheDocument()
		expect(screen.getByText('Custom Cleared')).toBeInTheDocument()
		expect(screen.getByText('Custom (per property)')).toBeInTheDocument()
	})

	it('renders mode radio buttons for export', () => {
		render(<PropertyConfigPanel panelMode='export' config={defaultExportConfig} onChange={vi.fn()} />)
		expect(screen.getByText('As Stored (all)')).toBeInTheDocument()
	})

	it('calls onChange when custom mode is selected', () => {
		const onChange = vi.fn()
		render(<PropertyConfigPanel panelMode='import' config={defaultImportConfig} onChange={onChange} />)

		fireEvent.click(screen.getByText('Custom (per property)'))
		expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ mode: 'custom' }))
	})

	it('shows property table when mode is custom', () => {
		const customConfig: GameImportConfig = { mode: 'custom' } as any
		render(<PropertyConfigPanel panelMode='import' config={customConfig} onChange={vi.fn()} />)
		expect(screen.getByText('Property')).toBeInTheDocument()
		expect(screen.getByText('Mode')).toBeInTheDocument()
	})

	it('shows customCleared explanation for import', () => {
		const clearedConfig: GameImportConfig = { mode: 'customCleared' } as any
		render(<PropertyConfigPanel panelMode='import' config={clearedConfig} onChange={vi.fn()} />)
		expect(screen.getByText(/Ignores personal fields/)).toBeInTheDocument()
	})

	it('shows customCleared explanation for export', () => {
		const clearedConfig: GameExportConfig = { mode: 'customCleared' } as any
		render(<PropertyConfigPanel panelMode='export' config={clearedConfig} onChange={vi.fn()} />)
		expect(screen.getByText(/Clears personal fields/)).toBeInTheDocument()
	})
})
