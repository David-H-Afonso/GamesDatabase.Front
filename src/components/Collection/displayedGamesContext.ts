import { createContext, useContext } from 'react'

export interface DisplayedGamesScope { ownerId: number; route: string; signature: string; gameIds: number[]; loading: boolean }
export const DisplayedGamesContext = createContext<{ scope: DisplayedGamesScope | null; register: (scope: DisplayedGamesScope) => () => void } | null>(null)
export const useDisplayedGamesScope = () => useContext(DisplayedGamesContext)
