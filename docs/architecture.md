# 구조

> 다루는 것: 프론트 레포의 층, 데이터가 흐르는 길, 바꿀 때 손대는 곳.

## 층

```
화면 (features/<기능>/*.vue)
   │  함수 호출
   ▼
api/index.js ── api/http.js ──┬─ fetch → 백엔드 /api/v1          (VITE_API_MODE=api)
                              └─ mocks/server.js (메모리 상태)    (VITE_API_MODE=mock)

면접 방만 추가로:
features/room/use-room.js ── room-socket.js ──┬─ WebSocket → Agent /ws/v1/rooms/{id}
                                              └─ mocks/socket.js (대본 재생)
features/room/use-microphone.js ── public/audio/pcm16-worklet.js (16kHz PCM16)
```

- 화면은 `api/index.js`의 함수만 부른다. 주소·토큰·오류 모양은 `http.js` 한 곳에서 처리한다.
- 서버 상태를 전역 스토어에 쌓지 않는다. 화면이 열릴 때 읽고, 기다릴 일이 있으면 `lib/poll.js`로 다시 읽는다. 전역(pinia)은 로그인 사용자와 화면 설정뿐이다.
- 오류는 `ApiError(status, code, message)`로 통일되고, 화면은 `ui.fail(e)`로 토스트를 띄운다. 401은 `http.js`가 refresh를 한 번 시도한 뒤 로그인 화면으로 보낸다.

## 한 면접의 세 화면

| 단계 | 화면 | 읽는 것 | 쓰는 것 |
| --- | --- | --- | --- |
| 면접 전 | `interview/PrepPage.vue` | interview, briefing, questions | 브리핑 생성, 질문 추가·숨김 |
| 면접 중 | `room/RoomPage.vue` | room, questions, utterances, follow-ups + 소켓 이벤트 | 방 시작·종료, 메모(자동 저장), 질문 "물음" 표시, 꼬리질문 채택(누르거나, 말로 물어 `followup.matched`가 오면 자동) |
| 면접 후 | `review/ReviewPage.vue` | report, ai-evaluation, criteria, utterances, questions | 내 평가(자동 저장·제출), 보고서 재생성, 물은 질문을 질문 은행에 담기(`AskedQuestionsPanel.vue`) |

세 화면 위에는 같은 `InterviewHeader` + `PhaseSteps`가 있어 지금 어느 단계인지 늘 보인다.

## AI 작업을 기다리는 방식

브리핑·AI 평가·보고서는 백엔드가 작업으로 돌린다. 프론트는 결과 리소스의 `status`(`RUNNING` → `SUCCEEDED`/`FAILED`)를 `usePolling`으로 다시 읽는다.

- 브리핑: 2초 간격, `RUNNING`인 동안만
- 보고서: 초안을 기다릴 때 2.5초, 초안(`basis: LIVE`)이 보인 뒤 보정본(`REFINED`)을 기다릴 때 10초. `LIVE → REFINED`로 바뀌면 토스트로 알리고 대화 기록도 다시 읽는다.

## 바꿀 때 손대는 곳

| 하려는 일 | 파일 |
| --- | --- |
| 화면 추가 | `features/<기능>/`, `router/index.js`, (메뉴) `components/AppShell.vue` |
| API 추가·변경 | `docs/contract/api-contract.md`, `api/index.js`, `mocks/server.js` |
| 열거형 값 추가 | `lib/labels.js` |
| 색·글자 크기 | `styles/main.css`의 `:root` / `.dark` 변수 |
| 실시간 이벤트 추가 | `features/room/room-state.js`(+테스트), `mocks/socket.js` |
| 로그인 방식(AD SSO) | `features/auth/LoginPage.vue`, `stores/auth.js` ([auth.md](auth.md)) |
| 평가 등급 체계(A~D) | `features/review/MyEvaluationPanel.vue`의 `BASE_GRADES` |

## 모의 모드가 있는 이유

세 사람이 세 레포를 동시에 고친다. 프론트는 백엔드·Agent가 덜 됐어도 화면을 만들 수 있어야 하고, API 명세만 맞으면 나중에 그대로 붙는다. 그래서 mock은 "API 명세와 같은 모양"을 지키는 것이 유일한 규칙이다. mock 전용 필드를 만들지 않는다.
