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
	} | null
	token: string | null
	loading: boolean
	error: string | null
}
