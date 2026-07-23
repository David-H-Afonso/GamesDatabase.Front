import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { GameDetails } from '@/components/elements'
import { useGames } from '@/hooks'
import type { Game } from '@/models/api/Game'
import { NotFound } from '@/components/errors'

/**
 * Deep-link entry point for `#/games/:id`.
 * It deliberately reuses the existing details surface and never accepts or
 * persists service credentials in the browser.
 */
const GameDeepLink = () => {
	const { id } = useParams<{ id: string }>()
	const navigate = useNavigate()
	const { fetchGameDetails, deleteGameById } = useGames()
	const [game, setGame] = useState<Game | null>(null)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const gameId = Number(id)
		if (!Number.isInteger(gameId) || gameId <= 0) {
			setLoading(false)
			return
		}

		let cancelled = false
		void fetchGameDetails(gameId)
			.then((result) => {
				if (!cancelled) setGame(result)
			})
			.catch(() => {
				if (!cancelled) setGame(null)
			})
			.finally(() => {
				if (!cancelled) setLoading(false)
			})

		return () => {
			cancelled = true
		}
	}, [id, fetchGameDetails])

	if (loading) return <div aria-live='polite'>Loading…</div>
	if (!game) return <NotFound />

	return (
		<GameDetails
			game={game}
			closeDetails={() => navigate('/')}
			onDelete={(deletedGame) => {
				void deleteGameById(deletedGame.id).finally(() => navigate('/'))
			}}
		/>
	)
}

export default GameDeepLink
