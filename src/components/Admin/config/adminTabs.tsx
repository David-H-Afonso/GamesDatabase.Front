import type { ReactNode } from 'react'

export interface AdminTab {
	path: string
	to: string
	labelKey: string
	icon: ReactNode
	adminOnly?: boolean
}

const iconProps = {
	width: 18,
	height: 18,
	viewBox: '0 0 24 24',
	fill: 'none',
	stroke: 'currentColor',
	strokeWidth: 1.8,
	strokeLinecap: 'round' as const,
	strokeLinejoin: 'round' as const,
	'aria-hidden': true,
}

const usersIcon = (
	<svg {...iconProps}>
		<path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' />
		<circle cx='9' cy='7' r='4' />
		<path d='M22 21v-2a4 4 0 0 0-3-3.87' />
		<path d='M16 3.13a4 4 0 0 1 0 7.75' />
	</svg>
)

const platformsIcon = (
	<svg {...iconProps}>
		<rect x='2' y='3' width='20' height='14' rx='2' />
		<path d='M8 21h8M12 17v4' />
	</svg>
)

const statusIcon = (
	<svg {...iconProps}>
		<circle cx='12' cy='12' r='9' />
		<path d='m9 12 2 2 4-4' />
	</svg>
)

const playWithIcon = (
	<svg {...iconProps}>
		<path d='M6 11h4M8 9v4' />
		<circle cx='15' cy='10' r='1' />
		<circle cx='18' cy='13' r='1' />
		<path d='M17.32 5H6.68a4 4 0 0 0-3.98 3.6L2 13.5A2.5 2.5 0 0 0 6.5 16l1.5-2h8l1.5 2a2.5 2.5 0 0 0 4.5-2.5l-.7-4.9A4 4 0 0 0 17.32 5Z' />
	</svg>
)

const playedStatusIcon = (
	<svg {...iconProps}>
		<circle cx='12' cy='12' r='9' />
		<path d='M12 7v5l3 2' />
	</svg>
)

const replayTypesIcon = (
	<svg {...iconProps}>
		<path d='M3 12a9 9 0 0 1 15-6.7L21 8' />
		<path d='M21 3v5h-5' />
		<path d='M21 12a9 9 0 0 1-15 6.7L3 16' />
		<path d='M3 21v-5h5' />
	</svg>
)

const importExportIcon = (
	<svg {...iconProps}>
		<path d='M12 3v12' />
		<path d='m8 7 4-4 4 4' />
		<path d='M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2' />
	</svg>
)

const gameViewsIcon = (
	<svg {...iconProps}>
		<rect x='3' y='4' width='18' height='16' rx='2' />
		<path d='M3 9h18M9 9v11' />
	</svg>
)

const auditIcon = (
	<svg {...iconProps}>
		<path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' />
		<path d='M14 2v6h6M9 13h6M9 17h4' />
	</svg>
)

const backupIcon = (
	<svg {...iconProps}>
		<ellipse cx='12' cy='5' rx='8' ry='3' />
		<path d='M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5' />
		<path d='M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6' />
	</svg>
)

const preferencesIcon = (
	<svg {...iconProps}>
		<circle cx='12' cy='12' r='3' />
		<path d='M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15H4a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 6 9.4a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 11 4.6V4a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 2.82 1.17l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9H20a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z' />
	</svg>
)

const steamIcon = (
	<svg {...iconProps}>
		<circle cx='12' cy='12' r='9' />
		<circle cx='15.5' cy='9' r='2.5' />
		<circle cx='9' cy='15' r='2' />
		<path d='m11 14-3.5-1.5M17.5 9 11 14' />
	</svg>
)

export const ADMIN_TABS: AdminTab[] = [
	{ path: 'users', to: '/admin/users', labelKey: 'admin.nav.users', icon: usersIcon, adminOnly: true },
	{ path: 'platforms', to: '/admin/platforms', labelKey: 'admin.nav.platforms', icon: platformsIcon },
	{ path: 'status', to: '/admin/status', labelKey: 'admin.nav.status', icon: statusIcon },
	{ path: 'play-with', to: '/admin/play-with', labelKey: 'admin.nav.playWith', icon: playWithIcon },
	{ path: 'played-status', to: '/admin/played-status', labelKey: 'admin.nav.playedStatus', icon: playedStatusIcon },
	{ path: 'replay-types', to: '/admin/replay-types', labelKey: 'admin.nav.replayTypes', icon: replayTypesIcon },
	{ path: 'data-export', to: '/admin/data-export', labelKey: 'admin.nav.importExport', icon: importExportIcon },
	{ path: 'game-views', to: '/admin/game-views', labelKey: 'admin.nav.gameViews', icon: gameViewsIcon },
	{ path: 'audit-log', to: '/admin/audit-log', labelKey: 'admin.nav.audit', icon: auditIcon },
	{ path: 'backup-schedule-users', to: '/admin/backup-schedule-users', labelKey: 'admin.nav.backupScheduleUsers', icon: backupIcon, adminOnly: true },
	{ path: 'preferences', to: '/admin/preferences', labelKey: 'admin.nav.preferences', icon: preferencesIcon },
	{ path: 'steam', to: '/admin/steam', labelKey: 'admin.nav.steam', icon: steamIcon },
]
