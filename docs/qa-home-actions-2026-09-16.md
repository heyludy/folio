# Home actions and favicon QA · 2026-09-16

- Folio favicon is a bundled SVG F mark. The built HTML uses a relative icon path for the `/folio/` GitHub Pages base; the file is present in `dist` and returned as SVG by the dev server.
- Home cards expose separate publish/visit, edit and delete actions. Existing thumbnail click still edits. A public address opens in a new tab with `noopener noreferrer`.
- Unpublished projects show Publish. A pre-existing publication ID without a cached address shows Check address; connecting or refreshing publication status backfills it. Already connected sessions also refresh existing IDs from home without publishing anything.
- Publication snapshots store only public fields, separate from editable project content. Keys and DNS verification data remain excluded. State is scoped to publisher endpoint and publication ID, and stale revisions cannot restore an outdated address.
- Live custom domains take priority over the default Pages address. A pending first deployment has no Visit link; a pending update retains the previous live address. Unpublishing removes the Visit link. Home polls only pending publications and keeps working cached links if a read fails.

## Verification

121 Node tests and 2 Workers runtime tests passed. Build and Worker dry-run passed.

In-app browser, using the local-only QA provider (no Cloudflare resources created):
1. Opened publishing directly from Hinton's home card and connected.
2. Published, checked the explicit Open published site link.
3. Closed the dialog: home immediately displayed Published and Visit.
4. Reloaded: the address persisted; verified its href and `_blank` target from rendered DOM.
5. Entered Edit, reopened publishing, unpublished the local test site.
6. Returned home: the Visit link was removed and Publish returned.
7. No browser console errors. Home document has no horizontal overflow at 1280 px.

Existing pre-feature publications need one successful status read (using the existing connected session, or Check address on the card). After that, the cached public link remains available even without the management key in a new session.
