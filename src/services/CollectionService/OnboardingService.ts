import { environment } from '@/environments'
import { customFetch } from '@/utils/customFetch'
import { ONBOARDING_STEPS, type OnboardingState, type OnboardingStep, type TutorialSampleChange, type TutorialSampleRequest } from '@/models/api/Onboarding'

const routes = environment.apiRoutes.onboarding
const stateResult = (state: OnboardingState) => {
	if (!state || !Number.isSafeInteger(state.revision) || state.revision < 0 || typeof state.enabled !== 'boolean' || !ONBOARDING_STEPS.includes(state.step) || !Array.isArray(state.sampleGames) || state.sampleGames.length > 64 || !Number.isSafeInteger(state.samplePlaylists) || state.samplePlaylists < 0 || !Array.isArray(state.sampleLists) || state.sampleLists.length !== state.samplePlaylists) throw new Error('Invalid guide response')
	if (state.exampleViews !== undefined && (!Array.isArray(state.exampleViews) || state.exampleViews.length > 64 || state.exampleViews.some(view => !view || !Number.isSafeInteger(view.id) || view.id <= 0 || typeof view.name !== 'string' || typeof view.isPublic !== 'boolean')) || state.step === 'views' && state.exampleViews === undefined) throw new Error('Invalid guide response')
	return state
}
export const getOnboarding = async (signal?: AbortSignal) => stateResult(await customFetch<OnboardingState>(routes.base, { signal }))
export const startOnboarding = async (revision: number, restart: boolean, signal?: AbortSignal) => stateResult(await customFetch<OnboardingState>(routes.start, { method: 'POST', body: { revision, restart }, signal }))
export const saveOnboarding = async (revision: number, step: OnboardingStep, enabled: boolean, complete = false, signal?: AbortSignal) => stateResult(await customFetch<OnboardingState>(routes.base, { method: 'PUT', body: { revision, step, enabled, complete }, signal }))
export const createTutorialSamples = async (revision: number, signal?: AbortSignal, locale = 'en') => stateResult(await customFetch<OnboardingState>(routes.samples, { method: 'POST', body: { revision, confirm: true, locale: locale.startsWith('es') ? 'es' : 'en' }, signal }))
export const createTutorialViews = async (revision: number, signal?: AbortSignal, locale = 'en') => stateResult(await customFetch<OnboardingState>(routes.views, { method: 'POST', body: { revision, confirm: true, locale: locale.startsWith('es') ? 'es' : 'en' }, signal }))
export const changeTutorialSamples = async (request: TutorialSampleRequest, remove: boolean, signal?: AbortSignal) => {
	const result = await customFetch<TutorialSampleChange>(remove ? routes.samples : routes.keep, { method: remove ? 'DELETE' : 'POST', body: request, signal })
	stateResult(result?.state)
	return result
}
