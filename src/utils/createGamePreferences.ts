const steamSearchKey = (ownerId: number | undefined) => Number.isSafeInteger(ownerId) && Number(ownerId) > 0 ? `gdb:create-game:steam-search:v1:${ownerId}` : null

/** Only an explicit on/off preference is persisted, never a draft, title or session. */
export const readCreateSteamPreference = (ownerId: number | undefined): boolean => {
	const key = steamSearchKey(ownerId)
	if (!key || typeof window === 'undefined') return false
	try { return window.localStorage.getItem(key) === 'true' } catch { return false }
}

export const saveCreateSteamPreference = (ownerId: number | undefined, enabled: boolean): void => {
	const key = steamSearchKey(ownerId)
	if (!key || typeof window === 'undefined') return
	try { window.localStorage.setItem(key, String(enabled)) } catch { /* Private/blocked storage must not prevent creation. */ }
}
