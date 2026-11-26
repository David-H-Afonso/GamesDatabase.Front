import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { createTestStore } from '@/test/utils/createTestStore'
import { createGame, createGameStatus, createGamePlatform, createGamePlayedStatus, createGamePlayWith } from '@/test/factories'
import type { Game } from '@/models/api/Game'
import type { SteamArtwork } from '@/models/api/SteamArtwork'
import i18n from '@/i18n'
import { CollectionGameEditor } from './CollectionGameEditor'

const mocks = vi.hoisted(() => ({ assets: vi.fn(), preload: vi.fn(), sync: vi.fn() }))
vi.mock('@/services/SteamService/SteamService', () => ({ steamService: { getAppArtwork: mocks.assets, syncGame: mocks.sync } }))
vi.mock('@/utils/artworkImage', async importOriginal => ({ ...await importOriginal<typeof import('@/utils/artworkImage')>(), preloadArtwork: mocks.preload }))

const game = createGame({ id: 501, name: 'Dark Souls', platformId: 2, platformName: 'Steam', statusId: 1, statusName: 'Playing', playedStatusId: 1, playedStatusName: 'Finished', playWithIds: [1], playWithNames: ['Solo'], released: '2011-09-22', started: '2023-01-01', finished: '2023-03-01', critic: 89, grade: 95, story: 40, completion: 80, score: 1.78, logo: 'https://cdn.test/original-logo.jpg', hero: 'https://cdn.test/original-hero.jpg', cover: 'https://cdn.test/original-cover.jpg', comment: 'Excellent game', manualPlaytimeMinutes: 150, steamAppId: 570, isCheaperByKey: true, keyStoreUrl: 'https://store.test/key' })
const base = createTestStore().getState()
const state = {
	gameStatus: { ...base.gameStatus, statuses: [createGameStatus({ id: 1, name: 'Playing' }), createGameStatus({ id: 2, name: 'Backlog' })] },
	gamePlatform: { ...base.gamePlatform, platforms: [createGamePlatform({ id: 1, name: 'PC' }), createGamePlatform({ id: 2, name: 'Steam' }), createGamePlatform({ id: 3, name: 'Epic Games' })] },
	gamePlayedStatus: { ...base.gamePlayedStatus, playedStatuses: [createGamePlayedStatus({ id: 1, name: 'Finished' })] },
	gamePlayWith: { ...base.gamePlayWith, playWithOptions: [createGamePlayWith({ id: 1, name: 'Solo' }), createGamePlayWith({ id: 2, name: 'Partner' })] },
}
const candidate: SteamArtwork = { logoUrl: 'https://cdn.test/new-logo.jpg', heroUrl: 'https://cdn.test/content-hash/header.jpg', coverUrl: 'https://cdn.test/content-hash/library_600x900.jpg' }
const setup = (item: Game = game) => {
	const save = vi.fn().mockResolvedValue(undefined), close = vi.fn()
	const Host = () => { const [open, setOpen] = useState(true); return <><button type='button' onClick={() => setOpen(true)}>Open editor</button>{open && <CollectionGameEditor game={item} onSave={save} onClose={() => { close(); setOpen(false) }} />}</> }
	const render = renderWithProviders(<Host />, { preloadedState: state })
	return { save, close, ...render }
}
const ui = () => within(screen.getByRole('dialog', { name: 'Edit game' }))
const tab = (name: string) => userEvent.click(ui().getByRole('tab', { name }))
const refreshName = (role: string) => i18n.t(`game.details.refreshSteam${role[0].toUpperCase()}${role.slice(1)}`)

