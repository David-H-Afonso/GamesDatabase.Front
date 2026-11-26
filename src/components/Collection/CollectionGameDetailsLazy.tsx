import { lazy, Suspense, type ComponentProps } from 'react'

const Details = lazy(() => import('./CollectionGameDetails').then(module => ({ default: module.CollectionGameDetails })))
type Props = ComponentProps<typeof import('./CollectionGameDetails')['CollectionGameDetails']>

/** Load the existing Steam, Replay, History and provider tooling only when a game is opened. */
export const CollectionGameDetails = (props: Props) => <Suspense fallback={null}><Details {...props} /></Suspense>
