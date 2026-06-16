/**
 * Authentication state stored in Redux
 */
export interface AuthState {
	isAuthenticated: boolean
	user: {
		id: number
		username: string
		role: 'Admin' | 'Standard'
		useScoreColors?: boolean
		scoreProvider?: string
		showPriceComparisonIcon?: boolean
		steamId?: string
		steamNickname?: string
		steamAvatarUrl?: string
	} | null
	token: string | null
	/** Long-lived refresh token (30 days). Persisted in localStorage. */
	refreshToken: string | null
	loading: boolean
	error: string | null
}
