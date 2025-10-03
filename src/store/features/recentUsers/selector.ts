import type { RootState } from '@/store'

export const selectRecentUsers = (state: RootState) => state.recentUsers.users
