import { GameViewMigrationService } from './GameViewMigrationService'
import * as services from '@/services'

vi.mock('@/services', () => ({
	getPublicGameViews: vi.fn(),
	createGameView: vi.fn(),
	deleteGameView: vi.fn(),
}))

const mockGetPublic = vi.mocked(services.getPublicGameViews)
const mockCreate = vi.mocked(services.createGameView)
const mockDelete = vi.mocked(services.deleteGameView)

describe('GameViewMigrationService', () => {
	beforeEach(() => vi.clearAllMocks())

	describe('createDefaultGameViews', () => {
		it('creates all 3 default views when none exist', async () => {
			mockGetPublic.mockResolvedValue([])
			mockCreate.mockResolvedValue({} as any)
			await GameViewMigrationService.createDefaultGameViews()
			expect(mockCreate).toHaveBeenCalledTimes(3)
		})

		it('skips views that already exist', async () => {
			mockGetPublic.mockResolvedValue([{ id: 1, name: 'GOTY 2025' } as any])
			mockCreate.mockResolvedValue({} as any)
			await GameViewMigrationService.createDefaultGameViews()
			// Should skip GOTY 2025, create the other 2
			expect(mockCreate).toHaveBeenCalledTimes(2)
		})

		it('throws on error', async () => {
			mockGetPublic.mockRejectedValue(new Error('Network'))
			await expect(GameViewMigrationService.createDefaultGameViews()).rejects.toThrow('Network')
		})
	})

	describe('removeDefaultGameViews', () => {
		it('deletes matching default views', async () => {
			mockGetPublic.mockResolvedValue([
				{ id: 1, name: 'GOTY 2025' },
				{ id: 2, name: 'Games 2025' },
				{ id: 3, name: 'Next up' },
				{ id: 4, name: 'Custom View' },
			] as any)
			mockDelete.mockResolvedValue(undefined)
			await GameViewMigrationService.removeDefaultGameViews()
			expect(mockDelete).toHaveBeenCalledTimes(3)
			expect(mockDelete).toHaveBeenCalledWith(1)
			expect(mockDelete).toHaveBeenCalledWith(2)
			expect(mockDelete).toHaveBeenCalledWith(3)
		})

		it('does nothing when no defaults exist', async () => {
			mockGetPublic.mockResolvedValue([{ id: 10, name: 'My View' }] as any)
			await GameViewMigrationService.removeDefaultGameViews()
			expect(mockDelete).not.toHaveBeenCalled()
		})

		it('throws on error', async () => {
			mockGetPublic.mockRejectedValue(new Error('Server error'))
			await expect(GameViewMigrationService.removeDefaultGameViews()).rejects.toThrow('Server error')
		})
	})
})
