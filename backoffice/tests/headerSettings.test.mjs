import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import * as admin from '../src/pages/miniapp-content/headerSettings.ts';
import * as app from '../../miniapp/src/features/content/headerSettings.ts';
import { defaultPageLayout, parsePageLayout, pageIds } from '../src/pages/miniapp-content/pageLayouts.ts';

test('shop logo is optional, supports restoring the default and rejects external or unsafe paths', () => {
  for (const client of [admin, app]) {
    for (const logo of ['', '/api/v1/miniapp-logo/0c0202be-f760-44ff-8e61-cfbb8e397622.png']) assert.ok(client.parseHeaderSettings({...client.defaultHeader, logo}));
    for (const logo of [null, 12, 'https://bad.test/logo.png', '//bad.test/logo.png', 'data:image/svg+xml,a', '/api/v1/miniapp-logo/../../file', '/api/v1/miniapp-logo/no.png']) assert.equal(client.parseHeaderSettings({...client.defaultHeader, logo}), null);
    assert.ok(client.parseHeaderSettings(client.defaultHeader));
  }
});

test('header contracts are identical and have 80 unique themes and five arrangements', () => {
  assert.equal(readFileSync(new URL('../src/pages/miniapp-content/headerSettings.ts',import.meta.url),'utf8'),readFileSync(new URL('../../miniapp/src/features/content/headerSettings.ts',import.meta.url),'utf8'));
  assert.equal(new Set(admin.headerThemes).size,80);
  assert.equal(new Set(admin.headerLayouts).size,5);
});

test('each header icon can use the shared catalog while old settings remain unchanged',()=>{
  for(const client of [admin,app]) {
    assert.deepEqual(client.parseHeaderSettings(client.defaultHeader),client.defaultHeader);
    for(const key of client.headerIconKeys) for(const icon of ['lucide:store','lucide:bell-ring','moon']) {
      const settings={...client.defaultHeader,iconNames:{[key]:icon}};
      assert.deepEqual(client.parseHeaderSettings(settings),settings);
    }
    const settings={...client.defaultHeader,logo:'/api/v1/miniapp-logo/0c0202be-f760-44ff-8e61-cfbb8e397622.png',iconNames:{title:'lucide:store',back:'lucide:arrow-right'}};
    assert.deepEqual(client.parseHeaderSettings(settings),settings);
    for(const iconNames of [null,[],false,'moon',{other:'moon'},{search:null},{search:'lucide:missing-icon'},{back:'https://example.com/icon.svg'},{title:''}]) assert.equal(client.parseHeaderSettings({...client.defaultHeader,iconNames}),null);
    const parsed=client.parseHeaderSettings(settings);parsed.iconNames.title='moon';
    assert.equal(settings.iconNames.title,'lucide:store');
  }
});
const cases=JSON.parse(readFileSync(new URL('../../core/internal/core/settings/testdata/header_settings.json',import.meta.url),'utf8'));
for(const fixture of cases) test('shared header fixture: '+fixture.name,()=>{
  for(const client of [admin,app]) assert.equal(client.parseHeaderSettings(fixture.value)!==null,fixture.valid);
});
test('all visibility combinations, action orders, scopes and detail pages work independently',()=>{
  for(const client of [admin,app]) for(let mask=0;mask<16;mask++) {
    const settings=structuredClone(client.defaultHeader);
    Object.keys(settings.icons).forEach((key,index)=>settings.icons[key]=!!(mask&(1<<index)));
    settings.actionOrder.reverse();
    assert.ok(client.parseHeaderSettings(settings));
    assert.deepEqual(client.visibleHeaderActions(settings,true,true),[]);
    assert.deepEqual(client.visibleHeaderActions(settings,false,true),settings.actionOrder.filter(key=>settings.icons[key]));
    assert.ok(!client.visibleHeaderActions(settings,false,false).includes('search'));
    settings.searchScope='all';
    assert.deepEqual(client.visibleHeaderActions(settings,false,false),settings.actionOrder.filter(key=>settings.icons[key]));
  }
});
test('parsing creates independent settings and missing data cannot disable the default header',()=>{
  const parsed=admin.parseHeaderSettings(admin.defaultHeader);
  parsed.icons.search=false; parsed.actionOrder.reverse();
  assert.equal(admin.defaultHeader.icons.search,true);
  assert.equal(admin.defaultHeader.actionOrder[0],'theme');
  for(const bad of [null,'',undefined,{},[],'{']) assert.equal(admin.parseHeaderSettings(bad),null);
});
test('search widget accepts six themes on every page without replacing protected controls',()=>{
  assert.equal(admin.searchDesigns.length,6);
  for(const page of pageIds)for(const design of admin.searchDesigns){
    const layout=defaultPageLayout(page);
    layout.sections.unshift({type:'catalog.search',design,visible:true});
    assert.deepEqual(parsePageLayout(layout,page),layout);
    layout.sections.push({...layout.sections[0]});
    assert.equal(parsePageLayout(layout,page),null);
  }
});
