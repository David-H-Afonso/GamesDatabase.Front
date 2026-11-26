import { combineReducers } from '@reduxjs/toolkit'
import games from './features/games/gamesSlice'
import gameStatus from './features/gameStatus/gameStatusSlice'
import gamePlatform from './features/gamePlatform/gamePlatformSlice'
import gamePlayWith from './features/gamePlayWith/gamePlayWithSlice'
import gamePlayedStatus from './features/gamePlayedStatus/gamePlayedStatusSlice'
import gameReplayType from './features/gameReplayType/gameReplayTypeSlice'
import gameViews from './features/gameViews/gameViewSlice'
import theme from './features/theme/themeSlice'
import auth from './features/auth/authSlice'
import recentUsers from './features/recentUsers/recentUsersSlice'
import steam from './features/steam/steamSlice'
import playlists from './features/playlists/playlistSlice'

const combined = combineReducers({ games, gameStatus, gamePlatform, gamePlayWith, gamePlayedStatus, gameReplayType, gameViews, theme, auth, recentUsers, steam, playlists })
const accountBoundaries = new Set(['auth/forceLogout', 'auth/logout/pending', 'auth/login/fulfilled', 'auth/steamLogin/fulfilled'])

/** A new account never inherits another user's collection, catalogs, playlists, or saved views. */
export const rootReducer: typeof combined = (state, action) => {
	if (state && accountBoundaries.has(action.type)) {
		const empty = combined(undefined, { type: '@@collection/new-session' })
		return combined({ ...empty, auth: state.auth, theme: { ...empty.theme, ...state.theme, viewMode: 'default' }, recentUsers: state.recentUsers }, action)
	}
	return combined(state, action)
}
