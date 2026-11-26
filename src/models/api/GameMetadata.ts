export type MetadataField = 'name' | 'released' | 'developer' | 'critic' | 'logo' | 'hero' | 'cover'
export interface MetadataIdentity { source: string; name: string; url: string; steamAppId?: number; wikidataId?: string }
export interface MetadataCandidate { field: MetadataField; value: string | number; current: string | number | null; source: string; url: string }
export interface MetadataPreview { overwrite: boolean; token?: string | null; matches: MetadataIdentity[]; fields: MetadataCandidate[]; notices: string[] }
export interface MetadataLookup { overwrite: boolean; includeArtwork: boolean; steamAppId?: number; wikidataId?: string }
