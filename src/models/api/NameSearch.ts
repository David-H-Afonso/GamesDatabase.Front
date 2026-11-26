export interface NameSearch {
	version: 1
	includeTerms: string[]
	matchMode: 'any' | 'all'
	excludeTerms: string[]
	caseSensitive: boolean
	accentSensitive: boolean
	matchType: 'contains' | 'exact'
}
