# Multi-file products

For `delivery_type: "file"`, admin create/edit requests accept an ordered
`file_ids` array (1–100 distinct existing file UUIDs). The product editor uses a
searchable checkbox list; selection order is delivery order. Its file library
loads all pages, not just the first 100 records.

Example delivery fields:

```json
{
  "delivery_type": "file",
  "file_ids": [
    "10000000-0000-0000-0000-000000000001",
    "10000000-0000-0000-0000-000000000002"
  ]
}
```

- Omit `file_ids` during PATCH to preserve the current selection; send a new
  nonempty array to replace it. An empty selection is invalid for file products.
- Legacy `file_id` requests remain supported for single-file products. If both
  fields are provided, `file_id` must match the first selected file.
- Admin responses include `file_ids` and the first-file `file_id` alias. Shopper
  product responses expose neither field. File URLs are available only through
  the authenticated paid-delivery endpoint.
- Switching delivery type clears obsolete source references. Other delivery
  types, including bundles, keep their existing behavior.
- Migration copies each existing single-file association into `product_files`.
  Product and ordered associations are written in one transaction.
- Checkout locks the product and snapshots every selected file into delivery
  items. Stars, wallet, and VIP checkout use the same snapshot function. Later
  product edits do not add/remove files from existing purchases. Unpaid orders
  remain excluded from the user delivery API.
- Existing miniapp purchase access and Downloads render every delivered item;
  each file has its own download action. Bot payment notifications stay unchanged.
- Files referenced by products or delivery records cannot be deleted. Database
  deletion is checked before removing the object from storage.

Tests: `cd core && go test ./...`; `cd backoffice && npm run build`.
