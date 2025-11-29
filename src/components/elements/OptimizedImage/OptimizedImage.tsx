import { useState, useEffect, useRef, memo } from 'react'
import './OptimizedImage.scss'

interface OptimizedImageProps {
	src: string
	alt: string
	className?: string
	width?: number
	height?: number
	quality?: 'low' | 'medium' | 'high'
	loading?: 'lazy' | 'eager'
	onLoad?: () => void
	onError?: () => void
}

/**
 * OptimizedImage component with lazy loading, quality control, and error handling
 * Reduces image quality for URLs when possible to improve performance
 */
const OptimizedImage: React.FC<OptimizedImageProps> = ({
	src,
	alt,
	className = '',
	width,
	height,
	quality = 'medium',
	loading = 'lazy',
	onLoad,
	onError,
}) => {
	const [isLoaded, setIsLoaded] = useState(false)
	const [hasError, setHasError] = useState(false)
	const imgRef = useRef<HTMLImageElement>(null)

	// Optimize image URL based on quality setting
	const getOptimizedSrc = (originalSrc: string): string => {
		if (!originalSrc) return ''

		// Validate URL before processing
		try {
			// Check if it's a valid URL
			const url = new URL(originalSrc, window.location.origin)

			// For IGDB images (images.igdb.com), use their built-in image optimization
			if (originalSrc.includes('images.igdb.com')) {
				// Replace thumb with appropriate size based on quality
				let sizeParam = 't_720p' // default medium
				if (quality === 'low') sizeParam = 't_cover_small'
				else if (quality === 'high') sizeParam = 't_1080p'

				// Replace existing size parameter or add it
				if (originalSrc.includes('/t_')) {
					return originalSrc.replace(/\/t_[^/]+\//, `/${sizeParam}/`)
				}
				// Insert before filename
				const lastSlash = originalSrc.lastIndexOf('/')
				return (
					originalSrc.slice(0, lastSlash + 1) + sizeParam + '/' + originalSrc.slice(lastSlash + 1)
				)
			}

			// For other URLs, attempt to add query parameters for quality control
			// (works with some CDNs like Cloudinary, Imgix, etc.)

			// Cloudinary optimization
			if (originalSrc.includes('cloudinary.com')) {
				const qualityMap = { low: 'q_50', medium: 'q_70', high: 'q_90' }
				const autoFormat = 'f_auto'
				const transforms = [qualityMap[quality], autoFormat]
				if (width) transforms.push(`w_${width}`)

				// Insert transformations in Cloudinary URL structure
				return originalSrc.replace('/upload/', `/upload/${transforms.join(',')}/`)
			}

			// Imgix optimization
			if (originalSrc.includes('imgix.net')) {
				const qualityMap = { low: 50, medium: 70, high: 90 }
				url.searchParams.set('q', qualityMap[quality].toString())
				url.searchParams.set('auto', 'format,compress')
				if (width) url.searchParams.set('w', width.toString())
				return url.toString()
			}

			// Return original if no optimization available
			return originalSrc
		} catch (error) {
			// If URL is invalid, log error and return empty string
			console.error('Invalid image URL:', originalSrc, error)
			return ''
		}
	}

	const optimizedSrc = getOptimizedSrc(src)

	// If URL is invalid, show error immediately
	useEffect(() => {
		if (!optimizedSrc && src) {
			setHasError(true)
		}
	}, [optimizedSrc, src])

	const handleLoad = () => {
		setIsLoaded(true)
		onLoad?.()
	}

	const handleError = () => {
		setHasError(true)
		onError?.()
	}

	// Intersection Observer for better lazy loading control
	useEffect(() => {
		if (loading === 'eager' || !imgRef.current) return

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						const img = entry.target as HTMLImageElement
						if (img.dataset.src && !img.src) {
							img.src = img.dataset.src
						}
					}
				})
			},
			{ rootMargin: '50px' } // Start loading 50px before image enters viewport
		)

		if (imgRef.current) {
			observer.observe(imgRef.current)
		}

		return () => {
			if (imgRef.current) {
				observer.unobserve(imgRef.current)
			}
		}
	}, [loading])

	if (hasError) {
		return (
			<div className={`optimized-image-error ${className}`}>
				<span className='optimized-image-error__text'>Image unavailable</span>
			</div>
		)
	}

	return (
		<div className={`optimized-image-container ${className}`}>
			{!isLoaded && (
				<div className='optimized-image-placeholder'>
					<div className='optimized-image-spinner' />
				</div>
			)}
			<img
				ref={imgRef}
				src={loading === 'eager' ? optimizedSrc : undefined}
				data-src={loading === 'lazy' ? optimizedSrc : undefined}
				alt={alt}
				className={`optimized-image ${isLoaded ? 'loaded' : ''}`}
				width={width}
				height={height}
				loading={loading}
				onLoad={handleLoad}
				onError={handleError}
				decoding='async'
			/>
		</div>
	)
}

export default memo(OptimizedImage)
