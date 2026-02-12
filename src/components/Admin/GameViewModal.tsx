import React, { useState, useEffect } from 'react'
import { useGameViews, useGameStatus, useGamePlatform, useGamePlayedStatus, useGamePlayWith } from '@/hooks'
import type { GameView, GameViewCreateDto, ViewFilter, ViewSort, FilterGroup } from '@/models/api/GameView'
import { FilterField, FilterOperator, SortField, SortDirection, CombineWith } from '@/models/api/GameView'
import './GameViewModal.scss'

interface Props {
	gameView?: GameView | null
	onClose: () => void
	onSave: () => void
}

const GameViewModal: React.FC<Props> = ({ gameView, onClose, onSave }) => {
	const { createGameView, updateGameView } = useGameViews()
	const { activeStatuses, loadActiveStatuses } = useGameStatus()
	const { activeItems: activePlatforms, loadActivePlatforms } = useGamePlatform()
	const { activeItems: activePlayedStatuses, fetchActiveList: loadActivePlayedStatus } = useGamePlayedStatus()
	const { activeOptions: activePlayWithOptions, fetchActiveOptions: loadActivePlayWith } = useGamePlayWith()

	const [loading, setLoading] = useState(false)
	const [formData, setFormData] = useState({
		name: '',
		isPublic: true, // Por defecto público
	})

	const [filterGroups, setFilterGroups] = useState<FilterGroup[]>([])
	const [groupCombineWith, setGroupCombineWith] = useState<CombineWith>(CombineWith.And)
	const [sorting, setSorting] = useState<ViewSort[]>([])

	// Load status, platform, and playedStatus options on mount
	useEffect(() => {
		loadActiveStatuses()
		loadActivePlatforms()
		loadActivePlayedStatus()
		loadActivePlayWith()
	}, [loadActiveStatuses, loadActivePlatforms, loadActivePlayedStatus, loadActivePlayWith])

	// Load gameView data when editing
	useEffect(() => {
		if (gameView) {
			setFormData({
				name: gameView.name,
				isPublic: gameView.isPublic,
			})

			// Load filter groups from configuration (new format) or convert legacy filters
			if (gameView.configuration?.filterGroups) {
				setFilterGroups(gameView.configuration.filterGroups)
				setGroupCombineWith(gameView.configuration.groupCombineWith || CombineWith.And)
			} else if (gameView.configuration?.filters) {
				// Convert legacy filters to single group
				const legacyGroup: FilterGroup = {
					filters: gameView.configuration.filters,
					combineWith: CombineWith.And,
				}
				setFilterGroups([legacyGroup])
				setGroupCombineWith(CombineWith.And)
			} else {
				// Try parsing legacy string format
				const rawFilters = (gameView as any).filters
				const parsedFilters: ViewFilter[] = (() => {
					if (Array.isArray(rawFilters)) return rawFilters
					if (typeof rawFilters === 'string') {
						try {
							const parsed = JSON.parse(rawFilters)
							return Array.isArray(parsed) ? parsed : []
						} catch {
							return []
						}
					}
					return []
				})()

				if (parsedFilters.length > 0) {
					const legacyGroup: FilterGroup = {
						filters: parsedFilters,
						combineWith: CombineWith.And,
					}
					setFilterGroups([legacyGroup])
				} else {
					// Initialize with one empty group even for legacy with no filters
					setFilterGroups([
						{
							filters: [],
							combineWith: CombineWith.And,
						},
					])
				}
				setGroupCombineWith(CombineWith.And)
			}

			const rawSorting = (gameView as any).configuration?.sorting ?? (gameView as any).sorting
			const parsedSorting: ViewSort[] = Array.isArray(rawSorting)
				? (rawSorting as ViewSort[])
				: typeof rawSorting === 'string'
					? (() => {
							try {
								const parsed = JSON.parse(rawSorting)
								return Array.isArray(parsed) ? (parsed as ViewSort[]) : []
							} catch {
								return []
							}
						})()
					: []

			setSorting(parsedSorting)
		} else {
			setFormData({ name: '', isPublic: true })
			// Initialize with one empty group for new views
			setFilterGroups([
				{
					filters: [],
					combineWith: CombineWith.And,
				},
			])
			setGroupCombineWith(CombineWith.And)
			setSorting([])
		}
	}, [gameView])

	const handleInputChange = (field: keyof typeof formData, value: string | boolean) => {
		setFormData((prev) => ({ ...prev, [field]: value }))
	}

	// Filter group management
	const addFilterGroup = () => {
		const newGroup: FilterGroup = {
			filters: [],
			combineWith: CombineWith.And,
		}
		setFilterGroups((prev) => [...prev, newGroup])
	}

	const updateFilterGroup = (groupIndex: number, field: keyof FilterGroup, value: any) => {
		setFilterGroups((prev) => {
			const updated = [...prev]
			updated[groupIndex] = { ...updated[groupIndex], [field]: value }
			return updated
		})
	}

	const removeFilterGroup = (groupIndex: number) => {
		setFilterGroups((prev) => prev.filter((_, i) => i !== groupIndex))
	}

	// Filter management within groups
	const addFilter = (groupIndex: number) => {
		const newFilter: ViewFilter = {
			field: FilterField.Name,
			operator: FilterOperator.Contains,
			value: '',
		}
		setFilterGroups((prev) => {
			const updated = [...prev]
			updated[groupIndex] = {
				...updated[groupIndex],
				filters: [...updated[groupIndex].filters, newFilter],
			}
			return updated
		})
	}

	const updateFilter = (groupIndex: number, filterIndex: number, field: keyof ViewFilter, value: any) => {
		setFilterGroups((prev) => {
			const updated = [...prev]
			const filters = [...updated[groupIndex].filters]
			const currentFilter = filters[filterIndex]

			// If changing the field, check if current operator is valid for the new field
			if (field === 'field') {
				const validOperators = getOperatorsForField(value)
				const currentOperatorStillValid = validOperators.some((op) => op.value === currentFilter.operator)

				if (!currentOperatorStillValid) {
					// Set to first valid operator for the new field
					filters[filterIndex] = {
						...currentFilter,
						field: value,
						operator: validOperators[0]?.value || FilterOperator.Equals,
						value: '', // Reset value when changing field
						secondValue: undefined,
					}
				} else {
					filters[filterIndex] = { ...currentFilter, [field]: value }
				}
			} else {
				filters[filterIndex] = { ...currentFilter, [field]: value }
			}

			updated[groupIndex] = { ...updated[groupIndex], filters }
			return updated
		})
	}

	const removeFilter = (groupIndex: number, filterIndex: number) => {
		setFilterGroups((prev) => {
			const updated = [...prev]
			updated[groupIndex] = {
				...updated[groupIndex],
				filters: updated[groupIndex].filters.filter((_, i) => i !== filterIndex),
			}
			return updated
		})
	}

	// Sorting management
	const addSort = () => {
		const newSort: ViewSort = {
			field: SortField.Name,
			direction: SortDirection.Ascending,
			order: sorting.length + 1,
		}
		setSorting((prev) => [...prev, newSort])
	}

	const updateSort = (index: number, field: keyof ViewSort, value: any) => {
		setSorting((prev) => {
			const updated = [...prev]
			updated[index] = { ...updated[index], [field]: value }
			return updated
		})
	}

	const removeSort = (index: number) => {
		setSorting((prev) => {
			const updated = prev.filter((_, i) => i !== index)
			// Reorder the remaining items
			return updated.map((sort, i) => ({ ...sort, order: i + 1 }))
		})
	}

	const moveSort = (fromIndex: number, toIndex: number) => {
		setSorting((prev) => {
			const updated = [...prev]
			const [moved] = updated.splice(fromIndex, 1)
			updated.splice(toIndex, 0, moved)
			// Reorder all items
			return updated.map((sort, i) => ({ ...sort, order: i + 1 }))
		})
	}

	const handleSave = async () => {
		if (!formData.name.trim()) return

		setLoading(true)
		try {
			// Normalize filter groups for API
			const normalizeFilterGroups = (groups: FilterGroup[]) => {
				return groups.map((group) => ({
					...group,
					filters: group.filters.map((f) => {
						const out: any = { ...f }

						// Date-like fields (Released, Started, Finished, ReleaseDate) -> YYYY-MM-DD
						if ([FilterField.Released, FilterField.Started, FilterField.Finished, FilterField.ReleaseDate].includes(f.field as any)) {
							if (f.value === '' || f.value === null || f.value === undefined) {
								out.value = null
							} else if (Array.isArray(f.value)) {
								out.value = f.value.map((v: any) => String(v))
							} else {
								// Expect YYYY-MM-DD from date input; normalize to that
								const s = String(f.value)
								// If includes T, split
								out.value = s.split('T')[0]
							}
							return out
						}

						// DateTime fields (CreatedAt, UpdatedAt) -> ISO 8601
						if ([FilterField.CreatedAt, FilterField.UpdatedAt].includes(f.field as any)) {
							if (f.value === '' || f.value === null || f.value === undefined) {
								out.value = null
							} else if (Array.isArray(f.value)) {
								out.value = f.value.map((v: any) => {
									try {
										return new Date(String(v)).toISOString()
									} catch {
										return String(v)
									}
								})
							} else {
								try {
									out.value = new Date(String(f.value)).toISOString()
								} catch {
									out.value = String(f.value)
								}
							}
							return out
						} // Convert selector string values to numbers
						if ([FilterField.StatusId, FilterField.PlatformId, FilterField.PlayWithId, FilterField.PlayedStatusId].includes(f.field as any)) {
							if (f.operator === FilterOperator.In || f.operator === FilterOperator.NotIn) {
								// expect comma separated or array - normalize to number[]
								if (Array.isArray(f.value)) {
									out.value = f.value.map((v: any) => Number(v))
								} else if (typeof f.value === 'string' && f.value.includes(',')) {
									out.value = f.value.split(',').map((s) => Number(s.trim()))
								} else {
									out.value = f.value !== '' ? Number(f.value) : null
								}
							} else {
								out.value = f.value !== '' && f.value !== null ? Number(f.value) : null
							}
							return out
						}

						// non-selector fields: if operator expects array (In/NotIn)
						if (f.operator === FilterOperator.In || f.operator === FilterOperator.NotIn) {
							if (!Array.isArray(f.value)) {
								if (typeof f.value === 'string' && f.value.includes(',')) {
									out.value = f.value.split(',').map((s) => s.trim())
								} else {
									out.value = [f.value]
								}
							}
						}

						return out
					}),
				}))
			}

			const normalizedFilterGroups = normalizeFilterGroups(filterGroups)
				// Filter out empty groups (groups with no filters)
				.filter((group) => group.filters && group.filters.length > 0)

			const gameViewData: GameViewCreateDto = {
				name: formData.name.trim(),
				isPublic: formData.isPublic,
				configuration: {
					filterGroups: normalizedFilterGroups,
					groupCombineWith: groupCombineWith,
					sorting: sorting.map((sort, i) => ({ ...sort, order: i + 1 })),
				},
			}

			if (gameView) {
				// Update full view via PUT /api/gameviews/{id}
				await updateGameView(gameView.id, { ...gameViewData, id: gameView.id })
			} else {
				await createGameView(gameViewData)
			}

			onSave()
		} catch (error) {
			console.error('Error saving game view:', error)
		} finally {
			setLoading(false)
		}
	}

	const getFieldOptions = () => [
		{ value: FilterField.Name, label: 'Nombre' },
		{ value: FilterField.StatusId, label: 'Estado' },
		{ value: FilterField.PlatformId, label: 'Plataforma' },
		{ value: FilterField.PlayWithId, label: 'Jugar con' },
		{ value: FilterField.PlayedStatusId, label: 'Estado jugado' },
		{ value: FilterField.Released, label: 'Fecha lanzamiento' },
		{ value: FilterField.ReleaseDate, label: 'Fecha lanzamiento (Alt)' },
		{ value: FilterField.Started, label: 'Fecha inicio' },
		{ value: FilterField.Finished, label: 'Fecha fin' },
		{ value: FilterField.Score, label: 'Puntuación' },
		{ value: FilterField.Grade, label: 'Calificación' },
		{ value: FilterField.Critic, label: 'Crítica' },
		{ value: FilterField.Description, label: 'Descripción' },
		{ value: FilterField.Comment, label: 'Comentario' },
	]

	const getOperatorOptions = () => [
		{ value: FilterOperator.Equals, label: 'Igual a' },
		{ value: FilterOperator.NotEquals, label: 'No igual a' },
		{ value: FilterOperator.Contains, label: 'Contiene' },
		{ value: FilterOperator.NotContains, label: 'No contiene' },
		{ value: FilterOperator.GreaterThan, label: 'Mayor que' },
		{ value: FilterOperator.GreaterThanOrEqual, label: 'Mayor o igual' },
		{ value: FilterOperator.LessThan, label: 'Menor que' },
		{ value: FilterOperator.LessThanOrEqual, label: 'Menor o igual' },
		{ value: FilterOperator.In, label: 'En' },
		{ value: FilterOperator.NotIn, label: 'No en' },
		{ value: FilterOperator.IsNull, label: 'Es nulo' },
		{ value: FilterOperator.IsNotNull, label: 'No es nulo' },
		{ value: FilterOperator.IsEmpty, label: 'Está vacío' },
		{ value: FilterOperator.IsNotEmpty, label: 'No está vacío' },
		{ value: FilterOperator.StartsWith, label: 'Empieza con' },
		{ value: FilterOperator.EndsWith, label: 'Termina con' },
	]

	/**
	 * Returns only valid operators for a given field based on its type
	 * Based on backend documentation - only specific operators are supported per field type
	 */
	const getOperatorsForField = (field: string) => {
		const TEXT_FIELDS = [FilterField.Name, FilterField.Comment, FilterField.Description]
		// Numeric fields (StatusId, PlatformId, etc.) - ONLY Equals/NotEquals supported
		const NUMERIC_ID_FIELDS = [FilterField.StatusId, FilterField.PlatformId, FilterField.PlayWithId, FilterField.PlayedStatusId]
		// Numeric score fields - may support more operators
		const NUMERIC_SCORE_FIELDS = [FilterField.Score, FilterField.Grade, FilterField.Critic, FilterField.Story, FilterField.Completion]
		// Date fields - ONLY Equals/GreaterThanOrEqual/LessThanOrEqual supported
		const DATE_FIELDS = [FilterField.Released, FilterField.Started, FilterField.Finished, FilterField.ReleaseDate]
		const DATETIME_FIELDS = [FilterField.CreatedAt, FilterField.UpdatedAt]

		// Text field operators
		if (TEXT_FIELDS.includes(field as any)) {
			return [
				{ value: FilterOperator.Equals, label: 'Igual a' },
				{ value: FilterOperator.NotEquals, label: 'No igual a' },
				{ value: FilterOperator.Contains, label: 'Contiene' },
				{ value: FilterOperator.NotContains, label: 'No contiene' },
				{ value: FilterOperator.StartsWith, label: 'Empieza con' },
				{ value: FilterOperator.EndsWith, label: 'Termina con' },
				{ value: FilterOperator.IsEmpty, label: 'Está vacío' },
				{ value: FilterOperator.IsNotEmpty, label: 'No está vacío' },
			]
		}

		// Numeric ID fields (StatusId, PlatformId, etc.) - ONLY Equals/NotEquals
		if (NUMERIC_ID_FIELDS.includes(field as any)) {
			return [
				{ value: FilterOperator.Equals, label: 'Tiene el estado' },
				{ value: FilterOperator.NotEquals, label: 'No tiene el estado' },
			]
		}

		// Numeric score fields - allow range operators
		if (NUMERIC_SCORE_FIELDS.includes(field as any)) {
			return [
				{ value: FilterOperator.Equals, label: 'Igual a' },
				{ value: FilterOperator.NotEquals, label: 'No igual a' },
				{ value: FilterOperator.GreaterThan, label: 'Mayor que' },
				{ value: FilterOperator.GreaterThanOrEqual, label: 'Mayor o igual' },
				{ value: FilterOperator.LessThan, label: 'Menor que' },
				{ value: FilterOperator.LessThanOrEqual, label: 'Menor o igual' },
			]
		}

		// Date field operators - Equals/GreaterThanOrEqual/LessThanOrEqual/IsNull/IsNotNull
		if (DATE_FIELDS.includes(field as any) || DATETIME_FIELDS.includes(field as any)) {
			return [
				{ value: FilterOperator.Equals, label: 'Fecha exacta' },
				{ value: FilterOperator.GreaterThanOrEqual, label: 'En la fecha o después' },
				{ value: FilterOperator.LessThanOrEqual, label: 'En la fecha o antes' },
				{ value: FilterOperator.IsNull, label: 'No tiene fecha' },
				{ value: FilterOperator.IsNotNull, label: 'Tiene fecha' },
			]
		}

		// Default: return all operators (for Logo, Cover, or unknown fields)
		return getOperatorOptions()
	}

	const getSortFieldOptions = () => [
		{ value: SortField.Name, label: 'Nombre' },
		{ value: SortField.Status, label: 'Estado' },
		{ value: SortField.Released, label: 'Fecha lanzamiento' },
		{ value: SortField.Started, label: 'Fecha inicio' },
		{ value: SortField.Finished, label: 'Fecha fin' },
		{ value: SortField.Score, label: 'Puntuación' },
		{ value: SortField.Grade, label: 'Calificación' },
		{ value: SortField.Critic, label: 'Crítica' },
		{ value: SortField.CreatedAt, label: 'Fecha creación' },
		{ value: SortField.UpdatedAt, label: 'Última modificación' },
	]

	const isDropdownField = (field: string) => {
		return [FilterField.StatusId, FilterField.PlatformId, FilterField.PlayWithId, FilterField.PlayedStatusId].includes(field as any)
	}

	const isDateLikeField = (field: string) => {
		return [FilterField.Released, FilterField.Started, FilterField.Finished, FilterField.ReleaseDate].includes(field as any)
	}

	const isDateTimeField = (field: string) => {
		return [FilterField.CreatedAt, FilterField.UpdatedAt].includes(field as any)
	}

	const getDropdownOptions = (field: string) => {
		switch (field) {
			case FilterField.StatusId:
				return activeStatuses.map((status) => ({ value: status.id.toString(), label: status.name }))
			case FilterField.PlatformId:
				return activePlatforms.map((platform) => ({
					value: platform.id.toString(),
					label: platform.name,
				}))
			case FilterField.PlayWithId:
				return activePlayWithOptions.map((option) => ({
					value: option.id.toString(),
					label: option.name,
				}))
			case FilterField.PlayedStatusId:
				return activePlayedStatuses.map((status) => ({
					value: status.id.toString(),
					label: status.name,
				}))
			default:
				return []
		}
	}

	const renderValueInput = (filter: ViewFilter, groupIndex: number, filterIndex: number) => {
		// No mostrar input si es IsNull o IsNotNull
		if (
			filter.operator === FilterOperator.IsNull ||
			filter.operator === FilterOperator.IsNotNull ||
			filter.operator === FilterOperator.IsEmpty ||
			filter.operator === FilterOperator.IsNotEmpty
		) {
			return null
		}

		if (isDropdownField(filter.field)) {
			return (
				<select value={filter.value} onChange={(e) => updateFilter(groupIndex, filterIndex, 'value', e.target.value)}>
					<option value=''>Selecciona una opción</option>
					{getDropdownOptions(filter.field).map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
			)
		}

		if (isDateLikeField(filter.field)) {
			// date input expects YYYY-MM-DD
			const value = filter.value ? String(filter.value).split('T')[0] : ''

			return <input type='date' value={value} onChange={(e) => updateFilter(groupIndex, filterIndex, 'value', e.target.value)} />
		}

		if (isDateTimeField(filter.field)) {
			// datetime-local expects YYYY-MM-DDTHH:mm
			let value = ''
			if (filter.value) {
				try {
					const d = new Date(filter.value)
					if (!isNaN(d.getTime())) {
						// format to yyyy-mm-ddThh:mm
						value = d.toISOString().slice(0, 16)
					}
				} catch (err) {
					console.warn('Failed to parse datetime value for input:', filter.value, err)
				}
			}

			return <input type='datetime-local' value={value} onChange={(e) => updateFilter(groupIndex, filterIndex, 'value', e.target.value)} />
		}

		// Default text input
		return <input type='text' value={filter.value} onChange={(e) => updateFilter(groupIndex, filterIndex, 'value', e.target.value)} placeholder='Valor' />
	}

	return (
		<div className='game-view-modal' onClick={onClose}>
			<div className='modal-content' onClick={(e) => e.stopPropagation()}>
				<div className='modal-header'>
					<h2>{gameView ? 'Editar Vista' : 'Nueva Vista'}</h2>
					<button className='close-btn' onClick={onClose}>
						×
					</button>
				</div>

				<div className='modal-body'>
					<div className='form-group'>
						<label>Nombre *</label>
						<input type='text' value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} placeholder='Nombre de la vista' />
					</div>

					<div className='configuration-section'>
						<div className='section-header'>
							<h3>Filtros</h3>
							<button className='add-btn' onClick={addFilterGroup}>
								Agregar Grupo
							</button>
						</div>

						{filterGroups.length > 1 && (
							<div className='global-combine'>
								<label>Combinar grupos con:</label>
								<select value={groupCombineWith} onChange={(e) => setGroupCombineWith(e.target.value as CombineWith)}>
									<option value={CombineWith.And}>Y (AND)</option>
									<option value={CombineWith.Or}>O (OR)</option>
								</select>
							</div>
						)}

						{filterGroups.length === 0 ? (
							<div className='no-items'>No hay filtros configurados</div>
						) : (
							filterGroups.map((group, groupIndex) => (
								<div key={groupIndex} className='filter-group'>
									<div className='group-header'>
										<h4>Grupo {groupIndex + 1}</h4>
										{group.filters.length > 1 && (
											<>
												<label>Combinar con:</label>
												<select value={group.combineWith} onChange={(e) => updateFilterGroup(groupIndex, 'combineWith', e.target.value)}>
													<option value={CombineWith.And}>Y (AND)</option>
													<option value={CombineWith.Or}>O (OR)</option>
												</select>
											</>
										)}
										{filterGroups.length > 1 && (
											<button className='remove-group-btn' onClick={() => removeFilterGroup(groupIndex)} title='Eliminar grupo'>
												×
											</button>
										)}
									</div>

									<div className='group-filters'>
										{group.filters.length === 0 ? (
											<div className='no-filters-in-group'>
												<p>No hay filtros en este grupo</p>
												<button className='add-first-filter-btn' onClick={() => addFilter(groupIndex)}>
													Agregar Filtro
												</button>
											</div>
										) : (
											group.filters.map((filter, filterIndex) => (
												<div key={filterIndex} className='filter-item'>
													<select value={filter.field} onChange={(e) => updateFilter(groupIndex, filterIndex, 'field', e.target.value)}>
														{getFieldOptions().map((option) => (
															<option key={option.value} value={option.value}>
																{option.label}
															</option>
														))}
													</select>
													<select value={filter.operator} onChange={(e) => updateFilter(groupIndex, filterIndex, 'operator', e.target.value)}>
														{getOperatorsForField(filter.field).map((option) => (
															<option key={option.value} value={option.value}>
																{option.label}
															</option>
														))}
													</select>
													{renderValueInput(filter, groupIndex, filterIndex)}
													<button className='remove-btn' onClick={() => removeFilter(groupIndex, filterIndex)} title='Eliminar filtro'>
														×
													</button>
												</div>
											))
										)}
										{group.filters.length > 0 && (
											<button className='add-filter-btn' onClick={() => addFilter(groupIndex)}>
												Agregar Filtro
											</button>
										)}
									</div>
								</div>
							))
						)}
					</div>

					<div className='configuration-section'>
						<div className='section-header'>
							<h3>Ordenamiento</h3>
							<button className='add-btn' onClick={addSort}>
								Agregar Ordenamiento
							</button>
						</div>
						{sorting.length === 0 ? (
							<div className='no-items'>No hay ordenamientos configurados</div>
						) : (
							sorting.map((sort, index) => (
								<div key={index} className='sort-item'>
									<div className='sort-order'>
										<button className='order-btn' onClick={() => moveSort(index, Math.max(0, index - 1))} disabled={index === 0} title='Mover arriba'>
											<svg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'>
												<path d='M6 3L2 7h8L6 3z' fill='currentColor' />
											</svg>
										</button>
										<span className='order-number'>{index + 1}</span>
										<button
											className='order-btn'
											onClick={() => moveSort(index, Math.min(sorting.length - 1, index + 1))}
											disabled={index === sorting.length - 1}
											title='Mover abajo'>
											<svg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'>
												<path d='M6 9L2 5h8L6 9z' fill='currentColor' />
											</svg>
										</button>
									</div>
									<select value={sort.field} onChange={(e) => updateSort(index, 'field', e.target.value)}>
										{getSortFieldOptions().map((option) => (
											<option key={option.value} value={option.value}>
												{option.label}
											</option>
										))}
									</select>
									<select value={sort.direction} onChange={(e) => updateSort(index, 'direction', e.target.value)}>
										<option value={SortDirection.Ascending}>Ascendente</option>
										<option value={SortDirection.Descending}>Descendente</option>
									</select>
									<button className='remove-btn' onClick={() => removeSort(index)}>
										×
									</button>
								</div>
							))
						)}
					</div>
				</div>

				<div className='modal-actions'>
					<button className='btn btn-secondary' onClick={onClose}>
						Cancelar
					</button>
					<button className='btn btn-primary' onClick={handleSave} disabled={loading || !formData.name.trim()}>
						{loading ? 'Guardando...' : 'Guardar'}
					</button>
				</div>
			</div>
		</div>
	)
}

export default GameViewModal
