let version = 0
const listeners = new Set<() => void>()
export const collectionVersion = () => version
export const subscribeCollection = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
export const invalidateCollection = () => { version++; listeners.forEach(listener => listener()) }
export const collectionChanged = <T,>(result: T): T => { invalidateCollection(); return result }
export const isCollectionConflict = (error: unknown) => Boolean(error && typeof error === 'object' && 'status' in error && (error.status === 409 || error.status === 412)) || error instanceof Error && /\bHTTP (?:409|412)\b/.test(error.message)
