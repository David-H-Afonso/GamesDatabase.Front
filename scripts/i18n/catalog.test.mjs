import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../src')
const flatten = (value, prefix = '') => Object.fromEntries(Object.entries(value).flatMap(([key, item]) => {
  const path = prefix ? `${prefix}.${key}` : key
  return item && typeof item === 'object' ? Object.entries(flatten(item, path)) : [[path, item]]
}))

test('every literal translation call resolves in EN and ES without importing source into coverage', async () => {
  const catalogs = {}
  for (const language of ['en', 'es']) {
    const load = async name => JSON.parse(await readFile(join(root, 'i18n/locales', `${name}${language}.json`), 'utf8'))
    catalogs[language] = flatten({ ...await load(''), gallery: await load('gallery.'), guide: await load('guide.'), metadata: await load('metadata.') })
  }
  const missing = []
  // Read only source text; Vite ?raw imports can collide with unexecuted original
  // module identities and silently reduce the V8 coverage denominator.
  for (const name of await readdir(root, { recursive: true })) {
    const path = name.replaceAll('\\', '/')
    if (!/\.tsx?$/.test(path) || /\.(test|spec)\./.test(path) || path.startsWith('test/')) continue
    const content = await readFile(join(root, name), 'utf8')
    for (const match of content.matchAll(/\bt\(\s*(['"])([\w.-]+)\1/g)) {
      for (const [language, catalog] of Object.entries(catalogs)) {
        if (![match[2], `${match[2]}_one`, `${match[2]}_other`].some(key => key in catalog)) missing.push(`${language}: ${relative(root, join(root, name))}: ${match[2]}`)
      }
    }
  }
  assert.deepEqual(missing, [], 'Missing literal UI translations (dynamic keys and human review are separate checks)')
})
