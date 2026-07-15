import type { FC } from 'react'
import './GameCardSkeleton.scss'

interface Props {
	variant?: 'card' | 'row' | 'cover'
	index?: number
}

const GameCardSkeleton: FC<Props> = ({ variant = 'card', index = 0 }) => {
	// Stagger the pulse animation so cards don't all pulse in sync
	const delay = `${(index % 8) * 0.1}s`

	if (variant === 'row') {
		return (
			<div className='gc-skeleton gc-skeleton--row' style={{ animationDelay: delay }}>
				<div className='gc-skeleton__bone gc-skeleton__bone--checkbox' />
				<div className='gc-skeleton__bone gc-skeleton__bone--status' />
				<div className='gc-skeleton__bone gc-skeleton__bone--name' />
				<div className='gc-skeleton__bone gc-skeleton__bone--score' />
				<div className='gc-skeleton__bone gc-skeleton__bone--score' />
				<div className='gc-skeleton__bone gc-skeleton__bone--score gc-skeleton__bone--hide-mobile' />
				<div className='gc-skeleton__bone gc-skeleton__bone--score gc-skeleton__bone--hide-mobile' />
			</div>
		)
	}

	return (
		<div className={`gc-skeleton gc-skeleton--${variant === 'cover' ? 'cover' : 'card'}`} style={{ animationDelay: delay }}>
			<div className='gc-skeleton__cover' />
			<div className='gc-skeleton__body'>
				<div className='gc-skeleton__bone gc-skeleton__bone--title' />
				<div className='gc-skeleton__bone gc-skeleton__bone--subtitle' />
				<div className='gc-skeleton__chips'>
					<div className='gc-skeleton__bone gc-skeleton__bone--chip' />
					<div className='gc-skeleton__bone gc-skeleton__bone--chip' />
				</div>
			</div>
		</div>
	)
}

export { GameCardSkeleton }
