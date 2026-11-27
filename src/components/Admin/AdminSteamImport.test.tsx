import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import i18n from '@/i18n'
import { AdminSteamImport } from './AdminSteamImport'
import type { SteamLibraryGame } from '@/services/SteamService/SteamService'

const mocks = vi.hoisted(() => ({ getLibrary: vi.fn(), getProfile: vi.fn(), importGames: vi.fn() }))
vi.mock('@/services/SteamService/SteamService', async importOriginal => ({ ...await importOriginal<typeof import('@/services/SteamService/SteamService')>(), steamService: mocks }))
vi.mock('./useSteamSyncJob', () => ({ useSteamSyncJob: () => ({ busy: false, job: null, checking: false, starting: false, errorKey: null, refresh: vi.fn(), start: vi.fn() }) }))
vi.mock('./SteamSyncPanel', () => ({ SteamSyncPanel: () => null }))
vi.mock('@/components/Collection/SteamDateReview', () => ({ SteamDateReview: () => null }))
let library: SteamLibraryGame[]
const imported = (id: number) => ({ success: true, created: 1, linked: 0, skipped: 0, importedGames: [{ appId: id, gdbGameId: id + 100, name: `Game ${String(id).padStart(3, '0')}`, action: 'created' }] })
const open = async () => {
 renderWithProviders(<AdminSteamImport />, { preloadedState: { auth: { user: { id: 2, username: 'Synthetic owner', role: 'Standard', steamId: '76561198000000000' }, token: 'fixture', refreshToken: null, isAuthenticated: true, loading: false, error: null } } })
 await userEvent.click(screen.getByRole('button', { name: i18n.t('admin.steam.tabsLibrary') }))
 await screen.findByRole('button', { name: 'Game 001' })
}
describe('Steam library visible selection and direct creation', () => {
 beforeEach(async () => {
  vi.clearAllMocks(); await i18n.changeLanguage('en')
  library = Array.from({ length: 55 }, (_, index) => ({ appId: index + 1, name: `Game ${String(index + 1).padStart(3, '0')}`, playtimeForever: 60, ...(index === 1 ? { gdbGameId: 99 } : {}) }))
  mocks.getLibrary.mockImplementation(async () => library); mocks.getProfile.mockResolvedValue({ steamId: '76561198000000000', steamNickname: 'Synthetic owner' }); mocks.importGames.mockResolvedValue(imported(1))
 })
 it('selects only the current page and never includes already imported or next-page games', async () => {
  await open(); await userEvent.click(screen.getByRole('button', { name: 'Select visible only' }))
  await userEvent.click(screen.getByRole('button', { name: /^Apply/ }))
  await waitFor(() => expect(mocks.importGames).toHaveBeenCalledOnce())
  expect(mocks.importGames).toHaveBeenCalledWith({ appIds: Array.from({ length: 50 }, (_, index) => index + 1).filter(id => id !== 2), createMissing: true })
 })
 it('replaces hidden bulk actions with just the filtered visible results', async () => {
  await open(); await userEvent.click(screen.getByRole('button', { name: 'Select all not imported' }))
  await userEvent.type(screen.getByPlaceholderText('Search by name...'), 'Game 05')
  await userEvent.click(screen.getByRole('button', { name: 'Select visible only' })); await userEvent.click(screen.getByRole('button', { name: /^Apply/ }))
  await waitFor(() => expect(mocks.importGames).toHaveBeenCalledWith({ appIds: [50, 51, 52, 53, 54, 55], createMissing: true }))
 })
 it('clicking the game creates only that app once, leaves other choices alone and disables an already imported game', async () => {
  let resolve!: (value: ReturnType<typeof imported>) => void
  mocks.importGames.mockReturnValueOnce(new Promise<ReturnType<typeof imported>>(yes => { resolve = yes }))
  await open(); await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Import action for Game 003' }), 'create')
  const button = screen.getByRole('button', { name: 'Game 001' })
  act(() => { fireEvent.click(button); fireEvent.click(button) })
  expect(mocks.importGames).toHaveBeenCalledExactlyOnceWith({ appIds: [1], createMissing: true })
  library = library.map(game => game.appId === 1 ? { ...game, gdbGameId: 101 } : game)
  await act(async () => { resolve(imported(1)) })
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Game 001' })).not.toBeInTheDocument())
  expect(screen.queryByRole('button', { name: 'Game 002' })).not.toBeInTheDocument()
  expect(screen.getByRole('combobox', { name: 'Import action for Game 003' })).toHaveValue('create')
 })
 it('keeps a failed direct creation retryable and never retries a write automatically', async () => {
  mocks.importGames.mockRejectedValueOnce(new Error('Synthetic refused import'))
  await open(); await userEvent.click(screen.getByRole('button', { name: 'Game 001' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not confirm the game was added')
  expect(screen.getByRole('button', { name: 'Game 001' })).toBeEnabled(); expect(mocks.importGames).toHaveBeenCalledOnce()
 })
})
