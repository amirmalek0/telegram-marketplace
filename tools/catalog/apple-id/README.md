# Apple ID catalog replacement

This is an explicitly invoked, one-time catalog import, not an application
startup migration. The storefront copy is Persian; all prices use store Stars.

- Four categories, eight account products and eight empty inventories.
- No generated passwords, fake account credentials, sales or reviews.
- Existing products referenced by orders, deliveries or payments are archived.
  Their categories and delivery resources are retained for purchase history.
- Unreferenced catalog resources are removed. Users, admins, orders, payments,
  coupons, wallets, subscriptions, tickets and settings are not modified.
- Existing object-storage files are retained; artwork uses new object keys.

`replace-catalog.sql` takes locks, snapshots the nine catalog tables into
`catalog_backup_20261024_apple_id`, applies the changes and checks the result
inside one transaction. Errors roll everything back. The backup schema is
not accessible to PUBLIC and causes a repeat run to fail safely.

Artwork in `assets/products` belongs in the `product-images` bucket under
`apple-id-catalog/`; artwork in `assets/categories` belongs in the
`categories-icons` bucket under the same prefix. Upload before importing.

To validate without committing, pipe the SQL through
`sed 's/^COMMIT;$/ROLLBACK;/'` before sending it to psql with
`-v ON_ERROR_STOP=1`.

Apply only after explicitly authorizing a catalog reset:

```sh
docker compose exec -T postgres psql -U tgmp -d telegram_marketplace \
  -v ON_ERROR_STOP=1 < tools/catalog/apple-id/replace-catalog.sql
```

Before selling, review the seeded prices and descriptions and add legitimate
account stock through the inventory editor. Empty inventory is intentional.

Recovery: the backup tables retain the original rows and object keys. Restore
under maintenance in dependency order (categories, files/messages/inventories/
APIs, bundles, products, product_files, inventory_items), with explicit column
lists. Reconcile any orders created after this import before restoring. Do not
truncate business tables or blindly overwrite subsequently sold inventory.
