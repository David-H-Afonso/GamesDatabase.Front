import React, { useState, useRef, useEffect } from 'react'
import './EditableSelect.scss'

interface Option {
	id: number
	name: string
	color?: string
}

interface EditableSelectProps {
	value: number | undefined
	displayValue: string | undefined
	options: Option[]
	onSave: (value: number | undefined) => Promise<void>
	placeholder?: string
	className?: string
	dropdownOnly?: boolean
}

export const EditableSelect: React.FC<EditableSelectProps> = ({ value, displayValue, options, onSave, placeholder = 'Select...', className = '', dropdownOnly = false }) => {
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

	const handleSelect = async (optionId: number) => {
		if (isSaving) return

		const newValue = optionId === value ? undefined : optionId

		setIsSaving(true)
		try {
			await onSave(newValue)
			setIsOpen(false)
		} catch (error) {
			console.error('Error saving selection:', error)
		} finally {
			setIsSaving(false)
		}
	}

	const [hoveredOption, setHoveredOption] = useState<Option | null>(null)
	const selectedOption = options.find((option) => option.id === value)
	const showTitle = hoveredOption ? hoveredOption.name : selectedOption ? selectedOption.name : placeholder

	return (
		<div ref={dropdownRef} className={`editable-select ${className}`} title={showTitle}>
			{!dropdownOnly && (
				<span
					onClick={handleClick}
					className={`editable-select__trigger ${isOpen ? 'editable-select__trigger--open' : ''} ${!displayValue ? 'editable-select__trigger--empty' : ''}`}>
					<span className='editable-select__trigger-text'>{displayValue || placeholder}</span>
					<span className='editable-select__arrow'>▼</span>
				</span>
			)}

			{(isOpen || dropdownOnly) && (
				<div className='editable-select__dropdown'>
					{options.map((option) => (
						<div
							key={option.id}
							onMouseEnter={() => setHoveredOption(option)}
							onMouseLeave={() => setHoveredOption(null)}
							onClick={() => handleSelect(option.id)}
							className={`editable-select__option ${option.id === value ? 'editable-select__option--selected' : ''}`}
							style={option.color ? ({ ['--option-bg' as any]: option.color } as React.CSSProperties) : undefined}>
							<span
								style={{
									background: `${option.color}66`,
									border: `1px solid ${option.color}99`,
								}}
								className='editable-select__option-name'>
								{option.name}
							</span>
							{option.id === value && <span className='editable-select__check'>✓</span>}
						</div>
					))}
				</div>
			)}
		</div>
	)
}
