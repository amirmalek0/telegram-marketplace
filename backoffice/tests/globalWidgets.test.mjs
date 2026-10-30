import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import * as contract from '../src/pages/miniapp-content/globalWidgets.ts';
import * as miniapp from '../../miniapp/src/features/content/globalWidgets.ts';
import { defaultPageLayout, parsePageLayout, pageIds } from '../src/pages/miniapp-content/pageLayouts.ts';
import { newTextWidget } from '../src/pages/miniapp-content/textWidgets.ts';
import { newImageWidget } from '../src/pages/miniapp-content/imageWidgets.ts';
import { widgetLibrary } from '../src/pages/miniapp-content/pageLayouts.ts';
import { widgetIcons } from '../src/pages/miniapp-content/widgetIcons.ts';
import { isNavigationIcon } from '../src/pages/miniapp-content/navigationSettings.ts';

const id = 'widget-12345678';
const text = newTextWidget('text.heading');
const image = newImageWidget();
const group = () => ({ version: 1, name: 'معرفی فروشگاه', sections: structuredClone([text, image]) });
test('global contracts are identical across applications', () => {
  assert.equal(readFileSync(new URL('../src/pages/miniapp-content/globalWidgets.ts', import.meta.url), 'utf8'), readFileSync(new URL('../../miniapp/src/features/content/globalWidgets.ts', import.meta.url), 'utf8'));
});
test('every library widget has its own valid semantic icon', () => {
  const icons = widgetLibrary.map(widget => widgetIcons[widget.type]);
  assert.ok(icons.every(isNavigationIcon));
  assert.equal(new Set(icons).size, widgetLibrary.length);
});
for (const [name, api] of [['admin', contract], ['miniapp', miniapp]]) {
  test(name + ': cascade cleanup removes repeated and hidden links without discarding other edits', () => {
    const ref = api.newGlobalReference(id);
    const hidden = { ...api.newGlobalReference(id), visible: false };
    const other = api.newGlobalReference('widget-other1234');
    const local = newTextWidget('text.paragraph');
    local.text.content = 'Unsaved changes';
    const layouts = { shop: { version: 1, sections: [ref, local, hidden, other] }, profile: { version: 1, sections: [ref] }, wallet: defaultPageLayout('wallet') };
    const before = structuredClone(layouts);
    const result = api.removeGlobalWidgetFromLayouts(layouts, id);
    assert.deepEqual(result.shop.sections, [local, other]);
    assert.deepEqual(result.profile.sections, []);
    assert.deepEqual(result.wallet, layouts.wallet);
    assert.deepEqual(layouts, before);
  });
  test(name + ': global icons are optional, validated and preserved', () => {
    assert.deepEqual(api.parseGlobalWidget(group()), group());
    for (const icon of ['lucide:globe', 'lucide:heart', 'shop']) {
      const widget = { ...group(), icon };
      assert.deepEqual(api.parseGlobalWidget(JSON.stringify(widget)), widget);
      assert.deepEqual(api.readGlobalWidgets({ [api.globalWidgetPrefix + id]: JSON.stringify(widget) })[id], widget);
    }
    for (const icon of [null, '', 1, 'lucide:missing-icon', 'https://bad.test/image.svg']) {
      assert.equal(api.parseGlobalWidget({ ...group(), icon }), null);
    }
  });
  test(name + ': global widgets reject malformed, nested, protected and page-bound content', () => {
    assert.deepEqual(api.parseGlobalWidget(group()), group());
    for (const value of [null, { ...group(), version: 2 }, { ...group(), extra: true }, { ...group(), name: '' }, { ...group(), name: 'a'.repeat(81) }, { ...group(), sections: [] }, { ...group(), sections: [api.newGlobalReference(id)] }, { ...group(), sections: [{ type: 'product.checkout', visible: true, design: 'original' }] }, { ...group(), sections: [{ type: 'product.description', visible: true, design: 'original' }] }]) assert.equal(api.parseGlobalWidget(value), null);
    const unsafe = group(); unsafe.sections[0].text.css = '.widget { background:url(https://evil.test); }';
    assert.equal(api.parseGlobalWidget(unsafe), null);
  });
  test(name + ': references are linked, reorderable and independently hideable on every page', () => {
    const library = { [id]: group() };
    for (const page of pageIds) {
      const layout = defaultPageLayout(page), ref = api.newGlobalReference(id);
      layout.sections.unshift(ref);
      assert.ok(parsePageLayout(layout, page));
      assert.equal(api.globalLayoutError(layout, library), null);
      let resolved = api.resolveGlobalWidgets(layout, library);
      assert.equal(resolved[0].ownerId, ref.id); assert.equal(resolved[1].ownerId, ref.id);
      assert.notEqual(resolved[0].key, resolved[1].key);
      library[id].sections[0].text.content = 'Shared update';
      assert.equal(api.resolveGlobalWidgets(layout, library)[0].item.text.content, 'Shared update');
      ref.visible = false;
      resolved = api.resolveGlobalWidgets(layout, library);
      assert.equal(resolved[0].item.visible, false); assert.equal(resolved[1].item.visible, false);
      assert.equal(library[id].sections[0].visible, true);
      const independent = api.independentSections(library[id].sections);
      assert.notEqual(independent[0].id, library[id].sections[0].id);
      independent[0].text.content = 'Local only';
      assert.equal(library[id].sections[0].text.content, 'Shared update');
    }
  });
  test(name + ': rejects dangling links, duplicate builtins and expanded layouts above 24', () => {
    const ref = api.newGlobalReference(id);
    const layout = { version: 1, sections: [ref] };
    assert.ok(api.globalLayoutError(layout, {}));
    const builtin = { type: 'catalog.products', visible: true, design: 'list' };
    assert.ok(api.globalLayoutError({ version: 1, sections: [ref, builtin] }, { [id]: { ...group(), sections: [builtin] } }));
    const library = { [id]: group() };
    assert.equal(api.globalLayoutError({ version: 1, sections: Array.from({ length: 12 }, () => api.newGlobalReference(id)) }, library), null);
    assert.ok(api.globalLayoutError({ version: 1, sections: Array.from({ length: 13 }, () => api.newGlobalReference(id)) }, library));
  });
}
