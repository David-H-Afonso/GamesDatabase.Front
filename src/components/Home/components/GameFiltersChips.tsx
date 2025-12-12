import React, { useState, useEffect, useRef } from 'react'
import type { GameQueryParameters } from '@/models/api/Game'
import { useGamePlatform, useGamePlayedStatus, useGamePlayWith, useGameStatus } from '@/hooks'
import { DEFAULT_PAGE_SIZE } from '@/utils'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { fetchUserPreferences } from '@/store/features/auth/authSlice'
import './GameFiltersChips.scss'

interface Props {
	filters: GameQueryParameters
	onFiltersChange: (partial: Partial<GameQueryParameters>) => void
	onSearchChange: (search: string) => void
	onSortChange: (sortBy: string, sortDescending: boolean) => void
	viewMode?: 'card' | 'row' | 'tile'
	onViewModeChange?: (mode: 'card' | 'row' | 'tile') => void
	publicGameViews?: Array<{ id: number; name: string }>
	currentView?: string
	onViewChange?: (viewName: string) => void
	selectedCount?: number
	onSelectAll?: () => void
	onDeselectAll?: () => void
	onBulkDelete?: () => void
	onBulkEdit?: () => void
}

type PopoverKey =
	| 'platform'
	| 'playWith'
	| 'status'
	| 'playedStatus'
	| 'grades'
	| 'years'
	| 'price'
	| 'criticProvider'
	| 'excluded'
	| 'pageSize'

