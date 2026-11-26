import { describe, expect, it } from 'vitest'
import { steamLaunchUrl } from './steamLaunch'

describe('Steam client play link — no game is launched by these tests', () => {
	it('uses only a validated App ID with the run-game protocol', () => { expect(steamLaunchUrl(570)).toBe('steam://rungameid/570') })
	it.each([null, undefined, 0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 2147483648])('rejects invalid ID %s', value => { expect(steamLaunchUrl(value)).toBeNull() })
})
