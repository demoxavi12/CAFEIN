import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const [store, modal] = await Promise.all([
  readFile(new URL('./adminStore.ts', import.meta.url), 'utf8'),
  readFile(new URL('./DigitalMenuAdminModal.tsx', import.meta.url), 'utf8'),
])

test('authenticated manager snapshots never fall back to public menu data', () => {
  const managerBranch = store.match(/if \(options\.managerMode\) \{([\s\S]*?)\n    \}/)?.[1]
  assert.ok(managerBranch, 'manager mode has an explicit read branch')
  assert.match(managerBranch, /requestJson<MenuSnapshot>\('\/api\/admin\/menu'\)/)
  assert.doesNotMatch(managerBranch, /\/api\/menu|sanityContent/)
  assert.match(store, /options\.managerMode \? undefined : window\.setInterval/)
  assert.match(store, /!options\.managerMode && document\.visibilityState/)
})

test('menu editors keep stable identity and preserve drafts through external updates', () => {
  assert.match(modal, /key=\{`\$\{item\.id\}:\$\{editorResetVersion\}`\}/)
  assert.doesNotMatch(modal, /key=\{JSON\.stringify\(item\)\}/)
  assert.match(modal, /if \(hasLocalEdits\) setExternalChange\(true\)\s+else setDraft\(item\)/)
  assert.match(modal, /externalChange \|\| conflict/)
  assert.match(modal, /Reload and discard edits/)
  assert.match(modal, /Reload the latest manager menu\? This will discard unsaved edits/)
})

test('revision conflicts are surfaced and require an explicit reload before drafts reset', () => {
  assert.match(store, /class AdminApiError extends Error/)
  assert.match(store, /new AdminApiError\([^\n]+409, 'revision_conflict'\)/)
  assert.match(modal, /cause instanceof AdminApiError && cause\.status === 409/)
  assert.doesNotMatch(modal, /includes\('changed in another session'\)\) await refresh\(\)/)
  assert.match(modal, /setEditorResetVersion\(\(version\) => version \+ 1\)/)
})

test('modal focus trap does not refocus search when the parent close callback changes', () => {
  assert.match(modal, /onCloseRef\.current\(\)/)
  assert.match(modal, /useEffect\(\(\) => \{ onCloseRef\.current = onClose \}, \[onClose\]\)/)
  assert.match(modal, /\}, \[isOpen\]\)/)
  assert.doesNotMatch(modal, /\}, \[isOpen, onClose\]\)/)
})
