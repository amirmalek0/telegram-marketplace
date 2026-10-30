import {test} from 'node:test';
import assert from 'node:assert/strict';
import {orderLayoutThemes} from '../src/pages/miniapp-content/chromeThemeOrder.ts';
import {headerLayoutPresets,navigationLayoutPresets} from '../src/pages/miniapp-content/chromeLayoutPresets.ts';
import {headerThemes} from '../src/pages/miniapp-content/headerSettings.ts';
import {navigationThemes} from '../src/pages/miniapp-content/navigationSettings.ts';

test('compatibility catalogs retain all 80 theme identifiers without duplicates or mutation',()=>{
  for (const [themes,presets] of [[headerThemes,headerLayoutPresets],[navigationThemes,navigationLayoutPresets]]) {
    const before=[...themes], sorted=orderLayoutThemes(themes,presets);
    assert.equal(sorted.length,80);
    assert.equal(new Set(sorted).size,80);
    assert.deepEqual(new Set(sorted),new Set(themes));
    assert.deepEqual([...themes],before);
    assert.ok(sorted.some(id=>!presets[id]));
    assert.ok(sorted.some(id=>presets[id]));
  }
});

test('the gallery leads with ten different structures before showing their variations',()=>{
  for(const presets of [headerLayoutPresets,navigationLayoutPresets]) {
    const original=Object.keys(presets), before=[...original], sorted=orderLayoutThemes(original,presets);
    assert.deepEqual(original,before);
    assert.equal(new Set(sorted.slice(0,10).map(id=>presets[id].family)).size,10);
    assert.equal(new Set(sorted).size,50);
  }
});
