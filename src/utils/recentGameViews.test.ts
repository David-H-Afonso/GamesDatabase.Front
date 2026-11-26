import { describe, expect, it } from 'vitest'
import { recentGameViews } from './recentGameViews'

describe('two stable recent view shortcuts', () => {
	it('uses the first two when no usable server usage exists', () => {
		expect(recentGameViews([{ id: 1 }, { id: 2, lastUsedAt: 'invalid' }, { id: 3 }]).map(view => view.id)).toEqual([1, 2])
	})
	it('prioritizes the last two used views, preserving manual order on ties without mutating input', () => {
		const views = [{ id: 1 }, { id: 2, lastUsedAt: '2026-11-25T10:00:00Z' }, { id: 3, lastUsedAt: '2026-11-25T12:00:00Z' }, { id: 4, lastUsedAt: '2026-11-25T12:00:00Z' }]
		expect(recentGameViews(views).map(view => view.id)).toEqual([3, 4]); expect(views.map(view => view.id)).toEqual([1, 2, 3, 4])
	})
	it('fills an unused second slot from the first manual views after a new view is used', () => {
		expect(recentGameViews([{ id: 1 }, { id: 2 }, { id: 3, lastUsedAt: '2026-11-25T12:00:00Z' }]).map(view => view.id)).toEqual([1, 3])
	})
	it('records reusing the second default shortcut for correct later eviction without moving either button', () => {
		const views = [{ id: 1 }, { id: 2, lastUsedAt: '2026-11-25T12:00:00Z' }, { id: 3 }]
		expect(recentGameViews(views).map(view => view.id)).toEqual([1, 2])
		expect(recentGameViews(views.map(view => view.id === 3 ? { ...view, lastUsedAt: '2026-11-25T13:00:00Z' } : view)).map(view => view.id)).toEqual([2, 3])
	})
	it('does not reorder an existing pair when either timestamp is refreshed or on reload', () => {
		const views = [{ id: 1, lastUsedAt: '2026-11-25T12:00:00Z' }, { id: 2 }, { id: 3, lastUsedAt: '2026-11-25T13:00:00Z' }]
		expect(recentGameViews(views).map(view => view.id)).toEqual([1, 3])
		expect(recentGameViews(views.map(view => view.id === 1 ? { ...view, lastUsedAt: '2026-11-25T14:00:00Z' } : view)).map(view => view.id)).toEqual([1, 3])
	})
})
