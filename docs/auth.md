# 로그인

## 지금 (외부 개발)

- `/login`에서 사번을 골라 `POST /auth/dev-login`을 부른다. 백엔드의 `local` 프로파일에서만 열려 있다.
- 응답의 `accessToken`·`refreshToken`은 `sessionStorage`(`iv.tokens`), 사용자 정보는 `iv.user`에 둔다. 탭을 닫으면 사라진다.
- 모든 요청에 `Authorization: Bearer`를 붙이고, 401이면 `/auth/refresh`를 한 번 시도한 뒤 실패하면 로그인 화면으로 보낸다(`api/http.js`).

## 사내 (AD SSO)

백엔드가 AD SSO를 붙이면 프론트에서 바꿀 곳은 두 군데다.

1. `features/auth/LoginPage.vue`: 사번 선택 폼 대신 "AD 계정으로 로그인" 버튼 하나. 누르면 백엔드의 `GET /auth/sso/login`으로 **페이지 이동**한다(fetch가 아니다).
2. SSO가 끝나고 돌아오는 주소(예: `/login/callback`)의 라우트를 더해, 백엔드가 준 토큰을 `tokens.set()`과 `auth.setUser()`로 저장하고 원래 가려던 화면으로 보낸다.

토큰을 어떻게 돌려받을지(쿼리의 일회용 코드 → `POST /auth/sso/exchange`, 또는 HttpOnly 쿠키)는 백엔드 `docs/auth.md`에서 정한 방식을 따른다. 토큰 자체를 URL에 싣지 않는다.

개발용 로그인 화면은 `import.meta.env.VITE_API_MODE === 'mock'`이거나 백엔드가 dev-login을 열어 둔 환경에서만 보이게 남겨 두면 로컬 개발이 편하다.

## 권한

- `auth.isAdmin`(`role === 'ADMIN'`)으로 업로드·자동 매칭·면접 등록·질문 은행 편집 버튼을 가린다.
- 화면에서 가리는 것은 편의일 뿐이다. 실제 권한 검사는 백엔드가 한다.
