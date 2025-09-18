import { useState, type FC } from 'react'
import type { Game, GameCreateDto, GameUpdateDto } from '@/models/api/Game'
import { Modal, GameForm } from '@/components/elements'
import { useGames } from '@/hooks/useGames'

interface Props {
	game: Game
}

const CreateGame: FC<Props> = (props) => {
	const { game } = props
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const { loadGames, addGame } = useGames()

	const openAddGameModal = () => {
		setIsModalOpen(true)
	}

	const closeModal = () => {
		setIsModalOpen(false)
		setIsSubmitting(false)
	}

	const handleGameSubmit = async (gameData: GameCreateDto | GameUpdateDto) => {
		try {
			setIsSubmitting(true)
			await addGame(gameData as GameCreateDto)
			closeModal()
			loadGames()
		} catch (error) {
			console.error('Error saving game:', error)
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<>
			{/* Game Form Modal */}
			{isModalOpen && (
				<Modal isOpen={isModalOpen} onClose={closeModal} title={'Add New Game'}>
					<GameForm
						game={game}
						onSubmit={handleGameSubmit}
						onCancel={closeModal}
						isLoading={isSubmitting}
					/>
				</Modal>
			)}

			<button className='home-component__add-button' onClick={openAddGameModal}>
				+ Add Game
			</button>
		</>
	)
}

export default CreateGame
