const games = [
	{
		id: 1,
		name: 'Warhammer 40,000: Space Marine II Anniversary Edition',
		statusId: 1,
		statusName: 'Playing',
		platformId: 1,
		platformName: 'Steam',
		playWithIds: [1],
		playWithNames: ['Friends', 'Family', 'Solo'],
		hero: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2183900/header.jpg',
		cover: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2183900/library_600x900.jpg',
		steamAppId: 2183900,
	},
	{
		id: 2,
		name: 'Balatro',
		statusId: 2,
		statusName: 'Done',
		platformId: 1,
		platformName: 'Steam',
		playWithIds: [2],
		playWithNames: ['Solo'],
		hero: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2379780/header.jpg',
		cover: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2379780/library_600x900.jpg',
		steamAppId: 2379780,
		isManuallyCompleted: true,
	},
]

const paged = <T,>(data: T[]) => ({
	data,
	page: 1,
	pageSize: 50,
	totalCount: data.length,
	totalPages: 1,
	hasNextPage: false,
	hasPreviousPage: false,
})

const statuses = [
	{ id: 1, name: 'Playing', color: '#61afef' },
	{ id: 2, name: 'Done', color: '#98c379' },
]

const platforms = [{ id: 1, name: 'Steam', color: '#2a475e' }]

const playWith = [
	{ id: 1, name: 'Friends', color: '#ab32ec' },
	{ id: 2, name: 'Solo', color: '#24c2b7' },
	{ id: 3, name: 'Family', color: '#099012' },
]

const persistRoot = {
	auth: JSON.stringify({
		isAuthenticated: true,
		user: { id: 1, username: 'Admin', role: 'Admin' },
		token: 'test-token',
		refreshToken: null,
		loading: false,
		error: null,
	}),
	theme: JSON.stringify({ currentTheme: 'dark', cardStyle: 'cover', viewMode: 'default', availableThemes: [] }),
	games: JSON.stringify({
		games: [],
		loading: true,
		error: null,
		pagination: { page: 1, pageSize: 50, totalCount: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
		filters: { page: 1, pageSize: 50, sortBy: 'name', sortDescending: false },
		lastAppliedFilters: null,
		isDataFresh: false,
		needsRefresh: false,
	}),
	gameStatus: JSON.stringify({ statuses: [], activeStatuses: [], specialStatuses: [], currentStatus: null, loading: false, error: null, pagination: { page: 1, pageSize: 50, totalCount: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false }, filters: {} }),
	gamePlatform: JSON.stringify({ platforms: [], activePlatforms: [], currentPlatform: null, loading: false, error: null, pagination: { page: 1, pageSize: 50, totalCount: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false }, filters: {} }),
	gamePlayWith: JSON.stringify({ playWithOptions: [], activePlayWithOptions: [], currentPlayWith: null, loading: false, error: null, pagination: { page: 1, pageSize: 50, totalCount: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false }, filters: {} }),
	gamePlayedStatus: JSON.stringify({ playedStatuses: [], activePlayedStatuses: [], currentPlayedStatus: null, loading: false, error: null, pagination: { page: 1, pageSize: 50, totalCount: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false }, filters: {} }),
	gameReplayType: JSON.stringify({ replayTypes: [], activeReplayTypes: [], specialReplayType: null, currentReplayType: null, loading: false, error: null, pagination: { page: 1, pageSize: 50, totalCount: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false }, filters: {} }),
	gameViews: JSON.stringify({ gameViews: [], publicGameViews: [], currentGameView: null, loading: false, error: null, filters: {} }),
	recentUsers: JSON.stringify({ users: [] }),
	_persist: JSON.stringify({ version: -1, rehydrated: true }),
}

describe('cover view', () => {
	beforeEach(() => {
		cy.intercept('GET', '**/api/users/1', { id: 1, username: 'Admin', role: 'Admin' }).as('user')
		cy.intercept('GET', '/api/gameviews*', { statusCode: 200, body: [] }).as('localViews')
		cy.intercept('GET', /\/api\/gameviews(\/public)?(\?.*)?$/, { statusCode: 200, body: [] }).as('views')
		cy.intercept('GET', '**/api/gamestatus/special*', []).as('specialStatuses')
		cy.intercept('GET', '**/api/gamestatus/active*', statuses).as('statuses')
		cy.intercept('GET', /\/api\/gameplatforms\/active(\?.*)?$/, platforms).as('activePlatforms')
		cy.intercept('GET', /\/api\/gameplatforms(\?.*)?$/, paged(platforms)).as('platforms')
		cy.intercept('GET', /\/api\/gameplaywith\/active(\?.*)?$/, playWith).as('activePlayWith')
		cy.intercept('GET', /\/api\/gameplaywith(\?.*)?$/, paged(playWith)).as('playWith')
		cy.intercept('GET', /\/api\/gameplayedstatus\/active(\?.*)?$/, []).as('activePlayedStatus')
		cy.intercept('GET', /\/api\/gameplayedstatus(\?.*)?$/, paged([])).as('playedStatus')
		cy.intercept('GET', '**/api/gamereplaytypes/special*', { statusCode: 200, body: null }).as('specialReplayType')
		cy.intercept('GET', '**/api/gamereplaytypes/active*', []).as('replayTypes')
		cy.intercept('GET', /\/api\/games(\?.*)?$/, {
			data: games,
			page: 1,
			pageSize: 50,
			totalCount: games.length,
			totalPages: 1,
			hasNextPage: false,
			hasPreviousPage: false,
		}).as('games')
		cy.intercept('PUT', '**/api/games/1', {}).as('updateGame')
		cy.intercept('POST', '**/api/steam/sync/1', { success: true }).as('syncGame')

		cy.visit('/', {
			onBeforeLoad(win) {
				;(win as any).API_BASE_URL = '/api'
				win.localStorage.setItem('persist:root', JSON.stringify(persistRoot))
				win.localStorage.setItem('cardStyle', 'cover')
				win.localStorage.setItem('theme', 'dark')
			},
		})
		cy.wait('@games')
	})

	it('shows full truncated names through title and quick-edit chips on hover', () => {
		cy.contains('h3', 'Warhammer 40,000').should('have.attr', 'title', games[0].name)
		cy.contains('.game-cover-view', 'Warhammer 40,000').trigger('mouseenter')
		cy.contains('.game-cover-view__hover-chip', 'Playing').click({ force: true })
		cy.contains('.game-cover-view__quick-editor button', 'Done').click({ force: true })
		cy.wait('@updateGame').its('request.body').should('include', { statusId: 2 })
	})

	it('bulk refreshes the selected cover image through Steam sync', () => {
		cy.contains('.game-cover-view', 'Warhammer 40,000').find('input[type="checkbox"]').check({ force: true })
		cy.findByLabelText('Image to refresh').select('cover')
		cy.contains('button', 'Refresh image').click()
		cy.wait('@updateGame').its('request.body').should('include', { cover: null })
		cy.wait('@syncGame')
	})
})
