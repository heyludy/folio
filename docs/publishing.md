# 홈페이지 게시

Folio 관리 화면은 GitHub Pages, 교수님 홈페이지는 Cloudflare Pages에 둡니다. 게시 서버는 Cloudflare Worker입니다. 편집은 브라우저에 저장되며 **게시 버튼을 눌렀을 때만** 공개 내용이 바뀝니다.

## 담당자 사용 순서

1. 프로젝트 → **게시** → 함께 정한 **게시 암호**로 연결합니다. 서버 주소는 미리 채워지며, 암호 확인 후 이 탭에서 8시간 동안 사용할 수 있습니다.
2. **게시하기**를 누르면 프로젝트별 `folio-….pages.dev` 기본 주소가 발급됩니다. 파일 업로드 후 **주소 확인 중**을 거쳐, 공개 주소에서 새 내용이 응답하는 것까지 확인한 뒤 **게시됨**으로 표시합니다. 첫 게시에는 시간이 걸릴 수 있습니다.
3. 편집 후 **변경사항 게시**를 누르면 같은 주소의 내용이 갱신됩니다.
4. 홈 카드의 **도메인**, 또는 게시 설정의 **도메인** 탭에서 구매한 도메인을 입력합니다. 주소 형태에 따라 네임서버 또는 CNAME 안내가 나타납니다. **구매처에 전달할 내용 복사**로 담당자에게 전달하고 **연결 상태 확인**을 누릅니다. DNS/HTTPS 확인이 끝나면 홈 바로가기가 연결된 도메인으로 바뀝니다.
5. **게시 중단**은 공개 사이트와 배포 이력을 삭제합니다. 공개 주소에 반영되기까지 잠시 걸릴 수 있습니다. 다시 게시하면 새 기본 주소가 생깁니다. 연결된 도메인이 있으면 먼저 해제하고 관련 DNS 레코드를 삭제합니다.

### 다른 브라우저에서 기존 게시 연결 복구

홈 카드에 기존 홈페이지 주소를 연결한 다음 **게시** 또는 **도메인**을 열고 게시 암호를 확인합니다. 서버가 그 주소의 기존 게시 기록을 찾으면 **기존 게시 연결을 복구했어요**가 표시됩니다. 이후 **변경사항 게시**로 같은 사이트를 업데이트할 수 있습니다. 복구 자체는 공개 내용이나 DNS를 변경하지 않습니다.

연결을 찾지 못하면 오류를 표시하고 멈춥니다. 다른 사이트를 새로 만들지 않습니다. 이전 버전에서 게시한 사이트는 처음 게시한 브라우저에서 게시 설정을 한 번 열면 검색에 등록됩니다. 그 브라우저가 없는 경우 관리자가 기존 Durable Object 목록에서 해당 Pages 프로젝트의 기록을 확인해 `/v1/admin/recovery`로 등록할 수 있습니다. 이 작업은 운영 키 전용이며 공유 암호로는 호출할 수 없습니다. 원래 기록에 별칭을 연결하므로 기존 브라우저의 게시 연결과 수정 충돌 검사도 유지됩니다.

프로젝트 목록에서 삭제하는 것은 로컬 초안 삭제입니다. 공개 사이트는 계속 열립니다. 게시 중단은 별도로 진행하세요.

## 링크 공유 미리보기

