import React, { useState, useRef, useEffect, useCallback } from 'react'
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

const MAX_DROPDOWN_HEIGHT = 240

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
	const [dropUp, setDropUp] = useState(false)
	const [maxHeight, setMaxHeight] = useState(MAX_DROPDOWN_HEIGHT)
	const containerRef = useRef<HTMLDivElement>(null)
	const triggerRef = useRef<HTMLButtonElement>(null)

	// Decide whether to open upwards and how tall the dropdown may be, based on
	// the space available around the trigger so it never leaves the viewport.
	const measurePlacement = useCallback(() => {
		if (dropdownOnly) return
		const rect = triggerRef.current?.getBoundingClientRect()
		if (!rect) return
		const spaceBelow = window.innerHeight - rect.bottom - 12
		const spaceAbove = rect.top - 12
		const openUp = spaceBelow < 180 && spaceAbove > spaceBelow
		setDropUp(openUp)
		setMaxHeight(Math.max(140, Math.min(MAX_DROPDOWN_HEIGHT, openUp ? spaceAbove : spaceBelow)))
	}, [dropdownOnly])

	useEffect(() => {
		if (!isOpen || dropdownOnly) return
		measurePlacement()
		const handleClickOutside = (event: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
				setIsOpen(false)
			}
		}
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				setIsOpen(false)
				triggerRef.current?.focus()
			}
		}
		document.addEventListener('mousedown', handleClickOutside)
		document.addEventListener('keydown', handleKeyDown)
		window.addEventListener('resize', measurePlacement)
		window.addEventListener('scroll', measurePlacement, true)

		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
			document.removeEventListener('keydown', handleKeyDown)
			window.removeEventListener('resize', measurePlacement)
			window.removeEventListener('scroll', measurePlacement, true)
		}
	}, [isOpen, dropdownOnly, measurePlacement])

	const handleClick = () => {
		if (!isSaving && !dropdownOnly) {
			setIsOpen(!isOpen)
		}
	}

	const handleToggle = async (optionId: number) => {
		if (isSaving) return

		const newValues = values.includes(optionId) ? values.filter((id) => id !== optionId) : [...values, optionId]

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
		const effectiveDisplayValues = values.length > 0 ? options.filter((o) => values.includes(o.id)).map((o) => o.name) : displayValues
		if (effectiveDisplayValues.length === 0) return placeholder
		if (effectiveDisplayValues.length === 1) return effectiveDisplayValues[0]
		return `${effectiveDisplayValues[0]} +${effectiveDisplayValues.length - 1}`
	}

	const [hoveredOption, setHoveredOption] = useState<Option | null>(null)
	const effectiveDisplayValues = values.length > 0 ? options.filter((o) => values.includes(o.id)).map((o) => o.name) : displayValues
	const showTitle = hoveredOption ? hoveredOption.name : effectiveDisplayValues.length > 0 ? effectiveDisplayValues.join(', ') : placeholder

	return (
		<div ref={containerRef} className={`editable-multi-select ${className}`} title={showTitle}>
			{!dropdownOnly && (
				<button
					type='button'
					ref={triggerRef}
					onClick={handleClick}
					aria-haspopup='listbox'
					aria-expanded={isOpen}
					disabled={isSaving}
					className={`editable-multi-select__trigger ${isOpen ? 'editable-multi-select__trigger--open' : ''} ${
						displayValues.length === 0 ? 'editable-multi-select__trigger--empty' : ''
					}`}>
					<span className='editable-multi-select__trigger-text'>{getDisplayText()}</span>
					<span className='editable-multi-select__arrow'>▼</span>
				</button>
			)}

			{(isOpen || dropdownOnly) && (
				<div
					className={`editable-multi-select__dropdown${dropUp ? ' editable-multi-select__dropdown--up' : ''}`}
					role='listbox'
					aria-multiselectable='true'
					style={dropdownOnly ? undefined : { maxHeight }}>
					{options.map((option) => {
						const isSelected = values.includes(option.id)
						return (
							<div
								key={option.id}
								role='option'
								aria-selected={isSelected}
								onMouseEnter={() => setHoveredOption(option)}
								onMouseLeave={() => setHoveredOption(null)}
								onClick={() => handleToggle(option.id)}
								className={`editable-multi-select__option ${isSelected ? 'editable-multi-select__option--selected' : ''} ${
									isSaving ? 'editable-multi-select__option--disabled' : ''
								}`}
								style={option.color ? ({ ['--option-bg' as any]: option.color } as React.CSSProperties) : undefined}>
								<label className='editable-multi-select__checkbox'>
									<input type='checkbox' checked={isSelected} onChange={() => {}} onClick={(e) => e.stopPropagation()} disabled={isSaving} />
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
