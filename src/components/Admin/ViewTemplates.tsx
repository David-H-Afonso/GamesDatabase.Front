import React, { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameViewCreateDto } from '@/models/api/GameView'
import { FilterField, FilterOperator, SortField, SortDirection, CombineWith } from '@/models/api/GameView'
import TrophyIcon from '@/assets/svgs/trophy.svg?react'
import GamepadIcon from '@/assets/svgs/gamepad.svg?react'
import StarIcon from '@/assets/svgs/star.svg?react'
import ChartIcon from '@/assets/svgs/chart.svg?react'
import CalendarIcon from '@/assets/svgs/calendar-days.svg?react'
import SparklesIcon from '@/assets/svgs/sparkles.svg?react'
import ChevronLeftIcon from '@/assets/svgs/chevron-left.svg?react'

// ─── Template definitions ─────────────────────────────────────────────────────

interface ViewTemplate {
	id: string
	name: string
	description: string
	icon: ReactNode
	params: TemplateParam[]
	generate: (values: Record<string, string>) => GameViewCreateDto
}

interface TemplateParam {
	key: string
	label: string
	type: 'year' | 'select'
	defaultValue?: string
	options?: Array<{ value: string; label: string }>
}

const currentYear = new Date().getFullYear()

const VIEW_TEMPLATES: ViewTemplate[] = [
	{
		id: 'favorites',
		name: 'Favoritos',
		description: 'Juegos marcados como favoritos. Puedes ordenar después de favoritos por nombre, salida o nota.',
		icon: <StarIcon aria-hidden='true' />,
		params: [
			{
				key: 'sortMode',
				label: 'Orden secundario',
				type: 'select',
				defaultValue: 'name',
				options: [
					{ value: 'name', label: 'Nombre' },
					{ value: 'released', label: 'Fecha de salida' },
					{ value: 'grade', label: 'Nota' },
				],
			},
		],
		generate: ({ sortMode }) => {
			const secondarySort =
				sortMode === 'released'
					? { field: SortField.EffectiveReleased, direction: SortDirection.Descending, order: 2 }
					: sortMode === 'grade'
						? { field: SortField.EffectiveGrade, direction: SortDirection.Descending, order: 2 }
						: { field: SortField.Name, direction: SortDirection.Ascending, order: 2 }

			return {
				name: `Favoritos (${sortMode === 'released' ? 'salida' : sortMode === 'grade' ? 'nota' : 'nombre'})`,
				isPublic: true,
				configuration: {
					filterGroups: [
						{
							filters: [{ field: FilterField.Favorite, operator: FilterOperator.Equals, value: true }],
							combineWith: CombineWith.And,
						},
					],
					groupCombineWith: CombineWith.And,
					sorting: [
						{ field: SortField.Favorite, direction: SortDirection.Descending, order: 1 },
						secondarySort,
						...(sortMode === 'name' ? [] : [{ field: SortField.Name, direction: SortDirection.Ascending, order: 3 }]),
					],
				},
			}
		},
	},
	{
		id: 'goty',
		name: 'GOTY',
		description: 'Juegos lanzados en el año seleccionado que hayas jugado o rejugado ese año. Ordenados por nota relevante.',
		icon: <TrophyIcon aria-hidden='true' />,
		params: [{ key: 'year', label: 'Año', type: 'year', defaultValue: String(currentYear) }],
		generate: ({ year }) => {
			const y = year || String(currentYear)
			return {
				name: `GOTY ${y}`,
				isPublic: true,
				configuration: {
					filterGroups: [
						{
							filters: [
								{ field: FilterField.Released, operator: FilterOperator.Between, value: `${y}-01-01`, secondValue: `${y}-12-31` },
								{ field: FilterField.ReplayReleased, operator: FilterOperator.Between, value: `${y}-01-01`, secondValue: `${y}-12-31` },
							],
							combineWith: CombineWith.Or,
						},
						{
							filters: [
								{ field: FilterField.Started, operator: FilterOperator.LessThanOrEqual, value: `${y}-12-31` },
								{ field: FilterField.Finished, operator: FilterOperator.Between, value: `${y}-01-01`, secondValue: `${y}-12-31` },
								{ field: FilterField.ReplayStarted, operator: FilterOperator.Between, value: `${y}-01-01`, secondValue: `${y}-12-31` },
								{ field: FilterField.ReplayFinished, operator: FilterOperator.Between, value: `${y}-01-01`, secondValue: `${y}-12-31` },
							],
							combineWith: CombineWith.Or,
						},
					],
					groupCombineWith: CombineWith.And,
					sorting: [
						{ field: SortField.EffectiveGrade, direction: SortDirection.Descending, order: 1 },
						{ field: SortField.Name, direction: SortDirection.Ascending, order: 2 },
					],
				},
			}
		},
	},
	{
		id: 'played-year',
		name: 'Jugados en año',
		description: 'Todos los juegos que empezaste o terminaste en el año seleccionado, incluyendo rejugadas.',
		icon: <GamepadIcon aria-hidden='true' />,
		params: [
			{ key: 'year', label: 'Año', type: 'year', defaultValue: String(currentYear) },
			{
				key: 'sortMode',
				label: 'Ordenar por',
				type: 'select',
				defaultValue: 'date',
				options: [
					{ value: 'date', label: 'Fecha relevante' },
					{ value: 'grade', label: 'Nota relevante' },
				],
			},
		],
		generate: ({ year, sortMode }) => {
			const y = year || String(currentYear)
			const byGrade = sortMode === 'grade'
			const sorting = byGrade
				? [
						{ field: SortField.EffectiveGrade, direction: SortDirection.Descending, order: 1 },
						{ field: SortField.EffectiveFinished, direction: SortDirection.Descending, order: 2 },
						{ field: SortField.EffectiveStarted, direction: SortDirection.Descending, order: 3 },
						{ field: SortField.Name, direction: SortDirection.Ascending, order: 4 },
					]
				: [
						{ field: SortField.EffectiveFinished, direction: SortDirection.Descending, order: 1 },
						{ field: SortField.EffectiveStarted, direction: SortDirection.Descending, order: 2 },
						{ field: SortField.EffectiveGrade, direction: SortDirection.Descending, order: 3 },
						{ field: SortField.Name, direction: SortDirection.Ascending, order: 4 },
					]

			return {
				name: `Jugados en ${y} (${byGrade ? 'nota' : 'fecha'})`,
				isPublic: true,
				configuration: {
					filterGroups: [
						{
							filters: [
								{ field: FilterField.Started, operator: FilterOperator.Between, value: `${y}-01-01`, secondValue: `${y}-12-31` },
								{ field: FilterField.Finished, operator: FilterOperator.Between, value: `${y}-01-01`, secondValue: `${y}-12-31` },
								{ field: FilterField.ReplayStarted, operator: FilterOperator.Between, value: `${y}-01-01`, secondValue: `${y}-12-31` },
								{ field: FilterField.ReplayFinished, operator: FilterOperator.Between, value: `${y}-01-01`, secondValue: `${y}-12-31` },
							],
							combineWith: CombineWith.Or,
						},
					],
					groupCombineWith: CombineWith.And,
					sorting,
				},
			}
		},
	},
	{
		id: 'best-score',
		name: 'Mejores por Score',
		description: 'Ranking de juegos ordenados por la puntuación auto-generada (Score), de mayor a menor.',
		icon: <StarIcon aria-hidden='true' />,
		params: [],
		generate: () => ({
			name: 'Mejores por Score',
			isPublic: true,
			configuration: {
				filterGroups: [
					{
						filters: [{ field: FilterField.Score, operator: FilterOperator.GreaterThan, value: 0 }],
						combineWith: CombineWith.And,
					},
				],
				groupCombineWith: CombineWith.And,
				sorting: [
					{ field: SortField.Score, direction: SortDirection.Descending, order: 1 },
					{ field: SortField.Name, direction: SortDirection.Ascending, order: 2 },
				],
			},
		}),
	},
	{
		id: 'best-grade',
		name: 'Mejores por Nota',
		description: 'Ranking de juegos ordenados por tu nota personal, de mayor a menor.',
		icon: <ChartIcon aria-hidden='true' />,
		params: [],
		generate: () => ({
			name: 'Mejores por Nota',
			isPublic: true,
			configuration: {
				filterGroups: [
					{
						filters: [{ field: FilterField.Grade, operator: FilterOperator.GreaterThan, value: 0 }],
						combineWith: CombineWith.And,
					},
				],
				groupCombineWith: CombineWith.And,
				sorting: [
					{ field: SortField.Grade, direction: SortDirection.Descending, order: 1 },
					{ field: SortField.Name, direction: SortDirection.Ascending, order: 2 },
				],
			},
		}),
	},
	{
		id: 'released-year',
		name: 'Lanzados en año',
		description: 'Juegos o rejugadas lanzados en el año seleccionado, sin importar si los jugaste o no.',
		icon: <CalendarIcon aria-hidden='true' />,
		params: [{ key: 'year', label: 'Año', type: 'year', defaultValue: String(currentYear) }],
		generate: ({ year }) => {
			const y = year || String(currentYear)
			return {
				name: `Lanzados en ${y}`,
				isPublic: true,
				configuration: {
					filterGroups: [
						{
							filters: [
								{ field: FilterField.Released, operator: FilterOperator.Between, value: `${y}-01-01`, secondValue: `${y}-12-31` },
								{ field: FilterField.ReplayReleased, operator: FilterOperator.Between, value: `${y}-01-01`, secondValue: `${y}-12-31` },
							],
							combineWith: CombineWith.Or,
						},
					],
					groupCombineWith: CombineWith.And,
					sorting: [
						{ field: SortField.EffectiveReleased, direction: SortDirection.Ascending, order: 1 },
						{ field: SortField.Name, direction: SortDirection.Ascending, order: 2 },
					],
				},
			}
		},
	},
	{
		id: 'recently-added',
		name: 'Añadidos recientemente',
		description: 'Los últimos juegos que has añadido a tu base de datos, ordenados por fecha de creación.',
		icon: <SparklesIcon aria-hidden='true' />,
		params: [],
		generate: () => ({
			name: 'Añadidos recientemente',
			isPublic: true,
			configuration: {
				filterGroups: [],
				groupCombineWith: CombineWith.And,
				sorting: [{ field: SortField.CreatedAt, direction: SortDirection.Descending, order: 1 }],
			},
		}),
	},
]

