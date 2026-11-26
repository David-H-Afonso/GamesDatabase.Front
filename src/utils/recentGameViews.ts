import type { GameView } from '@/models/api/GameView'

/** Use true LRU membership, but retain manual order within the pair so reuse never shuffles buttons. */
export const recentGameViews = <T extends Pick<GameView, 'id' | 'lastUsedAt'>>(views: T[]): T[] => views
	.map((view, index) => ({ view, index, time: Date.parse(view.lastUsedAt ?? '') || 0 }))
	.sort((left, right) => right.time - left.time || left.index - right.index)
	.slice(0, 2).sort((left, right) => left.index - right.index).map(item => item.view)
