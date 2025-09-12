import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '@/store'

// ===================================
// SIMPLE SELECTORS
// ===================================

export const selectExampleData = (state: RootState) => state.exampleFeature.data
export const selectExampleLoading = (state: RootState) => state.exampleFeature.loading
export const selectExampleError = (state: RootState) => state.exampleFeature.error

// ===================================
// PARAMETERIZED SELECTORS
// ===================================

// Since data is string[], this selector just finds by string value
export const selectExampleItemByValue = (value: string) => (state: RootState) =>
	state.exampleFeature.data.find((item) => item === value)

// ===================================
// MEMOIZED SELECTORS
// ===================================

// Example filtering logic: just returns all data (since items are strings)
export const selectFilteredExampleData = createSelector([selectExampleData], (data) => {
	return data
})

export const selectExampleStats = createSelector([selectExampleData], (data) => ({
	total: data.length,
}))

export const selectIsExampleOperationInProgress = createSelector(
	[selectExampleLoading],
	(loading) => loading
)
