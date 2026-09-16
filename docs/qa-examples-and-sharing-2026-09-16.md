# Example and sharing QA · 2026-09-16

- 116 Node tests, 2 Workers runtime tests passed; build and Worker dry-run passed.
- IndexedDB tests: existing draft/asset/deleted-project preservation, simultaneous first loads, intervening edits, deleted and edited examples, portrait-download failure/retry, pre-existing example IDs.
- Browser: Hinton appears before Heo; English and Korean content, optional sections, photo attribution, unofficial-example notice and original CV link render.
- Exported page: EN/KOR at 320, 390, 768, 1024, 1440 px have no horizontal document overflow.
- Example deletion remains deleted on reload; recovery remains available through deleted projects.
- New 1200×630 sharing card uses a large name, affiliation and larger portrait. Removed research-topic miniatures. Social description uses affiliation before the longer introduction.
- Sharing-link helper takes the last published fingerprint and drops section fragments. The publisher distinguishes the current draft preview from the published link.

## Existing Heo page

Updated only social metadata and image on the existing Cloudflare Pages project. Verified the live body is byte-for-byte unchanged, and the new PNG URL responds with HTTP 200 and `image/png`.

- Pages deployment: `5a17aa7e-ae26-4411-ab94-7bcbb03a9362`
- New image SHA-256: `c69b17c5460be8dc1b6643ec3a37c9c6a78367f5dbc85bec45f4a5b1e754008a`
- Share URL: https://folio-c4b09e29470a4eb68a1f.pages.dev/?share=c69b17c546

The user's screenshot confirmed the prior version-specific URL fetched the updated card in KakaoTalk. This second design is verified on the website; the assistant did not send any messages. Original-URL Kakao cache clearing requires the user's Kakao sign-in and was not performed. Previously sent messages can retain their card.
