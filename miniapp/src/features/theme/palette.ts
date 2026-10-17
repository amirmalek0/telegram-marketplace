export const paletteKey = 'appearance.palette'
const fields = ['accent', 'background', 'surface', 'text', 'secondary', 'navigation'] as const
type Colors = Record<typeof fields[number], string>
export type Palette = Record<'light' | 'dark', Colors>

// Never interpolate arbitrary content or postMessage values into CSS.
export function parsePalette(value: unknown): Palette | null {
  try {
    const candidate = typeof value === 'string' ? JSON.parse(value) : value
    if (!candidate || typeof candidate !== 'object' || Object.keys(candidate).length !== 2) return null
    for (const mode of ['light', 'dark'] as const) {
      const colors = candidate[mode]
      if (!colors || typeof colors !== 'object' || Object.keys(colors).length !== fields.length) return null
      if (!fields.every((key) => typeof colors[key] === 'string' && /^#[0-9a-f]{6}$/i.test(colors[key]))) return null
    }
    return candidate as Palette
  } catch { return null }
}

function foreground(hex: string) {
  const rgb = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((channel) => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4)
  const luminance = rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722
  return luminance > .179 ? '#000000' : '#ffffff'
}

export function paletteCSS(palette: Palette) {
  return (['light', 'dark'] as const).map((mode) => {
    const c = palette[mode]
    const selector = mode === 'light' ? ':root, :root[data-theme="light"]' : ':root[data-theme="dark"]'
    return `${selector} {
      --accent: ${c.accent}; --accent-soft: ${c.accent}1f; --on-accent: ${foreground(c.accent)};
      --bg: ${c.background}; --surface-solid: ${c.surface};
      --surface-soft: color-mix(in srgb, ${c.text} 6%, ${c.surface});
      --text: ${c.text}; --secondary: ${c.secondary}; --tertiary: ${c.secondary};
      --line: ${c.text}1f; --nav-active: ${c.navigation}; --on-nav-active: ${foreground(c.navigation)};
    }`
  }).join('\n')
}
