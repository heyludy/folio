# 홈페이지 게시

Folio 관리 화면은 GitHub Pages, 교수님 홈페이지는 Cloudflare Pages에 둡니다. 게시 서버는 Cloudflare Worker입니다. 편집은 브라우저에 저장되며 **게시 버튼을 눌렀을 때만** 공개 내용이 바뀝니다.

## 담당자 사용 순서

1. 프로젝트 → **게시** → 관리자가 받은 게시 관리 키로 연결합니다.
2. **게시하기**를 누르면 프로젝트별 `folio-….pages.dev` 기본 주소가 발급됩니다.
3. 편집 후 **변경사항 게시**를 누르면 같은 주소의 내용이 갱신됩니다.
4. 도메인을 구매했다면 게시 설정에 도메인만 입력합니다. 연결 후 나타나는 DNS 안내를 도메인 관리 화면에 반영하고 **새로고침**으로 확인합니다.
5. **게시 중단**은 공개 사이트와 배포 이력을 삭제합니다. 공개 주소에 반영되기까지 잠시 걸릴 수 있습니다. 다시 게시하면 새 기본 주소가 생깁니다. 연결된 도메인이 있으면 먼저 해제하고 관련 DNS 레코드를 삭제합니다.

프로젝트 목록에서 삭제하는 것은 로컬 초안 삭제입니다. 공개 사이트는 계속 열립니다. 게시 중단은 별도로 진행하세요.

## 최초 서버 연결

- `wrangler.jsonc`: Cloudflare 계정, 허용할 Folio origin, Worker 이름 확인.
- `npm run publisher:deploy`: Worker와 SQLite Durable Object 배포.
- Cloudflare에서 계정 하나에 한정한 **Cloudflare Pages Edit** API 토큰을 만듭니다.
- `node scripts/connect-publisher.mjs https://<worker>.workers.dev`: 로컬 연결 화면을 열어 API 토큰을 입력합니다. 토큰은 Cloudflare Worker secret으로 저장됩니다. 이 스크립트는 로그인된 Wrangler를 사용합니다.
- 생성된 Folio 관리 키는 `~/.config/folio/publisher.json`에 사용자 전용 권한으로 보관됩니다. 이 파일은 공유하거나 저장소에 올리지 않습니다. 연결 화면에서 관리 키를 복사할 수 있습니다.
- GitHub repository variable `PUBLISH_API_URL`에 Worker 주소를 지정하면 관리 화면에 미리 채워집니다. 이것은 공개 가능한 서버 주소입니다. `VITE_*`에 비밀 키를 넣으면 안 됩니다.

CLI로 직접 설정할 때에는 `npx wrangler secret put ADMIN_KEY`, `npx wrangler secret put CLOUDFLARE_API_TOKEN`의 보안 입력을 사용합니다. `ADMIN_KEY`는 32자 이상의 충분히 긴 임의 값입니다. OAuth 로그인은 개발 도구용이며 서버 운영용 API 토큰과 별개입니다.

## 현재 범위

- 신뢰하는 관리자가 함께 쓰는 1차 버전입니다. 게시 관리 키는 서버의 모든 게시 작업 권한을 가집니다. 서로 분리된 고객 계정 서비스로 운영할 때에는 사용자별 인증·프로젝트 권한을 추가해야 합니다.
- 관리 키는 탭의 sessionStorage에만 보관됩니다. 브라우저가 세션을 복원할 수도 있습니다. 공용 컴퓨터에서는 **게시 서버 연결 끊기**를 누르세요.
- 초안과 공개 사이트 연결 ID는 브라우저에 보관됩니다. 기기를 바꾸거나 브라우저 데이터를 삭제하면 자동 복구되지 않습니다. Cloudflare의 공개 사이트는 유지됩니다. 클라우드 초안 저장·백업/복원은 별도 기능입니다.
- 게시 파일은 합계 16MiB, 최대 100개입니다. PDF는 개당 10MiB, 사진·HTML은 개당 2MiB입니다. 사진·PDF는 게시할 때 중복을 제거하고 별도 정적 파일로 분리합니다. HTML 다운로드는 기존 단일 파일 방식입니다.
- 사용자 지정 도메인은 프로젝트당 한 개를 연결합니다. 도메인 구매와 DNS 변경은 사용자가 도메인 관리 서비스에서 진행합니다. 임의로 DNS 레코드를 덮어쓰지 않습니다.
- 기본 URL은 재게시 시 유지됩니다. 게시 중단 후에는 새 URL이 발급됩니다. Pages 특성상 과거 배포 주소는 게시 중단 전까지 남습니다. 검색엔진/브라우저 캐시에 이미 저장된 자료는 게시 중단으로 회수되지 않습니다.
- 게시 요청 중 새로고침·통신 오류가 나면 상태를 다시 조회합니다. Cloudflare가 성공을 확인하기 전에는 새 내용을 ‘게시됨’으로 표시하지 않습니다. 미확인 요청은 2분 뒤 재시도할 수 있습니다.

## 도메인

`www.example.com`처럼 하위 도메인은 외부 DNS의 CNAME을 `<project>.pages.dev`로 지정할 수 있습니다. `example.com` 자체는 **게시 프로젝트와 같은 Cloudflare 계정**에 zone을 두고 Cloudflare 네임서버를 사용해야 합니다. Pages에 도메인을 먼저 등록한 뒤 DNS를 연결해야 합니다. 인증에 TXT가 필요하면 응답에 따라 함께 표시합니다.

## 검증·운영

```sh
npm test                 # 기존 편집/내보내기 + 게시 계약/오류/동시성
npm run test:worker     # 실제 Workers 런타임, RPC, SQLite, 인증, 게시/중단
npm run publisher:check # 실제 Worker 패키징 검사
npm run build
```

프런트엔드 빌드에는 Cloudflare 토큰·게시 관리 키가 포함되지 않습니다. 서버 로그에는 요청 본문/키/HTML을 기록하지 않습니다. 인증·Origin 검사 후 요청을 전달하고, 입력 크기 제한과 파일 경로/해시를 검사합니다. 각 공개 사이트의 작업은 Durable Object 한 개에서 직렬 처리합니다. 오래된 화면의 게시 요청은 상태 충돌로 거절합니다.

공식 자료: [Pages Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/) · [도메인 연결](https://developers.cloudflare.com/pages/configuration/custom-domains/) · [Pages 제한](https://developers.cloudflare.com/pages/platform/limits/) · [Worker 요금·제한](https://developers.cloudflare.com/workers/platform/pricing/) · [Durable Objects 제한](https://developers.cloudflare.com/durable-objects/platform/limits/)

무료 한도 안에서 시작할 수 있습니다. 현재 Pages는 계정당 프로젝트 수 제한이 있으므로 여러 고객에게 크게 확장하기 전에 한도를 다시 확인하세요. 유료 플랜으로 자동 전환하거나 도메인을 구매하는 기능은 없습니다.
