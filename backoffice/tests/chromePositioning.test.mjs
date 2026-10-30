import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {headerPositions,navigationPositions,headerGeometries,navigationGeometries,resolveChrome,separateChrome} from '../src/pages/miniapp-content/chromePositioning.ts';
import {headerThemes,defaultHeader,parseHeaderSettings} from '../src/pages/miniapp-content/headerSettings.ts';
import {navigationThemes,defaultNavigation,parseNavigationSettings} from '../src/pages/miniapp-content/navigationSettings.ts';
import {headerLayoutPresets,navigationLayoutPresets} from '../src/pages/miniapp-content/chromeLayoutPresets.ts';
import {navigationFootprint} from '../../miniapp/src/features/content/navigationFootprint.ts';

test('shared positioning contracts and preview CSS stay identical',()=>{
  for(const [admin,app] of [['chromePositioning.ts','features/content/chromePositioning.ts'],['chrome-positioning.css','styles/chrome-positioning.css']]) {
    assert.equal(readFileSync(new URL('../src/pages/miniapp-content/'+admin,import.meta.url),'utf8'),readFileSync(new URL('../../miniapp/src/'+app,import.meta.url),'utf8'));
  }
});
test('every appearance/position/geometry combination preserves custom ordering and overrides',()=>{
  for(const [kind,defaults,themes,positions,geometries,presets,parse] of [
    ['header',defaultHeader,headerThemes,headerPositions,headerGeometries,headerLayoutPresets,parseHeaderSettings],
    ['navigation',defaultNavigation,navigationThemes,navigationPositions,navigationGeometries,navigationLayoutPresets,parseNavigationSettings],
  ]) {
    for(const theme of themes.filter(id=>!presets[id])) for(const position of positions) for(const geometry of geometries) {
      const value={...structuredClone(defaults),theme,positioning:position.id,geometry};
      if(kind==='header') value.actionOrder.reverse(); else {value.items.reverse();value.colors.light.activeText='#123456';}
      assert.deepEqual(parse(value),value);
      const changed={...separateChrome(kind,value),theme:'glass'};
      assert.equal(changed.positioning,position.id);
      assert.equal(changed.geometry,geometry);
      if(kind==='header') assert.deepEqual(changed.actionOrder,value.actionOrder); else assert.deepEqual(changed.items,value.items);
    }
    for(const positioning of [null,{},'invalid',12]) assert.equal(parse({...defaults,positioning}),null);
    for(const geometry of [null,{},'invalid',12]) assert.equal(parse({...defaults,geometry}),null);
    assert.equal(parse({...defaults,positioning:'standard',unknown:true}),null);
  }
});
test('legacy presets remain untouched on load and separate without resetting item order',()=>{
  for(const [kind,defaults,presets,parse] of [['header',defaultHeader,headerLayoutPresets,parseHeaderSettings],['navigation',defaultNavigation,navigationLayoutPresets,parseNavigationSettings]]) {
    for(const [theme,preset] of Object.entries(presets)) {
      const old={...structuredClone(defaults),theme,...(kind==='header'?{layout:'preset'}:{})};
      assert.deepEqual(parse(old),old);
      const separated=separateChrome(kind,old);
      assert.equal(separated.positioning,preset.family);
      assert.equal(separated.geometry,preset.variant);
      assert.equal(separated.theme,'classic');
      assert.deepEqual(resolveChrome(kind,{...separated,theme:'glass'}),{theme:'glass',positioning:preset.family,geometry:preset.variant});
    }
  }
  assert.equal(resolveChrome('header',{theme:'masthead-tiles',layout:'reversed'}).positioning,'reversed');
});
test('navigation spacing follows positioning, not appearance',()=>{
  for(const theme of ['classic','glass','solid']) for(let count=1;count<=6;count++) {
    const value=structuredClone(defaultNavigation);value.theme=theme;value.positioning='launcher';
    value.items.forEach((item,index)=>item.visible=index<count);
    assert.ok(navigationFootprint(value)>=Math.ceil(count/3)*value.height+38);
  }
});
