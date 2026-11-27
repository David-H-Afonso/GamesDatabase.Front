import { API, LIBRARY, games, firstGame } from '../support/fixtures'
import { metadataJob, metadataJobItem } from '../../src/test/factories/metadataJob'
import type { MetadataAutofillJob, MetadataJobItemStatus, MetadataJobStart } from '../../src/models/api/MetadataAutofillJob'

const JOB_ID = '11111111-1111-4111-8111-111111111111'
const select = (...positions: number[]) => {
	cy.visit(LIBRARY); cy.wait('@getGames'); cy.get('.gdb-select-mode').click()
	for (const position of positions) cy.get('.gdb-game-select-target').eq(position).click('center').find('input').should('be.checked')
}
const proposal = (id: number) => ({ overwrite: false, reviewVersion: 2, token: `fixture-metadata-plan-${id}`, matches: [], fields: [{ field: 'developer', current: null, value: `Verified studio ${id}`, source: 'steam', url: 'https://store.steampowered.com/app/100/' }], notices: [] })
const installJobs = (statuses: MetadataJobItemStatus[] = ['updated', 'updated'], active = false) => {
	let current: MetadataAutofillJob | null = null
	const starts: MetadataJobStart[] = [], actions: string[] = []
	const update = (items: MetadataAutofillJob['items'], override: Partial<MetadataAutofillJob> = {}) => {
		current = metadataJob({ ...current!, items, revision: (current?.revision ?? 0) + 1, totalGames: items.length,
			processedGames: items.filter(item => !['pending', 'looking', 'waiting', 'cancelled'].includes(item.status)).length,
			updatedGames: items.filter(item => item.status === 'updated').length, unchangedGames: items.filter(item => item.status === 'unchanged').length,
			reviewGames: items.filter(item => item.status === 'review').length, failedGames: items.filter(item => item.status === 'failed').length,
			partialGames: items.filter(item => item.status === 'partial').length, cancelledGames: items.filter(item => item.status === 'cancelled').length, ...override })
	}
	cy.intercept('GET', `${API}/metadata-autofill/jobs/current*`, request => request.reply({ statusCode: 200, body: current ?? 'null', headers: { 'content-type': 'application/json' } })).as('currentJob')
	cy.intercept('GET', `${API}/metadata-autofill/jobs?*`, request => request.reply(current ? [{ ...current, items: [] }] : [])).as('jobHistory')
	cy.intercept('GET', `${API}/metadata-autofill/jobs/${JOB_ID}`, request => request.reply(current)).as('jobDetails')
	cy.intercept('POST', `${API}/metadata-autofill/jobs`, request => {
		starts.push(request.body)
		current = metadataJob({ id: JOB_ID, clientRequestId: request.body.clientRequestId, overwrite: request.body.overwrite, acceptListedPlatformCritic: request.body.acceptListedPlatformCritic, state: active ? 'running' : 'completed', active,
			items: request.body.gameIds.map((id: number, index: number) => metadataJobItem({ gameId: id, name: games.find(game => game.id === id)?.name ?? `Imported fixture ${id}`, status: statuses[index] ?? 'updated', appliedFields: statuses[index] === 'review' || statuses[index] === 'failed' || active ? [] : ['developer'], notices: statuses[index] === 'review' ? ['chooseDurationIdentity'] : statuses[index] === 'failed' ? ['durationSourceUnavailable'] : [] })) })
		request.reply({ statusCode: 202, body: current })
	}).as('startJob')
	cy.intercept('POST', `${API}/metadata-autofill/jobs/${JOB_ID}/retry`, request => {
		actions.push('retry'); update(current!.items.map(item => ['failed', 'partial', 'cancelled'].includes(item.status) ? { ...item, status: 'updated', appliedFields: ['developer'], notices: [] } : item), { active: false, state: 'completed' }); request.reply(current)
	}).as('retryJob')
	cy.intercept('POST', `${API}/metadata-autofill/jobs/${JOB_ID}/cancel`, request => {
		actions.push('cancel'); update(current!.items.map(item => ['pending', 'looking', 'waiting'].includes(item.status) ? { ...item, status: 'cancelled' } : item), { active: false, state: 'cancelled' }); request.reply(current)
	}).as('cancelJob')
	return { starts, actions, read: () => current, resolve: (id: number) => update(current!.items.map(item => item.gameId === id ? { ...item, status: 'updated', appliedFields: ['developer'], notices: [] } : item)) }
}

