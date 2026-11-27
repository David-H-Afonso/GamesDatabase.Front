import type { Game } from './Game'

export const ONBOARDING_STEPS = ['welcome', 'library', 'views', 'organize', 'progress', 'home', 'discover', 'finish'] as const
export type OnboardingStep = typeof ONBOARDING_STEPS[number]
export interface OnboardingState {
	version: string
	revision: number
	enabled: boolean
	step: OnboardingStep
	completedVersion?: string | null
	requiresPassword?: boolean
	hasSamples?: boolean
	sampleGames: Game[]
	samplePlaylists: number
	sampleLists?: Array<{ id: number; name: string; createdAt: string; updatedAt: string }>
	exampleViews?: Array<{ id: number; name: string; description?: string | null; isPublic: boolean }>
}
export interface TutorialSampleChange {
	removedGames: number
	keptGames: number
	removedPlaylists: number
	keptPlaylists: number
	state: OnboardingState
}
export interface TutorialSampleRequest {
	revision: number
	confirm: true
	removeEditedSamples: boolean
	expectedGames: Array<{ id: number; updatedAt: string }>
	expectedPlaylists: Array<{ id: number; updatedAt: string }>
}
