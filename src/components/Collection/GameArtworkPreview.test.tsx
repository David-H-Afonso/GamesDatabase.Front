import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import i18n from '@/i18n'
import { GameArtworkPreview } from './GameArtworkPreview'

describe('draft artwork previews', () => {
	beforeEach(async () => { await i18n.changeLanguage('en') })
	it.each(['logo', 'hero', 'cover'] as const)('shows the current %s image in its own preview without substituting a role', role => {
		const label = role[0].toUpperCase() + role.slice(1), value = `https://cdn.test/${role}.png`
		renderWithProviders(<GameArtworkPreview role={role} label={label} value={value} name='Draft title' />)
		const preview = screen.getByRole('figure', { name: `${label} preview` })
		expect(preview).toHaveClass(`gdb-editor-artwork-preview--${role}`)
		expect(within(preview).getByRole('img')).toHaveAttribute('src', value)
		expect(within(preview).getByRole('img')).toHaveAccessibleName(`${label} for Draft title (draft)`)
		fireEvent.load(within(preview).getByRole('img'))
		expect(preview).toHaveAttribute('data-state', 'loaded')
	})
	it('shows an explicit empty state for a missing URL, not another saved image', () => {
		renderWithProviders(<GameArtworkPreview role='hero' label='Hero' value='' name='Draft title' />)
		expect(screen.getByRole('figure')).toHaveAttribute('data-state', 'empty')
		expect(screen.getByText('No image URL')).toBeInTheDocument()
		expect(screen.queryByRole('img')).not.toBeInTheDocument()
	})
	it('can describe a saved or proposed comparison image without calling it a draft', () => {
		renderWithProviders(<GameArtworkPreview role='cover' label='Cover' value='https://cdn.test/saved-cover.jpg' name='Saved title' caption='Current Cover' imageAlt='Current Cover for Saved title' />)
		const preview = screen.getByRole('figure', { name: 'Current Cover' })
		expect(within(preview).getByRole('img')).toHaveAccessibleName('Current Cover for Saved title')
		expect(within(preview).getByText('Current Cover')).toBeInTheDocument(); expect(within(preview).queryByText('Preview')).not.toBeInTheDocument()
	})
	it.each(['javascript:alert(1)', 'data:image/png;base64,abc', 'file:///image.jpg', 'https://user:password@cdn.test/a.jpg'])('does not load an unsafe preview URL %s', value => {
		renderWithProviders(<GameArtworkPreview role='cover' label='Cover' value={value} name='Draft title' />)
		expect(screen.getByRole('figure')).toHaveAttribute('data-state', 'invalid')
		expect(screen.queryByRole('img')).not.toBeInTheDocument()
	})
	it('updates the visible draft preview on URL change before any Save', () => {
		const { rerender } = renderWithProviders(<GameArtworkPreview role='hero' label='Hero' value='https://cdn.test/old.jpg' name='Draft title' />)
		fireEvent.load(screen.getByRole('img'))
		rerender(<GameArtworkPreview role='hero' label='Hero' value='https://cdn.test/new-hash.jpg' name='Edited title' />)
		expect(screen.getByRole('img')).toHaveAttribute('src', 'https://cdn.test/new-hash.jpg')
		expect(screen.getByRole('img')).toHaveAccessibleName('Hero for Edited title (draft)')
		expect(screen.getByRole('figure')).toHaveAttribute('data-state', 'loading')
	})
	it('reports a failed image and recovers when a different URL is entered', () => {
		const { rerender } = renderWithProviders(<GameArtworkPreview role='cover' label='Cover' value='https://cdn.test/broken.jpg' name='Draft title' />)
		fireEvent.error(screen.getByRole('img'))
		expect(screen.getByRole('figure')).toHaveAttribute('data-state', 'failed')
		expect(screen.getByText('Image could not be loaded.')).toBeInTheDocument()
		rerender(<GameArtworkPreview role='cover' label='Cover' value='https://cdn.test/recovered.jpg' name='Draft title' />)
		fireEvent.load(screen.getByRole('img'))
		expect(screen.getByRole('figure')).toHaveAttribute('data-state', 'loaded')
		expect(screen.queryByText('Image could not be loaded.')).not.toBeInTheDocument()
	})
})
