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

test('new menu drafts prevent duplicate IDs and duplicate submissions', () => {
  assert.match(modal, /if \(busy \|\| newPhotoBusy\) return/)
  assert.match(modal, /items\.some\(\(item\) => item\.id === id\)/)
  assert.match(modal, /setBusy\(true\)[\s\S]*finally \{\s*setBusy\(false\)/)
  assert.match(modal, /disabled=\{busy \|\| newPhotoBusy \|\| !sections\.length\}/)
})

test('manager add and edit forms expose the supported availability and badge fields', () => {
  assert.match(modal, /newIsSoldOut/)
  assert.match(modal, /newBadge/)
  assert.match(modal, /option value="Bestseller"/)
  assert.match(modal, /option value="Chef Special"/)
  assert.match(modal, /update\('isSoldOut'/)
  assert.match(modal, /update\('badge'/)
})

test('manager photo picker accepts the server-validated image formats', () => {
  assert.match(modal, /accept="image\/jpeg,image\/png,image\/webp"/)
  assert.match(modal, /Choose a JPEG, PNG, or WebP image\./)
})

test('manager photo selection previews locally and uploads only after explicit confirmation', () => {
  const selectFile = modal.slice(modal.indexOf('const selectFile ='), modal.indexOf('const confirmUpload ='))
  const confirmUpload = modal.slice(modal.indexOf('const confirmUpload ='), modal.indexOf('const cancelSelection ='))
  const cancelSelection = modal.slice(modal.indexOf('const cancelSelection ='), modal.indexOf('const remove ='))
  assert.match(selectFile, /URL\.createObjectURL\(file\)/)
  assert.match(selectFile, /catch \{/)
  assert.doesNotMatch(selectFile, /uploadMenuPhoto/)
  assert.match(confirmUpload, /await uploadMenuPhoto\(file/)
  assert.match(confirmUpload, /new URL\(image\.src\)/)
  assert.match(cancelSelection, /setPreviewUrl\(null\)/)
  assert.match(cancelSelection, /onPendingChange\?\.\(false\)/)
  assert.match(modal, /Upload & use photo/)
  assert.match(modal, />Cancel<\/button>/)
  assert.match(modal, /onError=\{\(\) => \{[\s\S]*setPreviewFailed\(true\)/)
})

test('manager portal uses a body-level full-viewport portal and restores background scrolling', () => {
  assert.match(modal, /createPortal\([\s\S]*document\.body/)
  assert.match(modal, /fixed inset-0 z-\[100\] h-\[100dvh\] min-h-\[100svh\] overflow-hidden/)
  assert.match(modal, /className="flex h-full min-h-0 w-full min-w-0 max-w-none flex-col overflow-hidden/)
  assert.match(modal, /min-h-0 min-w-0 flex-1 grid-cols-1 content-start gap-3 overflow-x-hidden overflow-y-auto/)
  assert.doesNotMatch(modal, /sm:h-auto|sm:max-h-\[94dvh\]|sm:max-w-6xl|xl:max-w-7xl/)
  assert.match(modal, /document\.body\.style\.overflow = 'hidden'/)
  assert.match(modal, /document\.body\.style\.overflow = bodyOverflow/)
  assert.match(modal, /appRoot\.inert = true/)
  assert.match(modal, /appRoot\.inert = appWasInert/)
})
