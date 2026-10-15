# Homepage Section CMS (Batch 85)

The homepage's image blocks are data, not code. They live in two tables —
`site_sections` (one row per section instance) and `site_section_items`
(the tiles/cards inside a section) — and are managed end to end from
**Admin → Homepage Sections**: create, edit, reorder, enable/disable and
delete, with image uploads going through the admin media library
(platform folder `cms`). The hero banners (main carousel, right portrait
rail, left promo) are a separate, older mechanism — CMS `content_blocks`
placements managed from **Admin → CMS & Banners**.

## How rendering works

- `src/features/home/api/sections.ts` reads the published view: enabled
  sections and their active items, in `sort_order`.
- `src/features/home/sections/registry.ts` maps each section **type** to a
  renderer component, a page **anchor** (a fixed slot in `HomePage`'s
  composition) and an item schema (`usesItems` / `usesImage` / `usesCta`,
  plus any `settingsFields` the admin form should edit).
- `HomeSectionAnchor` (in `HomePage`) renders the published sections of
  its anchor in order. Layout order of the anchors is a design decision
  and stays in code; the instances are data.

**Fallback rule:** while the sections read is in flight — and whenever it
fails, e.g. the migration has not run on a host yet — each anchor renders
its built-in composition, so the homepage is never blank over a CMS
table. A *successful* read is honoured exactly: an anchor with no
published sections renders nothing, which is what an admin deleting or
disabling a block means.

## Adding a NEW section type

1. Build a renderer under `src/features/home/sections/renderers/`: a
   component taking `{ section }: { section: SiteSection }`. Read items
   and settings defensively and fall back to sensible defaults for
   anything a row leaves empty (see `CategoryTilesSection`,
   `InspirationMosaicSection`, `PromoBannerSection`).
2. Register the type in `registry.ts`: label, description, anchor,
   schema flags, and any settings fields (kinds: `text`, `textarea`,
   `lines` — one entry per line, stored as a string array).
3. Add an anchor to `HomePage` if the type needs a new slot
   (`<HomeSectionAnchor anchor="…" fallback={…} />`); reuse an existing
   anchor if the block belongs in that slot.

That is all. The type appears in the admin page's type picker
automatically (`ADMIN_CREATABLE_TYPES`), and admins can create and
manage instances of it with no further code. Structured type-specific
data that does not fit the item columns belongs in the section's
`settings` jsonb — the admin settings form merges the fields it knows
and preserves the rest (the mosaic's shop-the-look pins in
`settings.hotspotsByItemId` are the working example).

## Types registered today

| Type | Anchor | Content |
| --- | --- | --- |
| `category-tiles` | under the hero | Items: tile image, name, catalogue link |
| `inspiration-mosaic` | mid-page, before Brand Spotlight | Items: card image/title/subtitle/tag; pins in settings |
| `promo-banner` | end of homepage | Copy only, in settings (eyebrow, headings, subtext, bullets) |

Product-data rails (`best-sellers-rail`, `recommended-shelf`,
`deals-strip`, `brand-spotlight`, `seller-spotlight`, `digital-showcase`)
are registered with no renderer: they render live catalogue data through
their own components, so there is nothing for a console to own.
