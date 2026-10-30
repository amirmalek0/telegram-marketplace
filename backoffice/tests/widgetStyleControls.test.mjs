import assert from 'node:assert/strict';
import { test } from 'node:test';
import { borderKeys, paddingKeys, radiusKeys, updateStyleGroup } from '../src/pages/miniapp-content/widgetStyleControls.ts';
import { validTextWidget } from '../src/pages/miniapp-content/textWidgets.ts';
import { newImageWidget, validImageWidget } from '../src/pages/miniapp-content/imageWidgets.ts';

test('linked edge edits and resets are immutable and preserve other styles', () => {
  for (const keys of [borderKeys, paddingKeys, radiusKeys]) {
    const original = { color: '#123456', opacity: 0.5 };
    const changed = updateStyleGroup(original, keys, 8);
    for (const key of keys) assert.equal(changed[key], 8);
    assert.deepEqual(original, { color: '#123456', opacity: 0.5 });
    assert.deepEqual(updateStyleGroup(changed, keys), original);
    const independent = updateStyleGroup(changed, [keys[0]], 0);
    assert.equal(independent[keys[0]], 0);
    assert.equal(independent[keys[1]], 8);
    assert.ok(validTextWidget({ tag: 'p', content: 'kept', styles: changed, css: '' }, 'text.paragraph'));
  }
});
test('image edges use the same contract without changing image content', () => {
  const image = newImageWidget().image;
  image.alt = 'Keep this description';
  const next = { ...image, styles: updateStyleGroup(image.styles, radiusKeys, 24) };
  assert.ok(validImageWidget(next));
  assert.equal(next.alt, image.alt);
  assert.equal(next.src, image.src);
  assert.deepEqual(image.styles, {});
});
