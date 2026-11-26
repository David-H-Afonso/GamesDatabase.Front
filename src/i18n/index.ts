import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import en from './locales/en.json'
import es from './locales/es.json'
import galleryEn from './locales/gallery.en.json'
import galleryEs from './locales/gallery.es.json'
import guideEn from './locales/guide.en.json'
import guideEs from './locales/guide.es.json'
import metadataEn from './locales/metadata.en.json'
import metadataEs from './locales/metadata.es.json'

i18n
	.use(LanguageDetector)
	.use(initReactI18next)
	.init({
		resources: {
			en: { translation: { ...en, gallery: galleryEn, guide: guideEn, metadata: metadataEn } },
			es: { translation: { ...es, gallery: galleryEs, guide: guideEs, metadata: metadataEs } },
		},
		fallbackLng: 'en',
		supportedLngs: ['en', 'es'],
		interpolation: {
			escapeValue: false,
		},
		detection: {
			order: ['localStorage'],
			caches: ['localStorage'],
		},
	})

export default i18n
