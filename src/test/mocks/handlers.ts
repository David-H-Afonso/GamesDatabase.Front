import { http, HttpResponse } from 'msw'

const API_BASE = 'https://localhost:7245/api'

/**
 * Default MSW handlers for all API endpoints.
 * Each handler returns a minimal successful response.
 * Override in individual tests with `server.use(...)` for specific scenarios.
 */
export const handlers = [
	// ─── Games ───────────────────────────────────────────────
	http.get(`${API_BASE}/games`, () => {
		return HttpResponse.json({
			data: [],
			totalCount: 0,
			page: 1,
			pageSize: 50,
			totalPages: 0,
			hasNextPage: false,
			hasPreviousPage: false,
		})
	}),

	http.get(`${API_BASE}/games/:id`, ({ params }) => {
		return HttpResponse.json({
			id: Number(params.id),
			name: 'Test Game',
			statusId: 1,
			playWithIds: [],
			playWithNames: [],
		})
	}),

	http.post(`${API_BASE}/games`, async ({ request }) => {
		const body = (await request.json()) as Record<string, unknown>
		return HttpResponse.json({ id: 1, ...body }, { status: 201 })
	}),

	http.put(`${API_BASE}/games/:id`, async ({ request, params }) => {
		const body = (await request.json()) as Record<string, unknown>
		return HttpResponse.json({ id: Number(params.id), ...body })
	}),

	http.delete(`${API_BASE}/games/:id`, () => {
		return new HttpResponse(null, { status: 204 })
	}),

	// ─── Game Status ─────────────────────────────────────────
	http.get(`${API_BASE}/gamestatus`, () => {
		return HttpResponse.json({
			data: [],
			totalCount: 0,
			page: 1,
			pageSize: 50,
			totalPages: 0,
			hasNextPage: false,
			hasPreviousPage: false,
		})
	}),

	http.get(`${API_BASE}/gamestatus/active`, () => {
		return HttpResponse.json([])
	}),

	http.get(`${API_BASE}/gamestatus/special`, () => {
		return HttpResponse.json([])
	}),

	http.post(`${API_BASE}/gamestatus`, async ({ request }) => {
		const body = (await request.json()) as Record<string, unknown>
		return HttpResponse.json({ id: 1, ...body }, { status: 201 })
	}),

	http.put(`${API_BASE}/gamestatus/:id`, async ({ request, params }) => {
		const body = (await request.json()) as Record<string, unknown>
		return HttpResponse.json({ id: Number(params.id), ...body })
	}),

	http.delete(`${API_BASE}/gamestatus/:id`, () => {
		return new HttpResponse(null, { status: 204 })
	}),

	http.put(`${API_BASE}/gamestatus/reorder`, () => {
		return new HttpResponse(null, { status: 204 })
	}),

	// ─── Game Platforms ──────────────────────────────────────
	http.get(`${API_BASE}/gameplatforms`, () => {
		return HttpResponse.json({
			data: [],
			totalCount: 0,
			page: 1,
			pageSize: 50,
			totalPages: 0,
			hasNextPage: false,
			hasPreviousPage: false,
		})
	}),

	http.get(`${API_BASE}/gameplatforms/active`, () => {
		return HttpResponse.json([])
	}),

	http.post(`${API_BASE}/gameplatforms`, async ({ request }) => {
		const body = (await request.json()) as Record<string, unknown>
		return HttpResponse.json({ id: 1, ...body }, { status: 201 })
	}),

	http.put(`${API_BASE}/gameplatforms/:id`, async ({ request, params }) => {
		const body = (await request.json()) as Record<string, unknown>
		return HttpResponse.json({ id: Number(params.id), ...body })
	}),

	http.delete(`${API_BASE}/gameplatforms/:id`, () => {
		return new HttpResponse(null, { status: 204 })
	}),

	http.put(`${API_BASE}/gameplatforms/reorder`, () => {
		return new HttpResponse(null, { status: 204 })
	}),

	// ─── Game Play With ──────────────────────────────────────
	http.get(`${API_BASE}/gameplaywith`, () => {
		return HttpResponse.json({
			data: [],
			totalCount: 0,
			page: 1,
			pageSize: 50,
			totalPages: 0,
			hasNextPage: false,
			hasPreviousPage: false,
		})
	}),

	http.get(`${API_BASE}/gameplaywith/active`, () => {
		return HttpResponse.json([])
	}),

	http.post(`${API_BASE}/gameplaywith`, async ({ request }) => {
		const body = (await request.json()) as Record<string, unknown>
		return HttpResponse.json({ id: 1, ...body }, { status: 201 })
	}),

	http.put(`${API_BASE}/gameplaywith/:id`, async ({ request, params }) => {
		const body = (await request.json()) as Record<string, unknown>
		return HttpResponse.json({ id: Number(params.id), ...body })
	}),

	http.delete(`${API_BASE}/gameplaywith/:id`, () => {
		return new HttpResponse(null, { status: 204 })
	}),

	http.put(`${API_BASE}/gameplaywith/reorder`, () => {
		return new HttpResponse(null, { status: 204 })
	}),

	// ─── Game Played Status ──────────────────────────────────
	http.get(`${API_BASE}/gameplayedstatus`, () => {
		return HttpResponse.json({
			data: [],
			totalCount: 0,
			page: 1,
			pageSize: 50,
			totalPages: 0,
			hasNextPage: false,
			hasPreviousPage: false,
		})
	}),

	http.get(`${API_BASE}/gameplayedstatus/active`, () => {
		return HttpResponse.json([])
	}),

	http.post(`${API_BASE}/gameplayedstatus`, async ({ request }) => {
		const body = (await request.json()) as Record<string, unknown>
		return HttpResponse.json({ id: 1, ...body }, { status: 201 })
	}),

	http.put(`${API_BASE}/gameplayedstatus/:id`, async ({ request, params }) => {
		const body = (await request.json()) as Record<string, unknown>
		return HttpResponse.json({ id: Number(params.id), ...body })
	}),

	http.delete(`${API_BASE}/gameplayedstatus/:id`, () => {
		return new HttpResponse(null, { status: 204 })
	}),

	http.put(`${API_BASE}/gameplayedstatus/reorder`, () => {
		return new HttpResponse(null, { status: 204 })
	}),

	// ─── Game Views ──────────────────────────────────────────
	http.get(`${API_BASE}/gameviews`, () => {
		return HttpResponse.json({
			data: [],
			totalCount: 0,
			page: 1,
			pageSize: 50,
			totalPages: 0,
			hasNextPage: false,
			hasPreviousPage: false,
		})
	}),

	http.post(`${API_BASE}/gameviews`, async ({ request }) => {
		const body = (await request.json()) as Record<string, unknown>
		return HttpResponse.json({ id: 1, ...body }, { status: 201 })
	}),

	http.put(`${API_BASE}/gameviews/:id`, async ({ request, params }) => {
		const body = (await request.json()) as Record<string, unknown>
		return HttpResponse.json({ id: Number(params.id), ...body })
	}),

	http.delete(`${API_BASE}/gameviews/:id`, () => {
		return new HttpResponse(null, { status: 204 })
	}),

	// ─── Game Replay Types ───────────────────────────────────
	http.get(`${API_BASE}/gamereplaytypes`, () => {
		return HttpResponse.json({
			data: [],
			totalCount: 0,
			page: 1,
			pageSize: 50,
			totalPages: 0,
			hasNextPage: false,
			hasPreviousPage: false,
		})
	}),

	http.get(`${API_BASE}/gamereplaytypes/active`, () => {
		return HttpResponse.json([])
	}),

	http.get(`${API_BASE}/gamereplaytypes/special`, () => {
		return HttpResponse.json([])
	}),

	http.post(`${API_BASE}/gamereplaytypes`, async ({ request }) => {
		const body = (await request.json()) as Record<string, unknown>
		return HttpResponse.json({ id: 1, ...body }, { status: 201 })
	}),

	http.put(`${API_BASE}/gamereplaytypes/:id`, async ({ request, params }) => {
		const body = (await request.json()) as Record<string, unknown>
		return HttpResponse.json({ id: Number(params.id), ...body })
	}),

	http.delete(`${API_BASE}/gamereplaytypes/:id`, () => {
		return new HttpResponse(null, { status: 204 })
	}),

	http.put(`${API_BASE}/gamereplaytypes/reorder`, () => {
		return new HttpResponse(null, { status: 204 })
	}),

	// ─── Game Replays ────────────────────────────────────────
	http.get(`${API_BASE}/games/:gameId/replays`, () => {
		return HttpResponse.json([])
	}),

	http.post(`${API_BASE}/games/:gameId/replays`, async ({ request }) => {
		const body = (await request.json()) as Record<string, unknown>
		return HttpResponse.json({ id: 1, ...body }, { status: 201 })
	}),

	http.put(`${API_BASE}/games/:gameId/replays/:id`, async ({ request, params }) => {
		const body = (await request.json()) as Record<string, unknown>
		return HttpResponse.json({ id: Number(params.id), ...body })
	}),

	http.delete(`${API_BASE}/games/:gameId/replays/:id`, () => {
		return new HttpResponse(null, { status: 204 })
	}),

	// ─── Game History ────────────────────────────────────────
	http.get(`${API_BASE}/games/:gameId/history`, () => {
		return HttpResponse.json({
			data: [],
			totalCount: 0,
			page: 1,
			pageSize: 50,
			totalPages: 0,
			hasNextPage: false,
			hasPreviousPage: false,
		})
	}),

	http.get(`${API_BASE}/games/history`, () => {
		return HttpResponse.json({
			data: [],
			totalCount: 0,
			page: 1,
			pageSize: 50,
			totalPages: 0,
			hasNextPage: false,
			hasPreviousPage: false,
		})
	}),

	// ─── Auth / Users ────────────────────────────────────────
	http.post(`${API_BASE}/users/login`, async ({ request }) => {
		const body = (await request.json()) as Record<string, unknown>
		return HttpResponse.json({
			userId: 1,
			username: body.username ?? 'testuser',
			role: 'Admin',
			token: 'mock-jwt-token',
		})
	}),

	http.get(`${API_BASE}/users`, () => {
		return HttpResponse.json([])
	}),

	http.post(`${API_BASE}/users`, async ({ request }) => {
		const body = (await request.json()) as Record<string, unknown>
		return HttpResponse.json({ id: 1, ...body }, { status: 201 })
	}),

	http.put(`${API_BASE}/users/:id`, async ({ request, params }) => {
		const body = (await request.json()) as Record<string, unknown>
		return HttpResponse.json({ id: Number(params.id), ...body })
	}),

	http.delete(`${API_BASE}/users/:id`, () => {
		return new HttpResponse(null, { status: 204 })
	}),

	// ─── Data Export ─────────────────────────────────────────
	http.get(`${API_BASE}/DataExport/games/csv`, () => {
		return new HttpResponse('id,name\n1,Test', {
			headers: { 'Content-Type': 'text/csv' },
		})
	}),

	http.get(`${API_BASE}/DataExport/full`, () => {
		return HttpResponse.json({})
	}),

	http.post(`${API_BASE}/DataExport/full`, () => {
		return HttpResponse.json({ success: true })
	}),
]
