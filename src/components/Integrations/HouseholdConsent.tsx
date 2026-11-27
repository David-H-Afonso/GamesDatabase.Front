import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppSelector } from '@/store/hooks'
import { selectCurrentUser } from '@/store/features/auth/selector'
import { customFetch } from '@/utils/customFetch'
import { environment } from '@/environments'
import './HouseholdConsent.scss'

const allowedScopes = {
	'profile.read': 'profile',
	'games.read': 'games',
	'games.status.write': 'status',
} as const

type HouseholdScope = keyof typeof allowedScopes

interface AuthorizationRequest {
	clientId: string
	redirectUri: string
	state: string
	codeChallenge: string
	codeChallengeMethod: string
	scopes: HouseholdScope[]
}

interface HouseholdConsentProps {
	onRedirect?: (url: string) => void
}

const parseAuthorizationRequest = (searchParams: URLSearchParams): { request?: AuthorizationRequest; error?: string } => {
	const clientId = searchParams.get('client_id') ?? ''
	const redirectUri = searchParams.get('redirect_uri') ?? ''
	const state = searchParams.get('state') ?? ''
	const codeChallenge = searchParams.get('code_challenge') ?? ''
	const codeChallengeMethod = searchParams.get('code_challenge_method') ?? ''
	const requestedScopes = (searchParams.get('scope') ?? '').split(/\s+/).filter(Boolean)

	if (clientId !== 'household') return { error: 'invalidClient' }
	if (!redirectUri || !state) return { error: 'missingParameters' }
	try {
		const redirect = new URL(redirectUri)
		if (redirect.protocol !== 'https:' && redirect.protocol !== 'http:') throw new Error('invalid protocol')
	} catch {
		return { error: 'invalidRedirect' }
	}
	if (codeChallengeMethod !== 'S256' || !/^[A-Za-z0-9_-]{43}$/.test(codeChallenge)) {
		return { error: 'invalidPkce' }
	}
	if (requestedScopes.length === 0 || requestedScopes.some((scope) => !(scope in allowedScopes))) {
		return { error: 'unsupportedScope' }
	}

	const scopes = Object.keys(allowedScopes).filter((scope) => requestedScopes.includes(scope)) as HouseholdScope[]
	return { request: { clientId, redirectUri, state, codeChallenge, codeChallengeMethod, scopes } }
}

export const HouseholdConsent = ({ onRedirect }: HouseholdConsentProps) => {
	const { t } = useTranslation()
	const [searchParams] = useSearchParams()
	const currentUser = useAppSelector(selectCurrentUser)
	const parsed = useMemo(() => parseAuthorizationRequest(searchParams), [searchParams])
	const [submitting, setSubmitting] = useState<'approve' | 'deny' | null>(null)
	const [submitError, setSubmitError] = useState(false)
	const inFlight = useRef(false)
	const failedDecision = useRef<{ control: HTMLButtonElement; ownerId: number | undefined; request: AuthorizationRequest } | null>(null)

	// Disabling the initiator drops native browser focus to BODY. Recover only
	// after the enabled DOM is committed, never across owner/request boundaries
	// or over another deliberate focus target. No timer or translated label lookup.
	useLayoutEffect(() => {
		if (submitting !== null || !failedDecision.current) return
		const recovery = failedDecision.current
		failedDecision.current = null
		if (recovery.ownerId !== currentUser?.id || recovery.request !== parsed.request || !recovery.control.isConnected || recovery.control.disabled) return
		const active = document.activeElement
		if (!active || active === document.body || active === document.documentElement || active === recovery.control) recovery.control.focus()
	})

	const redirectOrigin = parsed.request ? new URL(parsed.request.redirectUri).origin : null

	const submitDecision = async (approved: boolean, control: HTMLButtonElement) => {
		if (!parsed.request || submitting || inFlight.current) return
		inFlight.current = true
		failedDecision.current = null
		const recovery = { control, ownerId: currentUser?.id, request: parsed.request }
		setSubmitting(approved ? 'approve' : 'deny')
		setSubmitError(false)

		try {
			const result = await customFetch<{ redirectUrl: string }>(environment.apiRoutes.householdIntegration.authorize, {
				method: 'POST',
				body: { ...parsed.request, approved },
			})
			if (!result.redirectUrl) throw new Error('missing_validated_redirect')
			if (onRedirect) onRedirect(result.redirectUrl)
			else window.location.assign(result.redirectUrl)
		} catch {
			failedDecision.current = recovery
			setSubmitError(true)
			setSubmitting(null)
		} finally {
			inFlight.current = false
		}
	}

	return (
		<main className='household-consent'>
			<section className='household-consent__card' aria-labelledby='household-consent-title'>
				<div className='household-consent__brand' aria-hidden='true'>
					<span>GD</span>
					<i />
					<span>H</span>
				</div>

				{parsed.error ? (
					<div className='household-consent__invalid' role='alert'>
						<p className='household-consent__eyebrow'>{t('entryflows.household.deniedEyebrow')}</p>
						<h1 id='household-consent-title'>{t('entryflows.household.invalidTitle')}</h1>
						<p>{t(`entryflows.household.errors.${parsed.error}`)}</p>
						<p className='household-consent__note'>{t('entryflows.household.restartNote')}</p>
					</div>
				) : (
					<>
						<header className='household-consent__header'>
							<p className='household-consent__eyebrow'>{t('entryflows.household.connectionEyebrow')}</p>
							<h1 id='household-consent-title'>{t('entryflows.household.title')}</h1>
							<p>
								{t('entryflows.household.connectingAs')} <strong>{currentUser?.username}</strong>. {t('entryflows.household.accountExplanation')}
							</p>
						</header>

						<div className='household-consent__permissions'>
							<h2>{t('entryflows.household.permissionsTitle')}</h2>
							<ul>
								{parsed.request!.scopes.map((scope) => (
									<li key={scope}>
										<span className='household-consent__check' aria-hidden='true'>✓</span>
										<span>
											<strong>{t(`entryflows.household.scopes.${allowedScopes[scope]}.title`)}</strong>
											<small>{t(`entryflows.household.scopes.${allowedScopes[scope]}.description`)}</small>
										</span>
									</li>
								))}
							</ul>
						</div>

						<div className='household-consent__security-note'>
							<span aria-hidden='true'>◆</span>
							<p>
								{t('entryflows.household.securityNote')} <strong>{redirectOrigin}</strong>.
							</p>
						</div>

						{submitError && <p className='household-consent__error' role='alert'>{t('entryflows.household.submitFailed')}</p>}

						<div className='household-consent__actions'>
							<button type='button' className='household-consent__deny' onClick={event => void submitDecision(false, event.currentTarget)} disabled={submitting !== null}>
								{submitting === 'deny' ? t('entryflows.household.denying') : t('entryflows.household.deny')}
							</button>
							<button type='button' className='household-consent__approve' onClick={event => void submitDecision(true, event.currentTarget)} disabled={submitting !== null}>
								{submitting === 'approve' ? t('entryflows.household.approving') : t('entryflows.household.allow')}
							</button>
						</div>
					</>
				)}
			</section>
		</main>
	)
}

export default HouseholdConsent
