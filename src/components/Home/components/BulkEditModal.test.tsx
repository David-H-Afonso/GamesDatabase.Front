import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders as render } from '@/test/utils/renderWithProviders'
import i18n from '@/i18n'

const requests = vi.hoisted(() => ({
	statuses: vi.fn().mockResolvedValue([{ id: 1, name: 'Playing' }, { id: 2, name: 'Completed' }]),
	platforms: vi.fn().mockResolvedValue([{ id: 10, name: 'PC' }, { id: 11, name: 'PS5' }]),
	people: vi.fn().mockResolvedValue([{ id: 20, name: 'Solo' }, { id: 21, name: 'Online' }]),
	played: vi.fn().mockResolvedValue([{ id: 30, name: 'Finished' }]),
}))
vi.mock('@/hooks/useGameStatus/useGameStatus', () => ({
	useGameStatus: () => ({
		fetchActiveStatusList: requests.statuses,
	}),
}))

vi.mock('@/hooks', () => ({
	useGameStatus: () => ({
		fetchActiveStatusList: requests.statuses,
	}),
	useGamePlatform: () => ({
		fetchList: requests.platforms,
	}),
	useGamePlayWith: () => ({
		fetchOptions: requests.people,
	}),
	useGamePlayedStatus: () => ({
		fetchActiveList: requests.played,
	}),
}))

vi.mock('./GalleryBulkEdit.scss', () => ({}))

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
		expect(screen.getByRole('dialog', { name: i18n.t('home.bulk.title') })).toBeInTheDocument()
		await screen.findByText('Finished')
	})

	it('shows selected count', async () => {
		const BulkEditModal = await loadComponent()
		render(<BulkEditModal isOpen={true} onClose={onClose} selectedCount={5} onSave={onSave} />)
		expect(screen.getByText(i18n.t('home.bulk.editing', { count: 5 }))).toBeInTheDocument()
		await screen.findByText('Finished')
	})

	it('shows singular form for 1 game', async () => {
		const BulkEditModal = await loadComponent()
		render(<BulkEditModal isOpen={true} onClose={onClose} selectedCount={1} onSave={onSave} />)
		expect(screen.getByText(i18n.t('home.bulk.editing', { count: 1 }))).toBeInTheDocument()
		await screen.findByText('Finished')
	})

	it('loads dropdown options on mount', async () => {
		const BulkEditModal = await loadComponent()
		render(<BulkEditModal isOpen={true} onClose={onClose} selectedCount={3} onSave={onSave} />)
		await waitFor(() => {
			expect(screen.getByText('Playing')).toBeInTheDocument()
			expect(screen.getByText('PC')).toBeInTheDocument()
			expect(screen.getByText('Finished')).toBeInTheDocument()
		})
	})

	it('calls onClose when close button is clicked', async () => {
		const BulkEditModal = await loadComponent()
		const user = userEvent.setup()
		render(<BulkEditModal isOpen={true} onClose={onClose} selectedCount={3} onSave={onSave} />)
		await user.click(screen.getByRole('button', { name: i18n.t('common.close') }))
		expect(onClose).toHaveBeenCalledOnce()
	})

	it('cancels the native dialog without saving any changes', async () => {
		const BulkEditModal = await loadComponent()
		render(<BulkEditModal isOpen={true} onClose={onClose} selectedCount={3} onSave={onSave} />)
		await screen.findByText('Finished')
		fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: true, cancelable: true }))
		expect(onClose).toHaveBeenCalledOnce()
		expect(onSave).not.toHaveBeenCalled()
	})

	it('shows a visible warning inside the dialog when saving with no changes', async () => {
		const BulkEditModal = await loadComponent()
		const user = userEvent.setup()
		render(<BulkEditModal isOpen={true} onClose={onClose} selectedCount={3} onSave={onSave} />)
		await user.click(screen.getByRole('button', { name: i18n.t('home.bulk.save') }))
		expect(await screen.findByText('No hay cambios que guardar')).toBeInTheDocument()
		expect(onSave).not.toHaveBeenCalled()
	})

	it('calls onSave with selected status', async () => {
		const BulkEditModal = await loadComponent()
		const user = userEvent.setup()
		render(<BulkEditModal isOpen={true} onClose={onClose} selectedCount={3} onSave={onSave} />)
		await waitFor(() => expect(screen.getByText('Playing')).toBeInTheDocument())
		await user.selectOptions(screen.getByLabelText(i18n.t('home.bulk.fieldStatus')), '1')
		await user.click(screen.getByRole('button', { name: i18n.t('home.bulk.save') }))
		expect(onSave).toHaveBeenCalledWith({ statusId: 1 })
	})

	it('calls onSave with selected platform', async () => {
		const BulkEditModal = await loadComponent()
		const user = userEvent.setup()
		render(<BulkEditModal isOpen={true} onClose={onClose} selectedCount={3} onSave={onSave} />)
		await waitFor(() => expect(screen.getByText('PC')).toBeInTheDocument())
		await user.selectOptions(screen.getByLabelText(i18n.t('home.bulk.fieldPlatform')), '10')
		await user.click(screen.getByRole('button', { name: i18n.t('home.bulk.save') }))
		expect(onSave).toHaveBeenCalledWith({ platformId: 10 })
	})

	it('toggles playWith checkboxes', async () => {
		const BulkEditModal = await loadComponent()
		const user = userEvent.setup()
		render(<BulkEditModal isOpen={true} onClose={onClose} selectedCount={3} onSave={onSave} />)
		await waitFor(() => expect(screen.getByLabelText('Solo')).toBeInTheDocument())
		await user.click(screen.getByLabelText('Solo'))
		await user.click(screen.getByRole('button', { name: i18n.t('home.bulk.save') }))
		expect(onSave).toHaveBeenCalledWith({ playWithIds: [20] })
	})
})
