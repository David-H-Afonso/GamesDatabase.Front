import React, { useEffect, useState } from 'react'
import { useGames } from '@/hooks'
import { GameCard } from '@/components/elements'
import type { Game } from '@/models/api/Game'

const StartedOrStatusView: React.FC = () => {
	const { fetchStartedOrStatusList, filters } = useGames()
	const [items, setItems] = useState<Game[]>([])
	const [loading, setLoading] = useState(false)

	useEffect(() => {
		void (async () => {
			setLoading(true)
			try {
				const res = await fetchStartedOrStatusList({ ...filters, year: 2025, status: 'Goal 2025' })
				const data = (res as any)?.data ?? res
				setItems((data as Game[]) || [])
			} catch (err) {
				console.error('Error fetching started or status', err)
			} finally {
				setLoading(false)
			}
		})()
	}, [fetchStartedOrStatusList])

	return (
		<div>
			<h2>Started in 2025 or Status 'Goal 2025'</h2>
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

export default StartedOrStatusView
