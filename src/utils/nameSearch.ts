import type { NameSearch } from '@/models/api/NameSearch'

export const cleanSearchTerms = (terms: readonly string[]) => [...new Set(terms.map(term => term.trim()).filter(Boolean))]
export const createNameSearch = (value: Partial<NameSearch> = {}): NameSearch => ({
	version: 1,
	includeTerms: cleanSearchTerms(value.includeTerms ?? []),
	excludeTerms: cleanSearchTerms(value.excludeTerms ?? []),
	matchMode: value.matchMode === 'all' ? 'all' : 'any',
	caseSensitive: value.caseSensitive === true,
	accentSensitive: value.accentSensitive === true,
	matchType: value.matchType === 'exact' ? 'exact' : 'contains',
})
export const normalizeSearchText = (value: string, options: Pick<NameSearch, 'caseSensitive' | 'accentSensitive'> = { caseSensitive: false, accentSensitive: false }) => {
	let normalized = value.normalize('NFC')
	if (!options.accentSensitive) normalized = normalized.normalize('NFD').replace(/\p{M}/gu, '')
	return options.caseSensitive ? normalized : normalized.toLocaleLowerCase('es')
}
export const matchesNameSearch = (name: string, input: Partial<NameSearch> = {}) => {
	const rule = createNameSearch(input), value = normalizeSearchText(name, rule)
	const hit = (term: string) => rule.matchType === 'exact' ? value === normalizeSearchText(term, rule) : value.includes(normalizeSearchText(term, rule))
	return !rule.excludeTerms.some(hit) && (!rule.includeTerms.length || (rule.matchMode === 'all' ? rule.includeTerms.every(hit) : rule.includeTerms.some(hit)))
}
export const hasSearchTerms = (rule?: Partial<NameSearch> | null) => Boolean(rule?.includeTerms?.some(term => term.trim()) || rule?.excludeTerms?.some(term => term.trim()))
