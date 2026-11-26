import { useTranslation } from 'react-i18next'
import type { Game } from '@/models/api/Game'
import './SampleBadge.scss'

export const SampleBadge = ({ game }: { game: Pick<Game, 'isSample'> }) => {
	const { t } = useTranslation()
	return game.isSample ? <span className='gdb-sample-badge'>{t('guide.sampleBadge')}</span> : null
}
