import { setupServer } from 'msw/node'
import { handlers } from './handlers'

/**
 * MSW server for Vitest tests.
 * Started/stopped automatically in src/test/setup.ts.
 *
 * Override handlers per test:
 *   server.use(http.get('/api/games', () => HttpResponse.json([])))
 */
export const server = setupServer(...handlers)
