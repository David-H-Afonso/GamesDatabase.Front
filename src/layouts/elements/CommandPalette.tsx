import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setTheme } from '@/store/features/theme/themeSlice'
import { setFilters } from '@/store/features/games/gamesSlice'
import { logoutUser } from '@/store/features/auth/authSlice'
import { selectIsAdmin } from '@/store/features/auth/selector'
import type { Game } from '@/models/api/Game'
import { getGames } from '@/services/GamesService/GamesService'
import './CommandPalette.scss'

const SEARCH_LIMIT = 7
const SEARCH_DEBOUNCE_MS = 250

interface CommandPaletteProps {
	isOpen: boolean
	onClose: () => void
	onOpenGame: (game: Game) => void
	onCreateGame: () => void
}

interface CommandItem {
	id: string
	group: string
	label: string
	hint?: string
	icon: React.ReactNode
	keywords?: string
	run: () => void
}

const Svg = ({ d, children }: { d?: string; children?: React.ReactNode }) => (
	<svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
		{d ? <path d={d} /> : children}
	</svg>
)

const IconSearch = (
	<Svg>
		<circle cx='11' cy='11' r='7' />
		<line x1='21' y1='21' x2='16.65' y2='16.65' />
	</Svg>
)
const IconHome = <Svg d='M3 11.5 12 4l9 7.5M5 10v10h14V10' />
const IconAdmin = (
	<Svg>
		<rect x='3' y='3' width='7' height='7' rx='1' />
		<rect x='14' y='3' width='7' height='7' rx='1' />
		<rect x='14' y='14' width='7' height='7' rx='1' />
		<rect x='3' y='14' width='7' height='7' rx='1' />
	</Svg>
)
const IconUsers = (
	<Svg>
		<path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' />
		<circle cx='9' cy='7' r='4' />
		<path d='M22 21v-2a4 4 0 0 0-3-3.87' />
	</Svg>
)
const IconSettings = (
	<Svg>
		<circle cx='12' cy='12' r='3' />
		<path d='M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z' />
	</Svg>
)
const IconTheme = (
	<Svg>
		<circle cx='12' cy='12' r='5' />
		<path d='M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4' />
	</Svg>
)
const IconGlobe = (
	<Svg>
		<circle cx='12' cy='12' r='9' />
		<path d='M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z' />
	</Svg>
)
const IconLogout = (
	<Svg>
		<path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' />
		<polyline points='16 17 21 12 16 7' />
		<line x1='21' y1='12' x2='9' y2='12' />
	</Svg>
)
const IconGame = (
	<Svg>
		<rect x='2' y='6' width='20' height='12' rx='4' />
		<path d='M7 11v2M6 12h2' />
		<circle cx='16' cy='11' r='1' fill='currentColor' stroke='none' />
		<circle cx='18' cy='13' r='1' fill='currentColor' stroke='none' />
	</Svg>
)
const IconPlus = <Svg d='M12 5v14M5 12h14' />

