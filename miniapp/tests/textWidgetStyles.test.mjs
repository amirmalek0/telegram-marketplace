import assert from 'node:assert/strict';
import { test } from 'node:test';
import { textWidgetStyles } from '../src/features/content/textWidgetStyles.ts';
import { newTextWidget, textThemes } from '../src/features/content/textWidgets.ts';

test('semantic text styles have mobile overrides, correct units, and custom CSS last', () => {
  const text = newTextWidget('text.heading').text;
  text.styles = { fontSize: 36, fontWeight: 700, lineHeight: 1.8, width: 90, opacity: .8, paddingRight: 16, mobileFontSize: 24, shadow: 'soft' };
  text.css = '.widget { color: red; }';
  const css = textWidgetStyles(text, 'glass');
  for (const value of ['font-size:36px', 'font-weight:700', 'line-height:1.8', 'width:90%', 'opacity:0.8', 'padding-right:16px', 'font-size:24px', 'box-shadow:0 4px']) assert.ok(css.includes(value), value);
  assert.ok(css.trim().endsWith(text.css));
  assert.ok(css.indexOf('font-size:24px') > css.indexOf('font-size:36px'));
});
test('all themes and headings render with theme-aware colors and no raw content interpolation into CSS', () => {
  for (const theme of textThemes) for (const tag of ['h1','h2','h3','h4','h5','h6','p']) {
    const text = { ...newTextWidget('text.heading').text, tag, content: '</style><script>alert(1)</script>' };
    const css = textWidgetStyles(text, theme);
    assert.ok(css.includes('var(--text)'));
    assert.ok(!css.includes('<script>'));
    assert.ok(!css.includes('undefined'));
  }
});
