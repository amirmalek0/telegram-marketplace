import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import * as admin from '../src/pages/miniapp-content/pageLayouts.ts';
import * as app from '../../miniapp/src/features/content/pageLayouts.ts';
import { newTextWidget, numericStyleRules, enumStyleRules } from '../src/pages/miniapp-content/textWidgets.ts';

test('text widget contracts stay identical between standalone frontend builds', () => {
  assert.equal(readFileSync(new URL('../src/pages/miniapp-content/textWidgets.ts', import.meta.url), 'utf8'), readFileSync(new URL('../../miniapp/src/features/content/textWidgets.ts', import.meta.url), 'utf8'));
});
const fixtures = JSON.parse(readFileSync(new URL('../../core/internal/core/settings/testdata/text_widgets.json', import.meta.url), 'utf8'));
for (const fixture of fixtures) test('shared API and frontend fixture: ' + fixture.name, () => {
  for (const client of [admin, app]) assert.equal(client.parsePageLayout(fixture.value, fixture.page) !== null, fixture.expected);
});
test('custom widgets support every page, independent ids, cloning and reordering without touching defaults', () => {
  const one = newTextWidget('text.heading');
  const two = newTextWidget('text.heading');
  assert.notEqual(one.id, two.id);
  for (const client of [admin, app]) for (const page of client.pageIds) {
    const layout = client.defaultPageLayout(page);
    layout.sections.unshift(one, two);
    const parsed = client.parsePageLayout(layout, page);
    assert.deepEqual(parsed, layout);
    parsed.sections[0].text.content = 'changed';
    assert.notEqual(one.text.content, 'changed');
    assert.notEqual(parsed.sections[1].text.content, 'changed');
    assert.ok(client.parsePageLayout({ ...layout, sections: [...layout.sections].reverse() }, page));
  }
});
test('all numerical and enum fields validate at limits, reject outside limits and unknown values', () => {
  const widget = newTextWidget('text.paragraph');
  const valid = styles => admin.parsePageLayout({ version: 1, sections: [{ ...widget, text: { ...widget.text, styles } }] }, 'shop') !== null;
  for (const [key, [min,max]] of Object.entries(numericStyleRules)) {
    assert.ok(valid({ [key]: min }), key); assert.ok(valid({ [key]: max }), key);
    assert.equal(valid({ [key]: min - 1 }), false, key); assert.equal(valid({ [key]: max + 1 }), false, key);
    assert.equal(valid({ [key]: null }), false, key);
  }
  for (const [key, options] of Object.entries(enumStyleRules)) {
    for (const value of options) assert.ok(valid({ [key]: value }), key);
    assert.equal(valid({ [key]: 'not-a-value' }), false, key);
  }
});
