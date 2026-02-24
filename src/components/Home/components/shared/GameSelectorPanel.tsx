import React, { useEffect, useRef, useState } from 'react'
import { getGames } from '@/services/GamesService'
import type { Game } from '@/models/api/Game'
import './GameSelectorPanel.scss'

interface GameSelectorPanelProps {
	/** Currently selected games (id + name) */
	selectedGames: Array<{ id: number; name: string }>
	/** Called when the selection changes, with the full updated list */
	onSelectionChange: (games: Array<{ id: number; name: string }>) => void
	/**
	 * Optional pre-selected game objects (e.g. when triggered from a bulk-selection).
	 * If provided they are merged into the selection on mount.
	 */
	preSelectedGames?: Array<{ id: number; name: string }>
}

const SEARCH_LIMIT = 20

const GameSelectorPanel: React.FC<GameSelectorPanelProps> = ({ selectedGames, onSelectionChange, preSelectedGames = [] }) => {
	const [searchText, setSearchText] = useState('')
	const [searchResults, setSearchResults] = useState<Game[]>([])
	const [searching, setSearching] = useState(false)

	// Sync preSelectedGames on mount
	useEffect(() => {
		if (preSelectedGames.length > 0) {
			const merged = [...selectedGames]
			preSelectedGames.forEach((pg) => {
				if (!merged.find((g) => g.id === pg.id)) merged.push(pg)
			})
			if (merged.length !== selectedGames.length) onSelectionChange(merged)
		}
	}, [])

	const selectedIds = selectedGames.map((g) => g.id)

	// Debounced search
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)

		if (!searchText.trim()) {
			setSearchResults([])
			return
		}

		debounceRef.current = setTimeout(async () => {
			setSearching(true)
			try {
				const result = await getGames({ search: searchText.trim(), pageSize: SEARCH_LIMIT, page: 1 })
				const filtered = result.data.filter((g) => !selectedIds.includes(g.id))
				setSearchResults(filtered)
			} catch (err) {
				console.error('GameSelectorPanel search error', err)
				setSearchResults([])
			} finally {
				setSearching(false)
			}
		}, 300)

		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current)
		}
	}, [searchText, selectedIds.join(',')])

	const addGame = (game: Game) => {
		onSelectionChange([...selectedGames, { id: game.id, name: game.name }])
		setSearchResults((prev) => prev.filter((g) => g.id !== game.id))
	}

	const removeGame = (id: number) => {
		onSelectionChange(selectedGames.filter((g) => g.id !== id))
	}

	return (
		<div className='gsp'>
			{/* Left: search */}
			<div className='gsp__search-panel'>
				<p className='gsp__panel-title'>Search &amp; Add Games</p>
				<input type='text' className='gsp__search-input' placeholder='Type a game name…' value={searchText} onChange={(e) => setSearchText(e.target.value)} autoFocus />

				<div className='gsp__results'>
					{searching && <p className='gsp__status'>Searching…</p>}

					{!searching && searchText.trim() && searchResults.length === 0 && <p className='gsp__status'>No games found.</p>}

					{!searching &&
						searchResults.map((game) => (
							<button key={game.id} type='button' className='gsp__result-item' onClick={() => addGame(game)}>
								<span className='gsp__result-name'>{game.name}</span>
								<span className='gsp__result-add'>+</span>
							</button>
						))}
				</div>
			</div>

			{/* Right: selected games */}
			<div className='gsp__selected-panel'>
				<p className='gsp__panel-title'>
					Selected <span className='gsp__count'>{selectedGames.length}</span>
				</p>

				<div className='gsp__selected-list'>
					{selectedGames.length === 0 && <p className='gsp__status'>No games selected yet.</p>}

					{selectedGames.map((game) => (
						<div key={game.id} className='gsp__selected-item'>
							<span className='gsp__selected-name'>{game.name}</span>
							<button type='button' className='gsp__selected-remove' aria-label={`Remove ${game.name}`} onClick={() => removeGame(game.id)}>
								×
							</button>
						</div>
					))}
				</div>
			</div>
		</div>
	)
}

export default GameSelectorPanel
