import { act, fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import { createGame } from '@/test/factories'
import i18n from '@/i18n'
import { PlayingNowSpotlight } from './PlayingNowSpotlight'

vi.mock('./GameArtwork', () => ({ GameArtwork: () => <span>Artwork</span> }))
const items = Array.from({ length: 12 }, (_, index) => createGame({ id: index + 1, name: `Game ${index + 1}` }))
const props = () => ({ title: 'Playing now', items, total: 12, selectedId: 1, onSelect: vi.fn(), onOpen: vi.fn(), onViewAll: vi.fn(), formatTime: () => 'No recorded time' })
describe('Playing now keeps a quiet independent side list', () => {
	beforeEach(async () => { await i18n.changeLanguage('en') })
	it('keeps the list outside the artwork, renders every preview and adds no selector chrome', () => {
		const input = props(), { container } = renderWithProviders(<PlayingNowSpotlight {...input} />)
		expect(container.querySelector('.gdb-home-spotlight')?.contains(container.querySelector('.gdb-playing-list'))).toBe(false)
		expect(container.querySelectorAll('.gdb-playing-list__game')).toHaveLength(12)
		expect(screen.queryByRole('button', { name: 'Next games' })).not.toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Feature Game 1' })).toHaveAttribute('aria-pressed', 'true')
		expect(input.onSelect).not.toHaveBeenCalled(); expect(input.onOpen).not.toHaveBeenCalled()
	})
	it('arrow keys browse without changing state; explicit selection and opening stay separate', () => {
		const input = props(); renderWithProviders(<PlayingNowSpotlight {...input} />)
		const first = screen.getByRole('button', { name: 'Feature Game 1' }); act(() => first.focus())
		fireEvent.keyDown(first, { key: 'End' }); expect(screen.getByRole('button', { name: 'Feature Game 12' })).toHaveFocus(); expect(input.onSelect).not.toHaveBeenCalled()
		fireEvent.click(screen.getByRole('button', { name: 'Feature Game 12' })); expect(input.onSelect).toHaveBeenCalledWith(12); expect(input.onOpen).not.toHaveBeenCalled()
		fireEvent.click(screen.getByRole('button', { name: 'View game' })); expect(input.onOpen).toHaveBeenCalledWith(items[0])
	})
	it('the mobile native control uses the same explicit selection without opening details', () => {
		const input = props(); renderWithProviders(<PlayingNowSpotlight {...input} />)
		fireEvent.change(screen.getByRole('combobox', { name: 'Choose a game' }), { target: { value: '4' } })
		expect(input.onSelect).toHaveBeenCalledWith(4); expect(input.onOpen).not.toHaveBeenCalled()
	})
	it('handles no games and one game without a dead list or duplicated switcher', () => {
		const input = props(), { rerender, container } = renderWithProviders(<PlayingNowSpotlight {...input} items={[]} />)
		expect(container).toBeEmptyDOMElement()
		rerender(<PlayingNowSpotlight {...input} items={[items[0]]} />)
		expect(container.querySelector('.gdb-playing-list')).not.toBeInTheDocument(); expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: /automatic game rotation/ })).not.toBeInTheDocument()
	})
	it('keeps a mouse Pause action paused after focus enters, and allows explicit keyboard resume', () => {
		vi.useFakeTimers()
		try {
			const input = props(); renderWithProviders(<PlayingNowSpotlight {...input} />)
			const pause = screen.getByRole('button', { name: 'Pause automatic game rotation' }); fireEvent.pointerDown(pause); act(() => pause.focus()); fireEvent.click(pause)
			const resume = screen.getByRole('button', { name: 'Start automatic game rotation' }); act(() => vi.advanceTimersByTime(30_000)); expect(input.onSelect).not.toHaveBeenCalled()
			fireEvent.click(resume); act(() => vi.advanceTimersByTime(20_000)); expect(input.onSelect).toHaveBeenCalledExactlyOnceWith(2)
		} finally { vi.useRealTimers() }
	})
})
