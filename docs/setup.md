# 설치와 실행

## 필요한 것

- Node.js 24 (npm 11 포함). 확인: `node -v`, `npm -v`

## 설치

```bash
npm ci
```

사내망에서는 npm 레지스트리를 사내 미러로 바꾼 뒤 실행한다(`.npmrc`에 `registry=` 한 줄). `package-lock.json`을 함께 반입해 같은 버전이 깔리게 한다.

## 실행 방식 네 가지

| 명령 | 모드 | 필요한 것 | 주소 |
| --- | --- | --- | --- |
| `npm run dev` | mock | 없음 | http://localhost:5173 |
| `npm run dev:api` | api | 백엔드 8080, Agent 8000 | http://localhost:5173 |
| `npm run build` → `dist/` | api | 웹 서버(같은 도메인에서 `/api/v1`을 백엔드로 넘김) | 배포 주소 |
| `npm run build:demo` → `dist-demo/interview-mockup-<주차>.html` (주차마다 하나) | mock | 없음(서버도 필요 없다) | 파일을 더블클릭 |

### 시연용 HTML (`build:demo`)

화면 전체를 HTML 한 파일로 만든다. 스크립트·스타일·글꼴이 모두 들어 있어 서버 없이 브라우저로 바로 열리고, 메일이나 메신저로 보낼 수 있다(약 4MB).

- 데이터는 전부 가상이고 `src/mocks/`가 답한다. 새로 고침하면 처음 상태로 돌아간다.
- 오늘 일정은 여는 시각을 기준으로 잡힌다. 언제 열어도 "곧 시작할 면접"과 "진행 중인 방"이 있다.
- 면접 방은 마이크를 요청하지 않고 대본을 흘려보낸다(`.env.demo`의 `VITE_MOCK_MIC=off`). 실제 마이크 동작은 이 파일로 확인할 수 없다.
- 면접 방 위쪽에 설명 띠가 나온다(`VITE_DEMO_GUIDE=on`, `features/room/DemoGuide.vue`). 지금 시스템이 하는 일(음성을 글로 → 문장 다듬기·화자 구분 → 준비한 질문 찾기 → 꼬리질문 만들기)을 보여 주고, 멈춤·2배·처음부터 버튼이 있다. "처음부터"는 화면을 새로 읽어 모의 데이터를 처음 상태로 되돌린다.
- 대본은 `src/mocks/data.js`의 `liveScript`다(문장 18개, 1배속으로 약 2분 30초). 대본의 `q`는 준비된 질문의 순서와 맞춰야 자동 체크가 된다.
- 주소는 `#` 뒤로 화면을 구분한다(`VITE_ROUTER=hash`). 서버가 없어서다.
- 설정은 `vite.config.js`의 `demo` 부분과 `.env.demo`에 있다.

### 주차별 목업

매주 회의에서 무엇이 더해지고 나아졌는지 보여 주려고, 목업을 주차마다 한 파일씩 만든다. `npm run build:demo` 한 번에 모든 주차의 파일이 나온다.

| 파일 | 회의 | 그 주차에 새로 보이는 것 |
| --- | --- | --- |
| `interview-mockup-2026-w47.html` | 11/18 (3주 차) | 신입 흐름 전체: 오늘, 면접자 목록·상세, 엑셀 올리기와 자동 매칭, 면접 전, 면접 중(전사, 화자 구분, 준비한 질문 자동 인식, 꼬리질문 제안), 면접 후(초안 보고서, 내 평가) |
| `interview-mockup-2026-w48.html` | 11/25 (4주 차) | 말로 물은 꼬리질문 자동 채택, 보정본 보고서, 물은 질문과 은행에 담기, 질문 은행, 면접 종류 탭과 담당 직무 미리 선택, 진행 현황 |
| `interview-mockup-2026-w49.html` | 12/2 (5주 차) | 경력 채용 탭(차수, 상세 보고서), AI 참고 평가 |
| `interview-mockup-2026-w50.html` | 12/9 (6주 차) | 관리 > 운영 현황, AI 품질, 면접관 편차 |

- **코드는 한 벌이다.** 기능은 모두 만들어져 있고, 주차별 목업에서만 그 주차에 보여 줄 기능을 켠다. 개발 서버(`npm run dev`)와 실제 배포 빌드에서는 주차가 없으므로 모든 기능이 켜진다.
- **어느 주차에 무엇을 켜는지**는 `src/lib/features.js`의 표에 있다(기능 이름 → 처음 보이는 과제 주차). 화면·메뉴·라우트(`meta.feature`)·모의 서버가 `has('이름')`으로 확인한다. 가려진 화면의 주소로 직접 들어가면 오늘(또는 관리 > 등록·매칭)으로 돌아간다.
- **주차 목록과 변경 요약**은 `src/mocks/changelog.js`에 있다. 목업의 로그인 화면과 위쪽 줄에 "N주 차 · 달라진 것" 버튼이 나오고(`components/DemoChangelog.vue`), 누르면 그 주차까지의 변경 요약이 뜬다. 이 버튼은 목업에만 나온다.
- 주차 이름은 `main`에 붙이는 태그와 같다(예: `2026-w47`). 가장 최근 주차는 `interview-mockup.html`로도 나온다.
- 한 주차만 다시 만들려면 `npm run build:demo -- 2026-w48`. 빌드 스크립트는 `scripts/build-mockups.mjs`다.
- 주차 이름이 붙은 파일은 git에 올린다(빌드 없이 받아서 바로 열 수 있게). `interview-mockup.html`은 사본이라 올리지 않는다(`.gitignore`). 한 파일이 약 4MB다.

바꿀 때:

- **주차에 넣을 기능을 옮긴다**: `features.js`의 번호와 `changelog.js`의 항목을 같이 고치고 다시 빌드한다.
- **새 기능을 만들었다**: 어느 주차에 보여 줄지 정해 `features.js`에 이름을 더하고 화면에서 `has()`로 감싼다. `changelog.js`의 그 주차에 한 줄 적는다. 적지 않으면 처음(3주 차) 목업부터 보인다.
- **주차를 더한다**(7주 차 이후): `changelog.js` 맨 위에 항목을 더한다.
- 이미 회의에서 보여 준 주차의 파일과 변경 요약은 바꾸지 않는다. 현업 의견으로 고친 것은 다음 주차의 "개선"·"수정"으로 적는다.

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
