import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parsePalette, paletteCSS } from '../src/features/theme/palette.ts'

const colors = { accent: '#007aff', background: '#f5f5f7', surface: '#ffffff', text: '#111114', secondary: '#6e6e73', navigation: '#17171a' }
const palette = { light: colors, dark: { ...colors, background: '#0d0d0f', navigation: '#ffffff' } }

test('accepts persisted JSON and preview objects', () => {
  assert.deepEqual(parsePalette(JSON.stringify(palette)), palette)
  assert.deepEqual(parsePalette(palette), palette)
})

test('rejects malformed, partial, and unsafe palettes', () => {
  for (const value of [undefined, null, '{', {}, { light: colors }, { ...palette, extra: colors },
    { ...palette, light: { ...colors, accent: 'red; } body { display:none' } },
    { ...palette, light: { ...colors, accent: '#fff' } },
    { ...palette, light: { ...colors, text: null } }]) assert.equal(parsePalette(value), null)
})

test('generates both modes and readable foregrounds for navigation', () => {
  const css = paletteCSS(palette)
  assert.match(css, /:root\[data-theme="dark"\]/)
  assert.match(css, /--bg: #0d0d0f/)
  assert.match(css, /--nav-active: #17171a; --on-nav-active: #ffffff/)
  assert.match(css, /--nav-active: #ffffff; --on-nav-active: #000000/)
})
