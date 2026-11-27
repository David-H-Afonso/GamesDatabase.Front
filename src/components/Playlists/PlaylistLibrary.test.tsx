import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import type { PlaylistGroup, PlaylistSummary } from '@/models/api/Playlist'
import i18n from '@/i18n'
import PlaylistLibrary from './PlaylistLibrary'

const services = vi.hoisted(() => ({ get: vi.fn(), save: vi.fn(), remove: vi.fn(), move: vi.fn(), reorder: vi.fn() }))
vi.mock('@/services/PlaylistService/PlaylistGroupService', () => ({ getPlaylistGroups: services.get, savePlaylistGroup: services.save, deletePlaylistGroup: services.remove, movePlaylistToGroup: services.move, reorderPlaylistGroups: services.reorder }))
const auth = { user: { id: 1, username: 'Playlist fixture', role: 'Standard' }, token: 'fixture', refreshToken: null, isAuthenticated: true, loading: false, error: null } as const
const groups: PlaylistGroup[] = [{ id: 1, name: 'Fixture folder', sortOrder: 1 }, { id: 2, name: 'Empty folder', sortOrder: 2 }]
const lists: PlaylistSummary[] = [{ id: 7, name: 'First list', groupId: 1, isAutomatic: false, sortOrder: 0, gameCount: 2, updatedAt: '' }, { id: 8, name: 'Second list', groupId: 1, isAutomatic: false, sortOrder: 1, gameCount: 0, updatedAt: '' }, { id: 9, name: 'Ungrouped list', groupId: null, isAutomatic: false, sortOrder: 2, gameCount: 1, updatedAt: '' }]
const callbacks = () => ({ onSelect: vi.fn(), onRefresh: vi.fn().mockResolvedValue(undefined), onReorder: vi.fn().mockResolvedValue(undefined), onCreate: vi.fn(), onImport: vi.fn() })
const renderLibrary = async (options: { route?: string; moveRequest?: { id: number } } = {}) => {
	const actions = callbacks(), view = renderWithProviders(<PlaylistLibrary playlists={lists} selectedId={7} {...actions} moveRequest={options.moveRequest} />, { preloadedState: { auth }, route: options.route })
	await screen.findByRole('button', { name: /^Fixture folder/ }); return { ...view, actions }
}
const folder = () => screen.getByRole('button', { name: /^Fixture folder/ }).closest('section')!
const folderMenu = async (label: string) => { await userEvent.click(within(folder()).getByLabelText(`${i18n.t('playlists.options')}: Fixture folder`)); await userEvent.click(within(folder()).getByRole('button', { name: label })) }

