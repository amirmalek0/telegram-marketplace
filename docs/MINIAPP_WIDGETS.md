# Miniapp widgets

The page editor calls reusable sections **widgets**. Built-in widgets keep their
existing identifiers and behavior. New `text.heading` and `text.paragraph` widgets
are independent entities embedded in the existing `appearance.page.<page>` JSON
document. Linked global definitions use the same content store without a new table.

## Persistence

The existing admin-only `PUT /api/v1/miniapp-content/:key` saves the whole page.
`GET /api/v1/miniapp-content` supplies layouts to the renderer. Existing version 1
documents remain valid without data conversion. An automatic startup migration
expands only the layout document storage limit. Text instances add `id` and `text`:

```json
{
  "version": 1,
  "sections": [
    {
      "id": "widget-12345678",
      "type": "text.heading",
      "visible": true,
      "design": "soft",
      "text": {
        "tag": "h2",
        "content": "عنوان دلخواه",
        "styles": { "fontSize": 26, "paddingRight": 18 },
        "css": ".widget { border-bottom: 2px solid var(--accent); }"
      }
    }
  ]
}
```

- IDs are stable per placement; duplicating creates a fresh UUID and deep copy.
- Headings accept h1–h6, paragraphs only p. Content is plain text, not HTML.
- Five themes: plain, soft, outlined, glass, accent. Explicit fields override the
  theme; mobile font size applies below 480px; custom CSS comes last in the cascade.
- Empty fields inherit theme defaults. Auto colors follow miniapp light/dark mode.
- Existing built-ins remain unique by type; custom types can repeat with unique IDs.
- Limits: 24 widgets/page, 4,000 Unicode characters each for text and CSS, 256 KiB
  per serialized layout. Ordinary content entries retain their 4,000-character limit.
- Product checkout, ticket thread, and ticket form remain required and page-bound.

## Rendering and CSS isolation

Each text instance uses a React portal into its own Shadow DOM. The text uses a
native heading or paragraph element. CSS is never inserted into the document's
global stylesheet. A separate outer `contain: layout paint` boundary confines
positioned content; styles/shadows outside that boundary are clipped intentionally.
The widget can style `.widget`, its pseudo-elements, and local media queries.
CSS variables such as `--accent`, `--text`, `--surface-solid`, and `--line` inherit
from the miniapp palette. External resources, imports, escaped CSS tokens, and
executable/legacy expressions are disallowed. Invalid CSS syntax follows normal
browser behavior (invalid declarations are ignored); security-invalid CSS blocks
saving and is omitted from live preview until corrected.

Preview selection messages check both window source and origin. Clicking a text
widget opens its own settings; it is excluded from the legacy global text catalogue.
Drafts render live but publish only when that page is saved. No demo text is seeded
into customer-facing pages automatically.

## Code and tests

- Mirrored frontend contracts: `pageLayouts.ts` and `textWidgets.ts` in each app.
- API validation: `core/internal/core/settings/text_widget.go`.
- Editor: `PageLayoutEditor`, `PageLayoutRow`, `TextWidgetEditor`.
- Renderer: `TextWidget`, `textWidgetStyles`; no extra API source is mounted for text.
- Shared API/frontend fixtures: `core/internal/core/settings/testdata/text_widgets.json`.

Run the settings Go tests and both frontend builds/tests after changing the schema.

## Image widgets

`media.image` is another independent custom widget, with the same stable `id`,
visibility and five themes. Its `image` config contains `src`, `alt`, `styles`,
and `css`. It can repeat on any page without replacing protected controls.
`src` is empty or a same-origin `/api/v1/miniapp-images/<uuid>.png` path. Empty
instances show a selectable editor placeholder but are omitted for customers.

Admin-only `POST /api/v1/miniapp-images` accepts multipart `image` (PNG/JPEG,
maximum 5 MiB, 4096×4096). The service decodes, checks dimensions, and re-encodes
PNG without metadata in `MINIAPP_IMAGES_BUCKET` (default `miniapp-images`).
Public `GET /api/v1/miniapp-images/:key` serves only validated UUID PNG keys
from this dedicated bucket with immutable caching and `nosniff`. These are public
presentation assets, never product deliveries. Both frontend proxies prioritize
`/api/` over static image suffix rules. Uploading does not publish the page.
Removing/replacing a reference retains the old object for existing drafts/caches;
automatic orphan cleanup is not implemented.

