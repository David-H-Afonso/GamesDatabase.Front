import { describe, it, expect } from 'vitest'
import { searchGoogleImage } from './searchGoogleImage'

describe('searchGoogleImage', () => {
	it('opens a new window with the correct URL', () => {
		const gameName = 'The Legend of Zelda: Breath of the Wild'
		const additive = 'cover'
		const expectedUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`"' + ${gameName} + '" ${additive}`)}`

		// Mock window.open
		const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
		searchGoogleImage(gameName, additive)

		expect(openSpy).toHaveBeenCalledWith(expectedUrl, '_blank', 'noopener')
		openSpy.mockRestore()
	})

	it('handles special characters in game name', () => {
		const gameName = 'Super Mario Bros. 3'
		const additive = 'logo'
		const expectedUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`"' + ${gameName} + '" ${additive}`)}`

		// Mock window.open
		const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
		searchGoogleImage(gameName, additive)

		expect(openSpy).toHaveBeenCalledWith(expectedUrl, '_blank', 'noopener')
		openSpy.mockRestore()
	})
})
