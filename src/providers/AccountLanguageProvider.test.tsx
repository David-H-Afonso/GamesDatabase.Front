import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useTranslation } from 'react-i18next'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/utils/renderWithProviders'
import i18n from '@/i18n'
import { AccountLanguageProvider } from './AccountLanguageProvider'
import { useAccountLanguage } from './accountLanguageContext'

const calls = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }))
vi.mock('@/services/UserService', () => ({ userService: { getUserById: calls.get, updateUser: calls.put } }))
const auth = { user: { id: 1, username: 'Language fixture', role: 'Standard' }, token: 'fixture', refreshToken: null, isAuthenticated: true, loading: false, error: null } as const
const profile = (language: 'en' | 'es' | null = 'es', id = 1) => ({ id, preferredLanguage: language, useScoreColors: false, scoreProvider: 'Metacritic', showPriceComparisonIcon: false })
function Probe() { const { i18n } = useTranslation(), settings = useAccountLanguage()!; return <><p>{i18n.resolvedLanguage}: tutorial</p><button onClick={() => { void settings.change('en') }}>English</button>{settings.error && <p role='alert'>{settings.error}</p>}</> }
const mount = () => renderWithProviders(<AccountLanguageProvider><Probe /></AccountLanguageProvider>, { preloadedState: { auth } })

describe('account language before onboarding', () => {
	beforeEach(async () => { vi.clearAllMocks(); await i18n.changeLanguage('en'); calls.get.mockResolvedValue(profile()); calls.put.mockResolvedValue(undefined) })
	it('does not mount the tutorial until the assigned Spanish language has loaded', async () => {
		let finish!: (value: ReturnType<typeof profile>) => void; calls.get.mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
		mount(); expect(screen.queryByText(/: tutorial/)).not.toBeInTheDocument()
		await act(async () => { finish(profile()) }); expect(await screen.findByText('es: tutorial')).toBeInTheDocument(); expect(document.documentElement.lang).toBe('es'); expect(calls.put).not.toHaveBeenCalled()
	})
	it('persists only an explicit user choice and uses the authoritative refreshed profile', async () => {
		calls.put.mockImplementation(async () => { calls.get.mockResolvedValue(profile('en')) })
		mount(); await screen.findByText('es: tutorial'); await userEvent.click(screen.getByRole('button', { name: 'English' }))
		await screen.findByText('en: tutorial'); expect(calls.put).toHaveBeenCalledExactlyOnceWith(1, { preferredLanguage: 'en' }, expect.any(AbortSignal))
	})
	it('takes an administrator override on focus without uploading the old device choice', async () => {
		mount(); await screen.findByText('es: tutorial'); calls.get.mockResolvedValue(profile('en')); fireEvent.focus(window)
		await screen.findByText('en: tutorial'); expect(calls.put).not.toHaveBeenCalled()
	})
	it('ignores a previous account response even if its client ignores cancellation', async () => {
		let finish!: (value: ReturnType<typeof profile>) => void; calls.get.mockReturnValueOnce(new Promise(resolve => { finish = resolve })).mockResolvedValue(profile('en', 2))
		const { store } = mount(); await act(async () => { store.dispatch({ type: 'auth/login/fulfilled', payload: { userId: 2, username: 'Other fixture', role: 'Standard', token: 'other-fixture' } }) })
		await screen.findByText('en: tutorial'); await act(async () => { finish(profile('es', 1)) }); expect(screen.getByText('en: tutorial')).toBeInTheDocument()
	})
	it('keeps the previous language when saving cannot be confirmed and never repeats the write', async () => {
		calls.put.mockRejectedValue(new Error('Synthetic offline')); mount(); await screen.findByText('es: tutorial'); await userEvent.click(screen.getByRole('button', { name: 'English' }))
		expect(await screen.findByRole('alert')).toHaveTextContent('save'); expect(screen.getByText('es: tutorial')).toBeInTheDocument(); expect(calls.put).toHaveBeenCalledOnce()
	})
	it('supports a legacy API without pretending a device-only choice was saved to the account', async () => {
		calls.get.mockResolvedValue({ id: 1 }); mount(); await screen.findByText('en: tutorial'); expect(calls.put).not.toHaveBeenCalled()
		await userEvent.click(screen.getByRole('button', { name: 'English' })); await waitFor(() => expect(calls.put).not.toHaveBeenCalled())
	})
})
