# Three professor presentation templates

Confirmed references: Dasom Lee (classic), Hyunjin Kim (portrait), and Wix's
Katherine H. Gilbert Researcher example (color). All demos use Heo's existing
bilingual detail data and local portrait. The real heoe.info publication is separate.

## Design plan

- Basic: preserve the existing one-page design, Source Serif 4 / Source Sans 3,
  white #ffffff, purple #4e2a84, ink #342f2e, muted #716c6b, rule #d8d6d6.
- Introduction: white #ffffff, charcoal #333333, muted #585858, blue #057aad,
  pale gray #fbfbfb. Jost name/headings and Libre Franklin body, Pretendard Korean.
  Right-aligned navigation; a full-width name above equal photo and biography
  columns. Readable separate Research, Background, Teaching, Books/media pages.
- Color: white #ffffff, pale sage #eef1ea, forest #0c382e, warm title #ecb499,
  light text #f7f7f2, muted text #dbe6de. Source Serif 4 / Source Sans 3 with
  Korean Noto Serif KR / Pretendard. A large left portrait rises across the pale
  header and dark hero; the large name slightly overlaps its right edge. Below,
  section headings sit in a left column with content on the right. Wide section
  background bands provide hierarchy. Palette selection recolors this layout.

    Basic              Introduction          Color
    [             nav] [               nav]  [name          nav]
    [name bio | photo] [Name              ]  [photo             ]
    [research        ] [photo | biography ]  [photo| Name       ] dark band
    [publications    ] [detailed menu pages]  [photo| affiliation]
                                              [About | biography]
                                              [Research | topics]

## Review against the brief

The three are structurally distinct. Color intentionally uses the green and warm
name treatment requested in the reference, without importing its placeholder
profile or decorative archaeology images. Keep the real Heo portrait and all
verified existing content. Long biography goes into a readable About section in
Color, so the hero remains composed without cutting any information. On mobile,
photo/title/biography stack; no overlapping text. All fields remain directly
editable and resizable. In Introduction edit mode, all sections remain visible
for sorting; only published and preview views paginate. Preserve legacy saved
sidebar/research/editorial layouts, and retain Research as a planned option.

Examples are standalone HTML using the same export as Folio. Exclude the live
publication URL and provide a comparison page plus template-picker previews.

## Verification — 2026-09-21

- 204 application tests and 12 publisher tests pass; production build and
  publisher dry run pass.
- In-app browser checked the three exported examples at 320, 768 and 1440px:
  no horizontal overflow, all portrait images loaded.
- Introduction navigation shows Publications + Projects on Research; Korean
  controls and sandboxed Folio preview navigate correctly.
- A disposable local Color project was created, its name and biography edited
  directly, and the public preview verified. Blank photo, department and role
  stay absent. The local test project was moved to the recoverable deleted list.
- Template chooser shows real Heo thumbnails, full previews and a disabled
  planned Research option. Home links to the independent comparison page.
