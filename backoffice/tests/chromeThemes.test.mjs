import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { headerThemes, headerThemeLabels, defaultHeader, parseHeaderSettings, headerLayouts } from '../src/pages/miniapp-content/headerSettings.ts';
import { navigationThemes, navigationThemeLabels, defaultNavigation, parseNavigationSettings } from '../src/pages/miniapp-content/navigationSettings.ts';
import { headerLayoutPresets, navigationLayoutPresets } from '../src/pages/miniapp-content/chromeLayoutPresets.ts';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
test('all 160 chrome themes have names, production styles, thumbnails and backend support', () => {
  const server = read('../../core/internal/core/settings/chrome_themes.go');
  const previews = read('../src/pages/miniapp-content/chrome-theme-gallery.css');
  for (const [kind, themes, labels] of [['header', headerThemes, headerThemeLabels], ['navigation', navigationThemes, navigationThemeLabels]]) {
    assert.equal(new Set(themes).size, 80);
    const backendList = server.match(new RegExp(`${kind}ThemeNames = \\[\\]string\\{([^}]+)\\}`))[1];
    const generatedServer = read('../../core/internal/core/settings/chrome_layout_presets.go');
    const generatedList = generatedServer.match(new RegExp(`${kind}LayoutThemeNames = \\[\\]string\\{([^}]+)\\}`))[1];
    assert.deepEqual([...(backendList + generatedList).matchAll(/"([a-z-]+)"/g)].map(match => match[1]), [...themes]);
    const css = read(`../../miniapp/src/styles/${kind}-themes.css`);
    const samples = previews + read(`../src/pages/miniapp-content/${kind === 'header' ? 'header' : 'navigation'}-editor.css`);
    for (const theme of themes) {
      assert.ok(labels[theme], theme);
      const preset = (kind === 'header' ? headerLayoutPresets : navigationLayoutPresets)[theme];
      if (preset) {
        const structures = read('../../miniapp/src/styles/chrome-layout-presets.css');
        assert.ok(structures.includes(`data-structure='${preset.family}'`));
        assert.ok(structures.includes(`data-variant='${preset.variant}'`));
        continue;
      }
      if (theme === 'classic') continue;
      assert.ok(css.includes(`data-${kind === 'header' ? 'header' : 'nav'}-theme=${kind === 'header' ? '"' : "'"}${theme}`), `${kind}/${theme} production style`);
      assert.ok(samples.includes(kind === 'header' ? `.header-sample-${theme}` : `.theme-${theme}`), `${kind}/${theme} preview`);
    }
  }
});
test('every header theme round trips with all arrangements and preserves custom tools', () => {
  for (const theme of headerThemes) for (const layout of headerLayouts) {
    const value = {...structuredClone(defaultHeader), theme, layout, icons: {title:false, theme:false, notifications:true, search:false}, iconNames:{notifications:'lucide:bell-ring'}, actionOrder:['search','theme','notifications']};
    assert.deepEqual(parseHeaderSettings(JSON.stringify(value)), value);
  }
  assert.equal(parseHeaderSettings({...defaultHeader,theme:'unknown-theme'}),null);
});
test('every nav theme preserves overrides, ordering, visibility and compact mode', () => {
  for (const theme of navigationThemes) for (const count of [1, 6]) {
    const value = structuredClone(defaultNavigation);
    value.theme = theme; value.labels = false; value.items.reverse();
    value.items.forEach((item,index) => item.visible = index < count);
    value.colors.dark.activeText = '#ffffff'; value.colors.light.background = '#223344';
    assert.deepEqual(parseNavigationSettings(JSON.stringify(value)),value);
  }
  assert.equal(parseNavigationSettings({...defaultNavigation,theme:'unknown-theme'}),null);
});
