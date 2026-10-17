export interface EditableText {
  node: Text
  key: string
}

export function textRange(node: Text): Range {
  const range = document.createRange()
  const value = node.data
  const start = value.length - value.trimStart().length
  range.setStart(node, start)
  range.setEnd(node, value.trimEnd().length)
  return range
}

/** Hit-test glyph bounds, not a text node's surrounding card, button or icon. */
export function editableTextAtPoint(entries: EditableText[], target: Element, x: number, y: number): string | null {
  if (target.closest('svg, img, [aria-hidden="true"]')) return null
  for (const { node, key } of entries) {
    if (!node.isConnected || !target.contains(node) || !node.data.trim()) continue
    if (Array.from(textRange(node).getClientRects()).some((rect) => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom)) return key
  }
  return null
}

/** Highlight actual text without wrapping or replacing React-owned DOM nodes. */
export function highlightEditableText(entries: EditableText[]): () => void {
  const registry = (globalThis.CSS as typeof CSS & { highlights?: Map<string, unknown> } | undefined)?.highlights
  const HighlightClass = (globalThis as typeof globalThis & { Highlight?: new (...ranges: Range[]) => unknown }).Highlight
  if (registry && HighlightClass) {
    registry.set('miniapp-editable', new HighlightClass(...entries.map(({ node }) => textRange(node))))
    return () => { registry.delete('miniapp-editable') }
  }
  // Older WebViews still support selection; underline text-only elements as a
  // fallback, never outline their surrounding layout or icon controls.
  const elements = entries.map(({ node }) => node.parentElement).filter((element): element is HTMLElement => !!element && element.children.length === 0)
  elements.forEach((element) => { element.dataset.editableText = 'true' })
  return () => elements.forEach((element) => { delete element.dataset.editableText })
}
