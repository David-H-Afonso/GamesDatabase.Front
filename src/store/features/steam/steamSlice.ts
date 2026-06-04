import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { steamService } from '@/services'
import type { SteamProfile, SteamLibraryGame, SteamSyncResult, SteamImportRequest, SteamImportResult } from '@/services'

export interface SteamState {
	profile: SteamProfile | null
	library: SteamLibraryGame[]
	libraryLoading: boolean
	profileLoading: boolean
	syncLoading: boolean
	importLoading: boolean
	lastSyncResult: SteamSyncResult | null
	lastImportResult: SteamImportResult | null
	error: string | null
}

const initialState: SteamState = {
	profile: null,
	library: [],
	libraryLoading: false,
	profileLoading: false,
	syncLoading: false,
	importLoading: false,
	lastSyncResult: null,
	lastImportResult: null,
	error: null,
}

export const fetchSteamProfile = createAsyncThunk('steam/fetchProfile', async (_, { rejectWithValue }) => {
	try {
		return await steamService.getProfile()
	} catch (e) {
		return rejectWithValue(e instanceof Error ? e.message : 'Failed to fetch Steam profile')
	}
})

export const fetchSteamLibrary = createAsyncThunk('steam/fetchLibrary', async (_, { rejectWithValue }) => {
	try {
		return await steamService.getLibrary()
	} catch (e) {
		return rejectWithValue(e instanceof Error ? e.message : 'Failed to fetch Steam library')
	}
})

export const unlinkSteam = createAsyncThunk('steam/unlink', async (_, { rejectWithValue }) => {
	try {
		await steamService.unlinkAccount()
	} catch (e) {
		return rejectWithValue(e instanceof Error ? e.message : 'Failed to unlink Steam account')
	}
})

export const syncAllSteam = createAsyncThunk('steam/syncAll', async (_, { rejectWithValue }) => {
	try {
		return await steamService.syncAll()
	} catch (e) {
		return rejectWithValue(e instanceof Error ? e.message : 'Failed to sync Steam data')
	}
})

export const syncSteamGame = createAsyncThunk('steam/syncGame', async (gameId: number, { rejectWithValue }) => {
	try {
		return await steamService.syncGame(gameId)
	} catch (e) {
		return rejectWithValue(e instanceof Error ? e.message : 'Failed to sync Steam game')
	}
})

export const importSteamGames = createAsyncThunk('steam/import', async (request: SteamImportRequest, { rejectWithValue }) => {
	try {
		return await steamService.importGames(request)
	} catch (e) {
		return rejectWithValue(e instanceof Error ? e.message : 'Failed to import Steam games')
	}
})

const steamSlice = createSlice({
	name: 'steam',
	initialState,
	reducers: {
		clearSteamError: (state) => {
			state.error = null
		},
		clearLastImportResult: (state) => {
			state.lastImportResult = null
		},
		clearLastSyncResult: (state) => {
			state.lastSyncResult = null
		},
		markSteamGameLinked: (state, action: { payload: { appId: number; gameId: number; gameName: string } }) => {
			const libraryGame = state.library.find((game) => game.appId === action.payload.appId)
			if (libraryGame) {
				libraryGame.gdbGameId = action.payload.gameId
				libraryGame.gdbGameName = action.payload.gameName
			}
		},
	},
	extraReducers: (builder) => {
		// fetchSteamProfile
		builder
			.addCase(fetchSteamProfile.pending, (state) => {
				state.profileLoading = true
				state.error = null
			})
			.addCase(fetchSteamProfile.fulfilled, (state, action) => {
				state.profileLoading = false
				state.profile = action.payload
			})
			.addCase(fetchSteamProfile.rejected, (state, action) => {
				state.profileLoading = false
				state.error = action.payload as string
			})

		// fetchSteamLibrary
		builder
			.addCase(fetchSteamLibrary.pending, (state) => {
				state.libraryLoading = true
				state.error = null
			})
			.addCase(fetchSteamLibrary.fulfilled, (state, action) => {
				state.libraryLoading = false
				state.library = action.payload
			})
			.addCase(fetchSteamLibrary.rejected, (state, action) => {
				state.libraryLoading = false
				state.error = action.payload as string
			})

		// unlinkSteam
		builder
			.addCase(unlinkSteam.fulfilled, (state) => {
				state.profile = null
				state.library = []
			})
			.addCase(unlinkSteam.rejected, (state, action) => {
				state.error = action.payload as string
			})

		// syncAllSteam
		builder
			.addCase(syncAllSteam.pending, (state) => {
				state.syncLoading = true
				state.error = null
			})
			.addCase(syncAllSteam.fulfilled, (state, action) => {
				state.syncLoading = false
				state.lastSyncResult = action.payload
			})
			.addCase(syncAllSteam.rejected, (state, action) => {
				state.syncLoading = false
				state.error = action.payload as string
			})

		// syncSteamGame
		builder
			.addCase(syncSteamGame.pending, (state) => {
				state.syncLoading = true
				state.error = null
			})
			.addCase(syncSteamGame.fulfilled, (state, action) => {
				state.syncLoading = false
				state.lastSyncResult = action.payload
			})
			.addCase(syncSteamGame.rejected, (state, action) => {
				state.syncLoading = false
				state.error = action.payload as string
			})

		// importSteamGames
		builder
			.addCase(importSteamGames.pending, (state) => {
				state.importLoading = true
				state.error = null
			})
			.addCase(importSteamGames.fulfilled, (state, action) => {
				state.importLoading = false
				state.lastImportResult = action.payload
			})
			.addCase(importSteamGames.rejected, (state, action) => {
				state.importLoading = false
				state.error = action.payload as string
			})
	},
})

export const { clearSteamError, clearLastImportResult, clearLastSyncResult, markSteamGameLinked } = steamSlice.actions
export default steamSlice.reducer
