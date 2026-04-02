import { describe, it, expect } from 'vitest'

describe('Test infrastructure', () => {
	it('Vitest is configured and running', () => {
		expect(true).toBe(true)
	})

	it('can use @testing-library/jest-dom matchers', () => {
		const div = document.createElement('div')
		div.textContent = 'hello'
		document.body.appendChild(div)

		expect(div).toBeInTheDocument()
		expect(div).toHaveTextContent('hello')

		div.remove()
	})
})
