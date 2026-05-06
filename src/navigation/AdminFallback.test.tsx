import { render } from '@testing-library/react'
import AdminFallback from './AdminFallback'

vi.mock('./AdminFallback.scss', () => ({}))

describe('AdminFallback', () => {
	it('renders skeleton layout', () => {
		const { container } = render(<AdminFallback />)
		expect(container.querySelector('.admin-fallback')).toBeInTheDocument()
		expect(container.querySelector('.admin-fallback__sidebar')).toBeInTheDocument()
		expect(container.querySelector('.admin-fallback__content')).toBeInTheDocument()
	})

	it('renders sidebar bones', () => {
		const { container } = render(<AdminFallback />)
		const sidebarBones = container.querySelectorAll('.admin-fallback__sidebar .admin-fallback-bone')
		expect(sidebarBones).toHaveLength(6)
	})

	it('renders content row bones', () => {
		const { container } = render(<AdminFallback />)
		const rows = container.querySelectorAll('.admin-fallback-bone--row')
		expect(rows).toHaveLength(5)
	})
})
