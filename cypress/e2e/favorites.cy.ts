export {}

const API = '**/api'

const game = (overrides: Record<string, unknown>) => ({
	id: 1,
	name: 'Dark Souls',
	statusId: 1,
	statusName: 'Completado',
	platformId: 1,
	platformName: 'PC',
	score: 9,
	grade: 95,
	critic: 89,
	released: '2018-05-25',
	playWithIds: [],
	playWithNames: [],
	logo: null,
	hero: null,
	cover: null,
	comment: '',
	favorite: false,
	...overrides,
})

const allGames = [
	game({ id: 1, name: 'Dark Souls', favorite: false }),
	game({ id: 2, name: 'Hollow Knight', favorite: true, grade: 92, critic: null, released: '2017-02-24' }),
	game({ id: 3, name: 'Celeste', statusId: 2, statusName: 'Pendiente', favorite: false, grade: 88, critic: null, released: '2018-01-25' }),
]

const paged = (data: Array<Record<string, unknown>>) => ({
	data,
	page: 1,
	pageSize: 200,
	totalCount: data.length,
	totalPages: 1,
	hasNextPage: false,
	hasPreviousPage: false,
})

describe('Favorites journeys', () => {
	before(() => {
		Cypress.on('uncaught:exception', (error) => {
			if (error.message.includes('Failed to fetch public game views') || error.message.includes('Request cancelled')) {
				return false
			}
		})
	})

	beforeEach(() => {
		cy.login('Admin')
		cy.mockApiRoutes()
		cy.intercept('GET', `${API}/gameviews*`, []).as('getPublicGameViews')
	})

	it('marks a game as favorite from the card quick action', () => {
		cy.intercept('GET', `${API}/games*`, paged(allGames)).as('getGames')
		cy.intercept('PUT', `${API}/games/1`, { statusCode: 200, body: null }).as('updateFavorite')
		cy.intercept('GET', `${API}/games/1*`, game({ id: 1, name: 'Dark Souls', favorite: true })).as('getUpdatedGame')

		cy.visit('/')
		cy.wait('@getGames')

		cy.contains('.game-card-view-container', 'Dark Souls').trigger('mouseover').within(() => {
			cy.findByLabelText('Mark as favorite').click({ force: true })
		})

		cy.wait('@updateFavorite').its('request.body').should('deep.include', { favorite: true })
		cy.wait('@getUpdatedGame')
		cy.contains('.game-card-view-container', 'Dark Souls').find('[aria-label="Remove from favorites"]').should('have.attr', 'aria-pressed', 'true')
	})

	it('filters the list to favorite games only', () => {
		cy.intercept('GET', `${API}/games*`, (req) => {
			const url = new URL(req.url)
			const favorite = url.searchParams.get('favorite')
			if (favorite === 'true') req.alias = 'getFavoriteGames'
			req.reply(paged(favorite === 'true' ? allGames.filter((g) => g.favorite === true) : allGames))
		}).as('getFavoriteFilteredGames')

		cy.visit('/')
		cy.wait('@getFavoriteFilteredGames')
		cy.get('.game-filters-chips__advanced-btn').click()
		cy.contains('button.game-filters-chips__chip', 'Favorite:').click()
		cy.contains('.game-filters-chips__option', 'Favorites').click()

		cy.wait('@getFavoriteGames').then((interception) => {
			expect(interception.request.url).to.include('favorite=true')
		})
		cy.contains('Hollow Knight').should('be.visible')
		cy.contains('Dark Souls').should('not.exist')
		cy.contains('Celeste').should('not.exist')
	})

	it('creates a favorites GameView from the template with secondary sorting', () => {
		cy.intercept('GET', `${API}/gameviews*`, []).as('getGameViews')
		cy.intercept('POST', `${API}/gameviews`, (req) => {
			expect(req.body.name).to.eq('Favoritos (nota)')
			expect(req.body.configuration.filterGroups[0].filters[0]).to.deep.include({ field: 'Favorite', operator: 'Equals', value: true })
			expect(req.body.configuration.sorting[0]).to.deep.include({ field: 'Favorite', direction: 'Descending', order: 1 })
			expect(req.body.configuration.sorting[1]).to.deep.include({ field: 'EffectiveGrade', direction: 'Descending', order: 2 })
			req.reply({ statusCode: 201, body: { id: 10, ...req.body } })
		}).as('createFavoriteView')

		cy.visit('/#/admin/game-views')
		cy.wait('@getGameViews')
		cy.contains('h1', 'Game Views Management').should('be.visible')
		cy.contains('button', 'Templates').click()
		cy.contains('.template-card', 'Favorites').click()
		cy.get('select').select('grade')
		cy.contains('button', 'Create View').click()

		cy.wait('@createFavoriteView')
	})
})
