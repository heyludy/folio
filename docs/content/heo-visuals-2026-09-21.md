# Heo template example images

The three independent template demos share four original images, embedded as
data URLs in `src/examples/heo-media.json`. Exported HTML carries these images
without requests to the source servers. Existing saved drafts and heoe.info are
not migrated or republished by this example update.

## Sources

1. **우리는 미래에 살고 있다** — 2020, 서울대학교 공과대학, 창비교육.
   Heo is listed among the contributing authors.
   - Book: https://books.changbiedu.com/Home/BookDetail?bookid=2119
   - Original cover: https://books.changbiedu.com/api/MCBApi/getcoverimage?imgid=519&thumb=8
2. **새로운 지구를 위한 에너지 디자인** — 2008, 바츨라프 스밀;
   Korean translation by 김태유, 이수갑, 허은녕; 창비.
   - Book: https://www.changbi.com/BookDetail?bookid=1636
   - Original cover: https://kr.object.ncloudstorage.com/changbi/old/uploads/2013/09/2848.jpg
3. **국내외 평가기관별 ESG 평가신뢰도 분석; KOSPI50 기업을 중심으로** —
   2024, 이지현, 김수현, 허은녕, 한국혁신학회지 19(2).
   - DOI: https://doi.org/10.46251/INNOS.2024.5.19.2.137
   - English title, author names and pages: https://api.crossref.org/works/10.46251/INNOS.2024.5.19.2.137
     Display corrects the metadata typo “Statitical” to “Statistical”.
   - Research summary: https://temep.snu.ac.kr/research/activities?bbsidx=2399&bm=v
   - Original table: https://temep.snu.ac.kr/webdata/upimages/19fz577z405z543ze04zb86z231ze20zb67z604z55.png
4. **Dynamics of Regionalization in Jet-Fuel Markets: Evidence From Global Shocks** —
   Mingi Jung, Eunnyeong Heo, Soohyeon Kim, Hansol Julian Yoon, 2025.
   Classify as a poster at the 46th IAEE International Conference in Paris, not
   a journal publication. Use the published author names without guessing Korean
   spellings. The illustration shows four periods of market relationships.
   - Research summary: https://temep.snu.ac.kr/research/activities?bbsidx=2464&bm=v
   - Original figure: https://temep.snu.ac.kr/webdata/upimages/026z288z12dz2f0z592z897z41bzd78z4b3z5faza7.png

## Presentation

Keep each template's existing typefaces and palette (see template-directions.md).
Book covers remain upright, uncropped, beside the citation on desktop and above
it on narrow screens. Research figures use a wider contained image; narrow
columns stack image and text. A keyboard-accessible image dialog enlarges the
original and links to its source. Actual-size mode allows small-screen readers
to pan across wide tables. Escape, the close button and backdrop clicks
close it and return focus. Editing keeps the existing image upload and resize
controls. Papers without images retain their text layout.

## Verification

- 203 application tests pass; production build succeeds.
- Browser checks at 320, 390, 768px and desktop confirm uncropped covers,
  contained figures, source links and no horizontal page overflow.
- English and Korean image dialogs open and close; Escape restores focus and
  page scrolling. A 916px-wide table scrolls inside the mobile actual-size view.
