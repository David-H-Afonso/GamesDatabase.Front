import { environment } from '@/environments'
import { customFetch } from '@/utils/customFetch'

/**
 * Fetches games CSV from the API and returns it as a Blob.
 * @returns Blob containing CSV data
 */
export const exportGamesCSV = async (): Promise<Blob> => {
	const endpoint = environment.apiRoutes.dataExport.gamesCSV

	const csvText = await customFetch<string>(endpoint, {
		method: 'GET',
		headers: { Accept: 'text/csv' },
		baseURL: environment.baseUrl,
		timeout: environment.api?.timeout,
	})

	return new Blob([csvText], { type: 'text/csv' })
}

/**
 * Uploads a CSV file to the API for import and returns the parsed response.
 * @param csvFile - The CSV file to upload
 * @returns Parsed response from the API
 */
export const importGamesCSV = async (csvFile: File): Promise<any> => {
	const endpoint = environment.apiRoutes.dataExport.gamesCSV
	const formData = new FormData()
	formData.append('csvFile', csvFile)

	return await customFetch<any>(endpoint, {
		method: 'POST',
		body: formData,
		baseURL: environment.baseUrl,
		timeout: environment.api?.timeout,
	})
}

/**
 * Fetches full database export (games + catalogs) from the API and returns it as a Blob.
 * @returns Blob containing CSV data with all database information
 */
export const exportFullDatabase = async (): Promise<Blob> => {
	const endpoint = environment.apiRoutes.dataExport.fullExport

	const csvText = await customFetch<string>(endpoint, {
		method: 'GET',
		headers: { Accept: 'text/csv' },
		baseURL: environment.baseUrl,
		// No timeout - let it take as long as needed
	})

	return new Blob([csvText], { type: 'text/csv' })
}

/**
 * Uploads a full database CSV file to the API for import (MERGE mode).
 * @param csvFile - The CSV file to upload
 * @returns Import result with statistics
 */
export const importFullDatabase = async (
	csvFile: File
): Promise<{
	message: string
	catalogs: {
		platforms: { imported: number; updated: number }
		statuses: { imported: number; updated: number }
		playWiths: { imported: number; updated: number }
		playedStatuses: { imported: number; updated: number }
	}
	views?: { imported: number; updated: number }
	games: { imported: number; updated: number }
	errors?: string[]
}> => {
	const endpoint = environment.apiRoutes.dataExport.fullImport
	const formData = new FormData()
	formData.append('csvFile', csvFile)

	return await customFetch(endpoint, {
		method: 'POST',
		body: formData,
		baseURL: environment.baseUrl,
		timeout: environment.api?.timeout,
	})
}

/**
 * Exports database to ZIP file (full or partial)
 * @param fullExport - If true, exports everything. If false, exports only updated data
 * @returns Blob containing ZIP file
 */
export const exportToZip = async (fullExport: boolean = true): Promise<Blob> => {
	const endpoint = `${environment.apiRoutes.dataExport.zip}?fullExport=${fullExport}`

	const response = await customFetch<ArrayBuffer>(endpoint, {
		method: 'GET',
		headers: { Accept: 'application/zip' },
		baseURL: environment.baseUrl,
		// No timeout - let it take as long as needed
	})

	return new Blob([response], { type: 'application/zip' })
}

/**
 * Syncs database to network share (full or partial)
 * @param fullExport - If true, syncs everything. If false, syncs only updated data
 * @returns Response message from API with statistics
 */
export const syncToNetwork = async (
	fullExport: boolean = true
): Promise<{
	message: string
	stats?: {
		elapsedSeconds: number
		totalGames: number
		gamesSynced: number
		gamesSkipped: number
		imagesSynced: number
		imagesFailed: number
		imagesRetried: number
		filesWritten: number
	}
	failedImages?: Array<{
		gameName: string
		imageTypes: string[]
	}>
}> => {
	const endpoint = environment.apiRoutes.dataExport.syncToNetwork

	return await customFetch(endpoint, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: { fullExport },
		baseURL: environment.baseUrl,
		// No timeout - let sync take as long as needed
	})
}

/**
 * Analyzes folders to detect duplicates and orphan folders
 * @returns Analysis result with statistics and issues found
 */
export const analyzeFolders = async (): Promise<{
	totalGamesInDatabase: number
	totalFoldersInFilesystem: number
	difference: number
	potentialDuplicates: Array<{
		gameName: string
		folderNames: string[]
		reason: string
	}>
	orphanFolders: Array<{
		folderName: string
		fullPath: string
	}>
}> => {
	const endpoint = environment.apiRoutes.dataExport.analyzeFolders

	return await customFetch(endpoint, {
		method: 'GET',
		baseURL: environment.baseUrl,
		timeout: environment.api?.timeout,
	})
}

/**
 * Triggers a download of a Blob using an anchor element. Throws if the Blob is empty.
 * @param blob - The Blob to download
 * @param filename - The desired filename for the downloaded file
 * @returns void
 */
export const downloadBlob = (blob: Blob, filename: string): void => {
	if (blob.size === 0) throw new Error('File is empty')

	const objectUrl = window.URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = objectUrl
	a.download = filename
	document.body.appendChild(a)
	a.click()
	document.body.removeChild(a)
	window.URL.revokeObjectURL(objectUrl)
}
