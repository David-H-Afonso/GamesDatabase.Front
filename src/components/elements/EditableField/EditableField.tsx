import React, { useState } from 'react'
import './EditableField.scss'

interface EditableFieldProps {
	value: string | number | undefined
	type: string
	onSave: (value: string | number) => void
	placeholder: string
	formatter?: (val: string | number | undefined) => string
	className?: string
	style?: React.CSSProperties
}

export const EditableField: React.FC<EditableFieldProps> = ({
	value,
	type,
	onSave,
	placeholder,
	formatter,
	className,
	style,
}) => {
	const [isEditing, setIsEditing] = useState(false)
	const [currentValue, setCurrentValue] = useState(value)

	const handleSave = () => {
		if (currentValue !== undefined) {
			onSave(currentValue)
		}
		setIsEditing(false)
	}

	const showTitle = value
		? formatter
			? formatter(value)
			: value
			? String(value)
			: placeholder
		: placeholder

	return (
		<div
			style={style}
			className={`editable-field ${className || ''}`}
			onClick={() => setIsEditing(true)}
			title={showTitle}>
			{isEditing ? (
				<input
					type={type}
					value={currentValue}
					onChange={(e) => setCurrentValue(e.target.value)}
					onBlur={handleSave}
					onKeyDown={(e) => {
						if (e.key === 'Enter') {
							e.preventDefault()
							handleSave()
						}
					}}
					placeholder={placeholder}
					className='editable-field-input'
					autoFocus
				/>
			) : (
				<span className={`editable-field__trigger ${!value ? 'editable-field--empty' : ''}`}>
					{formatter ? formatter(value) : value || placeholder}
				</span>
			)}
		</div>
	)
}
