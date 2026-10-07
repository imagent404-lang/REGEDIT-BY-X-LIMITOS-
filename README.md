# X LIMITOS — GitHub Static Package

A premium liquid-glass X LIMITOS website package designed for GitHub Pages or another static host.

## Included
- `index.html` — locked home page with the supplied anime background video.
- `panel.html` — six resource options:
  1. Free PC Panel
  2. Free Bypass
  3. Emulators
  4. Free Fire APK
  5. Aimbot Pro Free
  6. Error Fix
- `system.html` — individual resource page for each option.
- `admin.html` — admin-only editor for all six resource pages.
- `assets/video/anime-background.mp4` — supplied background video.

## Admin login
- Username: `admin`
- Password: `admin`

Change these values in `assets/config.js` before publishing.

## Admin editing
The admin can edit each of the six resource pages with:
- YouTube guide URL
- Resource/button URL
- Page description
- Instructions
- One downloadable file upload per page

The Home page is intentionally not editable from the admin panel.

## Important static-host limitation
This package intentionally uses **no Firebase, no Google login, no API tokens, and no backend**. The admin session, page settings and uploaded files are therefore stored in the browser (localStorage + IndexedDB). Changes made by the admin on one device/browser do **not** automatically sync to other visitors or modify files inside the GitHub repository.

For true multi-user server-side publishing, a backend/storage service would be required; that would conflict with the requested no-backend requirement.
