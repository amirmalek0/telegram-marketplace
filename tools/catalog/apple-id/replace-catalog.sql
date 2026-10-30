-- Run explicitly with psql -v ON_ERROR_STOP=1. Never invoked during startup.
-- This catalog-only operation preserves customer/financial/support records.
BEGIN;
SET LOCAL lock_timeout = '10s';
LOCK TABLE categories, products, product_files, bundles, inventories,
  inventory_items, files, delivery_messages, apis IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE orders, order_deliveries, order_delivery_items, payments IN SHARE MODE;

-- A second execution fails rather than silently replacing a newer catalog.
CREATE SCHEMA catalog_backup_20261024_apple_id;
REVOKE ALL ON SCHEMA catalog_backup_20261024_apple_id FROM PUBLIC;
CREATE TABLE catalog_backup_20261024_apple_id.categories AS TABLE public.categories;
CREATE TABLE catalog_backup_20261024_apple_id.products AS TABLE public.products;
CREATE TABLE catalog_backup_20261024_apple_id.product_files AS TABLE public.product_files;
CREATE TABLE catalog_backup_20261024_apple_id.bundles AS TABLE public.bundles;
CREATE TABLE catalog_backup_20261024_apple_id.inventories AS TABLE public.inventories;
CREATE TABLE catalog_backup_20261024_apple_id.inventory_items AS TABLE public.inventory_items;
CREATE TABLE catalog_backup_20261024_apple_id.files AS TABLE public.files;
CREATE TABLE catalog_backup_20261024_apple_id.delivery_messages AS TABLE public.delivery_messages;
CREATE TABLE catalog_backup_20261024_apple_id.apis AS TABLE public.apis;

CREATE TEMP TABLE retained_products ON COMMIT DROP AS
SELECT p.id FROM products p WHERE EXISTS (SELECT 1 FROM orders o WHERE o.product_id=p.id)
 OR EXISTS (SELECT 1 FROM order_deliveries d WHERE d.product_id=p.id)
 OR EXISTS (SELECT 1 FROM payments pay WHERE pay.purpose='product' AND pay.target_id=p.id);
UPDATE products SET status='archived' WHERE id IN (SELECT id FROM retained_products);
DELETE FROM products WHERE id NOT IN (SELECT id FROM retained_products);
UPDATE categories SET active=false;
DELETE FROM categories c WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.category_id=c.id);

DELETE FROM bundles b WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.bundle_id=b.id);
DELETE FROM inventory_items i WHERE i.status='available'
 AND NOT EXISTS (SELECT 1 FROM products p WHERE p.inventory_id=i.inventory_id)
 AND NOT EXISTS (SELECT 1 FROM bundles b WHERE b.inventory_id=i.inventory_id);
DELETE FROM inventories i WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.inventory_id=i.id)
 AND NOT EXISTS (SELECT 1 FROM bundles b WHERE b.inventory_id=i.id)
 AND NOT EXISTS (SELECT 1 FROM inventory_items it WHERE it.inventory_id=i.id);
DELETE FROM files f WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.file_id=f.id)
 AND NOT EXISTS (SELECT 1 FROM product_files pf WHERE pf.file_id=f.id)
 AND NOT EXISTS (SELECT 1 FROM bundles b WHERE b.file_id=f.id)
 AND NOT EXISTS (SELECT 1 FROM order_delivery_items di WHERE di.file_id=f.id);
DELETE FROM delivery_messages m WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.message_id=m.id)
 AND NOT EXISTS (SELECT 1 FROM bundles b WHERE b.message_id=m.id);
DELETE FROM apis a WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.api_id=a.id)
 AND NOT EXISTS (SELECT 1 FROM order_delivery_items di WHERE di.api_id=a.id);

