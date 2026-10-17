import assert from 'node:assert/strict'
import { test } from 'node:test'
import { editableTextAtPoint, highlightEditableText, textRange } from '../src/features/content/textSelection.ts'

function setup(t) {
  const original = globalThis.document
  globalThis.document = {
    createRange: () => ({
      setStart(node, offset) { this.node = node; this.start = offset },
      setEnd(node, offset) { this.end = offset },
      getClientRects() { return this.node.rects },
    }),
  }
  t.after(() => { globalThis.document = original })
  const node = { data: '  visible text  ', isConnected: true, rects: [{ left: 40, right: 90, top: 20, bottom: 40 }] }
  const target = { closest: () => null, contains: candidate => candidate === node }
  return { node, target, entries: [{ node, key: 'search.prompt' }] }
}

test('selects text bounds, not blank space in the surrounding section', t => {
  const { target, entries } = setup(t)
  assert.equal(editableTextAtPoint(entries, target, 60, 30), 'search.prompt')
  assert.equal(editableTextAtPoint(entries, target, 10, 30), null)
  assert.equal(editableTextAtPoint(entries, target, 60, 50), null)
})

test('never selects an icon or disconnected text, even inside a labelled control', t => {
  const { node, target, entries } = setup(t)
  assert.equal(editableTextAtPoint(entries, { ...target, closest: () => ({}) }, 60, 30), null)
  assert.equal(editableTextAtPoint(entries, { ...target, contains: () => false }, 60, 30), null)
  node.isConnected = false
  assert.equal(editableTextAtPoint(entries, target, 60, 30), null)
})

test('trims whitespace and checks each wrapped text line independently', t => {
  const { node, target, entries } = setup(t)
  const range = textRange(node)
  assert.equal(range.start, 2)
  assert.equal(range.end, 14)
  node.rects.push({ left: 10, right: 50, top: 45, bottom: 65 })
  assert.equal(editableTextAtPoint(entries, target, 20, 55), 'search.prompt')
  assert.equal(editableTextAtPoint(entries, target, 70, 55), null)
})

test('fallback highlighting does not mark containers holding icons', t => {
  const { node, entries } = setup(t)
  node.parentElement = { children: [{}], dataset: {} }
  const cleanup = highlightEditableText(entries)
  assert.equal(node.parentElement.dataset.editableText, undefined)
  cleanup()
})
