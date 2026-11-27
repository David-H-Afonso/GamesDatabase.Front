import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

// Source-color contracts belong to native Node, not the browser source/type or
// V8 coverage graph. Compiled browser/axe proof remains a separate required check.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const themeDirectory = join(root, 'src/assets/styles/themes')
const read = path => readFileSync(path, 'utf8').replace(/^\s*\/\/[^\n]*/gm, '')

// Parse only the first exported AVAILABLE_THEMES array as a validated data
// literal. No TypeScript execution, eval, dynamic import or new dependency.
const themeDeclaration = /^export\s+const\s+AVAILABLE_THEMES\s*=\s*(\[[\s\S]*?\])\s+as\s+const\b/m.exec(read(join(themeDirectory, 'AVAILABLE_THEMES.ts')))
assert.ok(themeDeclaration, 'The exported AVAILABLE_THEMES array must exist')
const themeLiteral = themeDeclaration[1]
assert.match(themeLiteral, /^\[\s*(?:'[a-z][a-z0-9-]*'|"[a-z][a-z0-9-]*")(?:\s*,\s*(?:'[a-z][a-z0-9-]*'|"[a-z][a-z0-9-]*"))*\s*,?\s*\]$/, 'AVAILABLE_THEMES must be a plain list of palette IDs')
const themes = JSON.parse(themeLiteral.replaceAll("'", '"').replace(/,\s*\]$/, ']'))
assert.ok(Array.isArray(themes) && themes.length > 0, 'Every declared palette must be tested')
assert.equal(new Set(themes).size, themes.length, 'Palette IDs must be unique')

// Preserve the real theme index's source/cascade order, including gallery's
// semantic button-ink adapters after the original twelve palettes.
const themeIndex = read(join(themeDirectory, 'index.scss'))
const themeFiles = [...themeIndex.matchAll(/@use '\.\/([^']+\.scss)'/g)].map(match => match[1])
assert.ok(themeFiles.length > 0, 'The SCSS theme source order must exist')
for (const file of themeFiles) assert.match(file, /^[a-z0-9-]+\.scss$/, 'Theme imports must remain local SCSS basenames')
const themeOrder = themeFiles.map(file => read(join(themeDirectory, file)))
const gallery = read(join(themeDirectory, 'gallery.scss'))
const household = read(join(root, 'src/components/Integrations/HouseholdConsent.scss'))
const login = read(join(root, 'src/components/Auth/Login.scss'))
const missing = read(join(root, 'src/components/errors/NotFound.scss'))
const legacy = read(join(root, 'src/assets/styles/legacy-controls.scss'))
const dataExport = read(join(root, 'src/components/Admin/AdminDataExport.scss'))
const selectiveExport = read(join(root, 'src/components/Home/components/SelectiveExportModal.scss'))
const selectiveImport = read(join(root, 'src/components/Home/components/SelectiveImportModal.scss'))
const propertyConfig = read(join(root, 'src/components/Home/components/shared/PropertyConfigPanel.scss'))