describe('owned playlist folders, selection and explicit order', () => {
	beforeEach(async () => {
		vi.clearAllMocks(); await i18n.changeLanguage('en'); services.get.mockResolvedValue(groups); services.save.mockResolvedValue(groups[0]); services.remove.mockResolvedValue(undefined); services.move.mockResolvedValue(undefined); services.reorder.mockResolvedValue(undefined)
		vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
		Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() })
	})
	afterEach(() => { vi.unstubAllGlobals(); delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollIntoView })
	it('renders manual folders and selection without creating, moving or deleting a list', async () => {
		const { actions } = await renderLibrary(); await userEvent.click(screen.getByRole('button', { name: /^First list/ }))
		expect(actions.onSelect).toHaveBeenCalledExactlyOnceWith(7); expect(services.move).not.toHaveBeenCalled(); expect(services.save).not.toHaveBeenCalled(); expect(services.remove).not.toHaveBeenCalled()
		expect(screen.getByRole('link', { name: /Your shelves/ })).toHaveAttribute('href', '/shelves')
	})
	it('places shelves first and hides the entire browser, including its tools and search, when collapsed', async () => {
		const { container } = await renderLibrary(); const trigger = container.querySelector<HTMLButtonElement>('[aria-controls="playlist-library-content"]')!
		expect(container.querySelector('aside')?.firstElementChild).toHaveAttribute('href', '/shelves')
		await userEvent.click(trigger); expect(container.querySelector('#playlist-library-content')).toHaveAttribute('hidden'); expect(screen.queryByRole('searchbox')).not.toBeInTheDocument(); expect(screen.queryByRole('button', { name: 'New playlist' })).not.toBeInTheDocument()
		await userEvent.click(trigger); expect(screen.getByRole('searchbox')).toBeInTheDocument(); expect(trigger).toHaveFocus()
	})
	it('collapses an owned folder while literal search can still find its contents', async () => {
		await renderLibrary(); const user = userEvent.setup(); await user.click(screen.getByRole('button', { name: /^Fixture folder/ }))
		expect(screen.queryByRole('button', { name: /^First list/ })).not.toBeInTheDocument(); expect(localStorage.getItem('gdb.playlist-groups.1')).toBe('[1]')
		await user.type(screen.getByRole('searchbox', { name: i18n.t('playlists.findPlaylist') }), 'First list')
		expect(screen.getByRole('button', { name: /^First list/ })).toBeInTheDocument(); expect(screen.queryByRole('button', { name: /^Second list/ })).not.toBeInTheDocument()
	})
	it('uses the focused-folder URL without deleting other folders and returns to the whole collection', async () => {
		await renderLibrary({ route: '/playlists/7?folder=1' }); expect(screen.queryByRole('button', { name: /^Ungrouped list/ })).not.toBeInTheDocument()
		await userEvent.click(screen.getByRole('button', { name: i18n.t('playlists.collection') })); expect(screen.getByRole('button', { name: /^Ungrouped list/ })).toBeInTheDocument(); expect(services.remove).not.toHaveBeenCalled()
	})
	it('creates a folder only through Save and keeps the name on a failed write', async () => {
		await renderLibrary(); const user = userEvent.setup(); await user.click(screen.getByRole('button', { name: i18n.t('playlists.newGroup') }))
		const dialog = within(screen.getByRole('dialog', { name: i18n.t('playlists.newGroup') })); await user.type(dialog.getByLabelText(i18n.t('playlists.groupName')), 'Personal folder')
		services.save.mockRejectedValueOnce(new Error('Fixture failure')); await user.click(dialog.getByRole('button', { name: 'Save' })); await waitFor(() => expect(dialog.getByRole('alert')).toBeInTheDocument())
		expect(dialog.getByLabelText(i18n.t('playlists.groupName'))).toHaveValue('Personal folder'); await user.click(dialog.getByRole('button', { name: 'Save' }))
		await waitFor(() => expect(services.save).toHaveBeenLastCalledWith('Personal folder', undefined)); await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
	})
	it('renames only the selected folder and does not interpret Escape as a save', async () => {
		await renderLibrary(); const user = userEvent.setup()
		const trigger = within(folder()).getByLabelText('Playlist options: Fixture folder'); await user.click(trigger); await user.keyboard('{Escape}'); expect(trigger.closest('details')).not.toHaveAttribute('open'); expect(trigger).toHaveFocus()
		await folderMenu(i18n.t('playlists.renameGroup', { name: 'Fixture folder' })); const dialog = within(screen.getByRole('dialog', { name: 'Edit' })); await user.clear(dialog.getByLabelText(i18n.t('playlists.groupName'))); await user.type(dialog.getByLabelText(i18n.t('playlists.groupName')), 'Renamed folder'); await user.click(dialog.getByRole('button', { name: 'Save' }))
		await waitFor(() => expect(services.save).toHaveBeenCalledExactlyOnceWith('Renamed folder', 1)); expect(services.move).not.toHaveBeenCalled()
	})
	it('requires deletion confirmation and keeps playlists when a folder is removed', async () => {
		const { actions } = await renderLibrary(); await folderMenu(i18n.t('playlists.deleteGroup', { name: 'Fixture folder' }))
		let confirm = within(screen.getByRole('alertdialog')); expect(services.remove).not.toHaveBeenCalled(); await userEvent.click(confirm.getByRole('button', { name: 'Cancel' })); expect(services.remove).not.toHaveBeenCalled()
		await folderMenu(i18n.t('playlists.deleteGroup', { name: 'Fixture folder' })); confirm = within(screen.getByRole('alertdialog')); await userEvent.click(confirm.getByRole('button', { name: 'Confirm' }))
		await waitFor(() => expect(services.remove).toHaveBeenCalledExactlyOnceWith(1)); expect(actions.onRefresh).toHaveBeenCalledOnce(); expect(actions.onReorder).not.toHaveBeenCalled()
	})
	it('moves only checked playlist IDs and clears selection after the confirmed operation', async () => {
		const { actions } = await renderLibrary(); const user = userEvent.setup(); await user.click(screen.getByRole('button', { name: i18n.t('playlists.selectionMode') }))
		await user.click(screen.getByRole('checkbox', { name: 'Select First list' })); await user.selectOptions(screen.getByRole('combobox', { name: i18n.t('playlists.moveToGroup') }), '2')
		await user.click(screen.getByRole('button', { name: 'Move selected' })); await waitFor(() => expect(services.move).toHaveBeenCalledExactlyOnceWith(7, 2)); expect(actions.onRefresh).toHaveBeenCalledOnce(); expect(screen.getByRole('button', { name: 'Move selected' })).toBeDisabled()
	})
	it('keeps the prior order and surfaces an error if a manual list reorder fails', async () => {
		const { actions } = await renderLibrary(); actions.onReorder.mockRejectedValueOnce(new Error('Fixture failure')); const user = userEvent.setup()
		await user.click(screen.getByRole('button', { name: i18n.t('playlists.selectionMode') })); await user.click(screen.getByRole('button', { name: 'Move up: Second list' }))
		await waitFor(() => expect(actions.onReorder).toHaveBeenCalledWith([8, 7, 9])); expect(await screen.findByRole('alert')).toBeInTheDocument()
		expect([...folder().querySelectorAll('.playlist-library__name')].map(node => node.textContent)).toEqual(['First list', 'Second list'])
	})
	it('reorders a folder around the ungrouped sentinel without changing list membership', async () => {
		await renderLibrary(); const user = userEvent.setup(); await user.click(screen.getByRole('button', { name: i18n.t('playlists.selectionMode') })); await user.click(screen.getByRole('button', { name: 'Move up: Fixture folder' }))
		await waitFor(() => expect(services.reorder).toHaveBeenCalledExactlyOnceWith([1, 0, 2])); expect(services.move).not.toHaveBeenCalled()
	})
	it('opens the direct move dialog, not selection, for an explicit move request and ignores malformed saved collapse state', async () => {
		localStorage.setItem('gdb.playlist-groups.1', '{invalid'); await renderLibrary({ moveRequest: { id: 8 } })
		const dialog = within(screen.getByRole('dialog', { name: i18n.t('gallery.playlist.move') }))
		expect(dialog.getByText('Second list')).toBeInTheDocument(); expect(dialog.getByRole('combobox', { name: i18n.t('playlists.moveToGroup') })).toHaveFocus(); expect(services.move).not.toHaveBeenCalled()
		expect(screen.queryByRole('checkbox', { name: 'Select Second list' })).not.toBeInTheDocument()
	})
	it('exposes group-load failures rather than showing an invented successful folder', async () => {
		services.get.mockRejectedValueOnce(new Error('Fixture offline')); renderWithProviders(<PlaylistLibrary playlists={lists} selectedId={7} {...callbacks()} />, { preloadedState: { auth } })
		expect(await screen.findByRole('alert')).toHaveTextContent(i18n.t('playlists.groupsLoadError')); expect(services.save).not.toHaveBeenCalled()
	})
	it('lets parent create/import controls act only on an explicit click', async () => {
		const { actions } = await renderLibrary(); await userEvent.click(screen.getByRole('button', { name: 'New playlist' })); await userEvent.click(screen.getByRole('button', { name: i18n.t('playlists.import') }))
		expect(actions.onCreate).toHaveBeenCalledOnce(); expect(actions.onImport).toHaveBeenCalledOnce(); expect(services.save).not.toHaveBeenCalled()
		fireEvent.pointerDown(document.body); expect(services.move).not.toHaveBeenCalled()
	})
})
