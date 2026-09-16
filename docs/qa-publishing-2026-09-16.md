# 게시 기능 QA · 2026-09-16

## 검증한 흐름

- 기존 편집·언어·자료 준비·HTML 내보내기 회귀 검사 + 게시 계약/인증/파일/동시성: 101개 통과.
- Workers 런타임, RPC, SQLite 실제 저장과 새 인스턴스에서 복구, Origin/관리 키 검증, 게시/중단: 2개 통과. 외부 Pages API는 이 테스트에서 모의 응답.
- 실 Cloudflare Pages API: 개인정보 없는 테스트 페이지 생성 → HTML/PDF HTTP 확인 → 내용 변경 후 동일 URL HTTP 확인 → 프로젝트 삭제 → 삭제 조회 확인. 테스트 프로젝트 `folio-qa-e94c257d-048` 정리 완료.
- 로컬 편집 UI + 격리된 모의 게시 서버: 연결 오류, 첫 게시, 변경사항 감지, 같은 URL 재게시, 잘못된 도메인 입력 거절, DNS 안내, 연결 해제 취소/확정, 게시 중단 확인/완료.
- 기존 실 사용자 브라우저 프로젝트는 변경하지 않음. QA는 localhost:5178의 기존 테스트 프로젝트 사용.
- 프런트 빌드에 서버 토큰/테스트 키가 들어가지 않는 것을 검색 확인.

## 운영 연결

- Worker: `https://folio-publisher.ludia0602.workers.dev`
- 브라우저 Folio 주소: `https://heyludy.github.io/folio/`
- Cloudflare 로그인·MCP OAuth 연결 완료. 서버 운영용 Pages API 토큰은 별도로 Secret에 넣어야 함.
- 실제 소유 도메인 연결은 도메인 제공 전까지 검증하지 못함. DNS 안내와 provider pending/active 상태 전환은 격리된 테스트로 검증.
- 실제 원격 Worker를 통한 end-to-end 게시는 운영용 Secret 입력 후 검증 필요. 앞선 실 Pages 검사는 로그인된 Wrangler의 개발용 권한으로 adapter를 직접 실행한 결과이며, 운영 서버 검증과 구분함.

## 알려진 범위

- 관리 키 하나를 공유하는 신뢰된 관리자용. 고객별 계정/권한 분리와 초안 클라우드 동기화는 아직 없음.
- 게시 중단은 Pages 프로젝트 삭제이며 재게시 때 새 기본 URL이 생김.
- 빌드의 기존 500KB chunk 경고는 남아 있음. 빌드 실패는 아님.