INSERT INTO categories(id,title,slug,storage_id,active,sort_order) VALUES
 ('a9910000-0000-4000-8000-000000000001','اپل آیدی آمریکا','apple-id-us','apple-id-catalog/us.svg',true,1),
 ('a9910000-0000-4000-8000-000000000002','اپل آیدی اروپا','apple-id-europe','apple-id-catalog/europe.svg',true,2),
 ('a9910000-0000-4000-8000-000000000003','اپل آیدی آسیا','apple-id-asia','apple-id-catalog/asia.svg',true,3),
 ('a9910000-0000-4000-8000-000000000004','اپل آیدی کانادا و امارات','apple-id-other','apple-id-catalog/other.svg',true,4);

CREATE TEMP TABLE apple_catalog (
 code text, title text, region text, category_id uuid, stars bigint, sort_order integer
) ON COMMIT DROP;
INSERT INTO apple_catalog VALUES
 ('us','اپل آیدی آمریکا','ایالات متحده آمریکا','a9910000-0000-4000-8000-000000000001',150,1),
 ('uk','اپل آیدی انگلستان','انگلستان','a9910000-0000-4000-8000-000000000002',160,2),
 ('de','اپل آیدی آلمان','آلمان','a9910000-0000-4000-8000-000000000002',160,3),
 ('fr','اپل آیدی فرانسه','فرانسه','a9910000-0000-4000-8000-000000000002',160,4),
 ('tr','اپل آیدی ترکیه','ترکیه','a9910000-0000-4000-8000-000000000003',120,5),
 ('jp','اپل آیدی ژاپن','ژاپن','a9910000-0000-4000-8000-000000000003',150,6),
 ('ca','اپل آیدی کانادا','کانادا','a9910000-0000-4000-8000-000000000004',150,7),
 ('ae','اپل آیدی امارات','امارات متحده عربی','a9910000-0000-4000-8000-000000000004',140,8);

-- Empty inventory deliberately prevents selling invented login credentials.
INSERT INTO inventories(id,name)
 SELECT ('a9920000-0000-4000-8000-'||lpad(sort_order::text,12,'0'))::uuid,
 'حساب‌های '||title FROM apple_catalog;
INSERT INTO products(id,title,description,stars_price,price,category_id,image_storage_id,
 delivery_type,inventory_id,vip_only,repurchasable,status,created_at)
 SELECT ('a9930000-0000-4000-8000-'||lpad(sort_order::text,12,'0'))::uuid,title,
 title||E'\n\nریجن حساب: '||region||E'\nنوع محصول: حساب Apple ID\nروش تحویل: دریافت اطلاعات حساب از موجودی فروشگاه پس از پرداخت موفق\n\nپیش از خرید، ریجن مورد نیاز خود را بررسی کنید. خرید این حساب شامل موجودی اپ استور، گیفت کارت یا اشتراک سرویس‌های اپل نیست.\n\nاطلاعات حساب را در اختیار دیگران قرار ندهید. پس از تحویل، تنظیمات امنیتی و اطلاعات بازیابی حساب را بررسی کنید. برای پرسش درباره محصول یا پیگیری تحویل، از بخش تیکت‌ها با پشتیبانی در ارتباط باشید.',
 stars,0,category_id,'apple-id-catalog/'||code||'.svg','inventory',
 ('a9920000-0000-4000-8000-'||lpad(sort_order::text,12,'0'))::uuid,
 false,true,'active',now()-sort_order*interval '1 second'
 FROM apple_catalog;

DO $$ BEGIN
 IF (SELECT count(*) FROM products WHERE status='active')<>8
 OR (SELECT count(*) FROM categories WHERE active)<>4 THEN
   RAISE EXCEPTION 'Unexpected catalog totals; rolling back';
 END IF;
 IF EXISTS (SELECT 1 FROM products p JOIN inventory_items i ON i.inventory_id=p.inventory_id WHERE p.id::text LIKE 'a9930000-%') THEN
   RAISE EXCEPTION 'New account inventory must be empty';
 END IF;
END $$;
COMMIT;

SELECT 'active products' AS entity,count(*) AS total FROM products WHERE status='active'
UNION ALL SELECT 'active categories',count(*) FROM categories WHERE active
UNION ALL SELECT 'archived historical products',count(*) FROM products WHERE status='archived';
