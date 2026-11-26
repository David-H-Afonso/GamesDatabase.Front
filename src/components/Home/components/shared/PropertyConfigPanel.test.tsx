import { act, render, screen, fireEvent } from '@testing-library/react'
import PropertyConfigPanel from './PropertyConfigPanel'
import type { GameImportConfig, GameExportConfig } from '@/models/api/ImportExport'

const loaders = vi.hoisted(() => ({ status: vi.fn().mockResolvedValue([]), platforms: vi.fn().mockResolvedValue([]), people: vi.fn().mockResolvedValue([]), played: vi.fn().mockResolvedValue([]) }))
vi.mock('@/hooks', () => ({
	useGameStatus: () => ({ fetchActiveStatusList: loaders.status }),
	useGamePlatform: () => ({ fetchList: loaders.platforms }),
	useGamePlayWith: () => ({ fetchOptions: loaders.people }),
	useGamePlayedStatus: () => ({ fetchActiveList: loaders.played }),
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
		expect(screen.getByText('Como importado (todo)')).toBeInTheDocument()
		expect(screen.getByText('Solo key/tienda')).toBeInTheDocument()
		expect(screen.getByText('Limpieza personalizada')).toBeInTheDocument()
		expect(screen.getByText('Personalizado (por propiedad)')).toBeInTheDocument()
	})

	it('renders mode radio buttons for export', () => {
		render(<PropertyConfigPanel panelMode='export' config={defaultExportConfig} onChange={vi.fn()} />)
		expect(screen.getByText('Como guardado (todo)')).toBeInTheDocument()
	})

	it('calls onChange when custom mode is selected', () => {
		const onChange = vi.fn()
		render(<PropertyConfigPanel panelMode='import' config={defaultImportConfig} onChange={onChange} />)

		fireEvent.click(screen.getByText('Personalizado (por propiedad)'))
		expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ mode: 'custom' }))
	})

	it('calls onChange when price-only mode is selected', () => {
		const onChange = vi.fn()
		render(<PropertyConfigPanel panelMode='import' config={defaultImportConfig} onChange={onChange} />)

		fireEvent.click(screen.getByText('Solo key/tienda'))
		expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ mode: 'priceOnly' }))
	})

	it('shows property table when mode is custom', async () => {
		const customConfig: GameImportConfig = { mode: 'custom' } as any
		await act(async () => { render(<PropertyConfigPanel panelMode='import' config={customConfig} onChange={vi.fn()} />); await Promise.all(Object.values(loaders).map(loader => loader.mock.results.at(-1)?.value)) })
		expect(screen.getByText('Propiedad')).toBeInTheDocument()
		expect(screen.getByText('Modo')).toBeInTheDocument()
	})

	it('shows customCleared explanation for import', () => {
		const clearedConfig: GameImportConfig = { mode: 'customCleared' } as any
		render(<PropertyConfigPanel panelMode='import' config={clearedConfig} onChange={vi.fn()} />)
		expect(screen.getByText(/Ignora los campos personales/)).toBeInTheDocument()
	})

	it('shows customCleared explanation for export', () => {
		const clearedConfig: GameExportConfig = { mode: 'customCleared' } as any
		render(<PropertyConfigPanel panelMode='export' config={clearedConfig} onChange={vi.fn()} />)
		expect(screen.getByText(/Limpia los campos personales/)).toBeInTheDocument()
	})

	it('shows price-only explanation for import', () => {
		const priceOnlyConfig: GameImportConfig = { mode: 'priceOnly' } as any
		render(<PropertyConfigPanel panelMode='import' config={priceOnlyConfig} onChange={vi.fn()} />)
		expect(screen.getByText(/Actualiza solo si es más barato/)).toBeInTheDocument()
	})
})
