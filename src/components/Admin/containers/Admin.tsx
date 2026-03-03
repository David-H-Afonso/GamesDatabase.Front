import { Routes, Route, Navigate } from 'react-router-dom'
import { useAppSelector } from '@/store/hooks'
import { selectIsAdmin } from '@/store/features/auth/selector'
import AdminLayout from '../AdminLayout'
import AdminPlatforms from '../AdminPlatforms'
import AdminStatus from '../AdminStatus'
import AdminPlayWith from '../AdminPlayWith'
import AdminPlayedStatus from '../AdminPlayedStatus'
import AdminDataExport from '../AdminDataExport'
import AdminGameViews from '../AdminGameViews'
import AdminUsers from '../AdminUsers'
import { AdminPreferences } from '../AdminPreferences'

const Admin = () => {
	const isAdmin = useAppSelector(selectIsAdmin)

	return (
		<Routes>
			<Route element={<AdminLayout />}>
				<Route index element={<Navigate to='platforms' replace />} />
				<Route path='platforms' element={<AdminPlatforms />} />
				<Route path='status' element={<AdminStatus />} />
				<Route path='play-with' element={<AdminPlayWith />} />
				<Route path='played-status' element={<AdminPlayedStatus />} />
				<Route path='data-export' element={<AdminDataExport />} />
				<Route path='game-views' element={<AdminGameViews />} />
				{isAdmin && <Route path='users' element={<AdminUsers />} />}
				<Route path='preferences' element={<AdminPreferences />} />
			</Route>
		</Routes>
	)
}

export default Admin