const GameFiltersChips: React.FC<Props> = ({
	filters,
	onFiltersChange,
	onSearchChange,
	onSortChange,
	viewMode,
	onViewModeChange,
	publicGameViews = [],
	currentView = 'default',
	onViewChange,
	selectedCount = 0,
	onSelectAll,
	onDeselectAll,
	onBulkDelete,
	onBulkEdit,
}) => {
	const [openPopover, setOpenPopover] = useState<PopoverKey | null>(null)
	const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
	const popoverRef = useRef<HTMLDivElement | null>(null)
	const chipsContainerRef = useRef<HTMLDivElement | null>(null)

	const dispatch = useAppDispatch()
	const currentUser = useAppSelector((state) => state.auth.user)
	const { fetchList: fetchPlatforms } = useGamePlatform()
	const { fetchOptions: fetchPlayWithList } = useGamePlayWith()
	const { fetchActiveStatusList } = useGameStatus()
	const { fetchList: fetchPlayedStatusList } = useGamePlayedStatus()

	const [platformOptions, setPlatformOptions] = useState<{ value: number; label: string }[]>([])
	const [playWithOptions, setPlayWithOptions] = useState<{ value: number; label: string }[]>([])
	const [statusOptions, setStatusOptions] = useState<{ value: number; label: string }[]>([])
	const [playedStatusOptions, setPlayedStatusOptions] = useState<
		{ value: number; label: string }[]
	>([])

	// Load filter options
	useEffect(() => {
		const normalize = (res: any) => {
			if (!res) return []
			if (Array.isArray(res)) return res
			if (res.data && Array.isArray(res.data)) return res.data
			return []
		}

		void (async () => {
			try {
				// Load user preferences
				if (currentUser?.id) {
					dispatch(fetchUserPreferences(currentUser.id))
				}

				const plat = await fetchPlatforms()
				const platList = normalize(plat)
				setPlatformOptions(
					platList.map((p: any) => ({ value: p.id as number, label: String(p.name) }))
				)

				const pw = await fetchPlayWithList()
				const pwList = normalize(pw)
				setPlayWithOptions(
					pwList.map((p: any) => ({ value: p.id as number, label: String(p.name) }))
				)

				const st = await fetchActiveStatusList()
				const stList = normalize(st)
				setStatusOptions(stList.map((s: any) => ({ value: s.id as number, label: String(s.name) })))

				const ps = await fetchPlayedStatusList()
				const psList = normalize(ps)
				setPlayedStatusOptions(
					psList.map((s: any) => ({ value: s.id as number, label: String(s.name) }))
				)
			} catch (err) {
				console.error('Error loading filter options', err)
			}
		})()
	}, [
		fetchPlatforms,
		fetchPlayWithList,
		fetchActiveStatusList,
		fetchPlayedStatusList,
		currentUser?.id,
		dispatch,
	])

	// Close popover when clicking outside
	useEffect(() => {
		const handler = (ev: MouseEvent) => {
			if (!popoverRef.current) return
			const target = ev.target as Node
			// Don't close if clicking inside popover or on any chip button
			if (
				popoverRef.current.contains(target) ||
				(chipsContainerRef.current && chipsContainerRef.current.contains(target))
			) {
				return
			}
			setOpenPopover(null)
		}
		if (openPopover) document.addEventListener('mousedown', handler)
		return () => document.removeEventListener('mousedown', handler)
	}, [openPopover])

	// Close popover on Escape key
	useEffect(() => {
		const handler = (ev: KeyboardEvent) => {
			if (ev.key === 'Escape') {
				setOpenPopover(null)
			}
		}
		if (openPopover) document.addEventListener('keydown', handler)
		return () => document.removeEventListener('keydown', handler)
	}, [openPopover])

	const setFilters = (partial: Partial<GameQueryParameters>) => {
		onFiltersChange({ ...partial, page: 1 })
	}

	// Label helpers
	const platformLabel = () => {
		if (!filters.platformId) return 'Todas'
		const platform = platformOptions.find((p) => p.value === filters.platformId)
		return platform?.label || 'Todas'
	}

	const playWithLabel = () => {
		if (!filters.playWithId) return 'Todos'
		const playWith = playWithOptions.find((p) => p.value === filters.playWithId)
		return playWith?.label || 'Todos'
	}

	const statusLabel = () => {
		if (!filters.statusId) return 'Todos'
		const status = statusOptions.find((s) => s.value === filters.statusId)
		return status?.label || 'Todos'
	}

	const playedStatusLabel = () => {
		if (!filters.playedStatusId) return 'Todos'
		const playedStatus = playedStatusOptions.find((s) => s.value === filters.playedStatusId)
		return playedStatus?.label || 'Todos'
	}

	const gradesLabel = () => {
		const { minGrade, maxGrade } = filters
		if (!minGrade && !maxGrade) return 'Cualquiera'
		if (minGrade && maxGrade) return `${minGrade} – ${maxGrade}`
		if (minGrade) return `Desde ${minGrade}`
		return `Hasta ${maxGrade}`
	}

	const yearsLabel = () => {
		const { releasedYear, startedYear, finishedYear } = filters
		const years = [releasedYear, startedYear, finishedYear].filter(
			(y): y is number => y !== undefined && y !== null
		)
		if (years.length === 0) return 'Cualquier año'
		if (years.length === 1) return `${years[0]}`
		return `${Math.min(...years)} – ${Math.max(...years)}`
	}

	const priceLabel = () => {
		if (filters.isCheaperByKey === undefined || filters.isCheaperByKey === null) return 'Todos'
		return filters.isCheaperByKey ? 'Por clave' : 'En tienda'
	}

	const criticProviderLabel = () => {
		if (!filters.criticProvider) return 'Todos'
		return filters.criticProvider
	}

	const excludedLabel = () => {
		if (!filters.excludeStatusIds?.length) return 'Sin exclusiones'
		return `${filters.excludeStatusIds.length} activa(s)`
	}

	const pageSizeLabel = () => {
		if (!filters.pageSize) return `Por defecto (${DEFAULT_PAGE_SIZE})`
		return `${filters.pageSize} juegos`
	}

	const resetAllFilters = () => {
		onFiltersChange({
			platformId: undefined,
			playWithId: undefined,
			statusId: undefined,
			playedStatusId: undefined,
			minGrade: undefined,
			maxGrade: undefined,
			releasedYear: undefined,
			startedYear: undefined,
			finishedYear: undefined,
			isCheaperByKey: undefined,
			criticProvider: undefined,
			excludeStatusIds: undefined,
			pageSize: undefined,
		})
	}

	const hasAnyActiveFilter = () => {
		return (
			!!filters.platformId ||
			!!filters.playWithId ||
			!!filters.statusId ||
			!!filters.playedStatusId ||
			!!filters.minGrade ||
			!!filters.maxGrade ||
			!!filters.releasedYear ||
			!!filters.startedYear ||
			!!filters.finishedYear ||
			(filters.isCheaperByKey !== undefined && filters.isCheaperByKey !== null) ||
			!!filters.criticProvider ||
			!!filters.excludeStatusIds?.length
		)
	}

	const hasActiveFilter = (key: PopoverKey): boolean => {
		switch (key) {
			case 'platform':
				return !!filters.platformId
			case 'playWith':
				return !!filters.playWithId
			case 'status':
				return !!filters.statusId
			case 'playedStatus':
				return !!filters.playedStatusId
			case 'grades':
				return !!filters.minGrade || !!filters.maxGrade
			case 'years':
				return !!filters.releasedYear || !!filters.startedYear || !!filters.finishedYear
			case 'price':
				return filters.isCheaperByKey !== undefined && filters.isCheaperByKey !== null
			case 'criticProvider':
				return !!filters.criticProvider
			case 'excluded':
				return !!filters.excludeStatusIds?.length
			case 'pageSize':
				return false
			default:
				return false
		}
	}

	const togglePopover = (key: PopoverKey) => {
		if (openPopover === key) {
			setOpenPopover(null)
		} else {
			setOpenPopover(key)
		}
	}

	const handleExcludeStatusChange = (statusId: number, isExcluded: boolean) => {
		const currentExcluded = filters.excludeStatusIds || []
		let newExcluded: number[]

		if (isExcluded) {
			newExcluded = [...currentExcluded, statusId]
		} else {
			newExcluded = currentExcluded.filter((id) => id !== statusId)
		}

		setFilters({ excludeStatusIds: newExcluded.length > 0 ? newExcluded : undefined })
	}

	return (
		<section className='game-filters-chips'>
			{/* SELECTION CONTROLS */}
			{selectedCount > 0 && (
				<div className='game-filters-chips__selection'>
					<span className='game-filters-chips__selection-count'>
						{selectedCount} seleccionado(s)
					</span>
					{onDeselectAll && (
						<button
							type='button'
							className='game-filters-chips__selection-btn'
							onClick={onDeselectAll}>
							Deseleccionar
						</button>
					)}
					{onBulkEdit && (
						<button
							type='button'
							className='game-filters-chips__selection-btn'
							onClick={onBulkEdit}>
							Editar
						</button>
					)}
					{onBulkDelete && (
						<button
							type='button'
							className='game-filters-chips__selection-btn game-filters-chips__selection-btn--danger'
							onClick={onBulkDelete}>
							Eliminar
						</button>
					)}
				</div>
			)}

			{/* TOP ROW */}
			<div className='game-filters-chips__top'>
				<div className='game-filters-chips__top-left'>
					<div className='game-filters-chips__field game-filters-chips__field--inline'>
						<label className='game-filters-chips__input-label' htmlFor='search-input'>
							Buscar
						</label>
						<input
							className='game-filters-chips__input-search'
							placeholder='Buscar juegos…'
							value={filters.search || ''}
							onChange={(e) => onSearchChange(e.target.value)}
						/>
					</div>

					<div className='game-filters-chips__field game-filters-chips__field--inline game-filters-chips__field--sort'>
						<label className='game-filters-chips__input-label' htmlFor='sort-select'>
							Ordenar por
						</label>
						<select
							className='game-filters-chips__select-pill'
							value={filters.sortBy || 'name'}
							onChange={(e) => onSortChange(e.target.value, filters.sortDescending || false)}>
							<option value='name'>Nombre</option>
							<option value='grade'>Calificación</option>
							<option value='critic'>Puntuación Crítica</option>
							<option value='released'>Fecha de Lanzamiento</option>
							<option value='started'>Fecha de Inicio</option>
							<option value='score'>Score</option>
							<option value='storyDuration'>Story</option>
							<option value='completionDuration'>Completion</option>
							<option value='status'>Status</option>
							<option value='createdat'>Fecha de Creación</option>
							<option value='updatedat'>Última Modificación</option>
						</select>
						<button
							type='button'
							className='game-filters-chips__sort-direction'
							onClick={() => onSortChange(filters.sortBy || 'name', !filters.sortDescending)}
							title={filters.sortDescending ? 'Descendente' : 'Ascendente'}>
							{filters.sortDescending ? '↓' : '↑'}
						</button>
					</div>

					{onSelectAll && (
						<button type='button' className='game-filters-chips__action-btn' onClick={onSelectAll}>
							{selectedCount > 0 ? 'Deseleccionar todos' : 'Seleccionar todos'}
						</button>
					)}
				</div>

				<div className='game-filters-chips__top-right'>
					{onViewChange && (
						<div className='game-filters-chips__field game-filters-chips__field--inline game-filters-chips__field--view'>
							<label>Vista</label>
							<select
								className='game-filters-chips__select-view'
								value={currentView}
								onChange={(e) => onViewChange(e.target.value)}>
								<option value='default'>Predeterminada</option>
								{publicGameViews.map((view) => (
									<option key={view.id} value={view.name}>
										{view.name}
									</option>
								))}
							</select>
						</div>
					)}

					{onViewModeChange && viewMode && (
						<div className='game-filters-chips__mobile-controls-viewtoggle game-filters-chips__view-toggle'>
							<button
								type='button'
								className={
									'game-filters-chips__view-btn' + (viewMode === 'card' ? ' is-active' : '')
								}
								onClick={() => onViewModeChange('card')}>
								Tarjetas
							</button>
							<button
								type='button'
								className={
									'game-filters-chips__view-btn' + (viewMode === 'row' ? ' is-active' : '')
								}
								onClick={() => onViewModeChange('row')}>
								Fila
							</button>
						</div>
					)}

					<button
						type='button'
						className={
							'game-filters-chips__advanced-btn' + (showAdvancedFilters ? ' is-active' : '')
						}
						onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}>
						<span className='game-filters-chips__advanced-btn__text'>
							{showAdvancedFilters ? '✕ Cerrar filtros' : '⚙ Filtros avanzados'}
						</span>
						<span className='game-filters-chips__advanced-btn__icon'>⚙</span>
					</button>
				</div>
			</div>

			{/* ADVANCED FILTERS */}
			{showAdvancedFilters && (
				<>
					{/* MOVED CONTROLS (hidden controls from top row) */}
					<div className='game-filters-chips__moved-controls'>
						{onSelectAll && (
							<button
								type='button'
								className='game-filters-chips__moved-controls-selectall game-filters-chips__action-btn'
								onClick={onSelectAll}>
								{selectedCount > 0 ? 'Deseleccionar todos' : 'Seleccionar todos'}
							</button>
						)}

						{onViewModeChange && viewMode && (
							<div className='game-filters-chips__moved-controls-viewtoggle game-filters-chips__view-toggle'>
								<button
									type='button'
									className={
										'game-filters-chips__view-btn' + (viewMode === 'card' ? ' is-active' : '')
									}
									onClick={() => onViewModeChange('card')}>
									Tarjetas
								</button>
								<button
									type='button'
									className={
										'game-filters-chips__view-btn' + (viewMode === 'row' ? ' is-active' : '')
									}
									onClick={() => onViewModeChange('row')}>
									Fila
								</button>
							</div>
						)}

						{onViewChange && (
							<div className='game-filters-chips__moved-controls-view game-filters-chips__field game-filters-chips__field--inline'>
								<label>Vista</label>
								<select
									className='game-filters-chips__select-view'
									value={currentView}
									onChange={(e) => onViewChange(e.target.value)}>
									<option value='default'>Predeterminada</option>
									{publicGameViews.map((view) => (
										<option key={view.id} value={view.name}>
											{view.name}
										</option>
									))}
								</select>
							</div>
						)}

						<div className='game-filters-chips__moved-controls-sort game-filters-chips__field game-filters-chips__field--inline'>
							<label>Ordenar por</label>
							<select
								className='game-filters-chips__select-pill'
								value={filters.sortBy || 'name'}
								onChange={(e) => onSortChange(e.target.value, filters.sortDescending || false)}>
								<option value='name'>Nombre</option>
								<option value='grade'>Calificación</option>
								<option value='critic'>Puntuación Crítica</option>
								<option value='released'>Fecha de Lanzamiento</option>
								<option value='started'>Fecha de Inicio</option>
								<option value='score'>Score</option>
								<option value='storyDuration'>Story</option>
								<option value='completionDuration'>Completion</option>
								<option value='status'>Status</option>
								<option value='createdat'>Fecha de Creación</option>
								<option value='updatedat'>Última Modificación</option>
							</select>
							<button
								type='button'
								className='game-filters-chips__sort-direction'
								onClick={() => onSortChange(filters.sortBy || 'name', !filters.sortDescending)}
								title={filters.sortDescending ? 'Descendente' : 'Ascendente'}>
								{filters.sortDescending ? '↓' : '↑'}
							</button>
						</div>
					</div>

					{/* CHIPS ROW */}
					<div className='game-filters-chips__chips-row' ref={chipsContainerRef}>
						<button
							type='button'
							className={
								'game-filters-chips__chip' + (hasActiveFilter('platform') ? ' is-active' : '')
							}
							onClick={() => togglePopover('platform')}>
							Plataforma: <span>{platformLabel()}</span>
						</button>

						<button
							type='button'
							className={
								'game-filters-chips__chip' + (hasActiveFilter('playWith') ? ' is-active' : '')
							}
							onClick={() => togglePopover('playWith')}>
							Jugar con: <span>{playWithLabel()}</span>
						</button>

						<button
							type='button'
							className={
								'game-filters-chips__chip' + (hasActiveFilter('status') ? ' is-active' : '')
							}
							onClick={() => togglePopover('status')}>
							Status: <span>{statusLabel()}</span>
						</button>

						<button
							type='button'
							className={
								'game-filters-chips__chip' + (hasActiveFilter('playedStatus') ? ' is-active' : '')
							}
							onClick={() => togglePopover('playedStatus')}>
							Jugado: <span>{playedStatusLabel()}</span>
						</button>

						<button
							type='button'
							className={
								'game-filters-chips__chip' + (hasActiveFilter('grades') ? ' is-active' : '')
							}
							onClick={() => togglePopover('grades')}>
							Nota: <span>{gradesLabel()}</span>
						</button>

						<button
							type='button'
							className={
								'game-filters-chips__chip' + (hasActiveFilter('years') ? ' is-active' : '')
							}
							onClick={() => togglePopover('years')}>
							Años: <span>{yearsLabel()}</span>
						</button>

						<button
							type='button'
							className={
								'game-filters-chips__chip' + (hasActiveFilter('price') ? ' is-active' : '')
							}
							onClick={() => togglePopover('price')}>
							Precio: <span>{priceLabel()}</span>
						</button>

						<button
							type='button'
							className={
								'game-filters-chips__chip' + (hasActiveFilter('criticProvider') ? ' is-active' : '')
							}
							onClick={() => togglePopover('criticProvider')}>
							Proveedor: <span>{criticProviderLabel()}</span>
						</button>

						<button
							type='button'
							className={
								'game-filters-chips__chip' + (hasActiveFilter('excluded') ? ' is-active' : '')
							}
							onClick={() => togglePopover('excluded')}>
							Exclusiones: <span>{excludedLabel()}</span>
						</button>

						<button
							type='button'
							className={
								'game-filters-chips__chip' + (hasActiveFilter('pageSize') ? ' is-active' : '')
							}
							onClick={() => togglePopover('pageSize')}>
							Página: <span>{pageSizeLabel()}</span>
						</button>
					</div>

					{/* POPOVERS */}
					{openPopover && (
						<div className='game-filters-chips__popover' ref={popoverRef}>
							{openPopover === 'platform' && (
								<>
									<h4>Plataforma</h4>
									<div className='game-filters-chips__popover-options'>
										<button
											type='button'
											className={
												'game-filters-chips__option' + (!filters.platformId ? ' is-active' : '')
											}
											onClick={() => setFilters({ platformId: undefined })}>
											Todas
										</button>
										{platformOptions.map((p) => (
											<button
												key={p.value}
												type='button'
												className={
													'game-filters-chips__option' +
													(filters.platformId === p.value ? ' is-active' : '')
												}
												onClick={() => setFilters({ platformId: p.value })}>
												{p.label}
											</button>
										))}
									</div>
								</>
							)}

							{openPopover === 'playWith' && (
								<>
									<h4>Jugar con</h4>
									<div className='game-filters-chips__popover-options'>
										<button
											type='button'
											className={
												'game-filters-chips__option' + (!filters.playWithId ? ' is-active' : '')
											}
											onClick={() => setFilters({ playWithId: undefined })}>
											Todos
										</button>
										{playWithOptions.map((p) => (
											<button
												key={p.value}
												type='button'
												className={
													'game-filters-chips__option' +
													(filters.playWithId === p.value ? ' is-active' : '')
												}
												onClick={() => setFilters({ playWithId: p.value })}>
												{p.label}
											</button>
										))}
									</div>
								</>
							)}

							{openPopover === 'status' && (
								<>
									<h4>Status</h4>
									<div className='game-filters-chips__popover-options'>
										<button
											type='button'
											className={
												'game-filters-chips__option' + (!filters.statusId ? ' is-active' : '')
											}
											onClick={() => setFilters({ statusId: undefined })}>
											Todos
										</button>
										{statusOptions.map((s) => (
											<button
												key={s.value}
												type='button'
												className={
													'game-filters-chips__option' +
													(filters.statusId === s.value ? ' is-active' : '')
												}
												onClick={() => setFilters({ statusId: s.value })}>
												{s.label}
											</button>
										))}
									</div>
								</>
							)}

							{openPopover === 'playedStatus' && (
								<>
									<h4>Estado Jugado</h4>
									<div className='game-filters-chips__popover-options'>
										<button
											type='button'
											className={
												'game-filters-chips__option' + (!filters.playedStatusId ? ' is-active' : '')
											}
											onClick={() => setFilters({ playedStatusId: undefined })}>
											Todos
										</button>
										{playedStatusOptions.map((s) => (
											<button
												key={s.value}
												type='button'
												className={
													'game-filters-chips__option' +
													(filters.playedStatusId === s.value ? ' is-active' : '')
												}
												onClick={() => setFilters({ playedStatusId: s.value })}>
												{s.label}
											</button>
										))}
									</div>
								</>
							)}

							{openPopover === 'grades' && (
								<>
									<h4>Nota</h4>
									<div className='game-filters-chips__popover-grid'>
										<div className='game-filters-chips__field'>
											<label>Mínimo</label>
											<input
												type='number'
												min='0'
												max='100'
												placeholder='0'
												value={filters.minGrade ?? ''}
												onChange={(e) =>
													setFilters({
														minGrade: e.target.value ? Number(e.target.value) : undefined,
													})
												}
											/>
										</div>
										<div className='game-filters-chips__field'>
											<label>Máximo</label>
											<input
												type='number'
												min='0'
												max='100'
												placeholder='100'
												value={filters.maxGrade ?? ''}
												onChange={(e) =>
													setFilters({
														maxGrade: e.target.value ? Number(e.target.value) : undefined,
													})
												}
											/>
										</div>
									</div>
									<button
										type='button'
										className='game-filters-chips__clear-btn'
										onClick={() => setFilters({ minGrade: undefined, maxGrade: undefined })}>
										Limpiar
									</button>
								</>
							)}

							{openPopover === 'years' && (
								<>
									<h4>Años</h4>
									<div className='game-filters-chips__popover-grid'>
										<div className='game-filters-chips__field'>
											<label>Lanzamiento</label>
											<input
												type='number'
												min='1970'
												max='2100'
												placeholder='Año'
												value={filters.releasedYear ?? ''}
												onChange={(e) =>
													setFilters({
														releasedYear: e.target.value ? Number(e.target.value) : undefined,
													})
												}
											/>
										</div>
										<div className='game-filters-chips__field'>
											<label>Inicio</label>
											<input
												type='number'
												min='1970'
												max='2100'
												placeholder='Año'
												value={filters.startedYear ?? ''}
												onChange={(e) =>
													setFilters({
														startedYear: e.target.value ? Number(e.target.value) : undefined,
													})
												}
											/>
										</div>
										<div className='game-filters-chips__field'>
											<label>Finalización</label>
											<input
												type='number'
												min='1970'
												max='2100'
												placeholder='Año'
												value={filters.finishedYear ?? ''}
												onChange={(e) =>
													setFilters({
														finishedYear: e.target.value ? Number(e.target.value) : undefined,
													})
												}
											/>
										</div>
									</div>
									<button
										type='button'
										className='game-filters-chips__clear-btn'
										onClick={() =>
											setFilters({
												releasedYear: undefined,
												startedYear: undefined,
												finishedYear: undefined,
											})
										}>
										Limpiar
									</button>
								</>
							)}

							{openPopover === 'price' && (
								<>
									<h4>Precio</h4>
									<div className='game-filters-chips__popover-options'>
										<button
											type='button'
											className={
												'game-filters-chips__option' +
												(filters.isCheaperByKey === undefined || filters.isCheaperByKey === null
													? ' is-active'
													: '')
											}
											onClick={() => setFilters({ isCheaperByKey: undefined })}>
											Todos
										</button>
										<button
											type='button'
											className={
												'game-filters-chips__option' +
												(filters.isCheaperByKey === true ? ' is-active' : '')
											}
											onClick={() => setFilters({ isCheaperByKey: true })}>
											Más barato por clave
										</button>
										<button
											type='button'
											className={
												'game-filters-chips__option' +
												(filters.isCheaperByKey === false ? ' is-active' : '')
											}
											onClick={() => setFilters({ isCheaperByKey: false })}>
											Más barato en tienda
										</button>
									</div>
								</>
							)}

							{openPopover === 'criticProvider' && (
								<>
									<h4>Proveedor de Crítica</h4>
									<div className='game-filters-chips__popover-options'>
										<button
											type='button'
											className={
												'game-filters-chips__option' + (!filters.criticProvider ? ' is-active' : '')
											}
											onClick={() => setFilters({ criticProvider: undefined })}>
											Todos
										</button>
										<button
											type='button'
											className={
												'game-filters-chips__option' +
												(filters.criticProvider === 'Default' ? ' is-active' : '')
											}
											onClick={() => setFilters({ criticProvider: 'Default' })}>
											Por defecto
										</button>
										<button
											type='button'
											className={
												'game-filters-chips__option' +
												(filters.criticProvider === 'Metacritic' ? ' is-active' : '')
											}
											onClick={() => setFilters({ criticProvider: 'Metacritic' })}>
											Metacritic
										</button>
										<button
											type='button'
											className={
												'game-filters-chips__option' +
												(filters.criticProvider === 'OpenCritic' ? ' is-active' : '')
											}
											onClick={() => setFilters({ criticProvider: 'OpenCritic' })}>
											OpenCritic
										</button>
										<button
											type='button'
											className={
												'game-filters-chips__option' +
												(filters.criticProvider === 'SteamDB' ? ' is-active' : '')
											}
											onClick={() => setFilters({ criticProvider: 'SteamDB' })}>
											SteamDB
										</button>
									</div>
								</>
							)}

							{openPopover === 'excluded' && (
								<>
									<h4>Excluir Status</h4>
									<div className='game-filters-chips__popover-checkboxes'>
										{statusOptions.map((status) => {
											const isExcluded = (filters.excludeStatusIds || []).includes(status.value)
											return (
												<label key={status.value} className='game-filters-chips__checkbox'>
													<input
														type='checkbox'
														checked={isExcluded}
														onChange={(e) =>
															handleExcludeStatusChange(status.value, e.target.checked)
														}
													/>
													<span>{status.label}</span>
												</label>
											)
										})}
									</div>
									<button
										type='button'
										className='game-filters-chips__clear-btn'
										onClick={() => setFilters({ excludeStatusIds: undefined })}>
										Limpiar
									</button>
								</>
							)}

							{openPopover === 'pageSize' && (
								<>
									<h4>Tamaño de página</h4>
									<div className='game-filters-chips__popover-options'>
										<button
											type='button'
											className={
												'game-filters-chips__option' +
												(!filters.pageSize || filters.pageSize === 50 ? ' is-active' : '')
											}
											onClick={() => setFilters({ pageSize: 50 })}>
											Por defecto
										</button>
										{[10, 25, 50, 100, 200].map((size) => (
											<button
												key={size}
												type='button'
												className={
													'game-filters-chips__option' +
													(filters.pageSize === size ? ' is-active' : '')
												}
												onClick={() => setFilters({ pageSize: size })}>
												{size} juegos
											</button>
										))}
									</div>
								</>
							)}
						</div>
					)}

					{/* BOTTOM ROW */}
					<div className='game-filters-chips__bottom'>
						<label className='game-filters-chips__checkbox'>
							<input
								type='checkbox'
								checked={filters.showIncomplete === true}
								onChange={(e) => setFilters({ showIncomplete: e.target.checked || undefined })}
							/>
							<span>Mostrar juegos incompletos</span>
						</label>

						{hasAnyActiveFilter() && (
							<button
								type='button'
								className='game-filters-chips__reset-btn'
								onClick={resetAllFilters}>
								Resetear filtros
							</button>
						)}
					</div>
				</>
			)}
		</section>
	)
}

export default GameFiltersChips
