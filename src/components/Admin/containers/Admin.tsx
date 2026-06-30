import { Routes, Route, Navigate } from 'react-router-dom'
import type { ReactElement } from 'react'
import { useAppSelector } from '@/store/hooks'
import { selectIsAdmin } from '@/store/features/auth/selector'
import { ADMIN_TABS } from '../config/adminTabs'
import AdminLayout from '../AdminLayout'
import AdminPlatforms from '../AdminPlatforms'
import AdminStatus from '../AdminStatus'
import AdminPlayWith from '../AdminPlayWith'
import AdminPlayedStatus from '../AdminPlayedStatus'
import AdminDataExport from '../AdminDataExport'
import AdminGameViews from '../AdminGameViews'
import AdminUsers from '../AdminUsers'
import { AdminPreferences } from '../AdminPreferences'
import AdminReplayTypes from '../AdminReplayTypes'
import { AdminAuditLog } from '../AdminAuditLog'
import AdminBackupScheduleUsers from '../AdminBackupScheduleUsers'
import { AdminSteam } from '../AdminSteam'

const TAB_ELEMENTS: Record<string, ReactElement> = {
	users: <AdminUsers />,
	platforms: <AdminPlatforms />,
	status: <AdminStatus />,
	'play-with': <AdminPlayWith />,
	'played-status': <AdminPlayedStatus />,
	'replay-types': <AdminReplayTypes />,
	'data-export': <AdminDataExport />,
	'game-views': <AdminGameViews />,
	'audit-log': <AdminAuditLog />,
	'backup-schedule-users': <AdminBackupScheduleUsers />,
	preferences: <AdminPreferences />,
	steam: <AdminSteam />,
}

const Admin = () => {
	const isAdmin = useAppSelector(selectIsAdmin)

	return (
		<Routes>
			<Route element={<AdminLayout />}>
				<Route index element={<Navigate to='platforms' replace />} />
				{ADMIN_TABS.filter((tab) => !tab.adminOnly || isAdmin).map((tab) => (
					<Route key={tab.path} path={tab.path} element={TAB_ELEMENTS[tab.path]} />
				))}
				<Route path='steam-import' element={<Navigate to='/admin/steam' replace />} />
			</Route>
		</Routes>
	)
}

export default Admin
