/** Exact public critic destinations only; no redirects, credentials or arbitrary URLs. */
export const metadataCriticUrl = (provider: string | null | undefined, url: unknown): url is string => typeof url === 'string' && url.length <= 600 && (provider === 'Metacritic' ? /^https:\/\/www\.metacritic\.com\/game\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/){1,2}$/.test(url) : provider === 'OpenCritic' && /^https:\/\/opencritic\.com\/game\/[1-9][0-9]*\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(url))

/** Public provenance pages, never API endpoints or credential-bearing URLs. */
export const metadataSourceUrl = (url: string): string | undefined => url.length <= 1000 && /^https:\/\/(?:store\.steampowered\.com\/app\/[1-9]\d*\/?|www\.wikidata\.org\/wiki\/Q[1-9]\d*|www\.dekudeals\.com\/items\/[a-z0-9]+(?:-[a-z0-9]+)*|www\.steamgriddb\.com\/game\/[1-9]\d*|gamesdb\.launchbox-app\.com\/games\/details\/[1-9]\d*-[a-z0-9-]+|www\.nintendo\.com\/us\/store\/products\/[a-z0-9]+(?:-[a-z0-9]+)*\/)$/.test(url) ? url : undefined
