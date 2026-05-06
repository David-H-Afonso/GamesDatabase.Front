import { describe, it, expect } from 'vitest'
import { store, persistor } from '../index'

describe('store', () => {
	it('exports a configured Redux store', () => {
		expect(store).toBeDefined()
		expect(store.getState).toBeTypeOf('function')
		expect(store.dispatch).toBeTypeOf('function')
	})

	it('exports a persistor', () => {
		expect(persistor).toBeDefined()
	})

	it('has the expected reducer slices', () => {
		const state = store.getState()
		expect(state).toHaveProperty('games')
		expect(state).toHaveProperty('gameStatus')
		expect(state).toHaveProperty('gamePlatform')
		expect(state).toHaveProperty('gamePlayWith')
		expect(state).toHaveProperty('gamePlayedStatus')
		expect(state).toHaveProperty('gameViews')
		expect(state).toHaveProperty('theme')
		expect(state).toHaveProperty('auth')
		expect(state).toHaveProperty('recentUsers')
	})
})
