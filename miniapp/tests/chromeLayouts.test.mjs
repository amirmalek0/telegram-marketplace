import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { headerLayoutPresets, navigationLayoutPresets } from '../src/features/content/chromeLayoutPresets.ts';
import { defaultNavigation } from '../src/features/content/navigationSettings.ts';
import { navigationFootprint } from '../src/features/content/navigationFootprint.ts';

test('100 structural presets have unique layout and geometry combinations', () => {
  for (const presets of [headerLayoutPresets,navigationLayoutPresets]) {
    assert.equal(Object.keys(presets).length,50);
    assert.equal(new Set(Object.values(presets).map(p=>`${p.family}/${p.variant}`)).size,50);
    assert.equal(new Set(Object.values(presets).map(p=>p.family)).size,10);
    assert.equal(new Set(Object.values(presets).map(p=>p.variant)).size,5);
  }
});
test('preview and production share identical structural definitions and CSS', () => {
  for (const [app,admin] of [
    ['src/features/content/chromeLayoutPresets.ts','src/pages/miniapp-content/chromeLayoutPresets.ts'],
    ['src/styles/chrome-layout-presets.css','src/pages/miniapp-content/chrome-layout-presets.css'],
  ]) assert.equal(readFileSync(new URL('../'+app,import.meta.url),'utf8'),readFileSync(new URL('../../backoffice/'+admin,import.meta.url),'utf8'));
});
test('navigation reserves enough space for all row counts and administrator heights', () => {
  for (const theme of Object.keys(navigationLayoutPresets)) for (let count=1;count<=6;count++) for (const height of [56,66,92]) {
    const settings = structuredClone(defaultNavigation);
    settings.theme = theme; settings.height = height;
    settings.items.forEach((item,index) => item.visible = index < count);
    const family = navigationLayoutPresets[theme].family;
    const rows = family === 'launcher' ? Math.ceil(count/3) : family === 'inline' && count>3 ? 1.65 : 1;
    const extra = family === 'labelrail' ? settings.labelSize * 1.4 + 8 : 0;
    assert.ok(navigationFootprint(settings) >= height * rows + extra + 38);
    settings.labels = false;
    assert.equal(navigationFootprint(settings),96);
  }
});
