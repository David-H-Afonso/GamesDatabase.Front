import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { collectionTemplateIds, type CollectionTemplateId } from '@/utils/collectionTemplates'
import { CollectionIcon, type CollectionIconName } from './CollectionIcon'
import './CollectionTemplates.scss'

const icons: Record<CollectionTemplateId, CollectionIconName> = { favorites: 'star', playingNow: 'focus', upcoming: 'clock' }

export const CollectionTemplatePicker = ({ scope, onSelect, onCustom }: {
	scope: 'playlist' | 'home'
	onSelect: (id: CollectionTemplateId) => void
	onCustom: () => void
}) => {
	const { t } = useTranslation(), headingId = useId()
	return <section className='gdb-template-picker' aria-labelledby={headingId}>
		<div className='gdb-template-picker__intro'><span className='gdb-eyebrow'>{t('gallery.templates.eyebrow')}</span><h3 id={headingId}>{t(`gallery.templates.${scope}Heading`)}</h3><p>{t(`gallery.templates.${scope}Help`)}</p></div>
		<div className='gdb-template-options'>{collectionTemplateIds.map(id => <button key={id} type='button' data-template={id} aria-label={t('gallery.templates.use', { name: t(`gallery.templates.${id}.title`) })} onClick={() => onSelect(id)}>
			<span className='gdb-template-option__icon'><CollectionIcon name={icons[id]} /></span><span className='gdb-template-option__copy'><strong>{t(`gallery.templates.${id}.title`)}</strong><span>{t(`gallery.templates.${id}.description`)}</span><small>{t('gallery.templates.automatic')}</small></span><CollectionIcon name='arrow' />
		</button>)}</div>
		<div className='gdb-template-custom'><span>{t('gallery.templates.orCustom')}</span><button type='button' className='gdb-button' onClick={onCustom}><CollectionIcon name='plus' />{t(`gallery.templates.${scope}Custom`)}</button><p className='gdb-hint'>{t(`gallery.templates.${scope}CustomHelp`)}</p></div>
	</section>
}
