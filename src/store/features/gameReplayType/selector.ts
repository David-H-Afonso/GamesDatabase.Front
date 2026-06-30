import type { RootState } from '@/store'
import type { GameReplayType } from '@/models/api/GameReplayType'

export const selectReplayTypes = (state: RootState) => state.gameReplayType.replayTypes

export const selectActiveReplayTypes = (state: RootState) => state.gameReplayType.activeReplayTypes

export const selectSpecialReplayType = (state: RootState) => state.gameReplayType.specialReplayType

export const selectReplayTypesLoading = (state: RootState) => state.gameReplayType.loading

export const selectReplayTypesError = (state: RootState) => state.gameReplayType.error

export const selectReplayTypesPagination = (state: RootState) => state.gameReplayType.pagination

export const selectReplayTypesFilters = (state: RootState) => state.gameReplayType.filters

export const selectReplayTypeState = (state: RootState) => state.gameReplayType

export const selectReplayTypeById =
	(id: number) =>
	(state: RootState): GameReplayType | undefined =>
		state.gameReplayType.replayTypes.find((type) => type.id === id)
