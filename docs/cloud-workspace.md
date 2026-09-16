# Google 로그인 · 공용 프로젝트

## 동작

- `@apub.kr`의 Google 인증 계정과 지정 관리자 두 계정만 이용한다.
- 관리자: `ludia0602@gmail.com`, `ludy.kim@furiosa.ai`.
- 모두 **같은 공용 프로젝트**를 열고 편집·삭제·복원·게시·도메인 관리한다.
- 기존 브라우저 프로젝트는 선택해서 공용 공간으로 가져온다. 원본은 그대로 보관한다.
- 과거 게시 ID 가져오기는 관리자만 가능하다. 게시된 URL만으로 관리 권한을 추측하지 않는다.
- 사진/PDF는 비공개 Storage, 문서와 게시 ID는 PostgreSQL에 저장한다. 공개 사이트는 계속 Cloudflare Pages에 독립적으로 남는다.
- 서로 다른 필드 수정은 합치고 같은 필드 수정은 충돌을 표시한다. 동시 커서가 보이는 실시간 공동 편집은 아니다.
- 인터넷이 끊겨 저장이 실패하면 계정별 브라우저 임시본을 유지한다. 다시 저장/다시 접속할 때 서버와 비교한다. 저장 실패 중에는 로그아웃을 막고 HTML 내보내기를 제공한다.
- 홈/편집기는 유휴 상태에서 20초마다 최신 내용을 확인한다. AI 자료 준비 중간본은 브라우저에만 보관한다.

## 1. Supabase 무료 프로젝트

별도 Folio 프로젝트를 만든다. SQL Editor에서 [`supabase/migrations/202609160001_folio.sql`](../supabase/migrations/202609160001_folio.sql)을 실행한다.

테이블과 함수는 Worker의 service role만 접근한다. 브라우저용 키에는 권한을 주지 않으며, 테이블 RLS와 비공개 버킷을 유지한다. 공유 공간 ID는 서버에서 `apub`으로 고정한다.

## 2. Google 로그인

Supabase Authentication → Sign In / Providers → Google을 켠다. Google Cloud에서 웹 애플리케이션 OAuth 클라이언트를 만든다.

- 대상: External. 관리자 Gmail도 사용하므로 Internal로 제한하지 않는다.
- 범위: 이메일, 프로필, OpenID 기본 범위만 사용한다.
- Google 승인 리디렉션 URI: Supabase Google 설정에 표시된 `https://<project-ref>.supabase.co/auth/v1/callback`.
- Google Client ID/Secret은 Supabase Google 설정에 넣는다. 저장소나 프런트엔드에 넣지 않는다.
- OAuth 앱이 Testing이면 로그인할 계정을 Google의 테스트 사용자에도 등록한다. 회사 구성원 전체 사용 전에는 앱 게시 상태를 확인한다.
- Supabase Site URL 및 허용 Redirect URL: `https://heyludy.github.io/folio/`.
- 로컬 개발이 필요할 때만 `http://127.0.0.1:5173/`도 Redirect URL에 추가한다.
- Supabase 이메일/비밀번호 등 다른 로그인 제공자는 끈다.
- Authentication → Hooks → Before User Created: `public.folio_before_user_created` 지정.

Worker가 매 요청 Supabase 사용자 API로 유효한 세션과 Google에서 확인한 이메일을 검증한다. 사용자 수정 가능 metadata와 OAuth `hd` 힌트만으로 접근을 허용하지 않는다.

## 3. 연결 및 활성화

Worker 비밀 설정:

- `SUPABASE_URL`: 해당 프로젝트 URL.
- `SUPABASE_SECRET_KEY`: 서버 전용 `sb_secret_...` 키. **GitHub Pages 변수나 VITE 변수에 넣지 않는다.** 기존 `SUPABASE_SERVICE_KEY`의 legacy `service_role` 키도 호환된다.
- `CLOUD_ENABLED`: `true`로 지정하면 공유 게시 암호 로그인은 차단된다. 준비 전에는 지정하지 않는다.

`npx wrangler secret put <이름>`의 비공개 입력으로 설정한다. 키를 CLI 인수로 직접 넘기지 않는다.

GitHub Actions repository variables:

- `SUPABASE_URL`: 같은 프로젝트 URL.
- `SUPABASE_PUBLISHABLE_KEY`: 브라우저용 publishable key 또는 legacy anon key.
- 기존 `PUBLISH_API_URL` 유지.

순서: SQL·Google 설정 → Worker URL/키 저장 → backend 검사 → 프런트 변수 설정·배포 → `CLOUD_ENABLED=true` 활성화 → 실제 허용/차단 계정으로 점검. 전환하는 짧은 시간에는 게시를 잠시 멈춘다. 프런트 Supabase 변수가 비어 있으면 기존 브라우저 저장 방식이 유지된다.

## 검증과 운영

`npm test`, `npm run test:worker`, `npm run publisher:check`, `npm run build`.

SQL은 PGlite PostgreSQL로 실제 실행해 권한, 공유 revision, 게시 ID 안정성을 검사한다. 가짜 OAuth 서버를 사용한 로컬 UI 검증과 실제 Google 로그인 검증을 구분한다. 실제 Google 로그인은 프로젝트 연결 후 진행한다.

파일은 해시로 중복 저장을 막는다. 삭제된 프로젝트는 복원 가능하므로 첨부 파일도 보존한다. 파일의 자동 영구 삭제·백업/감사 기록 UI는 아직 제공하지 않는다. 사용량은 Supabase 대시보드에서 확인한다.

공식 문서: [Google](https://supabase.com/docs/guides/auth/social-login/auth-google) · [인증 hook](https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook) · [Storage 권한](https://supabase.com/docs/guides/storage/security/access-control).
