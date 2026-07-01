export const formatToLocaleDate = (dateString?: string): string => {
	if (!dateString) return ''
	try {
		return new Date(dateString).toLocaleDateString()
	} catch {
		return 'Invalid Date'
	}
}
