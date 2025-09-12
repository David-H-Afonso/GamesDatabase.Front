import { createAsyncThunk } from '@reduxjs/toolkit'

// Example function template for async thunk
export const exampleAsyncThunk = createAsyncThunk<
	any, // Replace with the return type
	any, // Replace with the argument type
	{ rejectValue: string } // Replace with additional options if needed
>('example/asyncThunk', async (_args, { rejectWithValue }) => {
	try {
		// Replace this with your actual logic
		const result = await new Promise((resolve) => setTimeout(() => resolve('Success'), 1000))
		return result
	} catch (error: any) {
		return rejectWithValue(error.message || 'An error occurred')
	}
})
