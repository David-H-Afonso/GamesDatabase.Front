import { environment } from '@/environments'
import { customFetch } from '@/utils/customFetch'

export interface BackupScheduleDto {
	isEnabled: boolean
	backupHour: number
	backupMinute: number
	backupType: 'full' | 'partial'
	destinationPath: string
	retentionCount: number
	fileNamePrefix: string
	fileNameSuffix: string
	lastRunAt: string | null
	lastRunStatus: 'never' | 'running' | 'success' | 'failed'
	lastRunMessage: string | null
}

export interface UpdateBackupScheduleRequest {
	isEnabled: boolean
	backupHour: number
	backupMinute: number
	backupType: 'full' | 'partial'
	destinationPath: string
	retentionCount: number
	fileNamePrefix: string
	fileNameSuffix: string
}

export const getBackupSchedule = async (): Promise<BackupScheduleDto> => {
	return await customFetch<BackupScheduleDto>(environment.apiRoutes.backupSchedule.base, {
		method: 'GET',
		baseURL: environment.baseUrl,
	})
}

export const updateBackupSchedule = async (req: UpdateBackupScheduleRequest): Promise<BackupScheduleDto> => {
	return await customFetch<BackupScheduleDto>(environment.apiRoutes.backupSchedule.base, {
		method: 'PUT',
		body: req,
		baseURL: environment.baseUrl,
	})
}

export const runBackupNow = async (): Promise<{ message: string }> => {
	return await customFetch<{ message: string }>(environment.apiRoutes.backupSchedule.runNow, {
		method: 'POST',
		baseURL: environment.baseUrl,
	})
}
