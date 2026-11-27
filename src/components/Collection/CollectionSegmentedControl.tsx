import { useId } from 'react'
import './CollectionSegmentedControl.scss'

export interface CollectionSegment<T extends string> { value: T; label: string; description?: string }
interface Props<T extends string> { label: string; value: T; options: ReadonlyArray<CollectionSegment<T>>; onChange: (value: T) => void; disabled?: boolean; className?: string }

/** Native single-choice semantics and arrow-key behavior, presented as compact buttons. */
export const CollectionSegmentedControl = <T extends string,>({ label, value, options, onChange, disabled = false, className = '' }: Props<T>) => {
	const id = useId()
	return <fieldset className={`gdb-segmented-control ${className}`} disabled={disabled}>
		<legend>{label}</legend>
		<div className='gdb-segmented-control__options'>{options.map((option, index) => <label key={option.value} className='gdb-segmented-control__option' data-selected={value === option.value} title={option.description}>
			<input type='radio' className='sr-only' name={id} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} aria-labelledby={`${id}-${index}-label`} aria-describedby={option.description ? `${id}-${index}-description` : undefined} />
			<span id={`${id}-${index}-label`}>{option.label}</span>{option.description && <span id={`${id}-${index}-description`} className='sr-only'>{option.description}</span>}
		</label>)}</div>
	</fieldset>
}
