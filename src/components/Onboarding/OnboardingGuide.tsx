import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CollectionSheet } from '@/components/Collection/CollectionSheet'
import { CollectionIcon } from '@/components/Collection/CollectionIcon'
import { GameArtwork } from '@/components/Collection/GameArtwork'
import { ConfirmDialog } from '@/components/elements/ConfirmDialog/ConfirmDialog'
import { useAppSelector } from '@/store/hooks'
import { userService } from '@/services/UserService'
import { ONBOARDING_STEPS, type TutorialSampleRequest } from '@/models/api/Onboarding'
import type { Game } from '@/models/api/Game'
import { useOnboarding } from './onboardingContext'
import './OnboardingGuide.scss'

interface Props { onAddGame: () => void; onOpenGame: (game: Game) => void; onRandomGame: () => void }

export const OnboardingGuide = ({ onAddGame, onOpenGame, onRandomGame }: Props) => {
	const guide = useOnboarding(), { t } = useTranslation(), navigate = useNavigate()
	const userId = useAppSelector(state => state.auth.user?.id)
	const heading = useRef<HTMLHeadingElement>(null)
	const [confirmation, setConfirmation] = useState<{ request: TutorialSampleRequest; games: Game[]; remove: boolean } | null>(null)
	const [message, setMessage] = useState<string | null>(null)
	const [password, setPassword] = useState(''), [repeat, setRepeat] = useState(''), [passwordBusy, setPasswordBusy] = useState(false), [passwordMessage, setPasswordMessage] = useState<string | null>(null)
	const activeOwner = useRef(userId)
	activeOwner.current = userId
	const step = guide?.data?.step ?? 'welcome', index = ONBOARDING_STEPS.indexOf(step)
	useEffect(() => {
		if (guide?.open) { heading.current?.focus({ preventScroll: true }); const body = heading.current?.closest('.gdb-sheet__body'); if (body) body.scrollTop = 0 }
		if (!guide?.open || step !== 'welcome') { setPassword(''); setRepeat(''); setPasswordMessage(null) }
	}, [step, guide?.open, Boolean(guide?.data)])
	if (!guide) return null
	const busy = guide.busy || passwordBusy, data = guide.data, hasSamples = Boolean(data?.hasSamples || data?.sampleGames.length || data?.samplePlaylists)
	const visit = (path: string) => { guide.hide(); navigate(path) }
	const practice = () => { guide.hide(); if (data?.sampleGames[0]) onOpenGame(data.sampleGames[0]); else navigate('/library') }
	const next = async () => {
		const saved = await guide.saveStep(ONBOARDING_STEPS[Math.min(index + 1, ONBOARDING_STEPS.length - 1)], step === 'finish')
		if (saved && step === 'finish') guide.hide()
	}
	const reviewSamples = (remove: boolean) => {
		if (!data || busy) return
		setConfirmation({ remove, games: structuredClone(data.sampleGames), request: { revision: data.revision, confirm: true, removeEditedSamples: false, expectedGames: data.sampleGames.map(game => ({ id: game.id, updatedAt: game.updatedAt ?? '' })), expectedPlaylists: (data.sampleLists ?? []).map(list => ({ id: list.id, updatedAt: list.updatedAt })) } })
	}
	const changeSamples = async () => {
		if (!confirmation || busy) return
		const result = await guide.changeSamples(confirmation.request, confirmation.remove)
		if (result) { setConfirmation(null); setMessage(t('guide.samplesChanged', { removed: result.removedGames, kept: result.keptGames, lists: result.keptPlaylists })) }
	}
	const protectAccount = async (event: FormEvent) => {
		event.preventDefault()
		if (passwordBusy || !userId) return
		if (!password.trim() || password !== repeat) { setPasswordMessage(t('guide.passwordMismatch')); return }
		const owner = userId
		setPasswordBusy(true); setPasswordMessage(null)
		try {
			await userService.changePassword(owner, { newPassword: password })
			if (activeOwner.current !== owner) return
			setPassword(''); setRepeat(''); setPasswordMessage(t('guide.passwordSaved')); await guide.reload()
		} catch { if (activeOwner.current === owner) setPasswordMessage(t('guide.passwordFailed')) }
		finally { if (activeOwner.current === owner) setPasswordBusy(false) }
	}
	return <>
		<CollectionSheet open={guide.open} onClose={() => { if (!busy) { void guide.pause() } }} title={t('guide.title')} subtitle={t('guide.stepCount', { current: index + 1, total: ONBOARDING_STEPS.length })} wide className='gdb-onboarding' footer={data && <>
			<button type='button' className='gdb-button' disabled={busy} onClick={() => { void guide.pause() }}>{t('guide.pause')}</button>
			{index > 0 && <button type='button' className='gdb-button' disabled={busy} onClick={() => { void guide.saveStep(ONBOARDING_STEPS[index - 1]) }}>{t('guide.back')}</button>}
			{step !== 'welcome' && step !== 'finish' && <button type='button' className='gdb-text-button' disabled={busy} onClick={() => { void next() }}>{t('guide.skip')}</button>}
			{step !== 'welcome' && <button type='button' className='gdb-button gdb-button--primary' disabled={busy || guide.loading} onClick={() => { void next() }}>{t(step === 'finish' ? hasSamples ? 'guide.later' : 'guide.finish' : 'guide.next')}<CollectionIcon name='arrow' /></button>}
		</>}>
			{guide.error && <div className='gdb-guide-error' role='alert'><p>{t(guide.error === 'conflict' ? 'guide.conflict' : 'guide.saveError')}</p><button type='button' className='gdb-text-button' disabled={busy} onClick={() => { setConfirmation(null); void guide.reload() }}>{t('guide.reload')}</button></div>}
			{!data ? <div className='gdb-guide-loading' role='status'><CollectionIcon name='help' /><p>{t(guide.error ? 'guide.loadError' : 'gallery.common.loading')}</p></div> : <>
				<ol className='gdb-guide-progress' aria-label={t('guide.chapters')}>{ONBOARDING_STEPS.map((chapter, position) => <li key={chapter} aria-current={chapter === step ? 'step' : undefined}><span>{position + 1}</span><b>{t(`guide.steps.${chapter}.title`)}</b></li>)}</ol>
				<div className='gdb-guide-chapter'><h3 ref={heading} tabIndex={-1}>{t(`guide.steps.${step}.title`)}</h3><p>{t(`guide.steps.${step}.intro`)}</p>
					{step === 'welcome' ? <>
						{data.requiresPassword && <form className='gdb-form gdb-guide-password' onSubmit={event => { void protectAccount(event) }}><h4>{t('guide.passwordTitle')}</h4><p className='gdb-hint'>{t('guide.passwordHelp')}</p><div className='gdb-form-grid'><label>{t('guide.password')}<input type='password' autoComplete='new-password' minLength={12} required value={password} onChange={event => setPassword(event.target.value)} disabled={busy} /></label><label>{t('guide.passwordAgain')}<input type='password' autoComplete='new-password' minLength={12} required value={repeat} onChange={event => setRepeat(event.target.value)} disabled={busy} /></label></div>{passwordMessage && <p role='status'>{passwordMessage}</p>}<button type='submit' className='gdb-button' disabled={busy}>{t('guide.setPassword')}</button></form>}
						<div className='gdb-guide-data-choice'><div><CollectionIcon name='library' /><h4>{t('guide.useCollection')}</h4><p>{t('guide.ownHelp')}</p><button type='button' className='gdb-button gdb-button--primary' disabled={busy} onClick={() => { void guide.saveStep('library') }}>{t('guide.useCollection')}<CollectionIcon name='arrow' /></button></div><div><CollectionIcon name='cards' /><h4>{t('guide.tryExamples')}</h4><p>{hasSamples ? t('guide.examplesAdded') : t('guide.examplesHelp')}</p><button type='button' className='gdb-button' disabled={busy} onClick={() => { if (hasSamples) { void guide.saveStep('library') } else { void guide.createSamples() } }}>{t(hasSamples ? 'guide.next' : 'guide.tryExamples')}<CollectionIcon name='arrow' /></button></div></div>
					</> : step === 'finish' ? <>
						{hasSamples && <div className='gdb-guide-samples'><h4>{t('guide.sampleCount', { count: data.sampleGames.length })}</h4><p>{t('guide.sampleScope')}</p><div className='gdb-guide-actions'><button type='button' className='gdb-button' disabled={busy} onClick={() => reviewSamples(false)}>{t('guide.keep')}</button><button type='button' className='gdb-button' disabled={busy} onClick={() => reviewSamples(true)}><CollectionIcon name='trash' />{t('guide.remove')}</button></div></div>}
						{message && <p className='gdb-guide-message' role='status'>{message}</p>}
						<button type='button' className='gdb-text-button' disabled={busy} onClick={() => { void guide.openGuide(true) }}>{t('guide.restart')}</button>
					</> : <>
						<ol className='gdb-guide-instructions'>{(['one', 'two', 'three'] as const).map(key => <li key={key}>{t(`guide.steps.${step}.${key}`)}</li>)}</ol>
						{data.sampleGames.length > 0 && (step === 'library' || step === 'progress') && <div className='gdb-guide-game-preview'>{data.sampleGames.slice(0, 3).map(game => <button type='button' key={game.id} disabled={busy} onClick={() => { guide.hide(); onOpenGame(game) }}><GameArtwork game={game} role='cover' /><b>{game.name}</b><small>{t('guide.sampleBadge')}</small></button>)}</div>}
						<div className='gdb-guide-actions'>
							{step === 'library' && <><button type='button' className='gdb-button' disabled={busy} onClick={() => visit('/library')}><CollectionIcon name='library' />{t('guide.openLibrary')}</button><button type='button' className='gdb-button' disabled={busy} onClick={() => { guide.hide(); onAddGame() }}><CollectionIcon name='plus' />{t('guide.addGame')}</button></>}
							{step === 'organize' && <><button type='button' className='gdb-button' disabled={busy} onClick={() => visit('/playlists')}><CollectionIcon name='playlists' />{t('guide.openPlaylists')}</button><button type='button' className='gdb-button' disabled={busy} onClick={() => visit('/focus')}><CollectionIcon name='focus' />{t('guide.openFocus')}</button><button type='button' className='gdb-text-button' disabled={busy} onClick={() => visit('/shelves')}>{t('guide.openShelves')}</button></>}
							{step === 'progress' && <><button type='button' className='gdb-button' disabled={busy} onClick={practice}><CollectionIcon name='edit' />{t(data.sampleGames.length ? 'guide.openExample' : 'guide.openLibrary')}</button><button type='button' className='gdb-button' disabled={busy} onClick={() => visit('/statistics')}><CollectionIcon name='statistics' />{t('guide.openStatistics')}</button></>}
							{step === 'home' && <button type='button' className='gdb-button' disabled={busy} onClick={() => visit('/?customize=home')}><CollectionIcon name='settings' />{t('guide.customizeHome')}</button>}
							{step === 'discover' && <><button type='button' className='gdb-button' disabled={busy} onClick={() => { guide.hide(); onRandomGame() }}><CollectionIcon name='dice' />{t('guide.random')}</button><button type='button' className='gdb-button' disabled={busy} onClick={() => visit('/?customize=home')}><CollectionIcon name='home' />{t('guide.customizeHome')}</button></>}
						</div>
					</>}
				</div>
			</>}
		</CollectionSheet>
		<ConfirmDialog isOpen={Boolean(confirmation)} title={t(confirmation?.remove ? 'guide.removeTitle' : 'guide.keepTitle')} variant={confirmation?.remove ? 'danger' : 'primary'} isConfirming={busy} confirmLabel={t(confirmation?.remove ? 'guide.remove' : 'guide.keep')} onCancel={() => { if (!busy) setConfirmation(null) }} onConfirm={() => { void changeSamples() }} message={<>
			<p>{t('guide.reviewSamples', { count: confirmation?.games.length ?? 0 })}</p><ul className='gdb-guide-sample-review'>{confirmation?.games.map(game => <li key={game.id}>{game.name}</li>)}</ul>
			{confirmation?.remove && <><label className='gdb-check-label'><input type='checkbox' disabled={busy} checked={confirmation.request.removeEditedSamples} onChange={event => setConfirmation(current => current ? { ...current, request: { ...current.request, removeEditedSamples: event.target.checked } } : null)} />{t('guide.removeEdited')}</label><p className='gdb-hint'>{t('guide.editedHelp')}</p></>}
			{guide.error && <p className='gdb-error' role='alert'>{t(guide.error === 'conflict' ? 'guide.conflict' : 'guide.saveError')}</p>}
		</>} />
	</>
}
