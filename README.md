# Fetch v0.6.5

New in v0.6.3: the Fetch dog-with-newspaper mark is now the official app icon across the web app, favicon/PWA assets, and branded UI. The sidebar icon now uses the solid TV-style slate-blue tile, and Add link uses the same slate-blue primary-button treatment. No database changes.

GitHub Pages build for Fetch.

Changes in this revision:
- Export from Settings: JSON, CSV, HTML, or a full ZIP archive with screenshots.
- Sort-by chevron moved inward for better spacing.
- “Back to Everything” is now hidden unless Fetch is actually in a direct single-item view.
- Bookmark actions use a hamburger/menu icon instead of vertical dots.
- Menu and Star controls use a more transparent frosted-glass treatment over screenshots.
- Readable title + UUID Fetch deep links remain supported.

Upload the contents of this folder to the root of the Fetch GitHub repository.


## v0.5.1
- Tagline changed to **Save & retrieve**.
- Cards expand responsively to use wide desktop windows, including a third column when space permits.
- Gallery is now a true visual contact sheet with screenshot-first tiles and metadata revealed on hover.
- Item count no longer changes wording by view mode.
- Starring updates only the affected item and Starred count instead of redrawing the entire library.


## v0.6.3 — mobile and iPad pass
- iPhone/iPad navigation is now an off-canvas drawer instead of a long sidebar above the library.
- Touch targets and interface text are enlarged on mobile.
- iPhone top controls are reflowed for thumb-friendly use.
- Cards use a single-column reading layout on iPhone and two columns on iPad-sized screens.
- Gallery becomes a two-column visual contact sheet on iPhone, with metadata visible without hover.
- List view is compact but touchable on iPhone.
- Filters and dialogs become bottom sheets on narrow screens.
- Safe-area spacing added for iPhone/iPad browser chrome and Home Screen use.
- Added a web-app manifest and Apple mobile-web-app metadata.

Complete backup also retains the Supabase schema/function source and the current Chrome extension source.
- `extension/safari/` contains the v0.6.3 Safari Web Extension source prepared for Xcode/App Store Connect packaging.

## v0.6.3
- The Page/Text/Image-link thumbnail label now uses the same translucent frosted-glass treatment as the menu and star controls.


## v0.6.3
- Area is optional; blank Areas appear in the Unsorted system view.
- Settings can rename or merge Areas and Tags.
- Mobile swipe gesture opens/closes navigation; in single-item view a right swipe returns to Everything.
- Image-link capture windows open at a compact height.
- Supabase migration makes `fetch_items.category` nullable and adds rename/merge helper RPCs.


## Version-label hotfix

The sidebar footer now reads the displayed version from `APP_VERSION`, preventing the visible version label from falling behind the actual build.

## v0.6.4 icon repair
- Fixes the sidebar Fetch icon rendering as a hollow white square.
- Removes the legacy monochrome/invert filter and padding from the full-colour icon asset.
- Adds cache-busting version parameters to the web app CSS, JS, manifest and icon references.
- Keeps the TV-style slate-blue Add link button and the v0.6.x feature set unchanged.


## v0.6.5 screenshot preview repair

- Screenshot signed URLs now last 12 hours instead of 1 hour.
- Hover previews refresh an expired screenshot URL automatically.
- A hover preview is not shown until its image has loaded, preventing the large broken-image panel.
- Card thumbnails also retry once with a fresh signed URL if an old URL expires while Fetch remains open.
