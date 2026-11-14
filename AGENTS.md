# AGENTS.md — interview-frontend

면접 어시스턴트의 화면(면접관·관리자용). 세 레포 중 하나다: **frontend(여기)**, backend(Spring, 기록의 주인), agent(Python, AI·음성).

## 스택 (바꾸지 않는다)

- JavaScript(타입스크립트 아님), Vue 3 `<script setup>`, Vite 4, Node 24, npm 11
- vue-router 4, pinia, Tailwind CSS 3(PostCSS), lucide-vue-next(아이콘), Pretendard(글꼴, 패키지로 번들)
- 테스트 vitest 0.34 + jsdom, 린트 eslint 8 + eslint-plugin-vue
- 사내망에는 외부 CDN이 없다. 글꼴·아이콘·라이브러리는 모두 npm 패키지로만 쓴다. `<link>`/`<script>`로 외부 주소를 넣지 않는다.
- 새 의존성은 꼭 필요할 때만, 정확한 버전으로(`.npmrc`의 `save-exact`). 사내 미러에 있는지 먼저 확인한다.

## 명령어

| 하는 일 | 명령 |
| --- | --- |
| 화면만 띄우기(백엔드 없이, 모의 데이터) | `npm run dev` |
| 로컬 백엔드·Agent에 연결 | `npm run dev:api` (`.env.development`) |
| 린트 · 테스트 · 빌드 한 번에 | `npm run check` |

작업을 끝내기 전에 `npm run check`를 통과시킨다.

## 폴더

```
src/
  api/http.js        fetch 한 곳(토큰, 401 처리, mock 전환). 화면에서 직접 쓰지 않는다
  api/index.js       엔드포인트 함수(경로 문자열은 여기에만)
  mocks/             모의 백엔드(server.js), 모의 Agent 소켓(socket.js), 가상 데이터(data.js)
  stores/            pinia: auth(로그인), ui(테마·신입/경력 탭과 채용 선택·토스트)
  lib/               labels.js(열거형→한국어·색), format.js(시각), poll.js(작업 대기)
  components/        여러 화면이 같이 쓰는 것(AppShell, InterviewHeader, PhaseSteps, StageTrack, Modal …)
  features/<기능>/   화면. 한 기능의 파일은 그 폴더 안에만 둔다
    auth today candidates interview(면접 전) room(면접 중) review(면접 후) pipeline bank admin(관리자 전용)
  router/index.js    라우트 표
  styles/main.css    색 토큰(CSS 변수)과 공용 클래스(.btn .card .badge .input …)
public/audio/pcm16-worklet.js   마이크 → 16kHz PCM16 (AudioWorklet)
docs/                문서. docs/contract/api-contract.md가 API 계약 복사본
```

## 규칙

1. **계약이 먼저다.** 필드·경로·열거형은 `docs/contract/api-contract.md`를 따른다. 화면에서 필요한 값이 계약에 없으면 임의로 만들지 말고 계약 변경 절차(skill `change-api-contract`)를 따른다.
2. **API를 더하면 세 곳을 같이 고친다**: `api/index.js` → `mocks/server.js`(같은 경로·같은 모양) → 화면. mock이 빠지면 `npm run dev`에서 `MOCK_ROUTE_MISSING`이 난다.
3. **열거형을 화면에 그대로 쓰지 않는다.** `lib/labels.js`의 표로 한국어와 색을 얻는다(`StatusBadge`).
4. **색은 토큰으로만.** `bg-surface text-ink border-line text-brand …`처럼 `tailwind.config.js`에 이어진 이름을 쓴다. `#hex`·`bg-blue-500` 같은 직접 색을 쓰지 않는다(다크 모드가 깨진다).
5. **노트북 화면이 기준이다(1366×768).** 면접 방(`features/room`)은 페이지 스크롤이 없어야 하고, 칸 안에서만 스크롤한다. 화면을 고치면 그 크기로 확인한다. 자세한 것은 `docs/ui-guide.md`.
6. Tailwind 기본 유틸리티와 같은 이름의 공용 클래스를 만들지 않는다(예: `table-row`는 `display: table-row`와 겹친다).
7. 사용자에게 보이는 글은 한국어, 짧고 구체적으로. 오류는 "무엇이 안 됐고 무엇을 하면 되는지".
8. 기능 사이의 import는 `components/`, `lib/`, `api/`, `stores/`를 거친다. `features/a`가 `features/b`의 내부 파일을 가져오지 않는다(예외: `review`가 `room/TranscriptPane.vue`를 읽기 전용으로 재사용).
9. 실시간 방의 상태 변화는 `features/room/room-state.js`의 순수 함수에 넣고 테스트(`room-state.test.js`)를 더한다.
10. 목록 화면은 위쪽 탭의 채용(`ui.recruitmentId`)을 따른다: 그 값으로 읽고, `watch(() => ui.recruitmentId, …)`로 다시 읽는다. 목록은 수백 명을 가정한다: 백엔드 한 페이지 상한은 200이므로 서버 페이지를 쓰거나 `fetchAll`(`api/index.js`)로 끝까지 읽고, 화면에는 페이지를 둔다.
11. 관리자 전용 화면은 라우트에 `meta: { admin: true }`, 메뉴에 `admin: true`를 준다(실제 권한 검사는 백엔드).
12. 토큰·사용자 정보는 `sessionStorage`에만 둔다. 지원자 개인정보를 `localStorage`·URL 쿼리에 넣지 않는다.

## 화면을 더하는 순서

1. `features/<기능>/<Name>Page.vue` 작성
2. `router/index.js`에 한 줄, 메뉴에 보여야 하면 `components/AppShell.vue`의 `nav`에 한 줄
3. 필요한 API가 있으면 규칙 2대로
4. `npm run dev`로 1366×768에서 확인, `npm run check`

## 협업 (trunk-based, 3명)

- `main`에서 짧은 브랜치(하루 이틀)를 따고 작은 PR로 바로 합친다. 오래 사는 브랜치를 두지 않는다.
- 덜 끝난 화면은 라우트·메뉴에 연결하지 않거나 `import.meta.env.VITE_FEATURE_<이름> === 'true'`로 가린 채 합친다.
- 여러 사람이 동시에 건드리기 쉬운 파일: `router/index.js`, `api/index.js`, `mocks/server.js`, `lib/labels.js`, `components/AppShell.vue`. 여기는 **한 줄 추가** 위주로 고치고, 정렬·포맷 바꾸기 같은 무관한 변경을 섞지 않는다.
- 계약을 바꾸는 PR은 세 레포에 같은 날 올린다.

## 다른 레포와의 관계

- 백엔드 REST: `VITE_API_BASE_URL`(기본 `http://localhost:8080/api/v1`), JWT Bearer.
- Agent WebSocket: 주소와 입장권은 백엔드 `POST /rooms/{id}/ticket`이 준다. 프론트는 Agent 주소를 설정으로 갖지 않는다.
- 로그인: 지금은 개발용(사번 선택). 사내에서는 AD SSO → `docs/auth.md`.

## 문서와 skill

- `docs/architecture.md` 구조와 데이터 흐름 · `docs/realtime-room.md` 면접 방 · `docs/ui-guide.md` 디자인 규칙 · `docs/setup.md` 실행 · `docs/open-questions.md` 가정과 미확정
- `.opencode/skills/`: `add-screen`, `add-api-call`, `change-api-contract`, `work-on-live-room`, `port-legacy-feature`
- 세 레포를 아우르는 문서는 반입 시 함께 들어오는 `docs/`(상위 폴더)에 있다.
