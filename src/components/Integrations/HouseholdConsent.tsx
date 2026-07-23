import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAppSelector } from '@/store/hooks'
import { selectCurrentUser } from '@/store/features/auth/selector'
import { customFetch } from '@/utils/customFetch'
import { environment } from '@/environments'
import './HouseholdConsent.scss'

const allowedScopes = {
	'profile.read': {
		title: 'Ver tu perfil',
		description: 'Leer el nombre visible de esta cuenta para identificar la conexión.',
	},
	'games.read': {
		title: 'Consultar tu colección',
		description: 'Leer el resumen de juegos y sus estados para esta cuenta.',
	},
	'games.status.write': {
		title: 'Actualizar estados',
		description: 'Cambiar únicamente el estado de juegos que pertenecen a esta cuenta.',
	},
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

	if (clientId !== 'household') return { error: 'El cliente de integración no es válido.' }
	if (!redirectUri || !state) return { error: 'La solicitud no incluye todos los datos necesarios.' }
	try {
		const redirect = new URL(redirectUri)
		if (redirect.protocol !== 'https:' && redirect.protocol !== 'http:') throw new Error('invalid protocol')
	} catch {
		return { error: 'La URL de retorno no es válida.' }
	}
	if (codeChallengeMethod !== 'S256' || !/^[A-Za-z0-9_-]{43}$/.test(codeChallenge)) {
		return { error: 'La solicitud no usa PKCE S256 correctamente.' }
	}
	if (requestedScopes.length === 0 || requestedScopes.some((scope) => !(scope in allowedScopes))) {
		return { error: 'Household ha solicitado un permiso no admitido.' }
	}

	const scopes = Object.keys(allowedScopes).filter((scope) => requestedScopes.includes(scope)) as HouseholdScope[]
	return { request: { clientId, redirectUri, state, codeChallenge, codeChallengeMethod, scopes } }
}

export const HouseholdConsent = ({ onRedirect }: HouseholdConsentProps) => {
	const [searchParams] = useSearchParams()
	const currentUser = useAppSelector(selectCurrentUser)
	const parsed = useMemo(() => parseAuthorizationRequest(searchParams), [searchParams])
	const [submitting, setSubmitting] = useState<'approve' | 'deny' | null>(null)
	const [submitError, setSubmitError] = useState<string | null>(null)

	const redirectOrigin = parsed.request ? new URL(parsed.request.redirectUri).origin : null

	const submitDecision = async (approved: boolean) => {
		if (!parsed.request || submitting) return
		setSubmitting(approved ? 'approve' : 'deny')
		setSubmitError(null)

		try {
			const result = await customFetch<{ redirectUrl: string }>(environment.apiRoutes.householdIntegration.authorize, {
				method: 'POST',
				body: { ...parsed.request, approved },
			})
			if (!result.redirectUrl) throw new Error('La API no devolvió una URL de retorno validada.')
			if (onRedirect) onRedirect(result.redirectUrl)
			else window.location.assign(result.redirectUrl)
		} catch {
			setSubmitError('No se pudo completar la autorización. Revisa la solicitud o inténtalo de nuevo.')
			setSubmitting(null)
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
						<p className='household-consent__eyebrow'>Solicitud rechazada</p>
						<h1 id='household-consent-title'>No podemos abrir esta conexión</h1>
						<p>{parsed.error}</p>
						<p className='household-consent__note'>Vuelve a Household e inicia la conexión otra vez.</p>
					</div>
				) : (
					<>
						<header className='household-consent__header'>
							<p className='household-consent__eyebrow'>Conexión de cuenta</p>
							<h1 id='household-consent-title'>Household quiere acceder a Games Database</h1>
							<p>
								Conectando como <strong>{currentUser?.username}</strong>. Household solo recibirá los permisos que apruebes aquí.
							</p>
						</header>

						<div className='household-consent__permissions'>
							<h2>Household podrá</h2>
							<ul>
								{parsed.request!.scopes.map((scope) => (
									<li key={scope}>
										<span className='household-consent__check' aria-hidden='true'>✓</span>
										<span>
											<strong>{allowedScopes[scope].title}</strong>
											<small>{allowedScopes[scope].description}</small>
										</span>
									</li>
								))}
							</ul>
						</div>

						<div className='household-consent__security-note'>
							<span aria-hidden='true'>◆</span>
							<p>
								Tu contraseña no se comparte. Puedes revocar esta conexión en cualquier momento. El retorno se limita a <strong>{redirectOrigin}</strong>.
							</p>
						</div>

						{submitError && <p className='household-consent__error' role='alert'>{submitError}</p>}

						<div className='household-consent__actions'>
							<button type='button' className='household-consent__deny' onClick={() => void submitDecision(false)} disabled={submitting !== null}>
								{submitting === 'deny' ? 'Cancelando…' : 'Denegar'}
							</button>
							<button type='button' className='household-consent__approve' onClick={() => void submitDecision(true)} disabled={submitting !== null}>
								{submitting === 'approve' ? 'Conectando…' : 'Permitir conexión'}
							</button>
						</div>
					</>
				)}
			</section>
		</main>
	)
}

export default HouseholdConsent
