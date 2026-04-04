import { environment } from '@/environments'
import { customFetch } from '@/utils/customFetch'
import type { SelectiveExportRequest, SelectiveImportRequest, SelectiveImportResult } from '@/models/api/ImportExport'

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
	databaseDuplicates?: {
		totalGamesInDatabase: number
		duplicateGroups: Array<{
			normalizedKey: string
			games: Array<{ id: number; name: string }>
			reason: string
		}>
	}
}> => {
	const endpoint = environment.apiRoutes.dataExport.analyzeFolders

	return await customFetch(endpoint, {
		method: 'GET',
		baseURL: environment.baseUrl,
		timeout: environment.api?.timeout,
	})
}

/**
 * Analyzes the database to find games with duplicate or near-duplicate names.
 * Accessible to all authenticated users.
 * @returns Result with groups of duplicate games
 */
export const analyzeDatabaseDuplicates = async (): Promise<{
	totalGamesInDatabase: number
	duplicateGroups: Array<{
		normalizedKey: string
		games: Array<{ id: number; name: string }>
		reason: string
	}>
}> => {
	const endpoint = environment.apiRoutes.dataExport.analyzeDuplicateGames

	return await customFetch(endpoint, {
		method: 'GET',
		baseURL: environment.baseUrl,
		timeout: environment.api?.timeout,
	})
}

/**
 * Updates image URLs in the database to match the filesystem structure
 * @returns Result with statistics about updated games
 */
export const updateImageUrls = async (): Promise<{
	totalGames: number
	updatedGames: number
	skippedGames: number
	alreadyCorrect: number
	noImagesFound: number
}> => {
	const endpoint = environment.apiRoutes.dataExport.updateImageUrls

	return await customFetch(endpoint, {
		method: 'POST',
		baseURL: environment.baseUrl,
		timeout: environment.api?.timeout,
	})
}

/**
 * Clears the image proxy cache (_proxy_cache directory) on the server.
 * @returns Result with count of deleted files
 */
export const clearImageCache = async (): Promise<{ deletedFiles: number; message: string }> => {
	const endpoint = environment.apiRoutes.dataExport.clearImageCache

	return await customFetch(endpoint, {
		method: 'POST',
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
/**
 * Exports a selective set of games to CSV using per-property cleaning rules.
 * @param request - IDs of games to export + global/per-game property configs
 * @returns Blob containing the CSV
 */
export const selectiveExportGames = async (request: SelectiveExportRequest): Promise<Blob> => {
	const endpoint = environment.apiRoutes.dataExport.selectiveExport

	const csvText = await customFetch<string>(endpoint, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', 'Accept': 'text/csv' },
		body: request,
		baseURL: environment.baseUrl,
		timeout: environment.api?.timeout,
	})

	return new Blob([csvText], { type: 'text/csv' })
}

/**
 * Imports games from a CSV file with per-property transformation rules.
 * @param source - CSV file or raw CSV text string
 * @param config - Global and per-game import configuration
 * @returns Import result statistics
 */
export const selectiveImportGames = async (source: File | string, config: SelectiveImportRequest): Promise<SelectiveImportResult> => {
	const endpoint = environment.apiRoutes.dataExport.selectiveImport
	const formData = new FormData()

	if (source instanceof File) {
		formData.append('csvFile', source)
	} else {
		formData.append('csvText', source)
	}
	formData.append('configJson', JSON.stringify(config))

	return await customFetch<SelectiveImportResult>(endpoint, {
		method: 'POST',
		body: formData,
		baseURL: environment.baseUrl,
		timeout: environment.api?.timeout,
	})
}

/**
 * Parses a CSV string (or reads a File) and returns all game names found in it.
 * Only rows with Type === "Game" and a non-empty Name are returned.
 */
export const parseCSVGameNames = async (source: File | string): Promise<string[]> => {
	const text = source instanceof File ? await source.text() : source

	const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')
	if (lines.length < 2) return []

	// Parse header to find Type and Name column indices
	const header = splitCSVLine(lines[0])
	const typeIdx = header.findIndex((h) => h.trim().toLowerCase() === 'type')
	const nameIdx = header.findIndex((h) => h.trim().toLowerCase() === 'name')

	if (typeIdx === -1 || nameIdx === -1) return []

	const gameNames: string[] = []
	for (let i = 1; i < lines.length; i++) {
		const cols = splitCSVLine(lines[i])
		if (cols[typeIdx]?.trim() === 'Game' && cols[nameIdx]?.trim()) {
			gameNames.push(cols[nameIdx].trim())
		}
	}
	return gameNames
}

/** Minimal CSV line splitter (handles quoted fields). */
function splitCSVLine(line: string): string[] {
	const result: string[] = []
	let current = ''
	let inQuotes = false
	for (let i = 0; i < line.length; i++) {
		const ch = line[i]
		if (ch === '"') {
			if (inQuotes && line[i + 1] === '"') {
				current += '"'
				i++
			} else inQuotes = !inQuotes
		} else if (ch === ',' && !inQuotes) {
			result.push(current)
			current = ''
		} else {
			current += ch
		}
	}
	result.push(current)
	return result
}
