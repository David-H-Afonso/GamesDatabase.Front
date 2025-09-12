import type { ButtonProps } from '@/models/components/elements/Button'
import type { FC } from 'react'

export const Button: FC<ButtonProps> = (props) => {
	const { title, onPress } = props

	return (
		<button className='amazing-button' onClick={onPress}>
			{title}
		</button>
	)
}