describe('one editor — migrated fields and safe Steam artwork', () => {
	beforeEach(async () => { vi.clearAllMocks(); await i18n.changeLanguage('en'); mocks.assets.mockResolvedValue(candidate); mocks.preload.mockResolvedValue(true) })
	it('keeps the personal fields, catalogs, companions, prices and artwork editable in their real tabs', async () => {
		setup()
		for (const label of ['Status', 'Played']) expect(ui().getByLabelText(label, { exact: true })).toBeInTheDocument()
		expect(ui().getByLabelText('Partner')).toBeInTheDocument()
		expect(ui().getByLabelText('Personal comment')).toHaveValue('Excellent game')
		await tab('Game')
		for (const label of ['Title', 'Platform', 'Released', 'Your grade · /100', 'Critic · /100', 'Main story', 'Completionist']) expect(ui().getByLabelText(label, { exact: true })).toBeInTheDocument()
		await tab('Artwork')
		for (const label of ['Logo', 'Hero image', 'Cover art', 'Steam App ID', 'Cheaper', 'Key URL']) expect(ui().getByLabelText(label, { exact: true })).toBeInTheDocument()
		expect(document.querySelectorAll('dialog[open]')).toHaveLength(1)
	})
	it('retains existing values and calculated score rather than inventing or recalculating them', async () => {
		setup(); await tab('Game')
		expect(ui().getByText('1.78')).toBeInTheDocument()
		expect(ui().queryByRole('spinbutton', { name: 'Calculated score · /10' })).not.toBeInTheDocument()
	})
	it('keeps the saved App ID locked and ignores accidental change events until explicitly unlocked', async () => {
		const { save } = setup(); await tab('Artwork')
		const input = ui().getByLabelText('Steam App ID')
		expect(input).toHaveAttribute('readonly')
		fireEvent.change(input, { target: { value: '100' } })
		expect(input).toHaveValue(570)
		await userEvent.click(ui().getByRole('button', { name: 'Save changes' }))
		expect(save).not.toHaveBeenCalled()
	})
	it('unlocks, relocks and saves an intentional App ID change as only that dirty field', async () => {
		const { save } = setup(); await tab('Artwork')
		await userEvent.click(ui().getByRole('button', { name: 'Unlock to edit the Steam App ID' }))
		const input = ui().getByLabelText('Steam App ID')
		expect(input).not.toHaveAttribute('readonly')
		fireEvent.change(input, { target: { value: '100' } })
		await userEvent.click(ui().getByRole('button', { name: 'Lock the Steam App ID' }))
		expect(input).toHaveAttribute('readonly')
		await userEvent.click(ui().getByRole('button', { name: 'Save changes' }))
		await waitFor(() => expect(save).toHaveBeenCalledWith({ steamAppId: 100 }))
		expect(mocks.sync).not.toHaveBeenCalled()
	})
	it('starts unlinked games with an editable App ID and permits an explicit unlink on Save', async () => {
		const { save } = setup({ ...game, steamAppId: undefined }); await tab('Artwork')
		expect(ui().getByLabelText('Steam App ID')).not.toHaveAttribute('readonly')
		fireEvent.change(ui().getByLabelText('Steam App ID'), { target: { value: '100' } })
		await userEvent.click(ui().getByRole('button', { name: 'Save changes' }))
		await waitFor(() => expect(save).toHaveBeenCalledWith({ steamAppId: 100 }))
	})
	it('clears a linked App ID only after unlocking and explicit Save, never while typing', async () => {
		const { save } = setup(); await tab('Artwork')
		await userEvent.click(ui().getByRole('button', { name: 'Unlock to edit the Steam App ID' }))
		fireEvent.change(ui().getByLabelText('Steam App ID'), { target: { value: '' } })
		expect(save).not.toHaveBeenCalled()
		await userEvent.click(ui().getByRole('button', { name: 'Save changes' }))
		await waitFor(() => expect(save).toHaveBeenCalledWith({ steamAppId: null }))
	})
	it.each(['0', '-1', '1.5', '2147483648'])('rejects invalid App ID %s before any save or provider lookup', async value => {
		const { save } = setup(); await tab('Artwork')
		await userEvent.click(ui().getByRole('button', { name: 'Unlock to edit the Steam App ID' }))
		fireEvent.change(ui().getByLabelText('Steam App ID'), { target: { value } })
		expect(ui().getByRole('button', { name: refreshName('hero') })).toBeDisabled()
		await userEvent.click(ui().getByRole('button', { name: 'Save changes' }))
		expect(save).not.toHaveBeenCalled(); expect(mocks.assets).not.toHaveBeenCalled()
	})
	it.each(['logo', 'hero', 'cover'] as const)('resolves %s into the draft and saves only the requested role', async role => {
		const { save } = setup(); await tab('Artwork')
		await userEvent.click(ui().getByRole('button', { name: refreshName(role) }))
		const label = i18n.t(`game.details.field${role[0].toUpperCase()}${role.slice(1)}`)
		await waitFor(() => expect(ui().getByLabelText(label)).toHaveValue(candidate[`${role}Url`]))
		const preview = ui().getByRole('figure', { name: `${label} preview` })
		expect(within(preview).getByRole('img')).toHaveAttribute('src', candidate[`${role}Url`])
		expect(save).not.toHaveBeenCalled(); expect(mocks.sync).not.toHaveBeenCalled()
		await userEvent.click(ui().getByRole('button', { name: 'Save changes' }))
		await waitFor(() => expect(save).toHaveBeenCalledWith({ [role]: candidate[`${role}Url`] }))
	})
	it('keeps a fetched image and unrelated comment entirely cancellable', async () => {
		const { save, close } = setup()
		fireEvent.change(ui().getByLabelText('Personal comment'), { target: { value: 'Unsaved note' } })
		await tab('Artwork'); await userEvent.click(ui().getByRole('button', { name: refreshName('cover') }))
		await waitFor(() => expect(ui().getByLabelText(i18n.t('game.details.fieldCover'))).toHaveValue(candidate.coverUrl))
		await userEvent.click(ui().getByRole('button', { name: 'Cancel' }))
		expect(close).toHaveBeenCalledOnce(); expect(save).not.toHaveBeenCalled(); expect(mocks.sync).not.toHaveBeenCalled()
	})
	it('updates a manual URL preview immediately and keeps the entire change cancellable', async () => {
		const { save } = setup(); await tab('Artwork')
		fireEvent.change(ui().getByLabelText('Hero image'), { target: { value: 'https://cdn.test/manual-new.jpg' } })
		expect(within(ui().getByRole('figure', { name: 'Hero image preview' })).getByRole('img')).toHaveAttribute('src', 'https://cdn.test/manual-new.jpg')
		await userEvent.click(ui().getByRole('button', { name: 'Cancel' }))
		expect(save).not.toHaveBeenCalled(); expect(mocks.assets).not.toHaveBeenCalled()
	})
	it('recovers a failed preview when Steam validates the same URL on an explicit retry', async () => {
		mocks.assets.mockResolvedValue({ coverUrl: game.cover })
		const { save } = setup(); await tab('Artwork')
		fireEvent.error(within(ui().getByRole('figure', { name: 'Cover art preview' })).getByRole('img'))
		expect(ui().getByRole('figure', { name: 'Cover art preview' })).toHaveAttribute('data-state', 'failed')
		await userEvent.click(ui().getByRole('button', { name: refreshName('cover') }))
		await waitFor(() => expect(within(ui().getByRole('figure', { name: 'Cover art preview' })).getByRole('img')).toBeInTheDocument())
		fireEvent.load(within(ui().getByRole('figure', { name: 'Cover art preview' })).getByRole('img'))
		expect(ui().getByRole('figure', { name: 'Cover art preview' })).toHaveAttribute('data-state', 'loaded')
		await userEvent.click(ui().getByRole('button', { name: 'Save changes' }))
		expect(save).not.toHaveBeenCalled()
	})
	it('retains the candidate and other draft edits through a failed Save, then allows explicit retry', async () => {
		const { save } = setup()
		save.mockRejectedValueOnce(new Error('offline'))
		fireEvent.change(ui().getByLabelText('Personal comment'), { target: { value: 'Keep my note' } })
		await tab('Artwork'); await userEvent.click(ui().getByRole('button', { name: refreshName('hero') }))
		await waitFor(() => expect(ui().getByLabelText('Hero image')).toHaveValue(candidate.heroUrl))
		await userEvent.click(ui().getByRole('button', { name: 'Save changes' })); await screen.findByRole('alert')
		expect(ui().getByLabelText('Hero image')).toHaveValue(candidate.heroUrl)
		await tab(i18n.t('gallery.detail.personal')); expect(ui().getByLabelText('Personal comment')).toHaveValue('Keep my note')
		await userEvent.click(ui().getByRole('button', { name: 'Save changes' }))
		await waitFor(() => expect(save).toHaveBeenLastCalledWith({ comment: 'Keep my note', hero: candidate.heroUrl }))
		expect(save).toHaveBeenCalledTimes(2); expect(mocks.sync).not.toHaveBeenCalled()
	})
	it('cancels an intentional App ID edit without saving or invalidating anything', async () => {
		const { save } = setup(); await tab('Artwork')
		await userEvent.click(ui().getByRole('button', { name: 'Unlock to edit the Steam App ID' }))
		fireEvent.change(ui().getByLabelText('Steam App ID'), { target: { value: '100' } })
		await userEvent.click(ui().getByRole('button', { name: 'Cancel' }))
		expect(save).not.toHaveBeenCalled(); expect(mocks.assets).not.toHaveBeenCalled(); expect(mocks.sync).not.toHaveBeenCalled()
	})
	it.each(['logo', 'hero', 'cover'] as const)('keeps existing %s if no usable role is returned', async role => {
		mocks.assets.mockResolvedValue({}); const { save } = setup(); await tab('Artwork')
		await userEvent.click(ui().getByRole('button', { name: refreshName(role) }))
		expect(await screen.findByRole('alert')).toHaveTextContent('Your previous URL has been kept')
		expect(ui().getByLabelText(i18n.t(`game.details.field${role[0].toUpperCase()}${role.slice(1)}`))).toHaveValue(game[role])
		expect(mocks.assets).toHaveBeenCalledTimes(role === 'logo' ? 3 : 1)
		await userEvent.click(ui().getByRole('button', { name: 'Save changes' })); expect(save).not.toHaveBeenCalled()
	})
	it.each(['logo', 'hero', 'cover'] as const)('keeps the previous %s through provider/network failure', async role => {
		mocks.assets.mockRejectedValue(new Error('offline')); setup(); await tab('Artwork')
		await userEvent.click(ui().getByRole('button', { name: refreshName(role) })); await screen.findByRole('alert')
		expect(ui().getByLabelText(i18n.t(`game.details.field${role[0].toUpperCase()}${role.slice(1)}`))).toHaveValue(game[role])
	})
	it.each(['logo', 'hero', 'cover'] as const)('keeps the previous %s even when its CDN is also unreachable', async role => {
		mocks.preload.mockResolvedValue(false); setup(); await tab('Artwork')
		await userEvent.click(ui().getByRole('button', { name: refreshName(role) })); await screen.findByRole('alert')
		expect(ui().getByLabelText(i18n.t(`game.details.field${role[0].toUpperCase()}${role.slice(1)}`))).toHaveValue(game[role])
	})
	it('retries the logo at most three times and accepts a later usable candidate', async () => {
		mocks.assets.mockResolvedValueOnce({}).mockResolvedValueOnce({}).mockResolvedValueOnce(candidate)
		setup(); await tab('Artwork'); await userEvent.click(ui().getByRole('button', { name: refreshName('logo') }))
		await waitFor(() => expect(ui().getByLabelText('Logo')).toHaveValue(candidate.logoUrl))
		expect(mocks.assets).toHaveBeenCalledTimes(3); expect(screen.queryByRole('alert')).not.toBeInTheDocument()
	})
	it('serializes different role requests and blocks Save until the current lookup finishes', async () => {
		let resolve!: (value: SteamArtwork) => void
		mocks.assets.mockReturnValue(new Promise<SteamArtwork>(done => { resolve = done }))
		setup(); await tab('Artwork')
		fireEvent.click(ui().getByRole('button', { name: refreshName('hero') })); fireEvent.click(ui().getByRole('button', { name: refreshName('cover') }))
		expect(mocks.assets).toHaveBeenCalledTimes(1)
		expect(ui().getByRole('button', { name: 'Save changes' })).toBeDisabled()
		expect(ui().getByRole('button', { name: 'Unlock to edit the Steam App ID' })).toBeDisabled()
		await act(async () => resolve(candidate))
		await waitFor(() => expect(ui().getByRole('button', { name: 'Save changes' })).toBeEnabled())
	})
	it('aborts on Cancel and ignores a late provider response', async () => {
		let resolve!: (value: SteamArtwork) => void
		mocks.assets.mockReturnValue(new Promise<SteamArtwork>(done => { resolve = done }))
		const { save } = setup(); await tab('Artwork'); await userEvent.click(ui().getByRole('button', { name: refreshName('hero') }))
		const signal = mocks.assets.mock.calls[0][1] as AbortSignal
		await userEvent.click(ui().getByRole('button', { name: 'Cancel' }))
		expect(signal.aborted).toBe(true)
		await act(async () => resolve(candidate))
		expect(save).not.toHaveBeenCalled(); expect(mocks.preload).not.toHaveBeenCalled(); expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})
	it('uses a deliberately changed App ID for the lookup rather than the old game ID', async () => {
		setup(); await tab('Artwork'); await userEvent.click(ui().getByRole('button', { name: 'Unlock to edit the Steam App ID' }))
		fireEvent.change(ui().getByLabelText('Steam App ID'), { target: { value: '100' } })
		await userEvent.click(ui().getByRole('button', { name: refreshName('hero') }))
		await waitFor(() => expect(mocks.assets).toHaveBeenCalledWith(100, expect.any(AbortSignal)))
	})
	it('keeps three independent research queries, the effective critic provider and HLTB reachable', async () => {
		setup(); await tab('Artwork')
		expect(ui().getAllByRole('link', { name: /Google Images/ })).toHaveLength(3)
		await tab('Game')
		expect(ui().getByRole('link', { name: /Critic.*Metacritic/ })).toHaveAttribute('href', 'https://www.metacritic.com/search/Dark%20Souls/')
		expect(ui().getAllByRole('link', { name: /HowLongToBeat/ })).toHaveLength(2)
		expect(ui().getByRole('link', { name: /Platform.*Steam/ })).toHaveAttribute('href', 'https://store.steampowered.com/app/570/')
	})
	it('falls back to a Steam name search for an unlinked title and supports Epic independently', async () => {
		setup({ ...game, steamAppId: undefined }); await tab('Game')
		expect(ui().getByRole('link', { name: /Platform.*Steam/ })).toHaveAttribute('href', 'https://store.steampowered.com/search/?term=Dark+Souls')
		fireEvent.change(ui().getByLabelText('Platform', { exact: true }), { target: { value: '3' } })
		expect(ui().getByRole('link', { name: /Platform.*Epic Games/ })).toHaveAttribute('href', expect.stringContaining('https://store.epicgames.com/es-ES/browse?q=Dark%20Souls'))
	})
	it('preserves prices and configured key URL with a sparse explicit save', async () => {
		const { save } = setup(); await tab('Artwork')
		fireEvent.change(ui().getByLabelText(i18n.t('game.details.fieldCheaper')), { target: { value: 'false' } })
		fireEvent.change(ui().getByLabelText('Key URL'), { target: { value: 'https://store.test/new-key' } })
		await userEvent.click(ui().getByRole('button', { name: 'Save changes' }))
		await waitFor(() => expect(save).toHaveBeenCalledWith({ isCheaperByKey: false, keyStoreUrl: 'https://store.test/new-key' }))
	})
	it('restores automatic Steam when manual hours and minutes are set to zero', async () => {
		const { save } = setup()
		fireEvent.change(ui().getByLabelText('Hours', { exact: true }), { target: { value: '0' } }); fireEvent.change(ui().getByLabelText('Minutes', { exact: true }), { target: { value: '0' } })
		await userEvent.click(ui().getByRole('button', { name: 'Save changes' }))
		await waitFor(() => expect(save).toHaveBeenCalledWith({ manualPlaytimeMinutes: null }))
	})
})
