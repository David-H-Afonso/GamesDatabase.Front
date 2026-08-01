import React from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Collapsible instructions for the Data Export screen.
 *
 * Rendered with plain React elements only — no `dangerouslySetInnerHTML`. The
 * bold lead of each bullet lives in a dedicated `…Label` i18n key so translation
 * values never contain HTML markup.
 */
export const AdminDataExportInstructions: React.FC = () => {
	const { t } = useTranslation()
	const [open, setOpen] = React.useState(false)

	const boldItem = (labelKey: string, textKey: string) => (
		<li>
			<strong>{t(labelKey)}</strong> {t(textKey)}
		</li>
	)

	return (
		<div className='section instructions-section'>
			<div className='section-toolbar'>
				<h2>{t('admin.dataExport.instructionsTitle')}</h2>
				<button className='btn btn-secondary btn-compact' onClick={() => setOpen((value) => !value)}>
					{open ? t('admin.dataExport.instrHide') : t('admin.dataExport.instrShow')}
				</button>
			</div>
			{open && (
				<div className='instructions-content'>
					<div className='instruction-item'>
						<h3>{t('admin.dataExport.instrExportTitle')}</h3>
						<ul>
							<li>{t('admin.dataExport.instrExport1')}</li>
							<li>{t('admin.dataExport.instrExport2')}</li>
							<li>{t('admin.dataExport.instrExport3')}</li>
							<li>{t('admin.dataExport.instrExport4')}</li>
							<li>{t('admin.dataExport.instrExport5')}</li>
						</ul>
					</div>

					<div className='instruction-item'>
						<h3>{t('admin.dataExport.instrImportTitle')}</h3>
						<ul>
							{boldItem('admin.dataExport.instrImport1Label', 'admin.dataExport.instrImport1')}
							{boldItem('admin.dataExport.instrImport2Label', 'admin.dataExport.instrImport2')}
							{boldItem('admin.dataExport.instrImport3Label', 'admin.dataExport.instrImport3')}
							<li>{t('admin.dataExport.instrImport4')}</li>
							<li>{t('admin.dataExport.instrImport5')}</li>
							<li>{t('admin.dataExport.instrImport6')}</li>
						</ul>
					</div>

					<div className='instruction-item'>
						<h3>{t('admin.dataExport.instrUseCasesTitle')}</h3>
						<ul>
							{boldItem('admin.dataExport.instrUseCase1Label', 'admin.dataExport.instrUseCase1')}
							{boldItem('admin.dataExport.instrUseCase2Label', 'admin.dataExport.instrUseCase2')}
							{boldItem('admin.dataExport.instrUseCase3Label', 'admin.dataExport.instrUseCase3')}
							{boldItem('admin.dataExport.instrUseCase4Label', 'admin.dataExport.instrUseCase4')}
							{boldItem('admin.dataExport.instrUseCase5Label', 'admin.dataExport.instrUseCase5')}
						</ul>
					</div>

					<div className='instruction-item warning-item'>
						<h3>{t('admin.dataExport.instrNotesTitle')}</h3>
						<ul>
							{boldItem('admin.dataExport.instrNote1Label', 'admin.dataExport.instrNote1')}
							{boldItem('admin.dataExport.instrNote2Label', 'admin.dataExport.instrNote2')}
							{boldItem('admin.dataExport.instrNote3Label', 'admin.dataExport.instrNote3')}
							{boldItem('admin.dataExport.instrNote4Label', 'admin.dataExport.instrNote4')}
							{boldItem('admin.dataExport.instrNote5Label', 'admin.dataExport.instrNote5')}
							{boldItem('admin.dataExport.instrNote6Label', 'admin.dataExport.instrNote6')}
							{boldItem('admin.dataExport.instrNote7Label', 'admin.dataExport.instrNote7')}
						</ul>
					</div>
				</div>
			)}
		</div>
	)
}

export default AdminDataExportInstructions
