# Three professor presentation templates

Confirmed references: Dasom Lee (classic), Hyunjin Kim (portrait), and Wix's
Katherine H. Gilbert Researcher example (color). All demos use Heo's existing
bilingual detail data and local portrait. The real heoe.info publication is separate.

## Design plan

- Basic: preserve the existing one-page design, Source Serif 4 / Source Sans 3,
  white #ffffff, black titles/links #222222, gray details #444444,
  muted #626262, rule #d9d9d9. Monochrome is the Classic creation preset.
- Introduction: white #ffffff, charcoal #333333, muted #585858, blue #057aad,
  pale gray #fbfbfb. Jost name/headings and Libre Franklin body, Pretendard Korean.
  Right-aligned navigation; a full-width name above equal photo and biography
  columns. The public page switches between About, Research, Publications,
  Background, Teaching, Books/media and Contact. Long groups still scroll.
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
    [publications    ] [selected menu only]  [photo| affiliation]
                                              [About | biography]
                                              [Research | topics]

## Review against the brief

The three are structurally distinct. Color intentionally uses the green and warm
name treatment requested in the reference, without importing its placeholder
profile or decorative archaeology images. Keep the real Heo portrait and all
verified existing content. Long biography goes into a readable About section in
Color, so the hero remains composed without cutting any information. On mobile,
photo/title/biography stack; no overlapping text. All fields remain directly
editable and resizable. The editor keeps every section accessible. Basic and Color
use continuous scrolling; Introduction displays the selected menu group, with
unlisted sections included under the preceding menu. Direct section URLs, language
switches and browser history restore the correct group. All three headers remain
at the top, with the current menu highlighted by color and an underline. Mobile
menu buttons also show the current group's name. Printing and JavaScript-free
viewing retain every section. Preserve legacy saved sidebar/research/editorial
layouts, and retain Research as a planned option.

Examples are standalone HTML using the same export as Folio. Exclude the live
publication URL and provide a comparison page plus template-picker previews.

## Verification — 2026-09-21

- 206 application tests pass, including reading-position navigation, mobile
  menu stability, language/deep-link routing and Introduction group switching.
  Production build passes.
- In-app browser checked the three exported examples at 320, 768 and 1440px:
  no horizontal overflow, all portrait images loaded.
- Introduction separates Research/projects, Publications/conference presentations,
  Background/education/awards/service and Books/media without discarding details.
- A disposable local Color project was created, its name and biography edited
  directly, and the public preview verified. Blank photo, department and role
  stay absent. The local test project was moved to the recoverable deleted list.
- Template chooser shows real Heo thumbnails, full previews and a disabled
  planned Research option. Home links to the independent comparison page.
- All three sticky headers verified on desktop and at 390px:
  no horizontal overflow; clicked and direct section links land 16px below the
  header, including after closing the mobile menu and switching to Korean.
  The active menu follows manual scrolling in Basic and Color and the selected
  group in Introduction.
