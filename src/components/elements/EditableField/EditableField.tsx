import React, { useState } from 'react'
import './EditableField.scss'

interface EditableFieldProps {
	allowEditing?: boolean
	className?: string
	formatter?: (val: string | number | undefined) => string
	onSave: (value: string | number) => void
	placeholder: string
	style?: React.CSSProperties
	type: string
	value: string | number | undefined
	allowEmpty?: boolean // New prop to control if empty values can be saved
}

export const EditableField: React.FC<EditableFieldProps> = ({
	allowEditing = true,
	className,
	formatter,
	onSave,
	placeholder,
	style,
	type,
	value,
	allowEmpty = true, // Default to true for backwards compatibility
}) => {
	const [isEditing, setIsEditing] = useState(false)
	const [currentValue, setCurrentValue] = useState<string | number | undefined>(value)
	const hasValue = value !== undefined && value !== null && currentValue !== ''
	const showTitle = hasValue ? (formatter ? formatter(value) : String(value)) : placeholder

	const handleSave = () => {
		// Check if value is empty
		const isEmpty = currentValue === undefined || currentValue === null || currentValue === ''

		// If empty and not allowed, don't save (just close editing)
		if (isEmpty && !allowEmpty) {
			setIsEditing(false)
			setCurrentValue(value) // Reset to original value
			return
		}

		// Allow saving empty strings to clear fields (if allowEmpty is true)
		const valueToSave = isEmpty ? '' : currentValue
		onSave(valueToSave)
		setIsEditing(false)
	}

	return (
		<div
			style={style}
			className={`editable-field ${className || ''}`}
			onClick={() => setIsEditing(true)}
			title={showTitle}>
			{isEditing && allowEditing ? (
				type === 'textarea' ? (
					<textarea
						value={currentValue === undefined || currentValue === null ? '' : String(currentValue)}
						onChange={(e) => setCurrentValue(e.target.value)}
						onBlur={handleSave}
						onKeyDown={(e) => {
							if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
								e.preventDefault()
								handleSave()
							}
						}}
						placeholder={placeholder}
						className='editable-field-input editable-field-textarea'
						autoFocus
					/>
				) : (
					<input
						type={type}
						value={currentValue === undefined || currentValue === null ? '' : String(currentValue)}
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
				)
			) : (
				<span
					className={`editable-field__trigger ${!hasValue ? 'editable-field--empty' : ''}`}
					style={{ whiteSpace: 'pre-wrap' }}>
					{formatter ? formatter(value) : hasValue ? String(value) : placeholder}
				</span>
			)}
		</div>
	)
}
