import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/hooks', () => ({
	useGameStatus: () => ({
		fetchActiveStatusList: vi.fn().mockResolvedValue([
			{ id: 1, name: 'Playing' },
			{ id: 2, name: 'Completed' },
		]),
	}),
	useGamePlatform: () => ({
		fetchList: vi.fn().mockResolvedValue([
			{ id: 10, name: 'PC' },
			{ id: 11, name: 'PS5' },
		]),
	}),
	useGamePlayWith: () => ({
		fetchOptions: vi.fn().mockResolvedValue([
			{ id: 20, name: 'Solo' },
			{ id: 21, name: 'Online' },
		]),
	}),
	useGamePlayedStatus: () => ({
		fetchActiveList: vi.fn().mockResolvedValue([{ id: 30, name: 'Finished' }]),
	}),
}))

vi.mock('./BulkEditModal.scss', () => ({}))

async function loadComponent() {
	const mod = await import('./BulkEditModal')
	return mod.default
}

describe('BulkEditModal', () => {
	const onClose = vi.fn()
	const onSave = vi.fn().mockResolvedValue(undefined)

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns null when not open', async () => {
		const BulkEditModal = await loadComponent()
		const { container } = render(<BulkEditModal isOpen={false} onClose={onClose} selectedCount={3} onSave={onSave} />)
		expect(container.innerHTML).toBe('')
	})

	it('renders modal when open', async () => {
		const BulkEditModal = await loadComponent()
		render(<BulkEditModal isOpen={true} onClose={onClose} selectedCount={3} onSave={onSave} />)
		expect(screen.getByText('Bulk Edit Games')).toBeInTheDocument()
	})

	it('shows selected count', async () => {
		const BulkEditModal = await loadComponent()
		render(<BulkEditModal isOpen={true} onClose={onClose} selectedCount={5} onSave={onSave} />)
		expect(screen.getByText(/Editing 5 games/)).toBeInTheDocument()
	})

	it('shows singular form for 1 game', async () => {
		const BulkEditModal = await loadComponent()
		render(<BulkEditModal isOpen={true} onClose={onClose} selectedCount={1} onSave={onSave} />)
		expect(screen.getByText(/Editing 1 game$/)).toBeInTheDocument()
	})

	it('loads dropdown options on mount', async () => {
		const BulkEditModal = await loadComponent()
		render(<BulkEditModal isOpen={true} onClose={onClose} selectedCount={3} onSave={onSave} />)
		await vi.waitFor(() => {
			expect(screen.getByText('Playing')).toBeInTheDocument()
			expect(screen.getByText('PC')).toBeInTheDocument()
			expect(screen.getByText('Finished')).toBeInTheDocument()
		})
	})

	it('calls onClose when close button is clicked', async () => {
		const BulkEditModal = await loadComponent()
		const user = userEvent.setup()
		render(<BulkEditModal isOpen={true} onClose={onClose} selectedCount={3} onSave={onSave} />)
		await user.click(screen.getByText('×'))
		expect(onClose).toHaveBeenCalledOnce()
	})

	it('calls onClose when overlay is clicked', async () => {
		const BulkEditModal = await loadComponent()
		const user = userEvent.setup()
		render(<BulkEditModal isOpen={true} onClose={onClose} selectedCount={3} onSave={onSave} />)
		const overlay = document.querySelector('.bulk-edit-modal-overlay')!
		await user.click(overlay)
		expect(onClose).toHaveBeenCalledOnce()
	})

	it('alerts when saving with no changes', async () => {
		const BulkEditModal = await loadComponent()
		const user = userEvent.setup()
		const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})
		render(<BulkEditModal isOpen={true} onClose={onClose} selectedCount={3} onSave={onSave} />)
		await user.click(screen.getByText('Save Changes'))
		expect(alertSpy).toHaveBeenCalledWith('No changes to save')
		expect(onSave).not.toHaveBeenCalled()
		alertSpy.mockRestore()
	})

	it('calls onSave with selected status', async () => {
		const BulkEditModal = await loadComponent()
		const user = userEvent.setup()
		render(<BulkEditModal isOpen={true} onClose={onClose} selectedCount={3} onSave={onSave} />)
		await vi.waitFor(() => expect(screen.getByText('Playing')).toBeInTheDocument())
		await user.selectOptions(screen.getByLabelText('Status'), '1')
		await user.click(screen.getByText('Save Changes'))
		expect(onSave).toHaveBeenCalledWith({ statusId: 1 })
	})

	it('calls onSave with selected platform', async () => {
		const BulkEditModal = await loadComponent()
		const user = userEvent.setup()
		render(<BulkEditModal isOpen={true} onClose={onClose} selectedCount={3} onSave={onSave} />)
		await vi.waitFor(() => expect(screen.getByText('PC')).toBeInTheDocument())
		await user.selectOptions(screen.getByLabelText('Platform'), '10')
		await user.click(screen.getByText('Save Changes'))
		expect(onSave).toHaveBeenCalledWith({ platformId: 10 })
	})

	it('toggles playWith checkboxes', async () => {
		const BulkEditModal = await loadComponent()
		const user = userEvent.setup()
		render(<BulkEditModal isOpen={true} onClose={onClose} selectedCount={3} onSave={onSave} />)
		await vi.waitFor(() => expect(screen.getByLabelText('Solo')).toBeInTheDocument())
		await user.click(screen.getByLabelText('Solo'))
		await user.click(screen.getByText('Save Changes'))
		expect(onSave).toHaveBeenCalledWith({ playWithIds: [20] })
	})
})
