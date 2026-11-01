import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { productGuides } from '../src/pages/products/guide/productGuides.ts';
import { guidePoints, guideTextParts } from '../src/pages/products/guide/guideTextParsing.ts';

test('guide covers all five delivery types with creation and customer instructions', () => {
  assert.deepEqual(productGuides.map(g => g.id).sort(), ['api', 'bundle', 'file', 'inventory', 'message']);
  for (const guide of productGuides) {
    assert.ok(guide.explanation.length > 100);
    assert.ok(guide.steps.length >= 3);
    assert.ok(guide.delivery.length > 100);
    if (guide.id !== 'file') assert.ok(guide.caution.length > 80);
    else assert.equal(guide.caution, undefined);
    assert.match(guide.resourcePath, /^\/(files|messages|inventory|bundles|apis)$/);
    for (const kind of ['setup', 'delivery']) assert.ok(existsSync(new URL(`../public/guides/products/${guide.id}-${kind}.jpg`, import.meta.url)), `${guide.id} ${kind} screenshot`);
  }
  assert.ok(existsSync(new URL('../public/guides/products/product-form.jpg', import.meta.url)));
  assert.ok(existsSync(new URL('../public/guides/products/product-delivery.jpg', import.meta.url)));
  assert.ok(existsSync(new URL('../public/guides/products/inventory-items.jpg', import.meta.url)));
});
test('product guide is routed inside the admin area and reachable beside add product', () => {
  const source = path => readFileSync(new URL(path, import.meta.url), 'utf8');
  assert.match(source('../src/App.tsx'), /path="products\/guide"/);
  assert.match(source('../src/pages/products/ProductsPage.tsx'), /navigate\('\/products\/guide'\)/);
  const page = source('../src/pages/products/guide/ProductGuidePage.tsx');
  assert.match(source('../src/pages/products/guide/GuideFigure.tsx'), /loading="lazy"/);
  assert.match(source('../src/pages/products/guide/GuideFigure.tsx'), /بزرگ‌نمایی/);
  assert.match(page, /پس از تأیید مدیر/);
  assert.doesNotMatch(page, /نمونه ذخیره نشده است|اطلاعات تصویر واقعی یا قابل استفاده نیست|تصاویر تنظیمات از فرم‌های واقعی/);
  assert.doesNotMatch(page, /onZoom=\{setZoom\} mobile/);
});

test('guide splits explanations into points and distinguishes UI paths without HTML injection', () => {
  assert.deepEqual(guidePoints('مرحله اول. مرحله دوم با $.data.code. مرحله سوم.'), ['مرحله اول.', 'مرحله دوم با $.data.code.', 'مرحله سوم.']);
  assert.deepEqual(guideTextParts('از «محصولات ← محصول جدید» شروع کنید.'), [
    { text: 'از ', isControl: false }, { text: 'محصولات ← محصول جدید', isControl: true }, { text: ' شروع کنید.', isControl: false },
  ]);
  const api = readFileSync(new URL('../src/pages/products/guide/APIResponseGuide.tsx', import.meta.url), 'utf8');
  for (const text of ['$.data.code', '$.data.credentials.username', '$.data.codes[0]', 'Idempotency-Key', 'null', '2xx', 'بازپرداخت']) assert.ok(api.includes(text));
});

test('every guide screenshot is a landscape desktop capture', () => {
  const directory = new URL('../public/guides/products/', import.meta.url);
  const files = readdirSync(directory).filter(name => name.endsWith('.jpg'));
  assert.equal(files.length, 13);
  for (const name of files) {
    const image = readFileSync(new URL(name, directory));
    assert.equal(image.readUInt16BE(0), 0xffd8, name);
    let dimensions;
    for (let offset = 2; offset < image.length;) {
      assert.equal(image[offset], 0xff, name);
      while (image[offset] === 0xff) offset++;
      const marker = image[offset++];
      if ([0xc0, 0xc1, 0xc2].includes(marker)) {
        dimensions = { height: image.readUInt16BE(offset + 3), width: image.readUInt16BE(offset + 5) };
        break;
      }
      if (marker === 0xda || marker === 0xd9) break;
      offset += image.readUInt16BE(offset);
    }
    assert.ok(dimensions, `${name}: JPEG dimensions`);
    assert.ok(dimensions.width >= 1280 && dimensions.width > dimensions.height, `${name}: desktop landscape`);
  }
});
