import { useEffect, useState, type FC } from 'react'
import { useFormik } from 'formik'
import type { Game, GameCreateDto } from '@/models/api/Game'
import { Modal, GameDetails } from '@/components/elements'
import { useGames } from '@/hooks/useGames'
import { useGameStatus } from '@/hooks'
import { useAppSelector } from '@/store/hooks'
import { selectGameById } from '@/store/features/games'
import './CreateGame.scss'

const CreateGame: FC = () => {
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const { fetchGamesList, createNewGame } = useGames()
	const [createdGameId, setCreatedGameId] = useState<number | null>(null)
	const [createdGameFallback, setCreatedGameFallback] = useState<Game | null>(null)
	const [isDetailsOpen, setIsDetailsOpen] = useState(false)
	const storeCreatedGame = useAppSelector((state) =>
		createdGameId ? selectGameById(createdGameId)(state) : undefined
	)

	const openAddGameModal = () => {
		// initialize fresh row when opening
		formik.setFieldValue('games', [{ name: '', statusId: defaultStatusId ?? '' }])
		setIsModalOpen(true)
	}

	const closeModal = () => {
		setIsModalOpen(false)
		setIsSubmitting(false)
		formik.resetForm()
		formik.setFieldValue('games', [{ name: '', statusId: defaultStatusId ?? '' }])
	}

	const { fetchActiveStatusList, fetchSpecialStatusList } = useGameStatus()
	const [statusOptions, setStatusOptions] = useState<{ value: number; label: string }[]>([])
	const [defaultStatusId, setDefaultStatusId] = useState<number | undefined>(undefined)

	// Formik will manage `games`: array of { name, statusId }
	interface GameForm {
		games: { name: string; statusId: number | '' }[]
	}
	const formik = useFormik<GameForm>({
		initialValues: { games: [{ name: '', statusId: '' as number | '' }] },
		validate: (values: GameForm) => {
			const errors: Partial<GameForm & { games?: Array<{ name?: string } | undefined> }> = {}
			const gameErrors: Array<{ name?: string } | undefined> = []
			values.games.forEach((g, i) => {
				if (!g || !g.name || g.name.trim() === '') {
					gameErrors[i] = { name: 'Required' }
				}
			})
			if (gameErrors.length > 0 && gameErrors.some((ge) => ge !== undefined))
				errors.games = gameErrors as any
			return errors
		},
		onSubmit: () => {
			/* submission handled manually by handleBatchSubmit */
		},
	})

	const getStatusOptions = async () => {
		try {
			const statusList = await fetchActiveStatusList()
			const specialStatusList = await fetchSpecialStatusList()
			const options = statusList?.map((status) => ({ value: status.id, label: status.name })) ?? []
			setStatusOptions(options)

			// Prefer the NotFulfilled from specialStatusList for preselects
			const notFulfilled = specialStatusList?.find((s) => s.statusType === 'NotFulfilled')
			if (notFulfilled) {
				setDefaultStatusId(notFulfilled.id)
				formik.setFieldValue(
					'games',
					formik.values.games.map((r: any) => ({ ...r, statusId: notFulfilled.id }))
				)
			} else if (options.length > 0) {
				const has8 = options.find((o) => o.value === 8)
				const defaultValue = has8 ? 8 : Math.min(...options.map((o) => o.value))
				setDefaultStatusId(defaultValue)
				formik.setFieldValue(
					'games',
					formik.values.games.map((r: any) => ({ ...r, statusId: defaultValue }))
				)
			}

			return options
		} catch (err) {
			console.error('Error fetching status options:', err)
			return []
		}
	}

	useEffect(() => {
		void getStatusOptions()
	}, [])

	const addRow = () =>
		formik.setFieldValue('games', [
			...formik.values.games,
			{ name: '', statusId: defaultStatusId ?? '' },
		])
	const removeRow = (index: number) => {
		if (formik.values.games.length <= 1) return // do not remove last row
		const newGames = formik.values.games.filter((_: any, i: number) => i !== index)
		formik.setFieldValue('games', newGames)
	}
	const updateRow = (index: number, patch: Partial<{ name: string; statusId: number | '' }>) => {
		const newGames = formik.values.games.map((r: any, i: number) =>
			i === index ? { ...r, ...patch } : r
		)
		formik.setFieldValue('games', newGames)
	}

	const handleBatchSubmit = async () => {
		try {
			setIsSubmitting(true)

			// run validation and stop if errors
			const errors = await formik.validateForm()
			if (errors && Object.keys(errors).length > 0) {
				// mark all name fields touched so errors are visible
				const touched = { games: formik.values.games.map(() => ({ name: true })) }
				formik.setTouched(touched)
				setIsSubmitting(false)
				return
			}

			// Prepare payloads from formik values
			const payloads: GameCreateDto[] = formik.values.games
				.filter((r: any) => r.name.trim() !== '')
				.map(
					(r: any) =>
						({
							name: r.name,
							statusId: r.statusId === '' ? defaultStatusId : (r.statusId as number | undefined),
						} as unknown as GameCreateDto)
				)

			const results = await Promise.allSettled(payloads.map((p) => createNewGame(p)))

			const fulfilled = results.filter(
				(r) => r.status === 'fulfilled'
			) as PromiseFulfilledResult<any>[]
			const rejected = results.filter((r) => r.status === 'rejected')
			if (rejected.length > 0) console.warn('Some creates failed:', rejected)

			// If only one game was created successfully, open its details modal; otherwise refresh list
			if (fulfilled.length === 1 && fulfilled[0].value && fulfilled[0].value.id) {
				const created = fulfilled[0].value as Game
				closeModal()
				setCreatedGameFallback(created)
				setCreatedGameId(created.id)
				setIsDetailsOpen(true)
			} else {
				closeModal()
				// reset form to initial single empty row
				formik.setValues({ games: [{ name: '', statusId: defaultStatusId ?? '' }] })
				fetchGamesList()
			}
		} catch (err) {
			console.error('Error creating games batch:', err)
		} finally {
			setIsSubmitting(false)
		}
	}

	const gameRow = (row: { name: string; statusId: number | '' }, id: number) => {
		// cast per-row errors/touched to a shaped type to safely access .name
		const error = formik.errors?.games && (formik.errors.games[id] as any)
		const touched = formik.touched?.games && (formik.touched.games[id] as any)
		return (
			<>
				<div key={id} className='add-game-row'>
					<input
						type='text'
						className='name-input'
						placeholder='Game Title'
						value={row.name}
						onChange={(e) => updateRow(id, { name: e.target.value })}
						onBlur={() => formik.setFieldTouched(`games.${id}.name`, true)}
						style={{ flex: 1 }}
					/>

					<select
						value={row.statusId}
						onChange={(e) =>
							updateRow(id, { statusId: e.target.value === '' ? '' : parseInt(e.target.value, 10) })
						}
						className='status-select'
						style={{ minWidth: '160px' }}>
						{statusOptions.length === 0 && <option value=''>Loading statuses...</option>}
						{statusOptions.map((opt) => (
							<option key={opt.value} value={opt.value}>
								{opt.label}
							</option>
						))}
					</select>

					<button
						type='button'
						className='delete-row'
						onClick={() => removeRow(id)}
						disabled={formik.values.games.length <= 1}
						title={
							formik.values.games.length <= 1
								? 'No se puede eliminar la única fila'
								: 'Eliminar fila'
						}>
						×
					</button>
				</div>
				{touched && error?.name && <div className='field-error'>{error.name}</div>}
			</>
		)
	}

	return (
		<>
			{/* Game Form Modal */}
			{isModalOpen && (
				<Modal isOpen={isModalOpen} onClose={closeModal} title={'Add New Games'}>
					<div className='create-game-modal'>
						<div className='add-game-rows'>
							{formik.values.games.map((r: any, i: number) => gameRow(r, i))}
						</div>

						<div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
							<button type='button' className='btn' onClick={addRow}>
								+ Add Row
							</button>
							<button
								type='button'
								className='btn btn-primary'
								onClick={handleBatchSubmit}
								disabled={isSubmitting}>
								{isSubmitting
									? 'Adding...'
									: formik.values.games.length === 1
									? 'Add game'
									: 'Add games'}
							</button>
						</div>
					</div>
				</Modal>
			)}

			{/* If a single game was created, show details modal */}
			{/* Use store-backed game so updates are reflected (like GameCard) */}
			{isDetailsOpen && (storeCreatedGame || createdGameFallback) && (
				<GameDetails
					game={storeCreatedGame || createdGameFallback!}
					closeDetails={() => {
						setIsDetailsOpen(false)
						setCreatedGameFallback(null)
						setCreatedGameId(null)
						fetchGamesList()
					}}
				/>
			)}

			<button className='home-component__add-button' onClick={openAddGameModal}>
				+ Add Game
			</button>
		</>
	)
}

export default CreateGame
