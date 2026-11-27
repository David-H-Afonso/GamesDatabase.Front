import { act, fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import i18n from '@/i18n'
import { GameArtwork } from './GameArtwork'
import { gameArtworkRefreshed } from '@/services/CollectionService/collectionEvents'

const game = { name: 'Artwork fixture', cover: 'https://cdn.test/cover.jpg', hero: 'https://cdn.test/hero.jpg', logo: 'https://cdn.test/logo.png' }

describe('display artwork fallback', () => {
	beforeEach(async () => { await i18n.changeLanguage('en') })
	it('prefers the actual cover and never changes the saved artwork values', () => {
		const saved = Object.freeze({ ...game })
		renderWithProviders(<GameArtwork game={saved} role='cover' />)
		expect(screen.getByAltText(game.name)).toHaveAttribute('src', game.cover)
		expect(saved.cover).toBe(game.cover); expect(saved.hero).toBe(game.hero)
	})
	it.each([undefined, '', '   '])('uses Hero when Cover is missing or blank (%s)', cover => {
		renderWithProviders(<GameArtwork game={{ ...game, cover }} role='cover' />)
		expect(screen.getByAltText(game.name)).toHaveAttribute('src', game.hero)
	})
	it('also applies the fallback to the default cover role', () => {
		renderWithProviders(<GameArtwork game={{ ...game, cover: undefined }} />)
		expect(screen.getByAltText(game.name)).toHaveAttribute('src', game.hero)
	})
	it('tries Hero after a failed Cover, then stops at the placeholder if both fail', () => {
		const { container } = renderWithProviders(<GameArtwork game={game} role='cover' />)
		fireEvent.error(screen.getByAltText(game.name)); expect(screen.getByAltText(game.name)).toHaveAttribute('src', game.hero)
		fireEvent.error(screen.getByAltText(game.name)); expect(container.querySelector('img')).not.toBeInTheDocument()
		expect(screen.getByRole('img', { name: `${i18n.t('gallery.common.noImage')}: ${game.name}` })).toBeInTheDocument()
	})
	it('does not retry the same failed URL when Hero and Cover are identical', () => {
		const { container } = renderWithProviders(<GameArtwork game={{ ...game, hero: game.cover }} />)
		fireEvent.error(screen.getByAltText(game.name)); expect(container.querySelector('img')).not.toBeInTheDocument()
	})
	it.each(['hero', 'logo'] as const)('does not replace a missing %s with another artwork role', role => {
		const { container } = renderWithProviders(<GameArtwork game={{ ...game, [role]: undefined }} role={role} />)
		expect(container.querySelector('img')).not.toBeInTheDocument(); expect(screen.getByText(game.name)).toBeInTheDocument()
	})
	it('recovers when the game receives a new actual cover after both old sources failed', () => {
		const { rerender } = renderWithProviders(<GameArtwork game={game} />)
		fireEvent.error(screen.getByAltText(game.name)); fireEvent.error(screen.getByAltText(game.name))
		rerender(<GameArtwork game={{ ...game, cover: 'https://cdn.test/new-cover.jpg' }} />)
		expect(screen.getByAltText(game.name)).toHaveAttribute('src', 'https://cdn.test/new-cover.jpg')
	})
	it('keeps decorative fallback images decorative', () => {
		const { container } = renderWithProviders(<GameArtwork game={{ ...game, cover: undefined }} decorative />)
		expect(container.querySelector('img')).toHaveAttribute('alt', ''); expect(container.querySelector('img')).toHaveAttribute('src', game.hero)
	})
	it('retries a confirmed same-URL refresh only for that game without clearing or changing its role URL', () => {
		const saved = Object.freeze({ ...game, id: 9101 }), other = Object.freeze({ ...game, id: 9102, name: 'Different fixture' })
		renderWithProviders(<><GameArtwork game={saved} /><GameArtwork game={other} /></>)
		fireEvent.error(screen.getByAltText(saved.name)); expect(screen.getByAltText(saved.name)).toHaveAttribute('src', game.hero)
		const untouched = screen.getByAltText(other.name)
		act(() => gameArtworkRefreshed(saved.id)); expect(screen.getByAltText(saved.name)).toHaveAttribute('src', game.cover); expect(screen.getByAltText(other.name)).toBe(untouched)
		expect(saved.cover).toBe(game.cover); expect(saved.hero).toBe(game.hero)
	})
})
