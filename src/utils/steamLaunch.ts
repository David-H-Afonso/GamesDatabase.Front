/** Client protocol URL only: never launch a process or trust an arbitrary URL. */
export const steamLaunchUrl = (appId?: number | null): string | null => Number.isSafeInteger(appId) && appId! > 0 && appId! <= 2147483647 ? `steam://rungameid/${appId}` : null