Controls include width (%), maximum width (px), desktop/mobile image height,
contain/cover, RTL alignment, four corner radii, four border widths, border color
and style, four padding/margin values, background, shadow, and opacity. Empty
height preserves natural proportions. CSS follows controls in an isolated shadow
root: `.widget` targets the frame, `.widget img` the image. Images load lazily with
a glass skeleton and a failure fallback; reduced-motion is respected. Uploads
disable conflicting actions and abort when their editor unmounts.

Contracts: mirrored `imageWidgets.ts`; backend `image_widget.go` and
`image_asset*.go`; UI `ImageWidgetEditor`, `ImageWidget`, `imageWidgetStyles`.
Tests cover field bounds, independent instances, protected pages, unsafe URL/CSS
rejection, admin upload guards, PNG/JPEG sanitization and isolated asset reads.

## Linked global widgets

An admin can save one reusable widget, or select several and combine them into a
named definition at `appearance.widget.<widget-id>`. The document is
`{version:1,name,sections}`. Page placements contain only `type:"global.widget"`,
`id`, `widgetId`, `visible`, `design:"original"`, and optional local `appearance`.
Saving a definition updates all linked placements on their next content fetch;
the editor previews changes immediately. Position, visibility, and optional frame
overrides remain local to each placement. Detaching creates fresh independent
children; it does not modify the shared definition or other placements.

Groups preserve selected child order and replace the selection at its first
position. Combining existing groups copies their current children into the new
definition: global definitions cannot contain other global references, preventing
recursive graphs. All page-bound controls/sections stay on their original pages.
The library is capped at 100 definitions, each with 1–24 children and an 80-character
name; a page may contain at most 24 expanded children, including hidden ones.
Built-in section types must remain unique across the expanded page. Text/image
instances can repeat. Definitions that are still referenced cannot be deleted.

Service validation checks the prospective graph across every saved page. The
repository serializes page/definition upserts and deletes in a transaction using
an advisory lock, so concurrent edits cannot leave dangling references or bypass
duplicate/size checks. SQL is kept in the repository's `queries.go`. Definition
documents receive the same 256 KiB limit as page layouts. Global saves publish
only the definition, not unrelated page drafts, and require an explicit UI warning.

## Shared widget appearance

Every page section accepts optional `appearance:{styles,css}`. The same typography,
color, size, margin, padding, per-edge border and corner-radius fields used for
text widgets are available on built-in sections and global frames. Empty appearance
preserves the existing renderer and behavior. Text/image widgets retain their
specialized editors. Bound commerce and ticket controls still cannot be moved to
other pages or removed by the layout schema.

Built-in widget CSS is parsed with CSSOM and each selector is scoped to the unique
frame ID; only style rules inside optional media/supports conditions survive.
Imports, resources and global at-rules are rejected. CSS-enabled frames have a
layout/paint boundary; this can change fixed positioning inside that customized
frame, as noted in the editor. Without local CSS, existing fixed controls retain
their viewport positioning. Global frame appearance is per placement; styling a
child inside the global definition updates every linked use.

## Bottom navigation

`appearance.navigation` is validated by both `navigationSettings.ts` copies and
`navigation.go`. The dedicated right-rail editor has 12 themes, drag/keyboard/arrow
reordering, per-item visibility, labels, a visual picker with 1,737 Lucide icons
(plus the 21 compatible original icons), normal/active item
colors, separate light/dark bar palettes, icon/text sizing, bar height, corner
radii, label visibility, and optional compact-on-scroll. Defaults preserve the
existing shop/wallet/VIP/tickets/profile routes. Orders/downloads/notifications are
additional optional destinations. Between 1 and 6 of the 8 routes may be visible.
Labels remain accessible when visually hidden; hiding links does not change
backend access. Routes are allowlisted, never arbitrary URLs. Navigation labels
are managed here and excluded from the legacy text-catalog overlay. Drafts replay
into the iframe and popup after reload; only save publishes to customers.

The shared header/navigation icon picker uses an icon-only grid, Persian/English
search, accessible names, and an infinite scroll area appending 60 results at a
time. A keyboard-accessible load-more fallback is also available. Search resets
the scroll position and loaded count. SVG symbols are hosted locally in content-hashed chunks
of 64 icons, shared by admin and miniapp. Only the selected chunks load; no icon
CDN, runtime SVG upload, or arbitrary URL is accepted. New icon IDs use the
`lucide:` prefix and are validated against the same generated allowlist on the
server. Original icon IDs continue to work. Lucide's ISC license is included in
each app's `public/icons` directory. `tools/generate-icon-catalog.mjs --count`
reports catalog/part counts; `--part=N` emits apply_patch input for regenerating
the contracts (part 0) and sprite chunks (remaining parts) from the pinned package.

