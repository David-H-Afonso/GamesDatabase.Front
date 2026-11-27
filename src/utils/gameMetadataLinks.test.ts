import { describe, expect, it } from 'vitest'
import { metadataCriticUrl } from './gameMetadataLinks'

describe('public critic destinations are provider-bound, not arbitrary outbound links', () => {
	it.each([
		['Metacritic', 'https://www.metacritic.com/game/hades/'],
		['Metacritic', 'https://www.metacritic.com/game/pc/hades/'],
		['OpenCritic', 'https://opencritic.com/game/10181/hades'],
	])('accepts a canonical %s page %s', (provider, url) => { expect(metadataCriticUrl(provider, url)).toBe(true) })
	it.each([
		['SteamDB', 'https://steamdb.info/app/1145360/'], [undefined, 'https://opencritic.com/game/10181/hades'],
		['Metacritic', 'javascript:alert(1)'], ['Metacritic', 'https://www.metacritic.com.evil.invalid/game/hades/'],
		['Metacritic', 'https://fixture:password@www.metacritic.com/game/hades/'], ['Metacritic', 'https://www.metacritic.com/game/hades/?redirect=1'],
		['OpenCritic', 'https://opencritic.com/game/0/hades'], ['OpenCritic', 'https://opencritic.com/game/10181/hades#redirect'],
		['OpenCritic', null], ['OpenCritic', 'https://opencritic.com/game/10181/' + 'a'.repeat(601)],
	])('rejects unverified %s destination %#', (provider, url) => { expect(metadataCriticUrl(provider, url)).toBe(false) })
})
