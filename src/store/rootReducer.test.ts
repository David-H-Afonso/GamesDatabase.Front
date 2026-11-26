import { describe, expect, it } from 'vitest'
import { rootReducer } from './rootReducer'
import { createGame } from '@/test/factories'

describe('collection session boundaries', () => {
	it.each(['auth/forceLogout', 'auth/logout/pending'])('clears private collection state on %s while retaining appearance', type => {
		const initial = rootReducer(undefined, { type: '@@test' })
		const privateState = { ...initial, games: { ...initial.games, games: [createGame()], filters: { search: 'private' } }, playlists: { ...initial.playlists, playlists: [{ id: 9, name: 'Private list' }] }, gameViews: { ...initial.gameViews, publicGameViews: [{ id: 4, name: 'Private view' }] }, theme: { ...initial.theme, currentTheme: 'steam', cardStyle: 'row' as const, viewMode: 'private-view' } }
		const result = rootReducer(privateState as typeof initial, { type })
		expect(result.games.games).toEqual([]); expect(result.games.filters.search).toBeUndefined(); expect(result.playlists.playlists).toEqual([]); expect(result.gameViews.publicGameViews).toEqual([])
		expect(result.theme.currentTheme).toBe('steam'); expect(result.theme.cardStyle).toBe('row')
		expect(result.theme.viewMode).toBe('default')
	})
})
