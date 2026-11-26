import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import type { Playlist } from '@/models/api/Playlist'
import { blankPlaylistRules } from '@/utils/playlistRules'
import i18n from '@/i18n'
import { PlaylistForm } from './PlaylistForm'

const mocks = vi.hoisted(() => ({ preview: vi.fn() }))
vi.mock('@/services/PlaylistService/PlaylistService', () => ({ previewPlaylist: mocks.preview }))
const setup = (initial?: Playlist) => {
	const save = vi.fn().mockResolvedValue(undefined), close = vi.fn()
	renderWithProviders(<PlaylistForm groups={[]} initial={initial} onSave={save} onClose={close} />)
	return { save, close }
}
const useTemplate = (name: string) => userEvent.click(screen.getByRole('button', { name: i18n.t('gallery.templates.use', { name }) }))

describe('playlist template onboarding and explicit save', () => {
	beforeEach(async () => { vi.clearAllMocks(); await i18n.changeLanguage('en'); mocks.preview.mockResolvedValue({ totalMatches: 0, returnedCount: 0, games: [] }) })
	it('shows separate educational options and creates nothing just by opening or cancelling', async () => {
		const { save, close } = setup()
		for (const id of ['favorites', 'playingNow', 'upcoming']) expect(screen.getByRole('button', { name: i18n.t('gallery.templates.use', { name: i18n.t(`gallery.templates.${id}.title`) }) })).toBeVisible()
		expect(screen.queryByRole('button', { name: i18n.t('gallery.rules.savePlaylist') })).not.toBeInTheDocument()
		await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
		expect(close).toHaveBeenCalledOnce()
		expect(save).not.toHaveBeenCalled()
		expect(mocks.preview).not.toHaveBeenCalled()
	})
	it('seeds favorites as real editable rules and writes only on Save playlist', async () => {
		const { save } = setup()
		await useTemplate(i18n.t('gallery.templates.favorites.title'))
		expect(save).not.toHaveBeenCalled()
		expect(screen.getByLabelText('Type')).toHaveValue('automatic')
		expect(screen.getByLabelText('Favorite')).toHaveValue('true')
		fireEvent.change(screen.getByLabelText(i18n.t('playlists.name')), { target: { value: 'My renamed favorites' } })
		await userEvent.click(screen.getByRole('button', { name: 'Save playlist' }))
		await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ name: 'My renamed favorites', isAutomatic: true, maxLength: null, rules: expect.objectContaining({ favorite: true, statusIds: [] }) }), null))
	})
	it('keeps upcoming releases rolling and unlimited until the user changes those settings', async () => {
		const { save } = setup()
		await useTemplate('Upcoming releases')
		expect(screen.getByLabelText(i18n.t('gallery.rules.upcoming'))).toBeChecked()
		expect(screen.getByLabelText('Sort by')).toHaveValue('Released')
		expect(screen.getByText(/Unknown or invalid dates are excluded/)).toBeInTheDocument()
		await userEvent.click(screen.getByRole('button', { name: 'Save playlist' }))
		await waitFor(() => expect(save).toHaveBeenCalledOnce())
		const rules = save.mock.calls[0][0].rules
		expect(rules).toMatchObject({ upcomingReleases: true, releaseTimeZone: expect.any(String) })
		expect(rules.limit).toBeUndefined()
		expect(rules.releasedFromYear).toBeUndefined()
	})
	it('does not silently replace an existing playlist with a template', () => {
		const initial: Playlist = { id: 41, name: 'Existing list', isAutomatic: true, rules: { ...blankPlaylistRules(), minGrade: 87, excludedGameIds: [9] }, sortOrder: 1, gameCount: 0, createdAt: '', updatedAt: '', items: [] }
		const { save } = setup(initial)
		expect(screen.queryByRole('button', { name: /Use .* template/ })).not.toBeInTheDocument()
		expect(screen.getByLabelText(i18n.t('playlists.name'))).toHaveValue('Existing list')
		expect(save).not.toHaveBeenCalled()
		expect(initial.rules?.excludedGameIds).toEqual([9])
	})
	it('lets users start a manual playlist without adopting automatic filters', async () => {
		const { save } = setup()
		await userEvent.click(screen.getByRole('button', { name: 'Create a custom playlist' }))
		expect(screen.getByLabelText('Type')).toHaveValue('manual')
		fireEvent.change(screen.getByLabelText(i18n.t('playlists.name')), { target: { value: 'A manual selection' } })
		await userEvent.click(screen.getByRole('button', { name: 'Save playlist' }))
		await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ name: 'A manual selection', isAutomatic: false }), null))
	})
	it('keeps a failed save editable and does not recreate or auto-submit a template', async () => {
		const { save } = setup()
		save.mockRejectedValueOnce(new Error('offline'))
		await useTemplate('Playing now')
		await userEvent.click(screen.getByRole('button', { name: 'Save playlist' }))
		expect(await screen.findByRole('alert')).toHaveTextContent(i18n.t('gallery.common.saveError'))
		expect(screen.getByLabelText(i18n.t('gallery.rules.playingNow'))).toBeChecked()
		expect(save).toHaveBeenCalledOnce()
	})
	it('preserves pending name terms when visiting templates and returning to the same draft', async () => {
		const { save } = setup()
		await useTemplate('Your favorite games')
		fireEvent.change(screen.getByRole('searchbox', { name: i18n.t('gallery.search.nameLabel') }), { target: { value: 'Unsubmitted phrase' } })
		await userEvent.click(screen.getByRole('button', { name: 'Choose another template' }))
		await userEvent.click(screen.getByRole('button', { name: 'Back to my draft' }))
		await userEvent.click(screen.getByRole('button', { name: 'Save playlist' }))
		await waitFor(() => expect(save).toHaveBeenCalledOnce())
		expect(save.mock.calls[0][0].rules.nameSearch.includeTerms).toContain('Unsubmitted phrase')
	})
})
