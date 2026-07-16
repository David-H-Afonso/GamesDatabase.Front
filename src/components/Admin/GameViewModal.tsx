import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '@/components/elements'
import { useGameViews, useGamePlatform, useGamePlayedStatus, useGamePlayWith } from '@/hooks'
import { useGameStatus } from '@/hooks/useGameStatus/useGameStatus'
import type { GameView, GameViewCreateDto, ViewFilter, ViewSort, FilterGroup } from '@/models/api/GameView'
import { FilterField, FilterOperator, SortField, SortDirection, CombineWith } from '@/models/api/GameView'
import { getActiveGameReplayTypes } from '@/services/GameReplayTypeService'
import type { GameReplayType } from '@/models/api/GameReplayType'
import './GameViewModal.scss'

interface Props {
	gameView?: GameView | null
	onClose: () => void
	onSave: () => void
}

const GameViewModal: React.FC<Props> = ({ gameView, onClose, onSave }) => {
	const { t } = useTranslation()
	const { createGameView, updateGameView } = useGameViews()
	const { activeStatuses, loadActiveStatuses } = useGameStatus()
	const { activeItems: activePlatforms, loadActivePlatforms } = useGamePlatform()
	const { activeItems: activePlayedStatuses, fetchActiveList: loadActivePlayedStatus } = useGamePlayedStatus()
	const { activeOptions: activePlayWithOptions, fetchActiveOptions: loadActivePlayWith } = useGamePlayWith()
	const [replayTypes, setReplayTypes] = useState<GameReplayType[]>([])

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
		getActiveGameReplayTypes()
			.then(setReplayTypes)
			.catch(() => {})
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

						// Date-like fields -> YYYY-MM-DD
						if (
							[
								FilterField.Released,
								FilterField.Started,
								FilterField.Finished,
								FilterField.ReleaseDate,
								FilterField.ReplayStarted,
								FilterField.ReplayFinished,
								FilterField.ReplayReleased,
							].includes(f.field as any)
						) {
							if (f.value === '' || f.value === null || f.value === undefined) {
								out.value = null
							} else if (Array.isArray(f.value)) {
								out.value = f.value.map((v: any) => String(v))
							} else {
								const s = String(f.value)
								out.value = s.split('T')[0]
							}
							// Normalize secondValue for Between operator
							if (f.operator === FilterOperator.Between && f.secondValue) {
								out.secondValue = String(f.secondValue).split('T')[0]
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

						if (f.field === FilterField.Favorite) {
							out.value = f.value === true || f.value === 'true'
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
		{ value: FilterField.Name, label: t('game.filters.fieldName') },
		{ value: FilterField.StatusId, label: t('game.filters.fieldStatus') },
		{ value: FilterField.PlatformId, label: t('game.filters.fieldPlatform') },
		{ value: FilterField.PlayWithId, label: t('game.filters.fieldPlayWith') },
		{ value: FilterField.PlayedStatusId, label: t('game.filters.fieldPlayedStatus') },
		{ value: FilterField.Released, label: t('game.filters.fieldReleased') },
		{ value: FilterField.ReleaseDate, label: t('game.filters.fieldReleaseDateAlt') },
		{ value: FilterField.Started, label: t('game.filters.fieldStarted') },
		{ value: FilterField.Finished, label: t('game.filters.fieldFinished') },
		{ value: FilterField.Score, label: t('game.filters.fieldScore') },
		{ value: FilterField.Grade, label: t('game.filters.fieldGrade') },
		{ value: FilterField.Critic, label: t('game.filters.fieldCritic') },
		{ value: FilterField.SteamAppId, label: t('game.filters.fieldSteamAppId') },
		{ value: FilterField.SteamPlaytimeForever, label: t('game.filters.fieldSteamPlaytime') },
		{ value: FilterField.Favorite, label: t('game.filters.fieldFavorite') },
		{ value: FilterField.Description, label: t('game.filters.fieldDescription') },
		{ value: FilterField.Comment, label: t('game.filters.fieldComment') },
		{ value: 'ReplayGroup', label: t('game.filters.fieldReplay') },
	]

	const getOperatorOptions = () => [
		{ value: FilterOperator.Equals, label: t('game.filters.opEquals') },
		{ value: FilterOperator.NotEquals, label: t('game.filters.opNotEquals') },
		{ value: FilterOperator.Contains, label: t('game.filters.opContains') },
		{ value: FilterOperator.NotContains, label: t('game.filters.opNotContains') },
		{ value: FilterOperator.GreaterThan, label: t('game.filters.opGreaterThan') },
		{ value: FilterOperator.GreaterThanOrEqual, label: t('game.filters.opGreaterThanOrEqual') },
		{ value: FilterOperator.LessThan, label: t('game.filters.opLessThan') },
		{ value: FilterOperator.LessThanOrEqual, label: t('game.filters.opLessThanOrEqual') },
		{ value: FilterOperator.In, label: t('game.filters.opIn') },
		{ value: FilterOperator.NotIn, label: t('game.filters.opNotIn') },
		{ value: FilterOperator.IsNull, label: t('game.filters.opIsNull') },
		{ value: FilterOperator.IsNotNull, label: t('game.filters.opIsNotNull') },
		{ value: FilterOperator.IsEmpty, label: t('game.filters.opIsEmpty') },
		{ value: FilterOperator.IsNotEmpty, label: t('game.filters.opIsNotEmpty') },
		{ value: FilterOperator.StartsWith, label: t('game.filters.opStartsWith') },
		{ value: FilterOperator.EndsWith, label: t('game.filters.opEndsWith') },
	]

	/**
	 * Returns only valid operators for a given field based on its type
	 * Based on backend documentation - only specific operators are supported per field type
	 */
	const getOperatorsForField = (field: string) => {
		const TEXT_FIELDS = [FilterField.Name, FilterField.Comment, FilterField.Description]
		// Numeric fields (StatusId, PlatformId, etc.) - ONLY Equals/NotEquals supported
		const NUMERIC_ID_FIELDS = [FilterField.StatusId, FilterField.PlatformId, FilterField.PlayWithId, FilterField.PlayedStatusId, FilterField.SteamAppId, FilterField.ReplayTypeId]
		// Numeric score fields - may support more operators
		const NUMERIC_SCORE_FIELDS = [
			FilterField.Score,
			FilterField.Grade,
			FilterField.Critic,
			FilterField.Story,
			FilterField.Completion,
			FilterField.SteamPlaytimeForever,
			FilterField.ReplayGrade,
		]
		// Date fields - ONLY Equals/GreaterThanOrEqual/LessThanOrEqual supported
		const DATE_FIELDS = [
			FilterField.Released,
			FilterField.Started,
			FilterField.Finished,
			FilterField.ReleaseDate,
			FilterField.ReplayStarted,
			FilterField.ReplayFinished,
			FilterField.ReplayReleased,
		]
		const DATETIME_FIELDS = [FilterField.CreatedAt, FilterField.UpdatedAt]
		const BOOLEAN_FIELDS = [FilterField.Favorite]

		if (BOOLEAN_FIELDS.includes(field as any)) {
			return [
				{ value: FilterOperator.Equals, label: t('game.filters.opEquals') },
				{ value: FilterOperator.NotEquals, label: t('game.filters.opNotEquals') },
			]
		}

		// Text field operators
		if (TEXT_FIELDS.includes(field as any)) {
			return [
				{ value: FilterOperator.Equals, label: t('game.filters.opEquals') },
				{ value: FilterOperator.NotEquals, label: t('game.filters.opNotEquals') },
				{ value: FilterOperator.Contains, label: t('game.filters.opContains') },
				{ value: FilterOperator.NotContains, label: t('game.filters.opNotContains') },
				{ value: FilterOperator.StartsWith, label: t('game.filters.opStartsWith') },
				{ value: FilterOperator.EndsWith, label: t('game.filters.opEndsWith') },
				{ value: FilterOperator.IsEmpty, label: t('game.filters.opIsEmpty') },
				{ value: FilterOperator.IsNotEmpty, label: t('game.filters.opIsNotEmpty') },
			]
		}

		// Numeric ID fields (StatusId, PlatformId, etc.) - ONLY Equals/NotEquals
		if (NUMERIC_ID_FIELDS.includes(field as any)) {
			return [
				{ value: FilterOperator.Equals, label: t('game.filters.opHasStatus') },
				{ value: FilterOperator.NotEquals, label: t('game.filters.opNotHasStatus') },
			]
		}

		// Numeric score fields - allow range operators
		if (NUMERIC_SCORE_FIELDS.includes(field as any)) {
			return [
				{ value: FilterOperator.Equals, label: t('game.filters.opEquals') },
				{ value: FilterOperator.NotEquals, label: t('game.filters.opNotEquals') },
				{ value: FilterOperator.GreaterThan, label: t('game.filters.opGreaterThan') },
				{ value: FilterOperator.GreaterThanOrEqual, label: t('game.filters.opGreaterThanOrEqual') },
				{ value: FilterOperator.LessThan, label: t('game.filters.opLessThan') },
				{ value: FilterOperator.LessThanOrEqual, label: t('game.filters.opLessThanOrEqual') },
				{ value: FilterOperator.Between, label: t('game.filters.opBetween') },
			]
		}

		// Date field operators - Equals/GreaterThanOrEqual/LessThanOrEqual/Between/IsNull/IsNotNull
		if (DATE_FIELDS.includes(field as any) || DATETIME_FIELDS.includes(field as any)) {
			return [
				{ value: FilterOperator.Equals, label: t('game.filters.opExactDate') },
				{ value: FilterOperator.GreaterThanOrEqual, label: t('game.filters.opOnOrAfter') },
				{ value: FilterOperator.LessThanOrEqual, label: t('game.filters.opOnOrBefore') },
				{ value: FilterOperator.Between, label: t('game.filters.opBetweenDates') },
				{ value: FilterOperator.IsNull, label: t('game.filters.opNoDate') },
				{ value: FilterOperator.IsNotNull, label: t('game.filters.opHasDate') },
			]
		}

		// Default: return all operators (for Logo, Cover, or unknown fields)
		return getOperatorOptions()
	}

	const getSortFieldOptions = () => [
		{ value: SortField.Name, label: t('game.filters.fieldName') },
		{ value: SortField.Status, label: t('game.filters.fieldStatus') },
		{ value: SortField.Released, label: t('game.filters.fieldReleased') },
		{ value: SortField.EffectiveReleased, label: t('game.filters.fieldEffectiveReleased') },
		{ value: SortField.Started, label: t('game.filters.fieldStarted') },
		{ value: SortField.Finished, label: t('game.filters.fieldFinished') },
		{ value: SortField.EffectiveStarted, label: t('game.filters.fieldEffectiveStarted') },
		{ value: SortField.EffectiveFinished, label: t('game.filters.fieldEffectiveFinished') },
		{ value: SortField.Score, label: t('game.filters.fieldScore') },
		{ value: SortField.Grade, label: t('game.filters.fieldGrade') },
		{ value: SortField.EffectiveGrade, label: t('game.filters.fieldEffectiveGrade') },
		{ value: SortField.Critic, label: t('game.filters.fieldCritic') },
		{ value: SortField.CreatedAt, label: t('game.filters.fieldCreatedAt') },
		{ value: SortField.UpdatedAt, label: t('game.filters.fieldUpdatedAt') },
		{ value: SortField.SteamPlaytimeForever, label: t('game.filters.fieldSteamPlaytime') },
		{ value: SortField.Favorite, label: t('game.filters.fieldFavorite') },
	]

	const REPLAY_FIELDS = [FilterField.ReplayStarted, FilterField.ReplayFinished, FilterField.ReplayReleased, FilterField.ReplayGrade, FilterField.ReplayTypeId]
	const isReplayField = (field: string) => REPLAY_FIELDS.includes(field as any)

	const getReplaySubOptions = () => [
		{ value: FilterField.ReplayStarted, label: t('game.filters.replayStarted') },
		{ value: FilterField.ReplayFinished, label: t('game.filters.replayFinished') },
		{ value: FilterField.ReplayReleased, label: t('game.filters.replayReleased') },
		{ value: FilterField.ReplayGrade, label: t('game.filters.replayGrade') },
		{ value: FilterField.ReplayTypeId, label: t('game.filters.replayType') },
	]

	const isDropdownField = (field: string) => {
		return [FilterField.StatusId, FilterField.PlatformId, FilterField.PlayWithId, FilterField.PlayedStatusId, FilterField.ReplayTypeId].includes(field as any)
	}

	const isDateLikeField = (field: string) => {
		return [
			FilterField.Released,
			FilterField.Started,
			FilterField.Finished,
			FilterField.ReleaseDate,
			FilterField.ReplayStarted,
			FilterField.ReplayFinished,
			FilterField.ReplayReleased,
		].includes(field as any)
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
			case FilterField.ReplayTypeId:
				return replayTypes.map((rt) => ({ value: rt.id.toString(), label: rt.name }))
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
					<option value=''>{t('common.selectOption')}</option>
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

			if (filter.operator === FilterOperator.Between) {
				const secondValue = filter.secondValue ? String(filter.secondValue).split('T')[0] : ''
				return (
					<>
						<input type='date' value={value} onChange={(e) => updateFilter(groupIndex, filterIndex, 'value', e.target.value)} title='Desde' />
						<span style={{ margin: '0 4px' }}>—</span>
						<input type='date' value={secondValue} onChange={(e) => updateFilter(groupIndex, filterIndex, 'secondValue', e.target.value)} title='Hasta' />
					</>
				)
			}

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

		if (filter.field === FilterField.Favorite) {
			return (
				<select value={String(filter.value ?? true)} onChange={(e) => updateFilter(groupIndex, filterIndex, 'value', e.target.value === 'true')}>
					<option value='true'>{t('common.yes')}</option>
					<option value='false'>{t('common.no')}</option>
				</select>
			)
		}

		// Default text input
		return <input type='text' value={filter.value} onChange={(e) => updateFilter(groupIndex, filterIndex, 'value', e.target.value)} placeholder={t('common.value')} />
	}

	return (
		<Modal
			isOpen
			onClose={onClose}
			title={gameView ? t('admin.gameViews.editView') : t('admin.gameViews.newView')}
			maxWidth='900px'
			footer={
				<>
					<button className='btn btn-secondary' onClick={onClose}>
						{t('common.cancel')}
					</button>
					<button className='btn btn-primary' onClick={handleSave} disabled={loading || !formData.name.trim()}>
						{loading ? t('common.saving') : t('common.save')}
					</button>
				</>
			}>
			<div className='game-view-modal-body'>
				<div className='form-group'>
					<label>{t('common.name')} *</label>
					<input type='text' value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} placeholder={t('game.viewNamePlaceholder')} />
				</div>

				<div className='configuration-section'>
					<div className='section-header'>
						<h3>{t('game.filters.title')}</h3>
						<button className='add-btn' onClick={addFilterGroup}>
							{t('game.filters.addGroup')}
						</button>
					</div>

					{filterGroups.length > 1 && (
						<div className='global-combine'>
							<label>{t('game.filters.combineGroups')}:</label>
							<select value={groupCombineWith} onChange={(e) => setGroupCombineWith(e.target.value as CombineWith)}>
								<option value={CombineWith.And}>{t('game.filters.combineAnd')} (AND)</option>
								<option value={CombineWith.Or}>{t('game.filters.combineOr')} (OR)</option>
							</select>
						</div>
					)}

					{filterGroups.length === 0 ? (
						<div className='no-items'>{t('game.filters.noFilters')}</div>
					) : (
						filterGroups.map((group, groupIndex) => (
							<div key={groupIndex} className='filter-group'>
								<div className='group-header'>
									<h4>
										{t('game.filters.group')} {groupIndex + 1}
									</h4>
									{group.filters.length > 1 && (
										<>
											<label>{t('game.filters.combineWith')}:</label>
											<select value={group.combineWith} onChange={(e) => updateFilterGroup(groupIndex, 'combineWith', e.target.value)}>
												<option value={CombineWith.And}>{t('game.filters.combineAnd')}</option>
												<option value={CombineWith.Or}>{t('game.filters.combineOr')}</option>
											</select>
										</>
									)}
									{filterGroups.length > 1 && (
										<button className='remove-group-btn' onClick={() => removeFilterGroup(groupIndex)} title={t('game.filters.removeGroup')}>
											×
										</button>
									)}
								</div>

								<div className='group-filters'>
									{group.filters.length === 0 ? (
										<div className='no-filters-in-group'>
											<p>{t('game.filters.noFiltersInGroup')}</p>
											<button className='add-first-filter-btn' onClick={() => addFilter(groupIndex)}>
												{t('game.filters.addFilter')}
											</button>
										</div>
									) : (
										group.filters.map((filter, filterIndex) => (
											<div key={filterIndex} className='filter-item'>
												<select
													value={isReplayField(filter.field) ? 'ReplayGroup' : filter.field}
													onChange={(e) => {
														const val = e.target.value
														updateFilter(groupIndex, filterIndex, 'field', val === 'ReplayGroup' ? FilterField.ReplayStarted : val)
													}}>
													{getFieldOptions().map((option) => (
														<option key={option.value} value={option.value}>
															{option.label}
														</option>
													))}
												</select>
												{isReplayField(filter.field) && (
													<select value={filter.field} onChange={(e) => updateFilter(groupIndex, filterIndex, 'field', e.target.value)}>
														{getReplaySubOptions().map((opt) => (
															<option key={opt.value} value={opt.value}>
																{opt.label}
															</option>
														))}
													</select>
												)}
												<select value={filter.operator} onChange={(e) => updateFilter(groupIndex, filterIndex, 'operator', e.target.value)}>
													{getOperatorsForField(filter.field).map((option) => (
														<option key={option.value} value={option.value}>
															{option.label}
														</option>
													))}
												</select>
												{renderValueInput(filter, groupIndex, filterIndex)}
												<button className='remove-btn' onClick={() => removeFilter(groupIndex, filterIndex)} title={t('game.filters.removeFilter')}>
													×
												</button>
											</div>
										))
									)}
									{group.filters.length > 0 && (
										<button className='add-filter-btn' onClick={() => addFilter(groupIndex)}>
											{t('game.filters.addFilter')}
										</button>
									)}
								</div>
							</div>
						))
					)}
				</div>

				<div className='configuration-section'>
					<div className='section-header'>
						<h3>{t('game.sorting.title')}</h3>
						<button className='add-btn' onClick={addSort}>
							{t('game.sorting.addSort')}
						</button>
					</div>
					{sorting.length === 0 ? (
						<div className='no-items'>{t('game.sorting.noSorts')}</div>
					) : (
						sorting.map((sort, index) => (
							<div key={index} className='sort-item'>
								<div className='sort-order'>
									<button className='order-btn' onClick={() => moveSort(index, Math.max(0, index - 1))} disabled={index === 0} title={t('game.sorting.moveUp')}>
										<svg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'>
											<path d='M6 3L2 7h8L6 3z' fill='currentColor' />
										</svg>
									</button>
									<span className='order-number'>{index + 1}</span>
									<button
										className='order-btn'
										onClick={() => moveSort(index, Math.min(sorting.length - 1, index + 1))}
										disabled={index === sorting.length - 1}
										title={t('game.sorting.moveDown')}>
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
									<option value={SortDirection.Ascending}>{t('game.sorting.ascending')}</option>
									<option value={SortDirection.Descending}>{t('game.sorting.descending')}</option>
								</select>
								<button className='remove-btn' onClick={() => removeSort(index)}>
									×
								</button>
							</div>
						))
					)}
				</div>
			</div>
		</Modal>
	)
}

export default GameViewModal