describe('Durable exact-scope metadata jobs (isolated UI contracts)', () => {
	beforeEach(() => { cy.login('Admin'); cy.mockApiRoutes() })
	it('submits only selected IDs; the browser never performs the server-owned per-game writes', () => {
		const server = installJobs()
		cy.intercept('POST', /\/api\/games\/\d+\/metadata\/(preview|apply)$/, () => { throw new Error('A server-owned batch must not execute per-game requests in the browser') })
		select(0, 2); cy.findByRole('button', { name: 'Autofill', exact: true }).click(); cy.wait('@startJob').its('request.body').should('deep.include', { gameIds: [1, 3], overwrite: false, acceptListedPlatformCritic: false })
		cy.get('dialog.gdb-metadata-job-sheet').should('contain.text', '2 of 2 processed'); cy.findByRole('button', { name: 'Close details' }).click()
		cy.get('.gdb-bulk-toolbar__count').should('contain.text', '2'); cy.then(() => expect(server.starts).to.have.length(1))
	})
	it('confirms Replace once with platform disclosure and uses the best reliable batch policy', () => {
		const server = installJobs(['updated'])
		select(0); cy.findByRole('checkbox', { name: 'Replace existing metadata' }).check()
		cy.findByRole('alertdialog').should('contain.text', 'another platform'); cy.then(() => expect(server.starts).to.have.length(0))
		cy.findByRole('button', { name: 'Enable Replace' }).click(); cy.findByRole('checkbox', { name: 'Replace existing metadata' }).should('be.checked')
		cy.then(() => expect(server.starts).to.have.length(0)); cy.findByRole('button', { name: 'Autofill', exact: true }).click()
		cy.wait('@startJob').its('request.body').should('deep.include', { gameIds: [1], overwrite: true, acceptListedPlatformCritic: true })
		cy.get('dialog.gdb-metadata-job-sheet').should('contain.text', 'best reliable match')
	})
	it('retries only unfinished metadata through the same job, never reimports or resubmits the batch', () => {
		const server = installJobs(['failed', 'updated'])
		select(0, 1); cy.findByRole('button', { name: 'Autofill', exact: true }).click(); cy.wait('@startJob')
		cy.get('.gdb-metadata-job-results > li[data-state="failed"]').should('contain.text', firstGame.name)
		cy.get('.gdb-metadata-job-results > li[data-state="updated"]').should('contain.text', games[1].name)
		cy.findByRole('button', { name: 'Retry unfinished information' }).click(); cy.wait('@retryJob')
		cy.get('.gdb-metadata-job-results > li[data-state="updated"]').should('have.length', 2)
		cy.then(() => { expect(server.starts).to.have.length(1); expect(server.actions).to.deep.equal(['retry']) })
	})
	it('continues across navigation and reload without opening a blocking modal or starting another job', () => {
		const server = installJobs(['looking', 'pending'], true)
		select(0, 1); cy.findByRole('button', { name: 'Autofill', exact: true }).click(); cy.wait('@startJob')
		cy.findByRole('button', { name: 'Continue in background' }).click(); cy.get('dialog.gdb-metadata-job-sheet[open]').should('not.exist')
		cy.findByRole('link', { name: 'Home', exact: true }).click(); cy.get('.gdb-metadata-job-notice').should('contain.text', 'Runs on the server')
		cy.reload(); cy.wait('@currentJob'); cy.get('.gdb-metadata-job-notice').should('contain.text', '0 of 2 processed'); cy.get('dialog.gdb-metadata-job-sheet[open]').should('not.exist')
		cy.get('.gdb-metadata-job-notice').contains('button', 'View details').click(); cy.get('dialog.gdb-metadata-job-sheet[open]').should('be.visible')
		cy.then(() => { expect(server.starts).to.have.length(1); expect(server.actions).to.deep.equal([]) })
	})
	it('only explicit cancellation stops remaining work and retains already saved results', () => {
		const server = installJobs(['updated', 'looking'], true)
		select(0, 1); cy.findByRole('button', { name: 'Autofill', exact: true }).click(); cy.wait('@startJob'); cy.findByRole('button', { name: 'Continue in background' }).click()
		cy.then(() => expect(server.actions).to.deep.equal([])); cy.get('.gdb-metadata-job-notice').contains('button', 'Cancel autofill').click(); cy.wait('@cancelJob')
		cy.get('.gdb-metadata-job-notice').contains('button', 'View details').click(); cy.get('.gdb-metadata-job-results > li[data-state="updated"]').should('have.length', 1); cy.get('.gdb-metadata-job-results > li[data-state="cancelled"]').should('have.length', 1)
		cy.then(() => expect(server.actions).to.deep.equal(['cancel']))
	})
	it('resolves two different pending games without losing results after the first review', () => {
		const server = installJobs(['review', 'review'])
		cy.intercept('POST', /\/api\/games\/\d+\/metadata\/preview$/, request => { const id = Number(new URL(request.url).pathname.split('/')[3]); expect(request.body.bestMatch).to.equal(true); request.reply(proposal(id)) }).as('manualJobLookup')
		cy.intercept('POST', /\/api\/metadata-autofill\/jobs\/[^/]+\/items\/\d+\/review$/, request => {
			const id = Number(new URL(request.url).pathname.split('/').at(-2)); expect(request.body).to.deep.equal({ token: `fixture-metadata-plan-${id}`, fields: ['developer'] }); server.resolve(id)
			request.reply({ game: { ...games.find(game => game.id === id), developer: `Verified studio ${id}` }, appliedFields: ['developer'], unchangedFields: [] })
		}).as('manualJobSave')
		select(0, 1); cy.findByRole('button', { name: 'Autofill', exact: true }).click(); cy.wait('@startJob')
		for (const game of games.slice(0, 2)) {
			cy.findByRole('button', { name: `Review ${game.name}`, exact: true }).click(); cy.get('dialog.gdb-metadata-sheet').should('contain.text', game.name)
			cy.findByRole('button', { name: 'Look up information', exact: true }).click(); cy.wait('@manualJobLookup'); cy.findByRole('button', { name: /Save selected fields/ }).click(); cy.wait('@manualJobSave')
			cy.get('dialog.gdb-metadata-job-sheet').should('be.visible'); cy.hash().should('eq', '#/library')
		}
		cy.get('.gdb-metadata-job-results > li[data-state="review"]').should('not.exist'); cy.get('.gdb-metadata-job-results > li[data-state="updated"]').should('have.length', 2)
	})
	it('starts a durable empty-only job after one confirmed Steam import and preserves the per-account Steam choice', () => {
		let imports = 0; const server = installJobs(['updated'])
		const imported = { ...firstGame, id: 99, name: 'Steam import fixture', steamAppId: 100, developer: null }
		cy.intercept('GET', `${API}/steam/library`, [])
		cy.intercept('GET', `${API}/steam/store/search*`, [{ appId: 100, name: imported.name, heroUrl: '/sample-artwork/amber-hero.svg', coverUrl: '/sample-artwork/amber-cover.svg' }])
		cy.intercept('POST', `${API}/steam/import`, request => { imports++; expect(request.body).to.deep.equal({ games: [{ appId: 100, heroUrl: '/sample-artwork/amber-hero.svg', coverUrl: '/sample-artwork/amber-cover.svg' }], createMissing: true }); request.reply({ success: true, created: 1, linked: 0, skipped: 0, importedGames: [{ appId: 100, name: imported.name, gdbGameId: 99, action: 'created' }] }) }).as('steamImport')
		cy.intercept('PATCH', `${API}/games/bulk`, request => { expect(request.body.gameIds).to.deep.equal([99]); request.reply({ updatedCount: 1, totalRequested: 1 }) }).as('importSettings')
		cy.visit(LIBRARY, { onBeforeLoad(win) { const state = JSON.parse(win.localStorage.getItem('persist:root')!); const auth = JSON.parse(state.auth); auth.user.steamId = '76561198000000000'; state.auth = JSON.stringify(auth); win.localStorage.setItem('persist:root', JSON.stringify(state)) } }); cy.wait('@getGames')
		cy.get('.gdb-header__add').click(); cy.findByRole('textbox', { name: 'Title' }).should('be.focused'); cy.findByRole('checkbox', { name: 'Try to autofill info after import' }).should('not.be.checked'); cy.findByRole('button', { name: 'Search Steam' }).click(); cy.findByRole('textbox', { name: 'Title' }).type('Steam')
		cy.findByRole('button', { name: /Steam import fixture.*Store/ }).click(); cy.findByRole('checkbox', { name: 'Try to autofill info after import' }).check(); cy.get('button[type="submit"][form="gdb-create-game-form"]').click()
		cy.wait('@steamImport'); cy.wait('@importSettings'); cy.wait('@startJob').its('request.body').should('deep.include', { gameIds: [99], overwrite: false, acceptListedPlatformCritic: false })
		cy.findByRole('button', { name: 'Close details' }).click(); cy.then(() => { expect(imports).to.equal(1); expect(server.starts).to.have.length(1) })
		cy.reload(); cy.wait('@getGames'); cy.get('.gdb-header__add').click(); cy.findByRole('textbox', { name: 'Title' }).should('be.focused'); cy.findByRole('button', { name: 'Search Steam' }).should('have.attr', 'aria-pressed', 'true').click(); cy.get('dialog.gdb-create-game-sheet').contains('button', /^Cancel$/).click()
		cy.reload(); cy.wait('@getGames'); cy.get('.gdb-header__add').click(); cy.findByRole('button', { name: 'Search Steam' }).should('have.attr', 'aria-pressed', 'false')
	})
})
