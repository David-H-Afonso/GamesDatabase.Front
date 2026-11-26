import { useTranslation } from 'react-i18next'

export default function CollectionFallback() {
	const { t } = useTranslation()
	return <div className='gdb-page'><div className='gdb-empty' role='status'><p>{t('gallery.common.loading')}</p></div></div>
}