게시 설정에서 이름·소속·테마·사진으로 만든 1200×630 공유 카드를 확인할 수 있습니다. 게시할 때 PNG와 Open Graph 제목·설명·이미지 주소가 함께 올라갑니다. 이름이나 디자인을 수정하면 **변경사항 게시**로 반영하세요. 사진이 없거나 외부 사진 서버가 이미지 읽기를 허용하지 않으면 글 중심 카드가 만들어집니다. 기본 예시 사진은 [서울대 공개 프로필 원본](https://enecon.snu.ac.kr/media/staticdata_uploads/2020/07/23/2018.jpg)의 사본을 사용합니다.

이미 공유한 카카오톡 미리보기에는 이전 캐시가 남을 수 있습니다. 필요하면 카카오디벨로퍼스의 OG 캐시 초기화 도구를 사용하세요. [카카오 공식 안내](https://developers.kakao.com/docs/ko/message-template/faq). 카카오톡 대화에 메시지를 보내는 검증은 자동 수행하지 않습니다.

단일 HTML 다운로드에는 제목·설명 메타데이터가 포함됩니다. 별도 PNG를 공개 주소로 제공하는 공유 카드는 Folio 게시 기능에서 생성됩니다.

## 최초 서버 연결

- `wrangler.jsonc`: Cloudflare 계정, 허용할 Folio origin, Worker 이름 확인.
- `npm run publisher:deploy`: Worker와 SQLite Durable Object 배포.
- Cloudflare에서 계정 하나에 한정한 **Cloudflare Pages Edit** API 토큰을 만듭니다.
- `node scripts/connect-publisher.mjs https://<worker>.workers.dev`: 로컬 연결 화면을 열어 API 토큰을 입력합니다. 토큰은 Cloudflare Worker secret으로 저장됩니다. 이 스크립트는 로그인된 Wrangler를 사용합니다.
- 생성된 Folio 관리 키는 `~/.config/folio/publisher.json`에 사용자 전용 권한으로 보관됩니다. 이 파일은 공유하거나 저장소에 올리지 않습니다. 연결 화면에서 관리 키를 복사할 수 있습니다.
- 도메인 자동 설정에는 별도의 **Zone → Zone → Edit**, **Zone → DNS → Edit** 토큰을 준비하고 `node scripts/connect-dns.mjs`의 로컬 화면에 입력합니다. 새 도메인에도 적용되는 영역 범위가 필요합니다. 서버는 설정된 게시 계정 안에서만 도메인을 조회·등록합니다. 토큰은 `CLOUDFLARE_DNS_TOKEN` secret에 저장되며 기존 게시 토큰·암호는 바뀌지 않습니다. 이 권한이 없으면 www 없는 도메인에 권한 연결 안내와 재시도가 표시됩니다.
- `node scripts/set-publish-password.mjs`: 담당자들이 함께 사용할 게시 암호를 입력합니다. 입력은 화면에 표시되지 않습니다. 암호 자체 대신 임의 salt와 서버 비밀 키를 사용한 PBKDF2 검증 값을 Worker secret `PUBLISH_PASSWORD_HASH`에 저장합니다. 암호 변경 시 기존 암호 세션은 무효화됩니다.
- GitHub repository variable `PUBLISH_API_URL`에 Worker 주소를 지정하면 관리 화면에 미리 채워집니다. 이것은 공개 가능한 서버 주소입니다. `VITE_*`에 비밀 키를 넣으면 안 됩니다.

CLI로 직접 설정할 때에는 `npx wrangler secret put ADMIN_KEY`, `npx wrangler secret put CLOUDFLARE_API_TOKEN`의 보안 입력을 사용합니다. `ADMIN_KEY`는 32자 이상의 충분히 긴 임의 값입니다. OAuth 로그인은 개발 도구용이며 서버 운영용 API 토큰과 별개입니다.

## 현재 범위

- 신뢰하는 관리자가 공용 암호를 함께 쓰는 1차 버전입니다. 서버의 모든 게시 작업 권한을 공유합니다. 고객별 로그인 도입 시 사용자별 인증·프로젝트 권한을 추가해야 합니다. 기존 관리자 키는 운영용 API 호환을 위해 유지합니다.
- 암호 자체는 브라우저 저장소에 남기지 않습니다. 유효기간 8시간의 서명된 토큰만 sessionStorage에 보관합니다. **게시 잠금**으로 이 탭의 연결을 해제합니다. 암호 확인은 IP별·Cloudflare 위치별 분당 5회로 제한합니다.
- 초안은 브라우저에 보관됩니다. 게시 연결은 홈페이지 주소와 게시 암호로 복구할 수 있지만, 편집 중인 초안까지 내려받는 기능은 아닙니다. 클라우드 초안 저장·백업/복원은 별도 기능입니다.
- 기존 주소만 바로가기로 연결한 프로젝트는 암호 확인 후 서버의 게시 기록과 연결됩니다. 로그인 기반 클라우드 모드에서는 이 복구 경로를 사용하지 않고 공용 작업 공간의 프로젝트 권한을 따릅니다.
- 게시 파일은 합계 16MiB, 최대 100개입니다. PDF는 개당 10MiB, 사진·HTML은 개당 2MiB입니다. 사진·PDF는 게시할 때 중복을 제거하고 별도 정적 파일로 분리합니다. HTML 다운로드는 기존 단일 파일 방식입니다.
- 사용자 지정 도메인은 프로젝트당 한 개를 연결합니다. 도메인 구매와 구매처의 네임서버 변경은 사용자가 진행합니다. Folio는 www 없는 도메인을 Cloudflare에 등록하고 빈 홈페이지 DNS에 CNAME을 추가합니다. 기존 A·AAAA·CNAME·NS 기록을 덮어쓰거나 zone·메일 DNS를 삭제하지 않습니다.
- 기본 URL은 재게시 시 유지됩니다. 게시 중단 후에는 새 URL이 발급됩니다. Pages 특성상 과거 배포 주소는 게시 중단 전까지 남습니다. 검색엔진/브라우저 캐시에 이미 저장된 자료는 게시 중단으로 회수되지 않습니다.
- 게시 요청 중 새로고침·통신 오류가 나면 상태를 다시 조회합니다. Cloudflare가 성공을 확인하기 전에는 새 내용을 ‘게시됨’으로 표시하지 않습니다. 미확인 요청은 2분 뒤 재시도할 수 있습니다.

## 도메인

`www.example.com`처럼 하위 도메인은 외부 DNS의 CNAME을 `<project>.pages.dev`로 지정할 수 있습니다. `example.com` 자체는 **게시 프로젝트와 같은 Cloudflare 계정**에 zone을 두고 Cloudflare 네임서버를 사용해야 합니다. Folio는 Public Suffix List로 두 방식을 구분합니다 (`professor.ac.kr`도 루트 도메인입니다).

- **루트 도메인**: 같은 계정의 기존 full zone을 재사용하거나 새로 등록 → Pages에 연결 → 주소에 충돌 기록이 없으면 CNAME 추가 → Cloudflare가 실제 배정한 네임서버 표시. 네임서버는 한 개씩 또는 구매처 전달 문장 전체를 복사합니다. 기존 메일·다른 서비스가 있다면 필요한 DNS 기록을 먼저 Cloudflare에 옮겨야 합니다. Folio는 기존 DNS 전체를 자동 이전하지 않습니다.
- **하위 도메인**: Pages에 먼저 등록하고 현재 DNS 관리 서비스에 입력할 CNAME·필요 시 TXT를 안내합니다. 네임서버 변경은 요구하지 않습니다.
- **상태**: 도메인 등록, 홈페이지 DNS, 네임서버 변경, HTTPS를 각각 표시합니다. 새로고침은 조회만 하며 DNS 생성은 하지 않습니다. 부분 실패 후에는 배정된 네임서버를 유지하고 ‘설정 다시 시도’로 완료되지 않은 단계를 이어갑니다.
- **충돌**: 기존 주소 기록이 있으면 ‘기존 홈페이지 설정이 있어요’를 표시합니다. Cloudflare에서 확인·정리한 뒤 다시 시도합니다. 다른 사이트로 연결된 기록을 자동으로 교체하지 않습니다.
- **연결 해제**: Pages 연결만 해제합니다. Cloudflare zone, 네임서버와 DNS 기록은 남습니다. 홈페이지용 DNS 기록은 담당자가 정리해야 합니다.

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
