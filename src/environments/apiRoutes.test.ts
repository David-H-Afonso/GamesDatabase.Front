import { describe, it, expect } from 'vitest'
import { apiRoutes } from './apiRoutes'

describe('apiRoutes — static endpoints', () => {
	it('games.base is /games', () => expect(apiRoutes.games.base).toBe('/games'))
	it('games.create is /games', () => expect(apiRoutes.games.create).toBe('/games'))

	it('gameStatus.base is /gamestatus', () => expect(apiRoutes.gameStatus.base).toBe('/gamestatus'))
	it('gameStatus.active is /gamestatus/active', () => expect(apiRoutes.gameStatus.active).toBe('/gamestatus/active'))
	it('gameStatus.special is /gamestatus/special', () => expect(apiRoutes.gameStatus.special).toBe('/gamestatus/special'))
	it('gameStatus.reorder is /gamestatus/reorder', () => expect(apiRoutes.gameStatus.reorder).toBe('/gamestatus/reorder'))

	it('gamePlatform.base is /gameplatforms', () => expect(apiRoutes.gamePlatform.base).toBe('/gameplatforms'))
	it('gamePlatform.active is /gameplatforms/active', () => expect(apiRoutes.gamePlatform.active).toBe('/gameplatforms/active'))

	it('gamePlayWith.base is /gameplaywith', () => expect(apiRoutes.gamePlayWith.base).toBe('/gameplaywith'))
	it('gamePlayedStatus.base is /gameplayedstatus', () => expect(apiRoutes.gamePlayedStatus.base).toBe('/gameplayedstatus'))

	it('gameViews.base is /gameviews', () => expect(apiRoutes.gameViews.base).toBe('/gameviews'))

	it('gameReplayTypes.base is /gamereplaytypes', () => expect(apiRoutes.gameReplayTypes.base).toBe('/gamereplaytypes'))
	it('gameReplayTypes.active is /gamereplaytypes/active', () => expect(apiRoutes.gameReplayTypes.active).toBe('/gamereplaytypes/active'))
	it('gameReplayTypes.reorder is /gamereplaytypes/reorder', () => expect(apiRoutes.gameReplayTypes.reorder).toBe('/gamereplaytypes/reorder'))

	it('users.login is /users/login', () => expect(apiRoutes.users.login).toBe('/users/login'))
	it('users.base is /users', () => expect(apiRoutes.users.base).toBe('/users'))
})

describe('apiRoutes — dynamic builders', () => {
	it('games.byId(5) returns /games/5', () => expect(apiRoutes.games.byId(5)).toBe('/games/5'))
	it('games.update(10) returns /games/10', () => expect(apiRoutes.games.update(10)).toBe('/games/10'))
	it('games.delete(7) returns /games/7', () => expect(apiRoutes.games.delete(7)).toBe('/games/7'))

	it('gameStatus.byId(3) returns /gamestatus/3', () => expect(apiRoutes.gameStatus.byId(3)).toBe('/gamestatus/3'))
	it('gameStatus.update(3) returns /gamestatus/3', () => expect(apiRoutes.gameStatus.update(3)).toBe('/gamestatus/3'))
	it('gameStatus.delete(3) returns /gamestatus/3', () => expect(apiRoutes.gameStatus.delete(3)).toBe('/gamestatus/3'))

	it('gamePlatform.byId(2) returns /gameplatforms/2', () => expect(apiRoutes.gamePlatform.byId(2)).toBe('/gameplatforms/2'))
	it('gamePlayWith.byId(4) returns /gameplaywith/4', () => expect(apiRoutes.gamePlayWith.byId(4)).toBe('/gameplaywith/4'))
	it('gamePlayedStatus.byId(1) returns /gameplayedstatus/1', () => expect(apiRoutes.gamePlayedStatus.byId(1)).toBe('/gameplayedstatus/1'))
	it('gameViews.byId(9) returns /gameviews/9', () => expect(apiRoutes.gameViews.byId(9)).toBe('/gameviews/9'))

	it('gameReplays.byGameId(1) returns /games/1/replays', () => expect(apiRoutes.gameReplays.byGameId(1)).toBe('/games/1/replays'))
	it('gameReplays.byId(1, 5) returns /games/1/replays/5', () => expect(apiRoutes.gameReplays.byId(1, 5)).toBe('/games/1/replays/5'))

	it('gameHistory.byGameId(3) returns /games/3/history', () => expect(apiRoutes.gameHistory.byGameId(3)).toBe('/games/3/history'))
	it('gameHistory.entryById(3, 7) returns /games/3/history/7', () => expect(apiRoutes.gameHistory.entryById(3, 7)).toBe('/games/3/history/7'))

	it('users.byId(1) returns /users/1', () => expect(apiRoutes.users.byId(1)).toBe('/users/1'))
	it('users.changePassword(2) returns /users/2/password', () => expect(apiRoutes.users.changePassword(2)).toBe('/users/2/password'))
})
