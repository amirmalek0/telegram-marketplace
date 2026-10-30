import assert from 'node:assert/strict';
import { test } from 'node:test';
import { imageWidgetStyles } from '../src/features/content/imageWidgetStyles.ts';

test('image styles support responsive size, all corners, borders, spacing and scoped CSS overrides', () => {
  const css = imageWidgetStyles({ src: '', alt: '', styles: { width: 75, maxWidth: 600, height: 240, mobileHeight: 120, borderTopLeftRadius: 12, borderRightWidth: 2, borderColor: '#ff0000', marginLeft: 10, paddingTop: 16, opacity: .5, alignment: 'end', objectFit: 'cover' }, css: '.widget { border-radius:4px; }' }, 'glass');
  for (const expected of ['width:75%', 'max-width:min(600px, calc(100% - 10px - 0px))', 'height:240px', 'height:120px', 'border-top-left-radius:12px', 'border-right-width:2px', 'border-color:#ff0000', 'margin-left:10px', 'padding-top:16px', 'opacity:0.5', 'justify-content:flex-end', 'object-fit:cover', 'backdrop-filter:blur(14px)']) assert.ok(css.includes(expected), expected);
  assert.ok(css.indexOf('.widget { border-radius:4px; }') > css.indexOf('@media(max-width:480px)'));
});
test('default images preserve natural proportions and honor reduced motion', () => {
  const css = imageWidgetStyles({ src: '', alt: '', styles: {}, css: '' }, 'plain');
  assert.ok(css.includes('height:auto')); assert.ok(css.includes('object-fit:contain'));
  assert.ok(css.includes('prefers-reduced-motion:reduce')); assert.ok(css.includes('max-width:min(100%,'));
});
