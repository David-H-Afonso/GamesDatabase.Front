import React, { useState } from 'react'
import type { GameViewCreateDto, ViewConfiguration } from '@/models/api/GameView'
import { FilterField, FilterOperator, SortField, SortDirection, CombineWith } from '@/models/api/GameView'

// ─── Template definitions ─────────────────────────────────────────────────────

interface ViewTemplate {
	id: string
	name: string
	description: string
	icon: string
	params: TemplateParam[]
	generate: (values: Record<string, string>) => GameViewCreateDto
}

interface TemplateParam {
	key: string
	label: string
	type: 'year'
	defaultValue?: string
}

const currentYear = new Date().getFullYear()

const VIEW_TEMPLATES: ViewTemplate[] = [
	{
		id: 'goty',
		name: 'GOTY',
		description: 'Juegos lanzados en el año seleccionado que hayas jugado o rejugado ese año. Ordenados por nota.',
		icon: '🏆',
		params: [{ key: 'year', label: 'Año', type: 'year', defaultValue: String(currentYear) }],
		generate: ({ year }) => {
			const y = year || String(currentYear)
			return {
				name: `GOTY ${y}`,
				isPublic: true,
				configuration: {
					filterGroups: [
						{
							filters: [{ field: FilterField.Released, operator: FilterOperator.Between, value: `${y}-01-01`, secondValue: `${y}-12-31` }],
							combineWith: CombineWith.And,
						},
						{
							filters: [
								{ field: FilterField.Started, operator: FilterOperator.LessThanOrEqual, value: `${y}-12-31` },
								{ field: FilterField.Finished, operator: FilterOperator.Between, value: `${y}-01-01`, secondValue: `${y}-12-31` },
								{ field: FilterField.ReplayStarted, operator: FilterOperator.LessThanOrEqual, value: `${y}-12-31` },
								{ field: FilterField.ReplayFinished, operator: FilterOperator.Between, value: `${y}-01-01`, secondValue: `${y}-12-31` },
							],
							combineWith: CombineWith.Or,
						},
					],
					groupCombineWith: CombineWith.And,
					sorting: [
						{ field: SortField.Grade, direction: SortDirection.Descending, order: 1 },
						{ field: SortField.Name, direction: SortDirection.Ascending, order: 2 },
					],
				},
			}
		},
	},
	{
		id: 'played-year',
		name: 'Jugados en año',
		description: 'Todos los juegos que empezaste o terminaste en el año seleccionado, sin importar cuándo salieron.',
		icon: '🎮',
		params: [{ key: 'year', label: 'Año', type: 'year', defaultValue: String(currentYear) }],
		generate: ({ year }) => {
			const y = year || String(currentYear)
			return {
				name: `Jugados en ${y}`,
				isPublic: true,
				configuration: {
					filterGroups: [
						{
							filters: [
								{ field: FilterField.Started, operator: FilterOperator.Between, value: `${y}-01-01`, secondValue: `${y}-12-31` },
								{ field: FilterField.Finished, operator: FilterOperator.Between, value: `${y}-01-01`, secondValue: `${y}-12-31` },
							],
							combineWith: CombineWith.Or,
						},
					],
					groupCombineWith: CombineWith.And,
					sorting: [
						{ field: SortField.Finished, direction: SortDirection.Descending, order: 1 },
						{ field: SortField.Name, direction: SortDirection.Ascending, order: 2 },
					],
				},
			}
		},
	},
	{
		id: 'best-score',
		name: 'Mejores por Score',
		description: 'Ranking de juegos ordenados por la puntuación auto-generada (Score), de mayor a menor.',
		icon: '⭐',
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
		icon: '📊',
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
		description: 'Juegos lanzados en el año seleccionado, sin importar si los jugaste o no.',
		icon: '📅',
		params: [{ key: 'year', label: 'Año', type: 'year', defaultValue: String(currentYear) }],
		generate: ({ year }) => {
			const y = year || String(currentYear)
			return {
				name: `Lanzados en ${y}`,
				isPublic: true,
				configuration: {
					filterGroups: [
						{
							filters: [{ field: FilterField.Released, operator: FilterOperator.Between, value: `${y}-01-01`, secondValue: `${y}-12-31` }],
							combineWith: CombineWith.And,
						},
					],
					groupCombineWith: CombineWith.And,
					sorting: [
						{ field: SortField.Released, direction: SortDirection.Ascending, order: 1 },
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
		icon: '🆕',
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
				setError(`El campo "${p.label}" es obligatorio`)
				return
			}
			if (p.type === 'year') {
				const yearNum = Number(paramValues[p.key])
				if (isNaN(yearNum) || yearNum < 1970 || yearNum > 2100) {
					setError(`"${p.label}" debe ser un año válido (1970-2100)`)
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
			setError(err?.message ?? 'Error al crear la vista')
		} finally {
			setCreating(false)
		}
	}

	// Preview the generated name
	const previewName = selectedTemplate ? selectedTemplate.generate(paramValues).name : ''

	return (
		<div className='view-templates'>
			<div className='view-templates__header'>
				<h3>{selectedTemplate ? 'Configurar plantilla' : 'Crear desde plantilla'}</h3>
				<button className='close-btn' onClick={onClose}>
					×
				</button>
			</div>

			{!selectedTemplate ? (
				<div className='view-templates__grid'>
					{VIEW_TEMPLATES.map((t) => (
						<button key={t.id} className='template-card' onClick={() => handleSelectTemplate(t)}>
							<span className='template-card__icon'>{t.icon}</span>
							<span className='template-card__name'>{t.name}</span>
							<span className='template-card__desc'>{t.description}</span>
						</button>
					))}
				</div>
			) : (
				<div className='view-templates__config'>
					<div className='template-selected'>
						<span className='template-selected__icon'>{selectedTemplate.icon}</span>
						<div>
							<strong>{selectedTemplate.name}</strong>
							<p>{selectedTemplate.description}</p>
						</div>
					</div>

					{selectedTemplate.params.length > 0 && (
						<div className='template-params'>
							{selectedTemplate.params.map((p) => (
								<div key={p.key} className='template-param'>
									<label>{p.label}</label>
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
								</div>
							))}
						</div>
					)}

					<div className='template-preview'>
						Se creará: <strong>{previewName}</strong>
					</div>

					{error && <p className='template-error'>{error}</p>}

					<div className='template-actions'>
						<button className='btn btn-secondary' onClick={handleBack} disabled={creating}>
							← Volver
						</button>
						<button className='btn btn-primary' onClick={handleCreate} disabled={creating}>
							{creating ? 'Creando...' : 'Crear Vista'}
						</button>
					</div>
				</div>
			)}
		</div>
	)
}

export default ViewTemplateSelector