// ─── Component ────────────────────────────────────────────────────────────────

interface ViewTemplateSelectorProps {
	onCreateFromTemplate: (dto: GameViewCreateDto) => Promise<void>
	onClose: () => void
}

const ViewTemplateSelector: React.FC<ViewTemplateSelectorProps> = ({ onCreateFromTemplate, onClose }) => {
	const { t } = useTranslation()
	const [selectedTemplate, setSelectedTemplate] = useState<ViewTemplate | null>(null)
	const [paramValues, setParamValues] = useState<Record<string, string>>({})
	const [creating, setCreating] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const handleSelectTemplate = (template: ViewTemplate) => {
		setSelectedTemplate(template)
		setError(null)
		// Initialize default param values
		const defaults: Record<string, string> = {}
		template.params.forEach((p) => {
			defaults[p.key] = p.defaultValue ?? ''
		})
		setParamValues(defaults)
	}

	const handleBack = () => {
		setSelectedTemplate(null)
		setParamValues({})
		setError(null)
	}

	const handleCreate = async () => {
		if (!selectedTemplate) return

		// Validate params
		for (const p of selectedTemplate.params) {
			if (!paramValues[p.key]?.trim()) {
				setError(t('admin.viewTemplates.fieldRequired', { field: p.label }))
				return
			}
			if (p.type === 'year') {
				const yearNum = Number(paramValues[p.key])
				if (isNaN(yearNum) || yearNum < 1970 || yearNum > 2100) {
					setError(t('admin.viewTemplates.invalidYear', { field: p.label }))
					return
				}
			}
		}

		setCreating(true)
		setError(null)
		try {
			const dto = selectedTemplate.generate(paramValues)
			await onCreateFromTemplate(dto)
		} catch (err: any) {
			setError(err?.message ?? t('admin.viewTemplates.createError'))
		} finally {
			setCreating(false)
		}
	}

	// Preview the generated name
	const previewName = selectedTemplate ? selectedTemplate.generate(paramValues).name : ''

	const getTemplateDisplay = (id: string) => ({
		name: t(`admin.viewTemplates.templates.${id}.name`, { defaultValue: '' }) || id,
		description: t(`admin.viewTemplates.templates.${id}.desc`, { defaultValue: '' }),
	})

	const getParamLabel = (param: TemplateParam) => t(`admin.viewTemplates.param.${param.key}`, { defaultValue: param.label })

	const getOptionLabel = (param: TemplateParam, option: { value: string; label: string }) =>
		t(`admin.viewTemplates.paramOptions.${param.key}.${option.value}`, { defaultValue: option.label })

	return (
		<div className='view-templates'>
			<div className='view-templates__header'>
				<h3>{selectedTemplate ? t('admin.viewTemplates.configureTemplate') : t('admin.viewTemplates.createFromTemplate')}</h3>
				<button className='close-btn' onClick={onClose}>
					×
				</button>
			</div>

			{!selectedTemplate ? (
				<div className='view-templates__grid'>
					{VIEW_TEMPLATES.map((tmpl) => {
						const display = getTemplateDisplay(tmpl.id)
						return (
							<button key={tmpl.id} className='template-card' onClick={() => handleSelectTemplate(tmpl)}>
								<span className='template-card__icon'>{tmpl.icon}</span>
								<span className='template-card__name'>{display.name || tmpl.name}</span>
								<span className='template-card__desc'>{display.description || tmpl.description}</span>
							</button>
						)
					})}
				</div>
			) : (
				<div className='view-templates__config'>
					<div className='template-selected'>
						<span className='template-selected__icon'>{selectedTemplate.icon}</span>
						<div>
							{(() => {
								const d = getTemplateDisplay(selectedTemplate.id)
								return (
									<>
										<strong>{d.name || selectedTemplate.name}</strong>
										<p>{d.description || selectedTemplate.description}</p>
									</>
								)
							})()}
						</div>
					</div>

					{selectedTemplate.params.length > 0 && (
						<div className='template-params'>
							{selectedTemplate.params.map((p) => (
								<div key={p.key} className='template-param'>
									<label>{getParamLabel(p)}</label>
									{p.type === 'year' && (
										<input
											type='number'
											min={1970}
											max={2100}
											value={paramValues[p.key] ?? ''}
											onChange={(e) => setParamValues((prev) => ({ ...prev, [p.key]: e.target.value }))}
											autoFocus
										/>
									)}
									{p.type === 'select' && (
										<select value={paramValues[p.key] ?? p.defaultValue ?? ''} onChange={(e) => setParamValues((prev) => ({ ...prev, [p.key]: e.target.value }))}>
											{(p.options ?? []).map((option) => (
												<option key={option.value} value={option.value}>
													{getOptionLabel(p, option)}
												</option>
											))}
										</select>
									)}
								</div>
							))}
						</div>
					)}

					<div className='template-preview'>
						{t('admin.viewTemplates.willCreate')}: <strong>{previewName}</strong>
						{error && <p className='template-error'>{error}</p>}
						<div className='template-actions'>
							<button className='btn btn-secondary' onClick={handleBack} disabled={creating}>
								<ChevronLeftIcon aria-hidden='true' /> {t('common.back')}
							</button>
							<button className='btn btn-primary' onClick={handleCreate} disabled={creating}>
								{creating ? t('admin.viewTemplates.creating') : t('admin.viewTemplates.createView')}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

export default ViewTemplateSelector
