import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PortalDropdown from './PortalDropdown'

describe('PortalDropdown', () => {
	afterEach(() => {
		// Clean up any portal containers appended to body during tests
		document.querySelectorAll('[id="dropdown-portal"] > div').forEach((el) => el.remove())
	})

	it('renders children in the document', () => {
		render(
			<PortalDropdown>
				<span>Dropdown content</span>
			</PortalDropdown>
		)
		expect(screen.getByText('Dropdown content')).toBeInTheDocument()
	})

	it('calls onClick when the portal wrapper is clicked', () => {
		const onClick = vi.fn()
		render(
			<PortalDropdown onClick={onClick}>
				<button>Click target</button>
			</PortalDropdown>
		)
		fireEvent.click(screen.getByRole('button'))
		expect(onClick).toHaveBeenCalled()
	})

	it('renders into a custom container when containerId matches an existing element', () => {
		const container = document.createElement('div')
		container.id = 'test-portal-container'
		document.body.appendChild(container)

		render(
			<PortalDropdown containerId='test-portal-container'>
				<span data-testid='portal-child'>In portal</span>
			</PortalDropdown>
		)

		expect(container.querySelector('[data-testid="portal-child"]')).toBeTruthy()
		document.body.removeChild(container)
	})
})
