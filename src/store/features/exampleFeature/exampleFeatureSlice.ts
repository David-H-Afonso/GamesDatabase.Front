import type { ExampleState } from '@/models/store/ExampleState'
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

const initialState: ExampleState = {
	data: [],
	loading: false,
	error: null,
}

// Example Slice
const exampleSlice = createSlice({
	name: 'example',
	initialState,
	reducers: {
		// Add item to data
		addItem: (state, action: PayloadAction<string>) => {
			state.data.push(action.payload)
		},
		// Remove item from data
		removeItem: (state, action: PayloadAction<string>) => {
			state.data = state.data.filter((item) => item !== action.payload)
		},
		// Clear all data
		clearData: (state) => {
			state.data = []
		},
		// Set loading state
		setLoading: (state, action: PayloadAction<boolean>) => {
			state.loading = action.payload
		},
		// Set error
		setError: (state, action: PayloadAction<string | null>) => {
			state.error = action.payload
		},
	},
})

// Exports
export const { addItem, removeItem, clearData, setLoading, setError } = exampleSlice.actions
export default exampleSlice.reducer
