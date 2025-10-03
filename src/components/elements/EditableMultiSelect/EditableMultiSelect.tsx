import React, { useState, useRef, useEffect } from 'react'
import './EditableMultiSelect.scss'

interface Option {
	id: number
	name: string
	color?: string
}

interface EditableMultiSelectProps {
	values: number[]
	displayValues: string[]
	options: Option[]
	onSave: (values: number[]) => Promise<void>
	placeholder?: string
	className?: string
	dropdownOnly?: boolean
}

export const EditableMultiSelect: React.FC<EditableMultiSelectProps> = ({
	values = [],
	displayValues = [],
	options,
	onSave,
	placeholder = 'Select...',
	className = '',
	dropdownOnly = false,
}) => {
	const [isOpen, setIsOpen] = useState(dropdownOnly)
	const [isSaving, setIsSaving] = useState(false)
	const dropdownRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsOpen(false)
			}
		}

		if (isOpen && !dropdownOnly) {
			document.addEventListener('mousedown', handleClickOutside)
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [isOpen, dropdownOnly])

	const handleClick = () => {
		if (!isSaving && !dropdownOnly) {
			setIsOpen(!isOpen)
		}
	}

	const handleToggle = async (optionId: number) => {
		if (isSaving) return

		const newValues = values.includes(optionId)
			? values.filter((id) => id !== optionId)
			: [...values, optionId]

		setIsSaving(true)
		try {
			await onSave(newValues)
		} catch (error) {
			console.error('Error saving selection:', error)
		} finally {
			setIsSaving(false)
		}
	}

	const getDisplayText = () => {
		if (displayValues.length === 0) return placeholder
		if (displayValues.length === 1) return displayValues[0]
		return `${displayValues[0]} +${displayValues.length - 1}`
	}

	const [hoveredOption, setHoveredOption] = useState<Option | null>(null)
	const showTitle = hoveredOption
		? hoveredOption.name
		: displayValues.length > 0
		? displayValues.join(', ')
		: placeholder

	return (
		<div ref={dropdownRef} className={`editable-multi-select ${className}`} title={showTitle}>
			{!dropdownOnly && (
				<span
					onClick={handleClick}
					className={`editable-multi-select__trigger ${
						isOpen ? 'editable-multi-select__trigger--open' : ''
					} ${displayValues.length === 0 ? 'editable-multi-select__trigger--empty' : ''}`}>
					<span className='editable-multi-select__trigger-text'>{getDisplayText()}</span>
					<span className='editable-multi-select__arrow'>▼</span>
				</span>
			)}

			{(isOpen || dropdownOnly) && (
				<div className='editable-multi-select__dropdown'>
					{options.map((option) => {
						const isSelected = values.includes(option.id)
						return (
							<div
								key={option.id}
								onMouseEnter={() => setHoveredOption(option)}
								onMouseLeave={() => setHoveredOption(null)}
								onClick={() => handleToggle(option.id)}
								className={`editable-multi-select__option ${
									isSelected ? 'editable-multi-select__option--selected' : ''
								} ${isSaving ? 'editable-multi-select__option--disabled' : ''}`}
								style={
									option.color
										? ({ ['--option-bg' as any]: option.color } as React.CSSProperties)
										: undefined
								}>
								<label className='editable-multi-select__checkbox'>
									<input
										type='checkbox'
										checked={isSelected}
										onChange={() => {}}
										onClick={(e) => e.stopPropagation()}
										disabled={isSaving}
									/>
									<span className='editable-multi-select__checkmark'></span>
								</label>
								<span
									style={{
										background: `${option.color}66`,
										border: `1px solid ${option.color}99`,
									}}
									className='editable-multi-select__option-name'>
									{option.name}
								</span>
							</div>
						)
					})}
				</div>
			)}
		</div>
	)
}