const block = (source, selector, from = 0) => {
	const start = source.indexOf(selector, from)
	if (start < 0) throw new Error(`Missing style selector ${selector}`)
	const opening = source.indexOf('{', start)
	let depth = 1, end = opening + 1
	while (depth && end < source.length) { if (source[end] === '{') depth++; else if (source[end] === '}') depth--; end++ }
	if (depth) throw new Error(`Unclosed style selector ${selector}`)
	return source.slice(opening + 1, end - 1)
}
const declarations = source => {
	let depth = 0, topLevel = ''
	for (const character of source) {
		if (character === '{') depth++
		else if (character === '}') depth--
		else if (!depth) topLevel += character
	}
	return Object.fromEntries([...topLevel.matchAll(/([\w-]+)\s*:\s*([^;{}]+);/g)].map(match => [match[1], match[2].trim()]))
}
const variables = theme => {
	const values = declarations(block(gallery, ':root {'))
	for (const source of themeOrder) {
		const selector = `[data-theme='${theme}']`
		let offset = source.indexOf(selector)
		while (offset >= 0) {
			Object.assign(values, declarations(block(source, selector, offset)))
			offset = source.indexOf(selector, offset + selector.length)
		}
	}
	Object.assign(values, declarations(block(themeIndex, ':root {')))
	return values
}
const color = (value, values, depth = 0) => {
	if (!value || depth > 12) throw new Error(`Unresolved entry color ${value}`)
	const variable = /^var\((--[\w-]+)(?:,\s*(.+))?\)$/.exec(value)
	if (variable) return color(values[variable[1]] ?? variable[2], values, depth + 1)
	if (value === 'white') return [255, 255, 255, 1]
	if (value === 'black') return [0, 0, 0, 1]
	if (/^#[\da-f]{3}$/i.test(value)) return color('#' + [...value.slice(1)].map(channel => channel + channel).join(''), values, depth + 1)
	if (/^#[\da-f]{6}$/i.test(value)) return [Number.parseInt(value.slice(1, 3), 16), Number.parseInt(value.slice(3, 5), 16), Number.parseInt(value.slice(5, 7), 16), 1]
	const rgb = /^rgba?\(([^)]+)\)$/.exec(value)
	if (rgb) { const channels = rgb[1].split(',').map(Number); return [channels[0], channels[1], channels[2], channels[3] ?? 1] }
	throw new Error(`Unsupported entry color ${value}`)
}
const over = (foreground, background) => [
	foreground[0] * foreground[3] + background[0] * (1 - foreground[3]),
	foreground[1] * foreground[3] + background[1] * (1 - foreground[3]),
	foreground[2] * foreground[3] + background[2] * (1 - foreground[3]), 1,
]
const luminance = value => value.slice(0, 3).map(channel => { const s = channel / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 }).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0)
const contrast = (foreground, background) => {
	const first = luminance(over(foreground, background)), second = luminance(background)
	return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}
const normalTextAA = (foreground, background, label) => {
	const ratio = contrast(foreground, background)
	assert.ok(ratio >= 4.5, `${label}: ${ratio.toFixed(4)}:1 must meet normal-text 4.5:1 AA`)
}

