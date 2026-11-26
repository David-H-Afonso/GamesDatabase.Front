export type GameArtworkRole = 'logo' | 'hero' | 'cover'

/** Public Steam artwork candidates; requesting them does not mutate a game. */
export interface SteamArtwork {
	logoUrl?: string | null
	heroUrl?: string | null
	coverUrl?: string | null
}
