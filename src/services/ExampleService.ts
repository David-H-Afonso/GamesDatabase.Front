import { customFetch } from '@/utils'
import { environment } from '@/environments'
import type { ExampleData } from '@/models/api/ExampleService'

/**
 * Fetches metadata for the example service.
 *
 * @returns Promise resolving to ExampleData
 */
export async function getExampleService(): Promise<ExampleData> {
	return customFetch<ExampleData>(`${environment.baseUrl}${environment.apiRoutes.example.url}`, {
		headers: {
			Accept: 'application/json',
		},
	})
}
