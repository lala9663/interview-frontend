# 설치와 실행

## 필요한 것

- Node.js 24 (npm 11 포함). 확인: `node -v`, `npm -v`

## 설치

```bash
npm ci
```

사내망에서는 npm 레지스트리를 사내 미러로 바꾼 뒤 실행한다(`.npmrc`에 `registry=` 한 줄). `package-lock.json`을 함께 반입해 같은 버전이 깔리게 한다.

## 실행 방식 세 가지

| 명령 | 모드 | 필요한 것 | 주소 |
| --- | --- | --- | --- |
| `npm run dev` | mock | 없음 | http://localhost:5173 |
| `npm run dev:api` | api | 백엔드 8080, Agent 8000 | http://localhost:5173 |
| `npm run build` → `dist/` | api | 웹 서버(같은 도메인에서 `/api/v1`을 백엔드로 넘김) | 배포 주소 |
| `npm run build:demo` → `dist-demo/interview-mockup.html` | mock | 없음(서버도 필요 없다) | 파일을 더블클릭 |

### 시연용 HTML (`build:demo`)

화면 전체를 HTML 한 파일로 만든다. 스크립트·스타일·글꼴이 모두 들어 있어 서버 없이 브라우저로 바로 열리고, 메일이나 메신저로 보낼 수 있다(약 4MB).

- 데이터는 전부 가상이고 `src/mocks/`가 답한다. 새로 고침하면 처음 상태로 돌아간다.
- 오늘 일정은 여는 시각을 기준으로 잡힌다. 언제 열어도 "곧 시작할 면접"과 "진행 중인 방"이 있다.
- 면접 방은 마이크를 요청하지 않고 대본을 흘려보낸다(`.env.demo`의 `VITE_MOCK_MIC=off`). 실제 마이크 동작은 이 파일로 확인할 수 없다.
- 면접 방 위쪽에 설명 띠가 나온다(`VITE_DEMO_GUIDE=on`, `features/room/DemoGuide.vue`). 지금 시스템이 하는 일(음성을 글로 → 문장 다듬기·화자 구분 → 준비한 질문 찾기 → 꼬리질문 만들기)을 보여 주고, 멈춤·2배·처음부터 버튼이 있다. "처음부터"는 화면을 새로 읽어 모의 데이터를 처음 상태로 되돌린다.
- 대본은 `src/mocks/data.js`의 `liveScript`다(문장 18개, 1배속으로 약 2분 30초). 대본의 `q`는 준비된 질문의 순서와 맞춰야 자동 체크가 된다.
- 주소는 `#` 뒤로 화면을 구분한다(`VITE_ROUTER=hash`). 서버가 없어서다.
- 설정은 `vite.config.js`의 `demo` 부분과 `.env.demo`에 있다.

세 레포를 함께 띄우는 순서: 백엔드(`./gradlew bootRun`) → Agent(`uvicorn app.main:app --port 8000`) → 프론트(`npm run dev:api`). 자세한 것은 각 레포의 `docs/setup.md`.

## 마이크

- 브라우저의 마이크 권한이 필요하다. `localhost`와 HTTPS에서만 동작한다(사내 배포는 HTTPS여야 한다).
- Chrome·Edge 기준으로 만들었다.

## 배포할 때 웹 서버가 해 줘야 하는 것

- `dist/`를 정적 파일로 제공하고, 없는 경로는 `index.html`로 돌려준다(history 라우팅).
- `/api/v1/**` → 백엔드로 프록시.
- Agent WebSocket 주소는 백엔드가 입장권과 함께 알려 준다(백엔드 환경변수 `AGENT_WS_BASE_URL`). 프록시가 WebSocket 업그레이드를 허용해야 한다.

## 자주 나는 문제

| 증상 | 원인과 해결 |
| --- | --- |
| `MOCK_ROUTE_MISSING` 토스트 | `api/index.js`에 더한 경로가 `mocks/server.js`에 없다 |
| 로그인 뒤 바로 로그인 화면으로 | 백엔드가 401. `VITE_API_BASE_URL`과 백엔드 CORS 허용 주소(5173) 확인 |
| `npm run build`가 "modules transformed" 뒤에 아무 말 없이 끝난다(두 번째 빌드부터) | 프로젝트가 OneDrive 동기화 폴더 안에 있을 때 Node가 기존 `dist/`를 지우다 죽는다. `dist/` 폴더를 탐색기나 셸에서 지우고 다시 빌드하거나, 프로젝트를 OneDrive 밖(예: `C:\work`)에 둔다. 사내 PC·서버에서는 해당 없음 |
| 면접 방에서 "연결 중"이 계속 | Agent가 꺼져 있거나 입장권 비밀키(`ROOM_TICKET_SECRET`)가 백엔드와 다르다 |
| `The 'bg-…' class does not exist` | Tailwind 설정을 못 찾음. `postcss.config.js`가 설정 경로를 절대 경로로 넘기는지 확인 |
