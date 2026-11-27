import type { GameView } from '@/models/api/GameView'

/** Pinned positions stay fixed; empty positions use LRU membership in stable manual order. */
export const recentGameViews = <T extends Pick<GameView, 'id' | 'lastUsedAt' | 'pinnedSlot'>>(views: T[]): T[] => {
	const slots: Array<T | undefined> = [undefined, undefined]
	for (const view of views) if ((view.pinnedSlot === 1 || view.pinnedSlot === 2) && !slots[view.pinnedSlot - 1]) slots[view.pinnedSlot - 1] = view
	const pinned = slots.filter((view): view is T => view !== undefined)
	const ids = new Set(pinned.map(view => view.id))
	const recent = views.map((view, index) => ({ view, index, time: Date.parse(view.lastUsedAt ?? '') || 0 }))
		.filter(item => !ids.has(item.view.id)).sort((left, right) => right.time - left.time || left.index - right.index)
		.slice(0, 2 - pinned.length).sort((left, right) => left.index - right.index).map(item => item.view)
	for (let index = 0; index < slots.length; index++) if (!slots[index]) slots[index] = recent.shift()
	return slots.filter((view): view is T => view !== undefined)
}
