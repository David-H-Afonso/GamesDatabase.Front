import platformIconData from './platformIconData.json'

const platformIcons = platformIconData as Record<string, string>

export const DEFAULT_PLATFORM_ICON = platformIcons.default
export const STEAM_PLATFORM_ICON = platformIcons.steam

export const PLATFORM_ICON_PRESETS = [
	{
		id: 'switch',
		label: 'Switch',
		logo: platformIcons.switch,
	},
	{
		id: 'switch2',
		label: 'Switch 2',
		logo: platformIcons.switch2,
	},
	{
		id: 'epic',
		label: 'Epic Games',
		logo: platformIcons.epic,
	},
	{
		id: 'gog',
		label: 'GOG',
		logo: platformIcons.gog,
	},
	{
		id: 'ubisoft',
		label: 'Ubisoft Connect',
		logo: platformIcons.ubisoft,
	},
	{
		id: 'emulator',
		label: 'Emulador',
		logo: platformIcons.emulator,
	},
	{
		id: 'itchio',
		label: 'itch.io',
		logo: platformIcons.itchio,
	},
	{
		id: 'battlenet',
		label: 'Battle.net',
		logo: platformIcons.battlenet,
	},
	{
		id: 'steam',
		label: 'Steam',
		logo: platformIcons.steam,
	},
	{
		id: 'ea',
		label: 'EA',
		logo: platformIcons.ea,
	},
	{
		id: 'playstation',
		label: 'PlayStation',
		logo: platformIcons.playstation,
	},
	{
		id: 'xbox',
		label: 'Xbox',
		logo: platformIcons.xbox,
	},
] as const

export const PLATFORM_LOGO_MAX_FILE_BYTES = 2 * 1024 * 1024
export const PLATFORM_LOGO_MAX_DATA_URL_LENGTH = 120_000
export const PLATFORM_LOGO_CANVAS_SIZE = 256
export const PLATFORM_LOGO_ACCEPT = 'image/png,image/jpeg,image/webp,image/avif,image/svg+xml'

const ACCEPTED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/svg+xml'])

export const formatPlaytime = (minutes?: number | null): string => {
	if (minutes == null) return ''
	const hours = minutes / 60
	const rounded = Math.round(hours * 10) / 10
	return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}h`
}

export const minutesToHoursValue = (minutes?: number | null): number | undefined => {
	if (minutes == null) return undefined
	return Math.round((minutes / 60) * 100) / 100
}

export const hoursToMinutesValue = (value: string | number): number | null => {
	if (value === '') return null
	const hours = Number(value)
	if (!Number.isFinite(hours) || hours < 0) return null
	return Math.round(hours * 60)
}

export const processPlatformLogoFile = async (file: File): Promise<string> => {
	if (!ACCEPTED_TYPES.has(file.type)) {
		throw new Error('unsupportedType')
	}

	if (file.size > PLATFORM_LOGO_MAX_FILE_BYTES) {
		throw new Error('tooLarge')
	}

	const image = await loadImage(file)
	const canvas = document.createElement('canvas')
	canvas.width = PLATFORM_LOGO_CANVAS_SIZE
	canvas.height = PLATFORM_LOGO_CANVAS_SIZE

	const context = canvas.getContext('2d')
	if (!context) {
		throw new Error('canvasUnavailable')
	}

	context.clearRect(0, 0, canvas.width, canvas.height)
	context.imageSmoothingEnabled = true
	context.imageSmoothingQuality = 'high'

	const scale = Math.min(PLATFORM_LOGO_CANVAS_SIZE / image.naturalWidth, PLATFORM_LOGO_CANVAS_SIZE / image.naturalHeight, 1)
	const width = Math.round(image.naturalWidth * scale)
	const height = Math.round(image.naturalHeight * scale)
	const x = Math.round((PLATFORM_LOGO_CANVAS_SIZE - width) / 2)
	const y = Math.round((PLATFORM_LOGO_CANVAS_SIZE - height) / 2)
	context.drawImage(image, x, y, width, height)

	URL.revokeObjectURL(image.src)

	for (const quality of [0.92, 0.86, 0.8, 0.74]) {
		const dataUrl = canvas.toDataURL('image/webp', quality)
		if (dataUrl.length <= PLATFORM_LOGO_MAX_DATA_URL_LENGTH) {
			return dataUrl
		}
	}

	throw new Error('encodedTooLarge')
}

const loadImage = (file: File): Promise<HTMLImageElement> =>
	new Promise((resolve, reject) => {
		const image = new Image()
		image.onload = () => resolve(image)
		image.onerror = () => {
			URL.revokeObjectURL(image.src)
			reject(new Error('invalidImage'))
		}
		image.src = URL.createObjectURL(file)
	})
