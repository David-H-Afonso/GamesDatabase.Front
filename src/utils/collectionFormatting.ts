import type { Game } from '@/models/api/Game'
export const collectionLocale = (language: string) => language.startsWith('es') ? 'es-ES' : 'en-US'
type Playtime = Pick<Game, 'manualPlaytimeMinutes' | 'steamPlaytimeForever' | 'manualPlaytimeIsAdditive'>
export const effectivePlaytime = (game: Playtime) => (game.manualPlaytimeMinutes ?? 0) > 0
	? game.manualPlaytimeMinutes! + (game.manualPlaytimeIsAdditive ? game.steamPlaytimeForever ?? 0 : 0)
	: game.steamPlaytimeForever ?? null
export const playtimeSourceKey = (game: Playtime) => (game.manualPlaytimeMinutes ?? 0) > 0
	? game.manualPlaytimeIsAdditive && game.steamPlaytimeForever != null ? 'gallery.statistics.manualAdded' : 'gallery.statistics.manual'
	: 'gallery.statistics.steam'
export const formatCollectionNumber = (value: number, language: string, maximumFractionDigits = 1) => new Intl.NumberFormat(collectionLocale(language), { maximumFractionDigits }).format(value)
export const storedIsoDate = (value?: string | null) => {
	if (!value || !/^\d{4}-\d{2}-\d{2}(?:$|T|\s)/.test(value)) return null
	const iso = value.slice(0, 10), date = new Date(`${iso}T12:00:00Z`)
	return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === iso ? iso : null
}
export const formatCollectionDate = (value: string | null | undefined, language: string) => {
	const iso = storedIsoDate(value)
	return iso ? new Intl.DateTimeFormat(collectionLocale(language), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`)) : value || '—'
}
export const collectionMonth = (month: number, language: string, short = false) => new Intl.DateTimeFormat(collectionLocale(language), { month: short ? 'short' : 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, month - 1, 15)))
