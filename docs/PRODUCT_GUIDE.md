# Admin product guide

The protected `/products/guide` route is linked beside the new-product action.
Persian articles live in `backoffice/src/pages/products/guide/productGuides.ts`;
the page, image component and styles are kept separately. The route is lazy-loaded.

## Screenshots

Assets in `backoffice/public/guides/products/` are screenshots, not generated
illustrations. Setup images were captured from actual admin forms using unsaved
fictional input. No products, delivery resources, payments or credentials were
created for this guide. Common product screenshots show the main-information and
delivery sections separately. Images open in the existing accessible modal.

Customer screenshots use the real miniapp `DeliveryCard` component with safe,
explicitly educational data. To refresh them, start the miniapp Vite dev server
and open `/tests/product-guide.html?type=file` (or `message`, `inventory`, `bundle`,
`api`). This development-only fixture makes no API calls and does not execute
downloads or payments. Capture the whole desktop viewport (1440 × 1100), including
the surrounding page; do not crop the images into mobile-sized cards.

For setup screenshots, start the backoffice Vite dev server and open
`/tests/product-guide.html?type=product` (or `file`, `message`, `inventory`, `bundle`,
`api`). The development-only fixture renders actual catalog pages with an isolated
read-only adapter and fictional resources. All writes are rejected locally. Use
new unsaved forms. Include both inventory creation and inventory item management.
Never capture customer credentials, existing inventory values, API keys, receipts
or account data. Review each image visually for clipping and private information.
Keep documentation aligned with delivery implementation, especially multi-file
limits, bundle components, test payments and asynchronous API delivery.

The API article includes JSONPath examples, raw-response and null behavior,
automatic retry semantics, idempotency requirements and business-error caveats.
Navigation paths are rendered as pills, and explanatory sentences as list items.

Run `node --experimental-strip-types --test backoffice/tests/productGuide.test.mjs`
from the repository root and `npm run build` in `backoffice` after edits.
