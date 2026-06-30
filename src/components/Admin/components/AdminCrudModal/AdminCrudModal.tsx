import type { FormEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import './AdminCrudModal.scss'

export interface AdminCrudModalProps {
	title: string
	name: string
	onNameChange: (value: string) => void
	color: string
	onColorChange: (value: string) => void
	submitLabel: string
	onClose: () => void
	onSubmit: (event: FormEvent) => void
	children?: ReactNode
}

export const AdminCrudModal = ({ title, name, onNameChange, color, onColorChange, submitLabel, onClose, onSubmit, children }: AdminCrudModalProps) => {
	const { t } = useTranslation()

	return (
		<div className='modal-overlay'>
			<div className='modal'>
				<div className='modal-header'>
					<h2>{title}</h2>
					<button type='button' className='close-btn' onClick={onClose}>
						{t('admin.crud.close')}
					</button>
				</div>
				<form onSubmit={onSubmit} className='modal-body'>
					<div className='form-group'>
						<label htmlFor='name'>{t('admin.crud.form.nameLabel')}</label>
						<input type='text' id='name' value={name} onChange={(event) => onNameChange(event.target.value)} required />
					</div>
					<div className='form-group'>
						<label htmlFor='color'>{t('admin.crud.form.colorLabel')}</label>
						<div className='admin-crud-modal__color'>
							<input type='color' id='colorPicker' value={color || '#000000'} onChange={(event) => onColorChange(event.target.value)} />
							<input type='text' id='color' value={color} onChange={(event) => onColorChange(event.target.value)} placeholder='#000000' pattern='^#[0-9A-Fa-f]{6}$' />
						</div>
					</div>
					{children}
					<div className='modal-footer'>
						<button type='button' className='btn btn-secondary' onClick={onClose}>
							{t('admin.crud.cancel')}
						</button>
						<button type='submit' className='btn btn-primary'>
							{submitLabel}
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}
