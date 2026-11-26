import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import type { HomeConfig, HomeRow } from '@/models/api/Collection'
import i18n from '@/i18n'
import CollectionHome from './CollectionHome'

const mocks = vi.hoisted(() => ({ config: vi.fn(), resolve: vi.fn(), save: vi.fn() }))
vi.mock('@/services/CollectionService/CollectionService', () => ({ getHomeConfig: mocks.config, resolveHomeRows: mocks.resolve, saveHomeConfig: mocks.save }))
vi.mock('@/services/PlaylistService/PlaylistService', () => ({ getPlaylists: vi.fn().mockResolvedValue([]), previewPlaylist: vi.fn().mockResolvedValue({ totalMatches: 0, returnedCount: 0, games: [] }) }))
vi.mock('@/services/GameViewService/GameViewService', () => ({ getGameViews: vi.fn().mockResolvedValue([]) }))
vi.mock('@/services/GamesService/GamesService', () => ({ getGamesSummary: vi.fn().mockResolvedValue({ totalGames: 0 }) }))
vi.mock('./CollectionGameDetailsLazy', () => ({ CollectionGameDetails: () => null }))
const auth = { user: { id: 1, username: 'test', role: 'Admin' }, token: 'test', refreshToken: null, isAuthenticated: true, loading: false, error: null } as const

const customize = async () => {
	renderWithProviders(<CollectionHome />, { preloadedState: { auth } })
	await waitFor(() => expect(screen.getByRole('button', { name: 'Customize' })).toBeEnabled())
	await userEvent.click(screen.getByRole('button', { name: 'Customize' }))
	const dialog = within(screen.getByRole('dialog', { name: 'Customize home' }))
	await waitFor(() => expect(dialog.getByRole('button', { name: 'Add row' })).toBeEnabled())
	await userEvent.click(dialog.getByRole('button', { name: 'Add row' }))
}

describe('Home templates preserve the two-level draft', () => {
	beforeEach(async () => {
		vi.clearAllMocks(); await i18n.changeLanguage('en')
		mocks.config.mockResolvedValue({ version: 1, revision: 7, rows: [] })
		mocks.resolve.mockImplementation(async (rows: HomeRow[]) => rows.map(row => ({ rowId: row.id, state: 'empty', totalMatches: 0, returnedCount: 0, hasMore: false, items: [] })))
		mocks.save.mockImplementation(async (config: HomeConfig) => ({ ...config, revision: config.revision + 1 }))
	})
	it('adds an editable favorite row to the draft, never creates a playlist, and persists only on Save home', async () => {
		await customize()
		await userEvent.click(screen.getByRole('button', { name: 'Use Your favorite games template' }))
		const row = within(screen.getByRole('dialog', { name: 'Configure row' }))
		expect(row.getByLabelText('Row title')).toHaveValue('Your favorite games')
		expect(row.getByLabelText('What would you like to show?')).toHaveValue('filter')
		fireEvent.change(row.getByLabelText('Row title'), { target: { value: 'My personal favorites' } })
		expect(mocks.save).not.toHaveBeenCalled()
		await userEvent.click(row.getByRole('button', { name: 'Save row' }))
		expect(mocks.save).not.toHaveBeenCalled()
		await userEvent.click(screen.getByRole('button', { name: 'Save home' }))
		await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce())
		expect(mocks.save.mock.calls[0][0]).toMatchObject({ version: 1, revision: 7, rows: [{ title: 'My personal favorites', source: { kind: 'filter', rules: { favorite: true } } }] })
	})
	it('keeps upcoming membership unlimited and leaves saved Home unchanged on Cancel', async () => {
		await customize()
		await userEvent.click(screen.getByRole('button', { name: 'Use Upcoming releases template' }))
		const row = within(screen.getByRole('dialog', { name: 'Configure row' }))
		expect(row.getByText(/Release date from today/)).toBeInTheDocument()
		await userEvent.click(row.getByRole('button', { name: 'Save row' }))
		await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
		expect(mocks.save).not.toHaveBeenCalled()
		await expect(mocks.config.mock.results[0].value).resolves.toEqual({ version: 1, revision: 7, rows: [] })
	})
	it('uses the dedicated semantic Playing source and does not change it into a Focus playlist', async () => {
		await customize()
		await userEvent.click(screen.getByRole('button', { name: 'Use Playing now template' }))
		const row = within(screen.getByRole('dialog', { name: 'Configure row' }))
		expect(row.getByLabelText('What would you like to show?')).toHaveValue('playingNow')
		expect(row.getByLabelText('Feature one game in the spotlight')).toBeChecked()
		await userEvent.click(row.getByRole('button', { name: 'Save row' }))
		await userEvent.click(screen.getByRole('button', { name: 'Save home' }))
		await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce())
		expect(mocks.save.mock.calls[0][0].rows[0].source).toEqual({ kind: 'playingNow' })
	})
})
