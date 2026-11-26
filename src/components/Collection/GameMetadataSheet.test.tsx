import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { createGame } from '@/test/factories'
import i18n from '@/i18n'
import { GameMetadataSheet } from './GameMetadataSheet'

const mocks = vi.hoisted(() => ({ preview: vi.fn(), apply: vi.fn() }))
vi.mock('@/services/GamesService/GameMetadataService', () => ({ previewGameMetadata: mocks.preview, applyGameMetadata: mocks.apply }))
const game = createGame({ id: 51, name: 'Hollow Knight' })
const preview = { overwrite: false, token: 'fixture-review-not-authentication', matches: [], notices: ['durationUnavailable'], fields: [{ field: 'developer', current: null, value: 'Team Cherry', source: 'steam', url: 'https://store.steampowered.com/app/367520/' }, { field: 'released', current: null, value: '2017-02-24', source: 'steam', url: 'https://store.steampowered.com/app/367520/' }] }
describe('automatic information is a reviewed sparse update', () => {
	beforeEach(async () => { vi.clearAllMocks(); await i18n.changeLanguage('en'); mocks.preview.mockResolvedValue(preview); mocks.apply.mockResolvedValue({ game, appliedFields: ['developer'] }) })
	it('asks about existing values before any lookup and Cancel never saves', async () => {
		const close = vi.fn(); renderWithProviders(<GameMetadataSheet game={game} onClose={close} />)
		expect(screen.getByRole('radio', { name: 'Fill empty fields' })).toBeChecked(); expect(mocks.preview).not.toHaveBeenCalled()
		await userEvent.click(screen.getByRole('button', { name: 'Cancel' })); expect(close).toHaveBeenCalledOnce(); expect(mocks.apply).not.toHaveBeenCalled()
	})
	it('looks up only after approval, shows provenance and saves only checked fields', async () => {
		const close = vi.fn(); renderWithProviders(<GameMetadataSheet game={game} onClose={close} />)
		await userEvent.click(screen.getByRole('button', { name: 'Look up information' })); await screen.findByText('Team Cherry')
		expect(mocks.preview).toHaveBeenCalledWith(51, { overwrite: false, includeArtwork: true }, expect.any(AbortSignal)); expect(mocks.apply).not.toHaveBeenCalled()
		expect(screen.getAllByRole('link', { name: /Source: Steam/ })[0]).toHaveAttribute('rel', 'noopener noreferrer')
		await userEvent.click(screen.getByRole('checkbox', { name: 'Release date' })); await userEvent.click(screen.getByRole('button', { name: 'Save selected fields' }))
		await waitFor(() => expect(mocks.apply).toHaveBeenCalledWith(51, preview.token, ['developer'], expect.any(AbortSignal))); expect(close).toHaveBeenCalled()
	})
	it('overwrite is an explicit lookup setting, not permission to clear absent fields', async () => {
		renderWithProviders(<GameMetadataSheet game={game} onClose={vi.fn()} />); await userEvent.click(screen.getByRole('radio', { name: 'Replace existing fields' })); await userEvent.click(screen.getByRole('checkbox', { name: 'Include artwork' })); await userEvent.click(screen.getByRole('button', { name: 'Look up information' })); await screen.findByText('Team Cherry')
		expect(mocks.preview).toHaveBeenCalledWith(51, { overwrite: true, includeArtwork: false }, expect.any(AbortSignal))
	})
	it('a stale save stays open with its selections and requires a new review', async () => {
		mocks.apply.mockRejectedValue(Object.assign(new Error('Fixture conflict'), { status: 409 })); const close = vi.fn(); renderWithProviders(<GameMetadataSheet game={game} onClose={close} />)
		await userEvent.click(screen.getByRole('button', { name: 'Look up information' })); await screen.findByText('Team Cherry'); await userEvent.click(screen.getByRole('button', { name: 'Save selected fields' }))
		expect(await screen.findByRole('alert')).toHaveTextContent('game changed'); expect(close).not.toHaveBeenCalled(); expect(screen.getByRole('checkbox', { name: 'Developer' })).toBeChecked(); expect(screen.getByRole('button', { name: 'Save selected fields' })).toBeDisabled()
	})
	it('empty or failed sources never become a success or invented duration', async () => {
		mocks.preview.mockResolvedValue({ ...preview, token: null, fields: [], notices: ['durationUnavailable', 'noChanges'] }); renderWithProviders(<GameMetadataSheet game={game} onClose={vi.fn()} />)
		await userEvent.click(screen.getByRole('button', { name: 'Look up information' })); expect(await screen.findByText(/do not provide verified/)).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Save selected fields' })).toBeDisabled(); expect(mocks.apply).not.toHaveBeenCalled()
	})
	it('cancels a read-only lookup, ignores its late response and makes no save', async () => {
		let resolve!: (value: typeof preview) => void; const pending = new Promise<typeof preview>(yes => { resolve = yes }); mocks.preview.mockReturnValueOnce(pending)
		const close = vi.fn(); const view = renderWithProviders(<GameMetadataSheet game={game} onClose={close} />)
		await userEvent.click(screen.getByRole('button', { name: 'Look up information' })); const signal = mocks.preview.mock.calls[0][2] as AbortSignal
		await userEvent.click(screen.getByRole('button', { name: 'Cancel' })); expect(signal.aborted).toBe(true); expect(close).toHaveBeenCalledOnce(); view.unmount()
		await act(async () => { resolve(preview); await pending }); expect(mocks.apply).not.toHaveBeenCalled()
	})
	it('shows a failed lookup and retries only through another explicit lookup action', async () => {
		mocks.preview.mockRejectedValueOnce(new Error('Fixture provider unavailable'))
		renderWithProviders(<GameMetadataSheet game={game} onClose={vi.fn()} />)
		await userEvent.click(screen.getByRole('button', { name: 'Look up information' })); expect(await screen.findByRole('alert')).toHaveTextContent(i18n.t('metadata.lookupFailed'))
		expect(mocks.apply).not.toHaveBeenCalled(); expect(mocks.preview).toHaveBeenCalledOnce()
		await userEvent.click(screen.getByRole('button', { name: 'Look up information' })); await screen.findByText('Team Cherry'); expect(mocks.preview).toHaveBeenCalledTimes(2)
	})
	it('retains reviewed selections after a failed save and does not dismiss a pending write', async () => {
		let reject!: (reason: unknown) => void; const pending = new Promise((_, no) => { reject = no }); mocks.apply.mockReturnValueOnce(pending)
		const close = vi.fn(); renderWithProviders(<GameMetadataSheet game={game} onClose={close} />)
		await userEvent.click(screen.getByRole('button', { name: 'Look up information' })); await screen.findByText('Team Cherry'); await userEvent.click(screen.getByRole('button', { name: 'Save selected fields' }))
		expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled(); await userEvent.click(screen.getByRole('button', { name: 'Close' })); expect(close).not.toHaveBeenCalled()
		await act(async () => { reject(new Error('Fixture write unavailable')); await expect(pending).rejects.toThrow('Fixture write unavailable') }); expect(await screen.findByRole('alert')).toHaveTextContent(i18n.t('metadata.saveFailed'))
		expect(screen.getByRole('checkbox', { name: 'Developer' })).toBeChecked(); await userEvent.click(screen.getByRole('button', { name: 'Save selected fields' })); await waitFor(() => expect(close).toHaveBeenCalledOnce()); expect(mocks.apply).toHaveBeenCalledTimes(2)
	})
	it('requires a chosen identity for an ambiguous result and can return to its original lookup settings', async () => {
		const match = { source: 'wikidata', name: 'Matching fixture edition', wikidataId: 'Q7889', url: 'https://www.wikidata.org/wiki/Q7889' }
		mocks.preview.mockResolvedValueOnce({ ...preview, token: null, fields: [], matches: [match], notices: ['chooseIdentity'] })
		renderWithProviders(<GameMetadataSheet game={{ ...game, steamAppId: undefined }} onClose={vi.fn()} />)
		await userEvent.click(screen.getByRole('button', { name: 'Look up information' })); await userEvent.click(await screen.findByRole('button', { name: /Matching fixture edition/ })); await screen.findByText('Team Cherry')
		expect(mocks.preview).toHaveBeenLastCalledWith(51, { overwrite: false, includeArtwork: true, wikidataId: 'Q7889' }, expect.any(AbortSignal))
		await userEvent.click(screen.getByRole('button', { name: i18n.t('metadata.back') })); expect(screen.getByRole('radio', { name: 'Fill empty fields' })).toBeChecked(); expect(screen.getByRole('checkbox', { name: 'Include artwork' })).toBeChecked(); expect(mocks.preview).toHaveBeenCalledTimes(2); expect(mocks.apply).not.toHaveBeenCalled()
	})
	it('keeps a linked App ID fixed and reviews public numbers, dates and independent artwork roles', async () => {
		const matches = [{ source: 'steam', name: 'Existing linked edition', steamAppId: 100, url: 'https://store.steampowered.com/app/100/' }, { source: 'steam', name: 'Different linked edition', steamAppId: 200, url: 'https://store.steampowered.com/app/200/' }]
		const fields = [...preview.fields, { field: 'critic', current: 0, value: 90, source: 'steam', url: matches[0].url }, ...(['logo', 'hero', 'cover'] as const).map(role => ({ field: role, current: '', value: `/sample-artwork/amber-${role}.svg`, source: 'steam', url: matches[0].url }))]
		mocks.preview.mockResolvedValueOnce({ ...preview, fields: [], matches, token: null }).mockResolvedValueOnce({ ...preview, fields: fields.map(field => ({ ...field, source: field.field === 'developer' ? 'wikidata' : 'steam', url: field.field === 'developer' ? 'https://www.wikidata.org/wiki/Q7889' : field.url })) })
		renderWithProviders(<GameMetadataSheet game={{ ...game, steamAppId: 100 }} onClose={vi.fn()} />)
		await userEvent.click(screen.getByRole('button', { name: 'Look up information' })); expect(await screen.findByRole('button', { name: /Different linked edition/ })).toBeDisabled(); await userEvent.click(screen.getByRole('button', { name: /Existing linked edition/ }))
		await screen.findByText('Team Cherry'); expect(mocks.preview).toHaveBeenLastCalledWith(51, { overwrite: false, includeArtwork: true, steamAppId: 100 }, expect.any(AbortSignal))
		expect(screen.getByRole('link', { name: /Source: Wikidata/ })).toHaveAttribute('href', 'https://www.wikidata.org/wiki/Q7889'); expect(document.querySelectorAll('.gdb-editor-artwork-preview')).toHaveLength(6)
		for (const checkbox of screen.getAllByRole('checkbox')) await userEvent.click(checkbox)
		expect(screen.getByRole('button', { name: 'Save selected fields' })).toBeDisabled(); await userEvent.click(screen.getByRole('checkbox', { name: 'Developer' })); expect(screen.getByRole('button', { name: 'Save selected fields' })).toBeEnabled(); expect(mocks.apply).not.toHaveBeenCalled()
	})
	it.each(['logo', 'hero', 'cover'] as const)('compares the reviewed current and suggested %s artwork, not just their URLs', async role => {
		const label = role[0].toUpperCase() + role.slice(1), current = `/sample-artwork/amber-${role}.svg`, suggested = `/sample-artwork/harbor-${role}.svg`
		mocks.preview.mockResolvedValueOnce({ ...preview, fields: [{ field: role, current, value: suggested, source: 'steam', url: 'https://store.steampowered.com/app/100/' }] })
		renderWithProviders(<GameMetadataSheet game={{ ...game, [role]: `/sample-artwork/orbit-${role}.svg` }} onClose={vi.fn()} />)
		await userEvent.click(screen.getByRole('button', { name: 'Look up information' }))
		const previous = await screen.findByRole('figure', { name: `Current ${label}` }), proposed = screen.getByRole('figure', { name: `Suggested ${label}` })
		expect(previous).toHaveClass(`gdb-editor-artwork-preview--${role}`); expect(proposed).toHaveClass(`gdb-editor-artwork-preview--${role}`)
		expect(within(previous).getByRole('img')).toHaveAttribute('src', expect.stringContaining(current)); expect(within(proposed).getByRole('img')).toHaveAttribute('src', expect.stringContaining(suggested))
		expect(within(previous).getByRole('img')).toHaveAccessibleName(`Current ${label} for Hollow Knight`); expect(within(proposed).getByRole('img')).toHaveAccessibleName(`Suggested ${label} for Hollow Knight`)
		expect(screen.getAllByText('Image URL')).toHaveLength(2); expect(mocks.apply).not.toHaveBeenCalled()
	})
	it('keeps an empty current image visible instead of borrowing the proposal or another artwork role', async () => {
		mocks.preview.mockResolvedValueOnce({ ...preview, fields: [{ field: 'cover', current: null, value: '/sample-artwork/harbor-cover.svg', source: 'steam', url: 'https://store.steampowered.com/app/100/' }] })
		renderWithProviders(<GameMetadataSheet game={{ ...game, cover: '/sample-artwork/orbit-cover.svg', hero: '/sample-artwork/amber-hero.svg' }} onClose={vi.fn()} />)
		await userEvent.click(screen.getByRole('button', { name: 'Look up information' }))
		const previous = await screen.findByRole('figure', { name: 'Current Cover' })
		expect(previous).toHaveAttribute('data-state', 'empty'); expect(within(previous).queryByRole('img')).not.toBeInTheDocument(); expect(within(previous).getByText('No image URL')).toBeInTheDocument()
		expect(within(screen.getByRole('figure', { name: 'Suggested Cover' })).getByRole('img')).toHaveAttribute('src', expect.stringContaining('harbor-cover.svg'))
		expect(screen.getAllByText('Image URL')).toHaveLength(1); expect(mocks.apply).not.toHaveBeenCalled()
	})
	it.each(['current', 'suggested'] as const)('isolates a failed %s image without hiding the other preview or changing the selection', async failed => {
		mocks.preview.mockResolvedValueOnce({ ...preview, fields: [{ field: 'hero', current: '/sample-artwork/amber-hero.svg', value: '/sample-artwork/harbor-hero.svg', source: 'steam', url: 'https://store.steampowered.com/app/100/' }] })
		const close = vi.fn(); renderWithProviders(<GameMetadataSheet game={game} onClose={close} />)
		await userEvent.click(screen.getByRole('button', { name: 'Look up information' }))
		const previous = await screen.findByRole('figure', { name: 'Current Hero' }), proposed = screen.getByRole('figure', { name: 'Suggested Hero' })
		const broken = failed === 'current' ? previous : proposed, retained = failed === 'current' ? proposed : previous
		fireEvent.load(within(retained).getByRole('img')); fireEvent.error(within(broken).getByRole('img'))
		expect(broken).toHaveAttribute('data-state', 'failed'); expect(within(broken).getByText('Image could not be loaded.')).toBeInTheDocument(); expect(retained).toHaveAttribute('data-state', 'loaded')
		expect(screen.getByRole('checkbox', { name: 'Hero' })).toBeChecked(); await userEvent.click(screen.getByRole('button', { name: 'Cancel' })); expect(close).toHaveBeenCalledOnce(); expect(mocks.apply).not.toHaveBeenCalled()
	})
	it('saves only the checked artwork from the reviewed pair, never automatically during preview', async () => {
		const fields = (['logo', 'hero', 'cover'] as const).map(role => ({ field: role, current: `/sample-artwork/amber-${role}.svg`, value: `/sample-artwork/harbor-${role}.svg`, source: 'steam', url: 'https://store.steampowered.com/app/100/' }))
		mocks.preview.mockResolvedValueOnce({ ...preview, fields }); const close = vi.fn(); renderWithProviders(<GameMetadataSheet game={game} onClose={close} />)
		await userEvent.click(screen.getByRole('button', { name: 'Look up information' })); await screen.findByRole('figure', { name: 'Current Hero' }); expect(mocks.apply).not.toHaveBeenCalled()
		await userEvent.click(screen.getByRole('checkbox', { name: 'Logo' })); await userEvent.click(screen.getByRole('checkbox', { name: 'Cover' })); await userEvent.click(screen.getByRole('button', { name: 'Save selected fields' }))
		await waitFor(() => expect(mocks.apply).toHaveBeenCalledWith(51, preview.token, ['hero'], expect.any(AbortSignal))); expect(close).toHaveBeenCalledOnce()
	})
	it('localizes the current/proposed artwork names and alt text in Spanish', async () => {
		await i18n.changeLanguage('es'); mocks.preview.mockResolvedValueOnce({ ...preview, fields: [{ field: 'logo', current: '/sample-artwork/amber-logo.svg', value: '/sample-artwork/harbor-logo.svg', source: 'steam', url: 'https://store.steampowered.com/app/100/' }] })
		renderWithProviders(<GameMetadataSheet game={game} onClose={vi.fn()} />); await userEvent.click(screen.getByRole('button', { name: 'Buscar información' }))
		expect(within(await screen.findByRole('figure', { name: 'Logo actual' })).getByRole('img')).toHaveAccessibleName('Logo actual de Hollow Knight')
		expect(within(screen.getByRole('figure', { name: 'Logo propuesto' })).getByRole('img')).toHaveAccessibleName('Logo propuesto de Hollow Knight')
	})
	it('guards same-tick double lookup and save actions rather than issuing duplicate requests', async () => {
		let resolveLookup!: (value: typeof preview) => void; const lookup = new Promise<typeof preview>(resolve => { resolveLookup = resolve }); mocks.preview.mockReturnValueOnce(lookup)
		const close = vi.fn(); renderWithProviders(<GameMetadataSheet game={game} onClose={close} />); const button = screen.getByRole('button', { name: 'Look up information' })
		act(() => { fireEvent.click(button); fireEvent.click(button) }); expect(mocks.preview).toHaveBeenCalledOnce(); await act(async () => { resolveLookup(preview); await lookup })
		let resolveSave!: (value: unknown) => void; const save = new Promise(resolve => { resolveSave = resolve }); mocks.apply.mockReturnValueOnce(save); const apply = screen.getByRole('button', { name: 'Save selected fields' })
		act(() => { fireEvent.click(apply); fireEvent.click(apply) }); expect(mocks.apply).toHaveBeenCalledOnce(); await act(async () => { resolveSave({ game }); await save }); expect(close).toHaveBeenCalledOnce()
	})
})
