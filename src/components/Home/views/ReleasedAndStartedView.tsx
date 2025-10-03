import React, { useEffect, useState } from 'react'
import { useGames } from '@/hooks'
import { GameCard } from '@/components/elements'
import type { Game } from '@/models/api/Game'

const ReleasedAndStartedView: React.FC = () => {
	const { refreshGames, filters } = useGames()
	const [items, setItems] = useState<Game[]>([])
	const [loading, setLoading] = useState(false)

	useEffect(() => {
		void (async () => {
			setLoading(true)
			try {
				const res = await refreshGames({ ...filters, releasedYear: 2025, startedYear: 2025 })
				// Thunk returns paged result; handle both shapes
				const data = (res as any)?.data ?? res
				setItems((data as Game[]) || [])
			} catch (err) {
				console.error('Error fetching released and started', err)
			} finally {
				setLoading(false)
			}
		})()
	}, [refreshGames, filters])

	return (
		<div>
			<h2>Released and Started (2025)</h2>
			{loading && <p>Loading...</p>}
			<div
				style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fill, minmax(240px,1fr))',
					gap: 12,
				}}>
				{items.map((g) => (
					<GameCard key={g.id} game={g} variant={'card'} />
				))}
			</div>
		</div>
	)
}

export default ReleasedAndStartedView
