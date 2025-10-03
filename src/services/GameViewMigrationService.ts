import { getPublicGameViews, createGameView, deleteGameView } from '@/services'
import type { GameViewCreateDto } from '@/models/api/GameView'
import { FilterField, FilterOperator, SortField, SortDirection } from '@/models/api/GameView'

/**
 * Creates default GameViews to replace hardcoded view endpoints
 */
export class GameViewMigrationService {
	/**
	 * Creates the default GameViews equivalent to the old hardcoded views
	 */
	static async createDefaultGameViews(): Promise<void> {
		const defaultViews: GameViewCreateDto[] = [
			{
				name: 'GOTY 2025',
				description: 'Games released and started in 2025',
				isPublic: true,
				configuration: {
					filters: [
						{
							field: FilterField.Released,
							operator: FilterOperator.GreaterThanOrEqual,
							value: '2025-01-01',
						},
						{
							field: FilterField.Released,
							operator: FilterOperator.LessThan,
							value: '2026-01-01',
						},
						{
							field: FilterField.Started,
							operator: FilterOperator.IsNotNull,
							value: '',
						},
					],
					sorting: [
						{
							field: SortField.Released,
							direction: SortDirection.Descending,
							order: 1,
						},
					],
				},
			},
			{
				name: 'Games 2025',
				description: 'Games started in 2025 or with Goal 2025 status',
				isPublic: true,
				configuration: {
					filters: [
						{
							field: FilterField.Started,
							operator: FilterOperator.GreaterThanOrEqual,
							value: '2025-01-01',
						},
						{
							field: FilterField.Started,
							operator: FilterOperator.LessThan,
							value: '2026-01-01',
						},
					],
					sorting: [
						{
							field: SortField.Started,
							direction: SortDirection.Descending,
							order: 1,
						},
					],
				},
			},
			{
				name: 'Next up',
				description: 'Unstarted games sorted by score',
				isPublic: true,
				configuration: {
					filters: [
						{
							field: FilterField.Started,
							operator: FilterOperator.IsNull,
							value: '',
						},
					],
					sorting: [
						{
							field: SortField.Score,
							direction: SortDirection.Descending,
							order: 1,
						},
					],
				},
			},
		]

		try {
			for (const view of defaultViews) {
				const existingViews = await getPublicGameViews()
				const exists = existingViews.some((existing: any) => existing.name === view.name)

				if (!exists) {
					await createGameView(view)
					console.log(`Created default GameView: ${view.name}`)
				} else {
					console.log(`GameView already exists: ${view.name}`)
				}
			}
			console.log('Default GameViews migration completed')
		} catch (error) {
			console.error('Error creating default GameViews:', error)
			throw error
		}
	}

	/**
	 * Removes the default GameViews (for cleanup/testing)
	 */
	static async removeDefaultGameViews(): Promise<void> {
		const defaultViewNames = ['GOTY 2025', 'Games 2025', 'Next up']

		try {
			const existingViews = await getPublicGameViews()

			for (const view of existingViews) {
				if (defaultViewNames.includes(view.name)) {
					await deleteGameView(view.id)
					console.log(`Removed default GameView: ${view.name}`)
				}
			}
			console.log('Default GameViews cleanup completed')
		} catch (error) {
			console.error('Error removing default GameViews:', error)
			throw error
		}
	}
}
