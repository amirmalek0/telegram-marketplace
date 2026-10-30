import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import * as admin from '../src/pages/miniapp-content/navigationSettings.ts';
import * as app from '../../miniapp/src/features/content/navigationSettings.ts';
test('navigation contracts are identical and defaults preserve current destinations',()=>{
  assert.equal(readFileSync(new URL('../src/pages/miniapp-content/navigationSettings.ts',import.meta.url),'utf8'),readFileSync(new URL('../../miniapp/src/features/content/navigationSettings.ts',import.meta.url),'utf8'));
  assert.deepEqual(admin.defaultNavigation.items.filter(item=>item.visible).map(item=>item.page),['shop','wallet','vip','tickets','profile']);
  assert.deepEqual(admin.parseNavigationSettings(admin.defaultNavigation),admin.defaultNavigation);
});
for(const fixture of JSON.parse(readFileSync(new URL('../../core/internal/core/settings/testdata/navigation.json',import.meta.url),'utf8'))) test('shared navigation fixture: '+fixture.name,()=>{
  for(const client of [admin,app])assert.equal(client.parseNavigationSettings(fixture.value)!==null,fixture.expected);
});
