# Fetch v0.4.0 — first real build

Fetch is a lightweight personal retrieval system for things seen on the web. It is designed around recognition and refinding, not archival capture.

## Status

This package is no longer only a visual prototype. The core backend has been created in the existing shared personal Supabase project, using Fetch-specific names so it does not modify Ticking or Newsletters data.

Live Fetch resources:

- `public.fetch_items`
- `public.fetch_capture_devices`
- private Storage bucket `fetch-screenshots`
- Edge Function `fetch-capture`

Both Fetch tables have Row Level Security enabled. The screenshot bucket is private.

## Web app

The web app now supports:

- Supabase connection using the project's publishable key
- existing-session detection
- email/password sign-in and optional email sign-in link
- Everything, Recent, Starred and category navigation
- search across title, domain, category, notes and selected text
- stackable filters: category, domain, date saved, page date, saved type
- sorting: date saved, page date, domain, category, title
- List, Card and Gallery views
- star/unstar
- whole-card one-click reopening
- desktop hover enlargement
- manual link addition for testing
- actual stored viewport screenshots when available
- Browser Setup screen for creating/revoking extension device tokens
- visible version number

If Fetch is opened on the same web origin where another app using this same Supabase project is already signed in, Supabase may reuse the existing stored session.

## Browser-token model

The Chrome/Safari extensions do not contain a database secret or owner ID.

From Fetch, open **Browser setup**, name a device, and generate a device token. Fetch:

1. generates the token in the browser,
2. stores only its SHA-256 hash in `fetch_capture_devices`,
3. shows the raw token once so it can be copied into the extension.

The token can later be revoked from Fetch. The `fetch-capture` Edge Function hashes incoming tokens and looks up the owner before writing any bookmark.

## Chrome extension

Load `/extension/chrome` as an unpacked Manifest V3 extension.

It can:

- read page title and URL
- derive domain automatically
- detect selected text
- look for a publication/page date in common metadata and JSON-LD
- capture the **visible browser viewport**
- reduce the viewport to at most 960 px wide and attempt WebP compression
- ask for one category before saving
- save Page, Text, or Image link captures
- add a right-click **Save image link to Fetch** command

The Supabase Edge Function URL is already prefilled in extension settings. The only private value to add is a device token generated inside Fetch.

The extension only captures after an explicit toolbar click or image context-menu command; it does not continuously watch browsing.

## Screenshot design

Screenshots are recognition cues, not archives.

- visible viewport only
- compressed before upload
- 1 MB hard Storage object limit
- private bucket
- screenshot failure never prevents the URL itself from being saved

## Safari / iPhone / iPad

The Chrome source is the reference WebExtension implementation. The capture endpoint and data shape are browser-neutral. The next browser step is to convert/package the extension as a Safari Web Extension with Xcode and test Safari's viewport-capture behavior on macOS, iPhone and iPad.

See `/extension/safari/README.md`.

## Current limits

- The web app has not yet been deployed to its own GitHub Pages URL.
- Safari/Xcode packaging has not yet been generated.
- Editing, recoverable trash, and category renaming are not in this build yet.
- A magic-link sign-in redirect may need the final Fetch GitHub Pages URL added to Supabase Auth's allowed redirect URLs. Password sign-in does not depend on that redirect.

## Retrieval principle

> I know I saw this somewhere. Where was it?

Everything in Fetch should shorten the path from that thought to the original page.
