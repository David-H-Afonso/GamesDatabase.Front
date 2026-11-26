import { useTranslation } from 'react-i18next'
import type { GameResearchLink as ResearchLink } from '@/utils/gameResearchLinks'
import { CollectionIcon } from './CollectionIcon'

export const GameResearchLink = ({ link, fieldLabel }: { link: ResearchLink | null; fieldLabel: string }) => {
	const { t } = useTranslation()
	if (!link) return null
	const provider = link.provider === 'Google Images' ? t('gallery.detail.googleImages') : link.provider
	const label = t('gallery.detail.searchProvider', { field: fieldLabel, provider })
	return <a className='gdb-research-link' href={link.href} target='_blank' rel='noopener noreferrer' aria-label={label} title={label}>
		<CollectionIcon name='search' /><span>{provider}</span><CollectionIcon name='external' />
	</a>
}
