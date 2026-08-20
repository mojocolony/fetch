# Fetch v0.4.4

Fetch is a lightweight personal retrieval system for saving links with a tiny visual memory of the page, then refinding them through Areas, Tags, domains, dates, search, and multiple visual views.

## What changed in 0.4.4

- Stops unnecessary full-library re-renders when returning to the Fetch browser tab.
- Supabase session/token refresh events no longer cause bookmark cards to flash.

## Changes retained from 0.4.2

- Renamed the primary category concept to **Area**.
- Added optional **multiple Tags** per item, with area-aware tag suggestions in the browser extension.
- Added Tag filtering alongside Area, Domain, Date saved, Page date, and Saved as.
- Fixed refresh/view state so the library always opens in a clean **Everything** state; view/sort preference still persist under a new preference key.
- Rebuilt Search so the Supabase backend URL is not present in the page markup at load time, preventing Chrome from restoring it into Search.
- Saved cards and list rows now reliably open their original URL.
- Redesigned compact List view with a larger viewport screenshot, readable text, and a sensible maximum width.
- Increased interface typography and the Fetch app name.
- Added lightly colour-coded Areas.
- Uses Lucide-style interface icons, including `gallery-vertical-end` for Everything.
- New blue Fetch icon treatment based on the supplied person/fetching-dog artwork.
- Chrome extension no longer asks for Page date. It detects it quietly when possible and stores Unknown otherwise.
- Chrome extension now shows a visible `Saved to Fetch` confirmation before closing.

## Deployment

Upload the web files in this folder to the root of the GitHub Pages repository. Do **not** upload the `extension` or `supabase` folders to the site unless you want them stored in the repo for reference.

The Chrome extension is in `extension/chrome`. Load that folder as an unpacked extension after replacing the existing v0.4.1 installation or using Reload from `chrome://extensions`.

## Backend

The live Supabase project has already received the `fetch_tags` and `fetch_item_tags` tables and the v3 `fetch-capture` Edge Function. Existing bookmarks remain intact.

- Replaced the browser-autofillable Search input with a non-form search surface so the Supabase URL cannot be injected into it.
- Restored the large hover preview of saved viewport screenshots on desktop.
- Standardized the primary Fetch blue on the TV-app slate blue (#7C8DA7).
