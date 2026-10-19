import assert from 'node:assert/strict';
import { test } from 'node:test';
import { themePresets, themeCollections, themeAccents, matchingPreset } from '../src/pages/miniapp-content/themePresets.ts';
import { readPalette, contrast } from '../src/pages/miniapp-content/palette.ts';
import { parsePalette, paletteCSS } from '../../miniapp/src/features/theme/palette.ts';

test('150 distinct complete themes with stable identities and visual filter colors', () => {
  assert.equal(themePresets.length, 150);
  for (const key of ['id', 'name']) assert.equal(new Set(themePresets.map(p => p[key])).size, 150);
  assert.equal(new Set(themePresets.map(p => JSON.stringify(p.palette))).size, 150);
  assert.equal(themeAccents.length, 30);
  for (const collection of themeCollections) {
    assert.equal(themePresets.filter(p => p.collection === collection.id).length, 30);
    for (const mode of ['light', 'dark']) assert.match(collection[mode].background, /^#[0-9a-f]{6}$/);
  }
  for (const accent of themeAccents) assert.equal(themePresets.filter(p => p.accent === accent.id).length, 5);
});

test('every preset round-trips through the existing API palette format and miniapp renderer', () => {
  for (const preset of themePresets) {
    const raw = JSON.stringify(preset.palette);
    assert.deepEqual(readPalette(raw), preset.palette);
    assert.deepEqual(parsePalette(raw), preset.palette);
    assert.match(paletteCSS(preset.palette), /data-theme="dark"/);
    assert.equal(matchingPreset(readPalette(raw))?.id, preset.id);
  }
});

test('primary and secondary text meet 4.5:1 contrast on both surfaces in both modes', () => {
  for (const preset of themePresets) for (const mode of ['light', 'dark']) {
    const colors = preset.palette[mode];
    for (const text of ['text', 'secondary', 'accent']) for (const surface of ['background', 'surface']) {
      assert.ok(contrast(colors[text], colors[surface]) >= 4.5, `${preset.id} ${mode} ${text}/${surface}`);
    }
  }
});

test('manual edits become custom and selection copies do not mutate presets', () => {
  const preset = themePresets[0];
  const draft = structuredClone(preset.palette);
  draft.light.accent = '#123456';
  assert.equal(matchingPreset(draft), undefined);
  assert.notEqual(preset.palette.light.accent, draft.light.accent);
  assert.equal(matchingPreset(structuredClone(preset.palette))?.id, preset.id);
});