## Header and search settings

The global header uses `appearance.header`, separately saved through the same
admin settings API. Both clients validate `headerSettings.ts`; the backend validates
`header.go`. It has 12 themes, four title/toolbar arrangements, toolbar ordering,
independent search/notifications/theme/title-icon visibility, sticky positioning,
and shop-only or all-main-pages search scope. Defaults retain the original header.
Detail pages always retain back navigation and omit optional toolbar actions.
Preview settings replay after iframe reload and into the editor popup; saving the
header does not save page or palette drafts.

Optional `iconNames` overrides the title, search, notifications, back, and the
theme button in light/dark mode independently. It accepts the same allowlisted
catalog IDs as bottom navigation. Missing overrides preserve page-specific title
icons and the original controls. Overrides never change button actions, labels,
visibility, or notification badges. An uploaded logo still takes priority over
the title icon; per-icon resets remove only the selected override. These changes
use the same live preview and header save flow.

The optional `logo` field holds a same-origin `/api/v1/miniapp-logo/<uuid>.png`
path. Missing/empty means the original page icon; the existing title-icon toggle
also hides the logo. Admin-only `POST /api/v1/miniapp-logo` accepts multipart
`logo` uploads (PNG/JPEG, at most 2 MiB, dimensions up to 2048×2048). The service
decodes and re-encodes them as PNG into the `SHOP_LOGOS_BUCKET` (`shop-logos`),
discarding metadata and untrusted MIME declarations. Public GET serves only
validated UUID PNG keys from this dedicated bucket, with immutable cache headers.
Uploads change only the draft; saving the header publishes the selected image.
Restoring the default removes the reference, not the object: older drafts/caches
stay valid. Unreferenced uploads are retained; automatic asset cleanup is not
implemented. Failed image loads fall back to the original icon.

`catalog.search` is an optional widget on all 12 page types, with six independent
per-page designs. It is not automatically inserted into existing layouts. It shares
the existing loaded product catalog and opens results in a menu, never filtering
the page. Results navigate to product details. Search normalizes Persian/Arabic
letter variants and supports loading, error, empty-query and no-result states.
Each mounted search has a unique accessible panel ID; header and page searches
can coexist, and hiding header search does not disable page search.

### Structural header and navigation presets

Both collections now have 80 presets: 30 legacy surface themes and 50 structural
presets (10 layout families × 5 control/indicator geometries). Legacy identifiers
and saved configurations remain supported. Selecting a structural header sets
`layout: "preset"`; the other layout choices explicitly override its composition.
Product/category/conversation detail headers always retain the compact title and
back control. Hidden tools leave no empty tool panel.

Appearance and positioning are independent. Each appearance gallery offers 30
surface themes, with no old/new tabs. Header positioning offers 14 arrangements;
navigation offers 11. Button/active-indicator geometry is a separate appearance
choice (default plus five shapes), so structural variations do not duplicate
the theme gallery. Item order and visibility remain independent of all of them.

Optional `positioning` and `geometry` fields extend the version-one contract.
Old combined theme IDs still validate and render unchanged until an appearance
or positioning edit. At that point the editor separates their layout and geometry
and uses the classic surface, without changing order, colors, labels or icons.
The current selection is previewed and only published on explicit save.
`chromePositioning.ts` and `chrome-positioning.css` are mirrored across clients;
the latter controls positioning without overriding theme surfaces or colors.
Navigation preserves configured routes/order/icons/colors. Launcher and dense
inline layouts reserve extra page-bottom space; compact mode uses one icon row.
The expanded footprint stays reserved during scroll compaction to avoid jumps.

Edit `tools/generate-chrome-layout-presets.mjs` for preset definitions and
`tools/chrome-layout-presets.css` for layout rules, then run
`node tools/generate-chrome-layout-presets.mjs`. This generates matching client
catalogs, backend allowlists, and identical preview/production CSS. Tests check
all identifiers, layouts, style coverage, gallery ordering, and reserved space.
Adding presets does not migrate or publish any existing appearance settings.
