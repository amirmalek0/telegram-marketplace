import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { defaultPageLayout, parsePageLayout, pageIds } from '../src/pages/miniapp-content/pageLayouts.ts';
import { validWidgetAppearance } from '../src/pages/miniapp-content/widgetAppearance.ts';
test('appearance contract stays identical',()=>assert.equal(readFileSync(new URL('../src/pages/miniapp-content/widgetAppearance.ts',import.meta.url),'utf8'),readFileSync(new URL('../../miniapp/src/features/content/widgetAppearance.ts',import.meta.url),'utf8')));
test('every existing widget, including protected controls, supports validated appearance without changing behavior',()=>{
  for(const page of pageIds){
    const layout=defaultPageLayout(page);layout.sections.forEach(item=>item.appearance={styles:{fontSize:18,paddingTop:20,borderTopWidth:2,borderColor:'#112233',width:80},css:'.widget {border-radius:20px} @media(max-width:480px){.widget p{font-size:16px}}'});
    assert.deepEqual(parsePageLayout(layout,page),layout);
  }
});
test('appearance rejects external resources, global at-rules and invalid values',()=>{
  for(const appearance of [null,{styles:{},css:null},{styles:{position:'fixed'},css:''},{styles:{width:300},css:''},{styles:{},css:'@keyframes spin{to{opacity:0}}'},{styles:{},css:'.widget{background:url(https://evil.test)}'},{styles:{},css:'@font-face{font-family:x}'}])assert.equal(validWidgetAppearance(appearance),false);
  assert.ok(validWidgetAppearance({styles:{},css:'/* @font-face ignored */ @MEDIA(max-width:480px){.widget{color:red}}'}));
});
