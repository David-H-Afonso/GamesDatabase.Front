import type { Game } from '@/models/api/Game'

const hasAllCachedAchievements = (game: Game) => Boolean(game.steamAchievementsTotal && game.steamAchievementsTotal > 0 && game.steamAchievementsUnlocked === game.steamAchievementsTotal)

/** Prefer the server policy; retain compatibility with older API responses. */
export const isGameFullyCompleted = (game: Game): boolean => game.isFullyCompleted ?? (hasAllCachedAchievements(game) || (!game.steamAppId && Boolean(game.isManuallyCompleted)))

export const isGameCompleted = (game: Game): boolean => game.isCompleted ?? (Boolean(game.isManuallyCompleted) || Boolean(game.steamCompletionPreserved) || (game.steamSetsCompleted ?? 0) > 0 || hasAllCachedAchievements(game))

export const completionLabelKey = (game: Game) => isGameFullyCompleted(game) ? 'game.card.full' : 'game.card.completed'

export const completionTitleKey = (game: Game) => isGameFullyCompleted(game) ? 'game.card.fullCompletionTitle' : 'game.card.completedTitle'
