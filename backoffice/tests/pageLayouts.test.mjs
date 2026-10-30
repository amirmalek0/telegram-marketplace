import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as admin from '../src/pages/miniapp-content/pageLayouts.ts';
import * as app from '../../miniapp/src/features/content/pageLayouts.ts';

test('page and section registries match across independent builds', () => {
  assert.deepEqual(admin.pageIds, app.pageIds);
  assert.deepEqual(admin.sectionLibrary, app.sectionLibrary);
  assert.deepEqual(admin.defaultSections, app.defaultSections);
  assert.equal(admin.pageIds.length, 12);
  assert.equal(admin.sectionLibrary.filter(section => !section.page).length, 19);
  assert.equal(new Set(admin.sectionLibrary.map(section => section.type)).size, admin.sectionLibrary.length);
});

test('every default layout validates and has an independent copy', () => {
  for (const client of [admin, app]) for (const page of client.pageIds) {
    const layout = client.defaultPageLayout(page);
    assert.deepEqual(client.parsePageLayout(JSON.stringify(layout), page), layout);
    assert.ok(layout.sections.every(section => section.visible));
    layout.sections.reverse();
    assert.deepEqual(client.defaultPageLayout(page).sections.map(section => section.type), client.defaultSections[page]);
  }
});

test('all library sections work independently on all 12 pages with every supported design', () => {
  for (const page of admin.pageIds) for (const definition of admin.sectionLibrary.filter(section => !section.page)) {
    for (const design of definition.designs) for (const visible of [true, false]) {
      const layout = admin.defaultPageLayout(page);
      layout.sections = layout.sections.filter(section => section.type !== definition.type);
      layout.sections.push({ type: definition.type, visible, design });
      for (const client of [admin, app]) assert.deepEqual(client.parsePageLayout(layout, page), layout);
    }
  }
});

test('essential controls cannot be removed, hidden or moved to unrelated pages', () => {
  for (const client of [admin, app]) for (const definition of client.sectionLibrary.filter(section => section.required)) {
    const layout = client.defaultPageLayout(definition.page);
    const removed = { ...layout, sections: layout.sections.filter(section => section.type !== definition.type) };
    assert.equal(client.parsePageLayout(removed, definition.page), null);
    const hidden = structuredClone(layout);
    hidden.sections.find(section => section.type === definition.type).visible = false;
    assert.equal(client.parsePageLayout(hidden, definition.page), null);
    assert.equal(client.parsePageLayout({ version: 1, sections: [{ type: definition.type, visible: true, design: 'original' }] }, 'shop'), null);
  }
});

test('malformed, duplicate, unsafe and oversized configuration is rejected', () => {
  const item = { type: 'catalog.products', visible: true, design: 'list' };
  for (const value of [null, [], {}, '', '{', { version: 2, sections: [] }, { version: 1, sections: null },
    { version: 1, sections: [], extra: true }, { version: 1, sections: [item, item] },
    { version: 1, sections: [{ ...item, visible: 'true' }] }, { version: 1, sections: [{ ...item, design: 'url(javascript:alert(1))' }] },
    { version: 1, sections: [{ ...item, html: '<script />' }] }, { version: 1, sections: [{ ...item, type: 'admin.users' }] },
    { version: 1, sections: Array(25).fill(item) }]) {
    for (const client of [admin, app]) assert.equal(client.parsePageLayout(value, 'shop'), null);
  }
});

test('empty pages are supported except where controls are essential; routes match detail templates', () => {
  for (const client of [admin, app]) {
    assert.deepEqual(client.parsePageLayout({ version: 1, sections: [] }, 'shop'), { version: 1, sections: [] });
    assert.equal(client.parsePageLayout({ version: 1, sections: [] }, 'ticket'), null);
    for (const [path, page] of [['/', 'shop'], ['/tickets/new', 'new-ticket'], ['/tickets/123', 'ticket'], ['/products/123', 'product'], ['/categories/123', 'category'], ['/wallet', 'wallet']]) {
      assert.equal(client.pageForPath(path), page);
    }
  }
});
