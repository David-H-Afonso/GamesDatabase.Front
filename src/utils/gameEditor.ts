import type { Game, GameUpdateDto } from '@/models/api/Game'

const textFields = ['name', 'developer', 'comment', 'released', 'started', 'finished', 'hero', 'cover', 'logo', 'keyStoreUrl', 'criticProvider'] as const
const numberFields = ['grade', 'critic', 'story', 'completion', 'platformId', 'playedStatusId', 'steamAppId'] as const
type TextField = typeof textFields[number]
type NumberField = typeof numberFields[number]
export type GameEditorDraft = Record<TextField | NumberField | 'manualHours' | 'manualMinutes', string> & { statusId: number; favorite: boolean; isManuallyCompleted: boolean; manualPlaytimeIsAdditive: boolean; playWithIds: number[]; isCheaperByKey: string }

export const gameEditorDraft = (game: Game): GameEditorDraft => {
	const values = Object.fromEntries([...textFields, ...numberFields].map(field => [field, game[field] == null ? '' : String(game[field])])) as Record<TextField | NumberField, string>
	for (const field of ['released', 'started', 'finished'] as const) values[field] = values[field].slice(0, 10)
	const manual = (game.manualPlaytimeMinutes ?? 0) > 0 ? game.manualPlaytimeMinutes : null
	return { ...values, statusId: game.statusId, favorite: game.favorite, isManuallyCompleted: game.isManuallyCompleted ?? false, manualPlaytimeIsAdditive: game.manualPlaytimeIsAdditive ?? false, playWithIds: [...(game.playWithIds ?? [])], isCheaperByKey: game.isCheaperByKey == null ? '' : String(game.isCheaperByKey), manualHours: manual == null ? '' : String(Math.floor(manual / 60)), manualMinutes: manual == null ? '' : String(manual % 60) }
}

/** Only changed fields are sent. Clearing manual time or setting zero restores automatic Steam. */
export const gameEditorPatch = (base: Game, draft: GameEditorDraft): GameUpdateDto => {
	const before = gameEditorDraft(base), patch: Record<string, unknown> = {}
	for (const field of textFields) if (draft[field] !== before[field]) patch[field] = field === 'name' ? draft[field].trim() : draft[field].trim() || null
	for (const field of numberFields) if (draft[field] !== before[field]) patch[field] = draft[field] === '' ? null : Number(draft[field])
	for (const field of ['statusId', 'favorite', 'isManuallyCompleted', 'manualPlaytimeIsAdditive'] as const) if (draft[field] !== before[field]) patch[field] = draft[field]
	if (draft.isCheaperByKey !== before.isCheaperByKey) patch.isCheaperByKey = draft.isCheaperByKey === '' ? null : draft.isCheaperByKey === 'true'
	if (JSON.stringify([...draft.playWithIds].sort((a, b) => a - b)) !== JSON.stringify([...before.playWithIds].sort((a, b) => a - b))) patch.playWithIds = [...draft.playWithIds]
	if (draft.manualHours !== before.manualHours || draft.manualMinutes !== before.manualMinutes) patch.manualPlaytimeMinutes = Number(draft.manualHours || 0) * 60 + Number(draft.manualMinutes || 0) || null
	return patch as GameUpdateDto
}

/** Validate dirty values across editor tabs, without rewriting legacy untouched data. */
export const invalidGameEditorFields = (base: Game, draft: GameEditorDraft): Array<keyof GameEditorDraft> => {
	const before = gameEditorDraft(base), errors: Array<keyof GameEditorDraft> = []
	if (!draft.name.trim()) errors.push('name')
	if (!Number.isSafeInteger(draft.statusId) || draft.statusId <= 0) errors.push('statusId')
	if (draft.developer !== before.developer && draft.developer.trim().length > 150) errors.push('developer')
	for (const key of numberFields) {
		if (draft[key] === before[key] || draft[key] === '') continue
		const number = Number(draft[key]), min = ['platformId', 'playedStatusId', 'steamAppId'].includes(key) ? 1 : 0, max = key === 'grade' || key === 'critic' ? 100 : 2147483647
		if (!Number.isSafeInteger(number) || number < min || number > max) errors.push(key)
	}
	for (const key of ['started', 'finished', 'released'] as const) if (draft[key] !== before[key] && draft[key] !== '') {
		const date = new Date(draft[key] + 'T00:00:00Z')
		if (!/^\d{4}-\d{2}-\d{2}$/.test(draft[key]) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== draft[key]) errors.push(key)
	}
	if (draft.manualHours !== before.manualHours || draft.manualMinutes !== before.manualMinutes) {
		const hours = Number(draft.manualHours || 0), minutes = Number(draft.manualMinutes || 0)
		if (!Number.isSafeInteger(hours) || hours < 0 || hours > 10000) errors.push('manualHours')
		if (!Number.isSafeInteger(minutes) || minutes < 0 || minutes > 59 || hours * 60 + minutes > 600000) errors.push('manualMinutes')
	}
	return [...new Set(errors)]
}
