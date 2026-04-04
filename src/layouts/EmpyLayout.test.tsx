import { render, screen } from '@testing-library/react'
import { EmptyLayout } from './EmpyLayout'

describe('EmptyLayout', () => {
	it('renders children', () => {
		render(
			<EmptyLayout>
				<span>child</span>
			</EmptyLayout>
		)
		expect(screen.getByText('child')).toBeInTheDocument()
	})
})
