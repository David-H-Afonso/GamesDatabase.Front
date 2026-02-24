// ─── Property Modes ─────────────────────────────────────────────────────────

/** Mode for how a property is handled during IMPORT */
export type ImportPropertyMode = 'asImported' | 'clean' | 'custom'

/** Mode for how a property is handled during EXPORT */
export type ExportPropertyMode = 'asStored' | 'clean'

// ─── Configurable properties ─────────────────────────────────────────────────

/** All game properties that can be individually configured during import/export.
 *  `name` and `score` are excluded (required / backend-computed).
 */
export type ConfigurableGameProperty =
	| 'status'
	| 'platform'
	| 'playWith'
	| 'playedStatus'
	| 'grade'
	| 'critic'
	| 'criticProvider'
	| 'story'
	| 'completion'
	| 'released'
	| 'started'
	| 'finished'
	| 'comment'
	| 'logo'
	| 'cover'
	| 'isCheaperByKey'
	| 'keyStoreUrl'

// ─── Per-property overrides ───────────────────────────────────────────────────

export interface ImportPropertyOverride {
	mode: ImportPropertyMode
	/** Used when mode === 'custom'. Stores a string representation (name for entities, ISO string for dates, etc.) */
	customValue?: string | null
}

export interface ExportPropertyOverride {
	mode: ExportPropertyMode
}

// ─── Per-game configs ─────────────────────────────────────────────────────────

export type ImportPropertyConfig = Partial<Record<ConfigurableGameProperty, ImportPropertyOverride>>
export type ExportPropertyConfig = Partial<Record<ConfigurableGameProperty, ExportPropertyOverride>>

/** Config for a single game during import. If mode is 'simple', properties are ignored. */
export interface GameImportConfig {
	/** simple = all asImported; custom = use properties; customCleared = clean personal fields, keep rest asImported */
	mode: 'simple' | 'custom' | 'customCleared'
	properties?: ImportPropertyConfig
}

/** Config for a single game during export. If mode is 'simple', properties are ignored. */
export interface GameExportConfig {
	/** simple = all asStored; custom = use properties; customCleared = clean personal fields, leave rest asStored */
	mode: 'simple' | 'custom' | 'customCleared'
	properties?: ExportPropertyConfig
}

// ─── Request shapes ───────────────────────────────────────────────────────────

export interface SelectiveExportRequest {
	gameIds: number[]
	/** Global export config applied to all games unless overridden */
	globalConfig: GameExportConfig
	/** Per-game overrides keyed by game ID. Overrides global for that game only. */
	perGameConfig?: Record<number, GameExportConfig>
}

export interface SelectiveImportRequest {
	/** Global import config applied to all games unless overridden */
	globalConfig: GameImportConfig
	/** Per-game overrides keyed by game name (from CSV). Overrides global for that game only. */
	perGameConfig?: Record<string, GameImportConfig>
}

// ─── Response shapes ──────────────────────────────────────────────────────────

export interface SelectiveImportResult {
	message: string
	imported: number
	updated: number
	errors?: string[]
}

// ─── Display metadata ─────────────────────────────────────────────────────────

/** Metadata to drive the property config UI */
export interface PropertyFieldMeta {
	key: ConfigurableGameProperty
	label: string
	/** Type determines which custom-value editor to show */
	inputType: 'status' | 'platform' | 'playedStatus' | 'playWith' | 'number' | 'date' | 'text' | 'boolean' | 'criticProvider' | 'none'
	/** Whether this property can ever be 'clean' during import */
	canCleanOnImport: boolean
	/** Whether this property supports a custom value during import */
	canCustomOnImport: boolean
	/** Whether this property can be 'clean' during export */
	canCleanOnExport: boolean
}

export const GAME_PROPERTY_FIELDS: PropertyFieldMeta[] = [
	{ key: 'status', label: 'Status', inputType: 'status', canCleanOnImport: false, canCustomOnImport: true, canCleanOnExport: true },
	{ key: 'platform', label: 'Platform', inputType: 'platform', canCleanOnImport: true, canCustomOnImport: true, canCleanOnExport: true },
	{ key: 'playWith', label: 'Play With', inputType: 'playWith', canCleanOnImport: true, canCustomOnImport: true, canCleanOnExport: true },
	{ key: 'playedStatus', label: 'Played Status', inputType: 'playedStatus', canCleanOnImport: true, canCustomOnImport: true, canCleanOnExport: true },
	{ key: 'grade', label: 'Grade (0–100)', inputType: 'number', canCleanOnImport: true, canCustomOnImport: true, canCleanOnExport: true },
	{ key: 'critic', label: 'Critic Score (0–100)', inputType: 'number', canCleanOnImport: true, canCustomOnImport: true, canCleanOnExport: true },
	{ key: 'criticProvider', label: 'Critic Provider', inputType: 'criticProvider', canCleanOnImport: true, canCustomOnImport: true, canCleanOnExport: true },
	{ key: 'story', label: 'Story Duration (h)', inputType: 'number', canCleanOnImport: true, canCustomOnImport: true, canCleanOnExport: true },
	{ key: 'completion', label: 'Completion Duration (h)', inputType: 'number', canCleanOnImport: true, canCustomOnImport: true, canCleanOnExport: true },
	{ key: 'released', label: 'Released Date', inputType: 'date', canCleanOnImport: true, canCustomOnImport: true, canCleanOnExport: true },
	{ key: 'started', label: 'Started Date', inputType: 'date', canCleanOnImport: true, canCustomOnImport: true, canCleanOnExport: true },
	{ key: 'finished', label: 'Finished Date', inputType: 'date', canCleanOnImport: true, canCustomOnImport: true, canCleanOnExport: true },
	{ key: 'comment', label: 'Comment', inputType: 'text', canCleanOnImport: true, canCustomOnImport: true, canCleanOnExport: true },
	{ key: 'logo', label: 'Logo URL', inputType: 'none', canCleanOnImport: true, canCustomOnImport: false, canCleanOnExport: true },
	{ key: 'cover', label: 'Cover URL', inputType: 'none', canCleanOnImport: true, canCustomOnImport: false, canCleanOnExport: true },
	{ key: 'isCheaperByKey', label: 'Cheaper by Key', inputType: 'boolean', canCleanOnImport: true, canCustomOnImport: true, canCleanOnExport: true },
	{ key: 'keyStoreUrl', label: 'Key Store URL', inputType: 'text', canCleanOnImport: true, canCustomOnImport: true, canCleanOnExport: true },
]