describe('Scoped entry and legacy control styles retain normal-text AA without changing shared palette tokens', () => {
	for (const theme of themes) it(`${theme} keeps both consent approval and brand ink readable on their actual accent`, () => {
		const values = variables(theme)
		const brand = declarations(block(block(household, '.household-consent__brand'), 'span'))
		const approve = declarations(block(household, '.household-consent__approve'))
		for (const rule of [brand, approve]) normalTextAA(color(rule.color, values), color(rule.background, values), `${theme} consent`)
	})

	for (const theme of themes) it(`${theme} keeps Login error ink readable over its composited alert surface`, () => {
		const values = variables(theme), rule = declarations(block(block(login, '.login-alert'), '&--error'))
		const background = over(color(rule['background-color'], values), color(values['--bg-primary'], values))
		normalTextAA(color(rule.color, values), background, `${theme} Login error`)
	})

	for (const theme of themes) it(`${theme} keeps the scoped NotFound recovery readable at rest and on hover`, () => {
		const values = variables(theme), source = block(missing, '.btn'), rule = declarations(source), hover = { ...rule, ...declarations(block(source, '&:hover')) }
		for (const state of [rule, hover]) normalTextAA(color(state.color, values), color(state.background, values), `${theme} NotFound recovery`)
	})

	for (const theme of themes) it(`${theme} keeps consent failure text readable without depending on gradient pixels`, () => {
		const values = variables(theme), rule = declarations(block(household, '.household-consent__error'))
		normalTextAA(color(rule.color, values), color(rule.background, values), `${theme} consent failure`)
	})

	for (const theme of themes) it(`${theme} keeps Login muted copy and the 404 code readable`, () => {
		const values = variables(theme)
		for (const [source, selector] of [[login, '.optional-label'], [login, '.form-hint'], [login, '.text-muted'], [block(login, '.login-divider'), 'span'], [missing, '.not-found-code']]) {
			const rule = declarations(block(source, selector))
			normalTextAA(color(rule.color, values), color(values['--bg-primary'], values), `${theme} ${selector}`)
		}
	})

	for (const theme of themes) it(`${theme} keeps scoped legacy primary, secondary and destructive buttons readable`, () => {
		const values = variables(theme)
		for (const selector of ['.btn.btn-primary {', '.btn.btn-secondary {', '.btn.btn-danger {', '.btn.btn-primary:hover', '.btn.btn-secondary:hover', '.btn.btn-danger:hover']) {
			const rule = declarations(block(legacy, selector))
			normalTextAA(color(rule.color, values), color(rule.background, values), `${theme} ${selector}`)
		}
	})

	for (const theme of themes) it(`${theme} keeps catalog active status and plain feedback readable on bounded inputs`, () => {
		const values = variables(theme)
		for (const selector of ['.status-pill.status-pill--active', '.status-pill.status-pill--inactive', '.alert {', '.aal-badge {']) {
			const rule = declarations(block(legacy, selector))
			normalTextAA(color(rule.color, values), color(rule.background, values), `${theme} ${selector}`)
		}
	})

	for (const theme of themes) it(`${theme} keeps the bootstrap action readable at rest and hover on the real info tint`, () => {
		const values = variables(theme), info = declarations(block(block(login, '.login-alert'), '&--info'))
		const action = block(block(block(login, '.login-alert'), '&--info'), '.btn-link')
		const rule = declarations(action), hover = { ...rule, ...declarations(block(action, '&:hover')) }
		const background = over(color(info['background-color'], values), color(values['--bg-primary'], values))
		for (const state of [rule, hover]) normalTextAA(color(state.color, values), background, `${theme} bootstrap action`)
	})

	for (const theme of themes) it(`${theme} gives enabled Login a deterministic AA label background at rest and hover`, () => {
		const values = variables(theme), source = block(block(login, '.login-form'), '.btn-primary')
		const rule = declarations(source), hover = declarations(block(source, '&:hover:not(:disabled)'))
		assert.ok(hover.background && hover.color, 'The scoped hover must explicitly retain both label colors instead of inheriting global palette hover rules')
		for (const state of [rule, hover]) normalTextAA(color(state.color, values), color(state.background, values), `${theme} enabled Login`)
	})

	for (const theme of themes) it(`${theme} keeps all three export summary states readable at the actual nested declaration`, () => {
		const values = variables(theme), summary = block(dataExport, '.summary-value')
		for (const selector of ['&.success', '&.warning', '&.error']) {
			const rule = declarations(block(summary, selector))
			normalTextAA(color(rule.color, values), color(values['--surface'], values), `${theme} export ${selector}`)
		}
	})

	for (const theme of themes) it(`${theme} keeps the active per-game export override badge readable`, () => {
		const values = variables(theme), rule = declarations(block(selectiveExport, '.sem__per-game-item--overridden &'))
		const background = over(color(rule.background, values), color(values['--bg-secondary'], values))
		normalTextAA(color(rule.color, values), background, `${theme} export override badge`)
	})

	for (const theme of themes) it(`${theme} keeps the active per-game import override badge readable`, () => {
		const values = variables(theme), rule = declarations(block(selectiveImport, '.sim__per-game-item--overridden &'))
		const background = over(color(rule.background, values), color(values['--color-bg-panel'], values))
		normalTextAA(color(rule.color, values), background, `${theme} import override badge`)
	})

	for (const theme of themes) it(`${theme} keeps the parsed import status note readable on its dialog surface`, () => {
		const values = variables(theme), rule = declarations(block(block(selectiveImport, '&__section-desc'), 'em {'))
		normalTextAA(color(rule.color, values), color(values['--bg-primary'], values), `${theme} import status note`)
	})

	for (const theme of themes) it(`${theme} keeps the shared Custom Cleared explanation readable on an explicit bounded surface`, () => {
		const values = variables(theme), source = block(propertyConfig, '&__mode-desc'), rule = declarations(source)
		const background = over(color(rule.background, values), color(values['--color-bg-sub'], values))
		for (const state of [rule, declarations(block(source, 'strong {')), declarations(block(source, 'em {'))]) {
			normalTextAA(color(state.color, values), background, `${theme} Custom Cleared description`)
		}
	})
})
