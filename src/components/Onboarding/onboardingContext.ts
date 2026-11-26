import { createContext, useContext } from 'react'
import type { OnboardingState, OnboardingStep, TutorialSampleChange, TutorialSampleRequest } from '@/models/api/Onboarding'

export interface OnboardingContextValue {
	data: OnboardingState | null
	loading: boolean
	busy: boolean
	open: boolean
	error: 'conflict' | 'request' | null
	openGuide: (restart?: boolean, targetStep?: OnboardingStep) => Promise<void>
	hide: () => void
	pause: () => Promise<void>
	saveStep: (step: OnboardingStep, complete?: boolean) => Promise<OnboardingState | null>
	createSamples: () => Promise<OnboardingState | null>
	changeSamples: (request: TutorialSampleRequest, remove: boolean) => Promise<TutorialSampleChange | null>
	reload: () => Promise<OnboardingState | null>
}
export const OnboardingContext = createContext<OnboardingContextValue | null>(null)
export const useOnboarding = () => useContext(OnboardingContext)
