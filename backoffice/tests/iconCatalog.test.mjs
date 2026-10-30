import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { catalogIconNames, catalogIconHref, isCatalogIcon } from '../src/pages/miniapp-content/iconCatalog.ts';
import { defaultNavigation, parseNavigationSettings } from '../src/pages/miniapp-content/navigationSettings.ts';
import { pickerIcons, searchPickerIcons, legacyIconTargets } from '../src/pages/miniapp-content/iconPickerCatalog.ts';
const read = path => readFileSync(new URL(path, import.meta.url),'utf8');
test('more than 500 distinct icons; frontend and backend catalogs agree',()=>{
  assert.ok(catalogIconNames.length >= 500);
  assert.equal(new Set(catalogIconNames).size,catalogIconNames.length);
  assert.equal(read('../src/pages/miniapp-content/iconCatalog.ts'),read('../../miniapp/src/features/content/iconCatalog.ts'));
  assert.deepEqual(read('../../core/internal/core/settings/icon_catalog.txt').trim().split('\n'),catalogIconNames.map(name=>'lucide:'+name));
});
test('all icons have matching local SVG symbols in both apps and validate in navigation',()=>{
  const assets = new Map();
  for (const name of catalogIconNames) {
    const id = 'lucide:'+name, href = catalogIconHref(id);
    assert.ok(isCatalogIcon(id));
    assert.match(href,/^\/icons\/lucide-[a-f0-9]{12}\.svg#[a-z0-9-]+$/);
    const [asset,symbol]=href.split('#');
    if (!assets.has(asset)) {
      const svg = read('../public'+asset);
      assert.equal(svg,read('../../miniapp/public'+asset));
      assert.doesNotMatch(svg,/<(?:script|foreignObject|image)|\son\w+=|href=|url\(/i);
      assets.set(asset,svg);
    }
    assert.ok(assets.get(asset).includes('id="'+symbol+'"'));
    const settings=structuredClone(defaultNavigation);settings.items[0].icon=id;
    assert.ok(parseNavigationSettings(settings));
  }
  assert.ok(assets.size>1,'Icons are chunked, not one giant download');
});
test('legacy icons remain valid and can be previewed in the picker',()=>{
  for (const [icon,target] of Object.entries(legacyIconTargets)) {
    assert.ok(catalogIconHref('lucide:'+target));
    const settings=structuredClone(defaultNavigation);settings.items[0].icon=icon;
    assert.ok(parseNavigationSettings(settings));
  }
});
test('visual picker search supports Persian and English without rendering thousands of buttons',()=>{
  assert.equal(searchPickerIcons('').length,pickerIcons.length);
  assert.ok(searchPickerIcons('کیف پول').includes('lucide:wallet'));
  assert.ok(searchPickerIcons('جستجو').includes('lucide:search'));
  assert.ok(searchPickerIcons('arrow right').includes('lucide:arrow-right'));
  assert.deepEqual(searchPickerIcons('doesnotexist987654'),[]);
});
test('unknown names and arbitrary URLs cannot become icons',()=>{
  for(const icon of ['lucide:no-such-icon','https://evil.test/x.svg','lucide:../../x','__proto__',null]) {
    assert.equal(isCatalogIcon(icon),false);
    assert.equal(catalogIconHref(icon),undefined);
    const settings=structuredClone(defaultNavigation);settings.items[0].icon=icon;
    assert.equal(parseNavigationSettings(settings),null);
  }
});
