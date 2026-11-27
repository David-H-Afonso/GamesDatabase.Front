let version = 0
const listeners = new Set<() => void>()
export const collectionVersion = () => version
export const subscribeCollection = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
export const invalidateCollection = () => { version++; listeners.forEach(listener => listener()) }
export const collectionChanged = <T,>(result: T): T => { invalidateCollection(); return result }
export const isCollectionConflict = (error: unknown) => Boolean(error && typeof error === 'object' && 'status' in error && (error.status === 409 || error.status === 412)) || error instanceof Error && /\bHTTP (?:409|412)\b/.test(error.message)

// Display retry only: never clear a stored role URL to force an image remount.
const artworkRevisions = new Map<number, number>()
const artworkListeners = new Set<() => void>()
export const gameArtworkRevision = (id?: number) => id == null ? 0 : artworkRevisions.get(id) ?? 0
export const subscribeGameArtwork = (listener: () => void) => { artworkListeners.add(listener); return () => { artworkListeners.delete(listener) } }
export const gameArtworkRefreshed = (id: number) => { if (!Number.isSafeInteger(id) || id <= 0) return; artworkRevisions.set(id, gameArtworkRevision(id) + 1); artworkListeners.forEach(listener => listener()) }
