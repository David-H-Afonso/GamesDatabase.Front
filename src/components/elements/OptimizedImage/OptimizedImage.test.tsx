import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import OptimizedImage from './OptimizedImage'

describe('OptimizedImage', () => {
	// ── Basic rendering ────────────────────────────────────────────────────────

	it('renders an img element with the correct alt text', () => {
		render(<OptimizedImage src='https://example.com/image.jpg' alt='Test image' />)
		expect(screen.getByRole('img')).toBeInTheDocument()
		expect(screen.getByAltText('Test image')).toBeInTheDocument()
	})

	it('shows the loading placeholder before image loads', () => {
		render(<OptimizedImage src='https://example.com/image.jpg' alt='Loading' />)
		expect(document.querySelector('.optimized-image-placeholder')).toBeInTheDocument()
	})

	// ── Load / error events ────────────────────────────────────────────────────

	it('removes the placeholder after the image loads', async () => {
		render(<OptimizedImage src='https://example.com/image.jpg' alt='Loaded' />)
		fireEvent.load(screen.getByRole('img'))
		await waitFor(() => {
			expect(document.querySelector('.optimized-image-placeholder')).not.toBeInTheDocument()
		})
	})

	it('shows "Image unavailable" when the image fails to load', async () => {
		render(<OptimizedImage src='https://example.com/broken.jpg' alt='Broken' />)
		fireEvent.error(screen.getByRole('img'))
		await waitFor(() => {
			expect(screen.getByText('Image unavailable')).toBeInTheDocument()
		})
	})

	it('calls onError callback when the image fails to load', async () => {
		const onError = vi.fn()
		render(<OptimizedImage src='https://example.com/broken.jpg' alt='Error' onError={onError} />)
		fireEvent.error(screen.getByRole('img'))
		await waitFor(() => expect(onError).toHaveBeenCalled())
	})

	// ── URL optimisation ───────────────────────────────────────────────────────

	it('rewrites IGDB image URLs to use the correct size for medium quality', () => {
		const igdbSrc = 'https://images.igdb.com/igdb/image/upload/t_thumb/abc123.jpg'
		render(<OptimizedImage src={igdbSrc} alt='IGDB' quality='medium' />)
		expect((screen.getByRole('img') as HTMLImageElement).src).toContain('t_720p')
	})

	it('rewrites IGDB image URLs to use the high-quality size', () => {
		const igdbSrc = 'https://images.igdb.com/igdb/image/upload/t_thumb/abc123.jpg'
		render(<OptimizedImage src={igdbSrc} alt='IGDB high' quality='high' />)
		expect((screen.getByRole('img') as HTMLImageElement).src).toContain('t_1080p')
	})
})
