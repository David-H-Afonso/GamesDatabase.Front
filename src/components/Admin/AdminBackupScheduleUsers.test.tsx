import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import i18n from '@/i18n'
import AdminBackupScheduleUsers from './AdminBackupScheduleUsers'

const calls = vi.hoisted(() => ({ read: vi.fn(), save: vi.fn(), run: vi.fn() }))
vi.mock('@/services/BackupScheduleService', () => ({ getAdminUserSchedules: calls.read, updateAdminUserSchedule: calls.save, runAdminUserBackupNow: calls.run }))
const entries = [1, 2].map(userId => ({ userId, username: `Schedule fixture ${userId}`, schedule: { isEnabled: false, backupHour: 3, backupMinute: 30, backupType: 'full', destinationPath: '/fixture-only', retentionCount: 7, fileNamePrefix: '', fileNameSuffix: '', lastRunAt: null, lastRunStatus: 'never', lastRunMessage: null } }))

describe('backup time controls remain distinct per expanded user', () => {
	beforeEach(() => { vi.clearAllMocks(); calls.read.mockResolvedValue(entries) })
	it('names both users\' hour and minute controls and never starts or saves a backup by opening or editing them', async () => {
		const { container } = renderWithProviders(<AdminBackupScheduleUsers />)
		for (const entry of entries) {
			const trigger = await screen.findByRole('button', { name: new RegExp(entry.username) })
			expect(trigger).toHaveAttribute('aria-expanded', 'false')
			await userEvent.click(trigger)
			expect(trigger).toHaveAttribute('aria-expanded', 'true')
			await userEvent.selectOptions(screen.getByRole('combobox', { name: i18n.t('admin.backupSchedule.hourFor', { user: entry.username }) }), '4')
			expect(screen.getByRole('combobox', { name: i18n.t('admin.backupSchedule.minuteFor', { user: entry.username }) })).toHaveValue('30')
		}
		const ids = [...container.querySelectorAll('[id]')].map(element => element.id)
		expect(new Set(ids).size).toBe(ids.length)
		expect(calls.save).not.toHaveBeenCalled(); expect(calls.run).not.toHaveBeenCalled()
	})
})
