import { type FormEvent, type ReactNode, useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '@/components/elements'
import './AdminCrudModal.scss'

export interface AdminCrudModalProps {
	title: string
	name: string
	onNameChange: (value: string) => void
	color: string
	onColorChange: (value: string) => void
	submitLabel: string
	onClose: () => void
	onSubmit: (event: FormEvent) => void | Promise<void>
	children?: ReactNode
}

export const AdminCrudModal = ({ title, name, onNameChange, color, onColorChange, submitLabel, onClose, onSubmit, children }: AdminCrudModalProps) => {
	const { t } = useTranslation()
	const id = useId()
	const submitting = useRef(false)
	const errorRef = useRef<HTMLParagraphElement>(null)
	const [saving, setSaving] = useState(false)
	const [failed, setFailed] = useState(false)
	useEffect(() => { if (failed && !saving) errorRef.current?.focus() }, [failed, saving])
	const submit = async (event: FormEvent) => {
		event.preventDefault()
		if (submitting.current) return
		submitting.current = true
		setSaving(true)
		setFailed(false)
		try { await onSubmit(event) }
		catch { setFailed(true) }
		finally { submitting.current = false; setSaving(false) }
	}

	return (
		<Modal isOpen onClose={() => { if (!submitting.current) onClose() }} closeDisabled={saving} bodyLabel={saving ? t('admin.crud.pendingFormLabel', { title }) : undefined} title={title} maxWidth='500px'>
			<form onSubmit={event => void submit(event)} className='admin-crud-modal' aria-busy={saving}>
				{failed && <p ref={errorRef} tabIndex={-1} role='alert' className='admin-crud-modal__error'>{t('admin.crud.saveError')}</p>}
				<fieldset disabled={saving}>
				<div className='form-group'>
					<label htmlFor={`${id}-name`}>{t('admin.crud.form.nameLabel')}</label>
					<input type='text' id={`${id}-name`} value={name} onChange={(event) => onNameChange(event.target.value)} required />
				</div>
				<div className='form-group'>
					<label htmlFor={`${id}-color`}>{t('admin.crud.form.colorLabel')}</label>
					<div className='admin-crud-modal__color'>
						<input type='color' aria-label={t('admin.crud.form.colorPickerLabel')} value={color || '#000000'} onChange={(event) => onColorChange(event.target.value)} />
						<input type='text' id={`${id}-color`} value={color} onChange={(event) => onColorChange(event.target.value)} placeholder='#000000' pattern='^#[0-9A-Fa-f]{6}$' />
					</div>
				</div>
				{children}
				<div className='modal-footer'>
					<button type='button' className='btn btn-secondary' onClick={onClose}>
						{t('admin.crud.cancel')}
					</button>
					<button type='submit' className='btn btn-primary'>
						{saving ? t('admin.crud.saving') : submitLabel}
					</button>
				</div>
				</fieldset>
			</form>
		</Modal>
	)
}