function useLibrarySearch(query: string, enabled: boolean) {
	const [games, setGames] = useState<Game[]>([])
	const [searching, setSearching] = useState(false)
	const requestId = useRef(0)

	useEffect(() => {
		const term = query.trim()
		if (!enabled || term.length < 1) {
			setGames([])
			setSearching(false)
			return
		}
		setSearching(true)
		const id = ++requestId.current
		const timer = window.setTimeout(async () => {
			try {
				const { data } = await getGames({ search: term, pageSize: SEARCH_LIMIT, page: 1 })
				if (requestId.current === id) setGames(data ?? [])
			} catch {
				if (requestId.current === id) setGames([])
			} finally {
				if (requestId.current === id) setSearching(false)
			}
		}, SEARCH_DEBOUNCE_MS)
		return () => window.clearTimeout(timer)
	}, [query, enabled])

	return { games, searching }
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onOpenGame, onCreateGame }) => {
	const { t, i18n } = useTranslation()
	const navigate = useNavigate()
	const dispatch = useAppDispatch()
	const isAdmin = useAppSelector(selectIsAdmin)
	const filters = useAppSelector((s) => s.games?.filters ?? {})
	const currentTheme = useAppSelector((s) => s.theme?.currentTheme ?? 'dark')

	const [query, setQuery] = useState('')
	const [activeIndex, setActiveIndex] = useState(0)
	const { games: apiGames, searching } = useLibrarySearch(query, isOpen)
	const inputRef = useRef<HTMLInputElement>(null)
	const listRef = useRef<HTMLDivElement>(null)

	const go = (to: string) => {
		navigate(to)
		onClose()
	}

	const applySearch = (search: string | undefined) => {
		dispatch(setFilters({ ...filters, search, page: 1 }))
		go('/')
	}

	const items = useMemo<CommandItem[]>(() => {
		const raw = query.trim()
		const q = raw.toLowerCase()
		const list: CommandItem[] = []

		if (raw.length >= 1) {
			apiGames.slice(0, 7).forEach((g) =>
				list.push({
					id: `game-${g.id}`,
					group: t('command.games'),
					label: g.name,
					icon: IconGame,
					keywords: g.name,
					run: () => {
						onClose()
						onOpenGame(g)
					},
				})
			)
			list.push({
				id: 'search-library',
				group: t('command.games'),
				label: t('command.searchLibrary', { query: raw }),
				icon: IconSearch,
				keywords: raw,
				run: () => applySearch(raw),
			})
		}

		const goto: CommandItem[] = [
			{ id: 'go-home', group: t('command.goto'), label: t('nav.home'), icon: IconHome, keywords: 'home inicio start', run: () => applySearch(undefined) },
			{ id: 'go-admin', group: t('command.goto'), label: t('nav.admin'), icon: IconAdmin, keywords: 'admin platforms plataformas', run: () => go('/admin/platforms') },
			...(isAdmin ? [{ id: 'go-users', group: t('command.goto'), label: t('nav.users'), icon: IconUsers, keywords: 'users usuarios', run: () => go('/admin/users') }] : []),
			{ id: 'go-settings', group: t('command.goto'), label: t('command.settings'), icon: IconSettings, keywords: 'settings ajustes config', run: () => go('/settings') },
		]

		const actions: CommandItem[] = [
			{
				id: 'act-create',
				group: t('command.actions'),
				label: t('command.createGame'),
				icon: IconPlus,
				keywords: 'add create game nuevo juego anadir',
				run: () => {
					onClose()
					onCreateGame()
				},
			},
			{
				id: 'act-theme',
				group: t('command.actions'),
				label: t('command.toggleTheme'),
				icon: IconTheme,
				keywords: 'theme tema dark light claro oscuro',
				run: () => dispatch(setTheme(currentTheme === 'dark' ? 'light' : 'dark')),
			},
			{ id: 'act-lang-en', group: t('command.actions'), label: t('command.langEn'), icon: IconGlobe, keywords: 'language idioma english ingles', run: () => void i18n.changeLanguage('en') },
			{ id: 'act-lang-es', group: t('command.actions'), label: t('command.langEs'), icon: IconGlobe, keywords: 'language idioma spanish espanol español', run: () => void i18n.changeLanguage('es') },
			{
				id: 'act-logout',
				group: t('command.actions'),
				label: t('nav.logout'),
				icon: IconLogout,
				keywords: 'logout cerrar sesion exit salir',
				run: () => {
					onClose()
					void dispatch(logoutUser())
					navigate('/login')
				},
			},
		]

		const adminPages: CommandItem[] =
			raw.length >= 2
				? [
						{ p: 'platforms', label: t('admin.nav.platforms') },
						{ p: 'status', label: t('admin.nav.status') },
						{ p: 'play-with', label: t('admin.nav.playWith') },
						{ p: 'played-status', label: t('admin.nav.playedStatus') },
						{ p: 'replay-types', label: t('admin.nav.replayTypes') },
						{ p: 'game-views', label: t('admin.nav.gameViews') },
						{ p: 'data-export', label: t('admin.nav.importExport') },
						{ p: 'audit-log', label: t('admin.nav.audit') },
						{ p: 'preferences', label: t('admin.nav.preferences') },
						{ p: 'steam', label: 'Steam' },
						...(isAdmin
							? [
									{ p: 'users', label: t('admin.nav.users') },
									{ p: 'backup-schedule-users', label: t('admin.nav.backupScheduleUsers') },
								]
							: []),
					].map(({ p, label }) => ({
						id: `admin-${p}`,
						group: t('nav.admin'),
						label,
						icon: IconAdmin,
						keywords: `${label} ${p}`,
						run: () => go(`/admin/${p}`),
					}))
				: []

		const match = (it: CommandItem) => !q || it.label.toLowerCase().includes(q) || (it.keywords?.toLowerCase().includes(q) ?? false)
		return [...list, ...goto.filter(match), ...adminPages.filter(match), ...actions.filter(match)]
	}, [query, apiGames, filters, isAdmin, currentTheme, i18n.language])

	const groups = useMemo(() => {
		const order: string[] = []
		const map = new Map<string, { item: CommandItem; index: number }[]>()
		items.forEach((item, index) => {
			if (!map.has(item.group)) {
				map.set(item.group, [])
				order.push(item.group)
			}
			map.get(item.group)!.push({ item, index })
		})
		return order.map((group) => ({ group, entries: map.get(group)! }))
	}, [items])

	useEffect(() => {
		if (isOpen) setQuery(filters.search ?? '')
	}, [isOpen])

	useEffect(() => {
		setActiveIndex(0)
	}, [query, isOpen])

	useEffect(() => {
		if (!isOpen) return
		const previouslyFocused = document.activeElement as HTMLElement | null
		const tid = window.setTimeout(() => inputRef.current?.focus(), 20)
		const prevOverflow = document.body.style.overflow
		document.body.style.overflow = 'hidden'
		return () => {
			window.clearTimeout(tid)
			document.body.style.overflow = prevOverflow
			previouslyFocused?.focus?.()
		}
	}, [isOpen])

	useEffect(() => {
		const el = listRef.current?.querySelector(`[data-cmd-index="${activeIndex}"]`) as HTMLElement | null
		el?.scrollIntoView({ block: 'nearest' })
	}, [activeIndex])

	const onKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Escape') {
			e.preventDefault()
			onClose()
		} else if (e.key === 'ArrowDown') {
			e.preventDefault()
			setActiveIndex((i) => (items.length ? (i + 1) % items.length : 0))
		} else if (e.key === 'ArrowUp') {
			e.preventDefault()
			setActiveIndex((i) => (items.length ? (i - 1 + items.length) % items.length : 0))
		} else if (e.key === 'Enter') {
			e.preventDefault()
			items[activeIndex]?.run()
		}
	}

	if (!isOpen) return null
	const portalTarget = (typeof document !== 'undefined' && document.getElementById('modal-portal')) || document.body

	return createPortal(
		<div className='command-palette' role='dialog' aria-modal='true' aria-label={t('nav.commandSearch')} onKeyDown={onKeyDown}>
			<div className='command-palette__backdrop' onClick={onClose} />
			<div className='command-palette__panel'>
				<div className='command-palette__search'>
					<span className='command-palette__search-icon'>{IconSearch}</span>
					<input
						ref={inputRef}
						className='command-palette__input'
						type='text'
						placeholder={t('command.placeholder')}
						value={query}
						onChange={(e) => {
							const value = e.target.value
							setQuery(value)
							if (value.trim() === '' && (filters.search ?? '') !== '') {
								dispatch(setFilters({ ...filters, search: undefined, page: 1 }))
							}
						}}
						role='combobox'
						aria-expanded='true'
						aria-controls='command-list'
						aria-activedescendant={items[activeIndex] ? `cmd-${items[activeIndex].id}` : undefined}
						autoComplete='off'
						spellCheck={false}
					/>
					<kbd className='command-palette__kbd'>Esc</kbd>
				</div>

				<div className='command-palette__list' id='command-list' role='listbox' ref={listRef}>
					{searching && <div className='command-palette__loading'>{t('command.searching')}</div>}
					{!searching && items.length === 0 && <div className='command-palette__empty'>{t('command.empty')}</div>}
					{groups.map(({ group, entries }) => (
						<div className='command-palette__group' key={group}>
							<div className='command-palette__group-label'>{group}</div>
							{entries.map(({ item, index }) => (
								<button
									key={item.id}
									id={`cmd-${item.id}`}
									data-cmd-index={index}
									type='button'
									role='option'
									aria-selected={index === activeIndex}
									className={`command-palette__item${index === activeIndex ? ' is-active' : ''}`}
									onMouseMove={() => setActiveIndex(index)}
									onClick={() => item.run()}>
									<span className='command-palette__item-icon'>{item.icon}</span>
									<span className='command-palette__item-label'>{item.label}</span>
								</button>
							))}
						</div>
					))}
				</div>

				<div className='command-palette__footer'>
					<span>
						<kbd>↑</kbd>
						<kbd>↓</kbd> {t('command.hintNavigate')}
					</span>
					<span>
						<kbd>↵</kbd> {t('command.hintSelect')}
					</span>
					<span>
						<kbd>Esc</kbd> {t('command.hintClose')}
					</span>
				</div>
			</div>
		</div>,
		portalTarget
	)
}
