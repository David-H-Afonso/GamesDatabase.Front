import type { ButtonHTMLAttributes, ReactNode } from 'react'
import './IconButton.scss'

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
	label: string
	icon: ReactNode
	variant?: 'default' | 'primary' | 'danger'
	size?: 'sm' | 'md'
}

export const IconButton = ({ label, icon, variant = 'default', size = 'md', className, type = 'button', ...rest }: IconButtonProps) => (
	<button type={type} className={`icon-button icon-button--${variant} icon-button--${size}${className ? ` ${className}` : ''}`} title={label} aria-label={label} {...rest}>
		{icon}
	</button>
)

export default IconButton
