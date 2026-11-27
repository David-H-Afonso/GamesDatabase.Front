import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import i18n from '@/i18n'
import { AdminCrudModal } from './AdminCrudModal'

const renderModal = (onSubmit = vi.fn(), onClose = vi.fn()) => {
	const Fixture = () => {
		const [name, setName] = useState('Retained catalog draft')
		return <AdminCrudModal title='Catalog fixture' name={name} onNameChange={setName} color='#112233' onColorChange={vi.fn()} submitLabel='Save fixture' onSubmit={onSubmit} onClose={onClose} />
	}
	return renderWithProviders(<Fixture />)
}

describe('shared catalog editor failure boundary', () => {
	it('names both the native color picker and editable hex value', () => {
		renderModal()
		expect(screen.getByLabelText(i18n.t('admin.crud.form.colorPickerLabel'))).toHaveAttribute('type', 'color')
		expect(screen.getByLabelText(i18n.t('admin.crud.form.colorLabel'))).toHaveAttribute('type', 'text')
	})

	it('keeps the draft and announces a safe failed save inside the active dialog before explicit retry', async () => {
		const onSubmit = vi.fn().mockRejectedValueOnce(new Error('private-fixture-path')).mockResolvedValue(undefined)
		renderModal(onSubmit)
		await userEvent.click(screen.getByRole('button', { name: 'Save fixture' }))
		const dialog = screen.getByRole('dialog', { name: 'Catalog fixture' })
		const error = await within(dialog).findByRole('alert')
		expect(error).toHaveTextContent(i18n.t('admin.crud.saveError'))
		expect(error).toHaveFocus()
		expect(dialog).not.toHaveTextContent('private-fixture-path')
		expect(within(dialog).getByLabelText(i18n.t('admin.crud.form.nameLabel'))).toHaveValue('Retained catalog draft')
		expect(onSubmit).toHaveBeenCalledOnce()
		await userEvent.click(within(dialog).getByRole('button', { name: 'Save fixture' }))
		expect(onSubmit).toHaveBeenCalledTimes(2)
		await waitFor(() => expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument())
	})

	it('bounds a pending save to one request and prevents dismissal or draft changes until it settles', async () => {
		let finish!: () => void
		const pending = new Promise<void>(resolve => { finish = resolve })
		const onSubmit = vi.fn(() => pending), onClose = vi.fn()
		renderModal(onSubmit, onClose)
		const form = screen.getByRole('button', { name: 'Save fixture' }).closest('form')!
		fireEvent.submit(form); fireEvent.submit(form)
		expect(onSubmit).toHaveBeenCalledOnce()
		expect(screen.getByLabelText(i18n.t('admin.crud.form.nameLabel'))).toBeDisabled()
		expect(screen.getByRole('button', { name: i18n.t('common.close') })).toBeDisabled()
		fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
		fireEvent.click(document.querySelector('.modal-overlay')!)
		expect(onClose).not.toHaveBeenCalled()
		await act(async () => { finish(); await pending })
		expect(screen.getByRole('button', { name: 'Save fixture' })).toBeEnabled()
	})

	it('exposes a named read-only body to keyboard readers only while the catalog fields are disabled', async () => {
		let finish!: () => void
		const pending = new Promise<void>(resolve => { finish = resolve })
		renderModal(vi.fn(() => pending))
		expect(screen.queryByRole('region')).not.toBeInTheDocument()
		await userEvent.click(screen.getByRole('button', { name: 'Save fixture' }))
		const region = screen.getByRole('region', { name: i18n.t('admin.crud.pendingFormLabel', { title: 'Catalog fixture' }) })
		expect(region).toHaveAttribute('tabindex', '0')
		expect(region).toHaveFocus()
		await act(async () => { finish(); await pending })
		expect(screen.queryByRole('region')).not.toBeInTheDocument()
	})
})
