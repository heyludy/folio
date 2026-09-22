<div align="center">

# Folio

**교수님의 연구와 이야기를, 하나의 홈페이지로.**

자료 준비부터 디자인 선택, 편집과 게시까지 함께 관리합니다.

[**Folio 시작하기 ↗**](https://heyludy.github.io/folio/) · [**템플릿 둘러보기 ↗**](https://heyludy.github.io/folio/examples/)

</div>

---

## 만드는 흐름

1. **프로젝트 생성** — 이름·소속·사용할 언어를 입력합니다.
2. **자료 가져오기** — Folio의 프롬프트를 각자 사용하는 AI에 전달하고, 받은 Markdown 파일이나 답변을 가져와 확인합니다.
3. **디자인 선택** — 사진·CV를 추가하고, 내 자료가 담긴 네 가지 템플릿을 비교합니다. 파일은 나중에 넣어도 됩니다.
4. **편집하고 게시** — 페이지에서 직접 수정하고, 화면별 미리보기를 확인한 뒤 게시합니다.

게시 후에도 같은 프로젝트에서 수정하고 **변경사항 게시**를 누르면 기존 주소에 반영됩니다.

## 네 가지 템플릿

| 템플릿 | 구성 |
| :--- | :--- |
| [**기본형**](https://heyludy.github.io/folio/examples/classic.html) | 소개·연구·이력을 한 페이지에서 차례로 |
| [**소개형**](https://heyludy.github.io/folio/examples/portrait.html) | 큰 이름과 사진, 메뉴별로 나눠 보는 내용 |
| [**컬러형**](https://heyludy.github.io/folio/examples/color.html) | 넓은 컬러 배경과 강조한 이름, 큰 인물 사진 |
| [**연구형**](https://heyludy.github.io/folio/examples/research.html) | 연구 분야·논문·프로젝트를 카드로 |

템플릿은 언제든 바꿀 수 있습니다. 내용과 첨부파일은 유지되고, 색상·폰트 선택은 템플릿별로 기억합니다.

## 할 수 있는 일

- **함께 관리** — Google 로그인, 공용 저장, 프로젝트 복제·삭제·복원, 수정 이력
- **직접 편집** — 글을 클릭해 수정하고, 섹션·항목 추가·삭제·순서 변경
- **자료 첨부** — 프로필·연구 이미지, CV·논문 PDF, 영어·한글 페이지
- **검토하고 공유** — 모바일·태블릿·데스크톱 미리보기, 게시 전 점검, 7일 초안 공유 링크
- **사이트 운영** — 기본 주소로 게시·재게시·중단, 구매한 도메인 연결, 독립 HTML 다운로드

> 운영 Folio는 허용된 Google 계정으로 이용하는 공용 공간입니다. 입력 자료는 클라우드에 자동 저장되며, 공개 사이트에는 **게시할 때** 반영됩니다. 다운로드한 HTML은 공개용 결과물로, 편집용 백업은 아닙니다.

<details>
<summary><strong>개발 및 설치</strong></summary>

### 로컬 실행

Node.js 24 기준입니다.

```sh
npm ci
npm run dev
```

클라우드 설정 없이 실행하면 현재 브라우저에 저장됩니다. 로그인·공용 저장과 온라인 게시를 사용하려면 아래 연결 가이드를 따라 설정하세요.

- 검사: `npm test` · `npm run test:worker`
- 빌드: `npm run build`
- 게시 서버 사전 검사: `npm run publisher:check`

**React · Vite** 편집기 / **Supabase** 로그인·자료 저장 / **Cloudflare** 게시 서버·교수님 사이트

이 저장소의 `main`에 푸시하면 GitHub Actions가 검사·빌드 후 편집기를 GitHub Pages에 배포합니다. 교수님 사이트는 Folio에서 별도로 게시합니다.

</details>

---

[자료 준비](docs/content-preparation.md) · [공용 저장 설정](docs/cloud-workspace.md) · [게시·도메인 설정](docs/publishing.md) · [전체 QA 기록](docs/qa-full-2026-09-22.md)
