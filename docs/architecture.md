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

### 11/18 회의 반영 스위치가 켜졌을 때 달라지는 것

`lib/features.js`의 `feedback1118`, `persona`, `systemStatus`, `modelSwitch`, `calendar`는 2026-11-18 현업 회의 의견을 반영한 화면의 스위치다. `modelSwitch`를 뺀 넷은 API 명세에 들어가 있어 실제 백엔드에 붙는 빌드(`npm run dev:api`, 배포)에서도 켜진다. 꺼지는 것은 3주 차 목업뿐이고, 그때는 위 표대로 동작한다. `modelSwitch`는 API 명세에 아직 없는 화면 시안이라 가짜 데이터로 도는 빌드(`npm run dev`, 4주 차 이후 목업)에서만 켜진다(`features.js`의 `MOCKUP_ONLY`). 켜지는 조건은 [setup.md](setup.md)의 "가짜 데이터로 돌 때만 켜지는 화면".

| 단계 | `feedback1118`이 켜졌을 때 |
| --- | --- |
| 면접 전 | 질문을 하나씩 빼는 버튼과 직접 추가하는 입력 칸을 숨기고 "질문 전체 다시 만들기"만 둔다(브리핑 생성과 같은 호출이다. 모의 서버는 이때 질문도 새로 만든다). 예상 꼬리질문(부모가 있는 질문)은 부모 질문 아래에 보인다. 실시간 기능이 잠긴 면접(`liveEnabled: false`)은 입장 버튼이 "질문 화면 열기"다 |
| 면접 중 | 가운데가 질문과 꼬리질문 나무, 왼쪽이 지원자 요약 탭과 메모, 대화는 접힘. 실시간 기능이 잠긴 면접(신입 대면)은 마이크·Agent 연결 없이 질문 화면으로만 쓴다([realtime-room.md](realtime-room.md)) |
| 면접 후 | 맨 위에 질문 피드백(`QuestionFeedback.vue`: 준비된 질문이 도움이 됐는지. `interviewApi.questionFeedback`으로 읽고 `saveQuestionFeedback`으로 저장한다. 사람마다 면접 한 건에 의견 하나, API 명세 2.6). AI 참고 평가 탭은 관리자에게만 보이고, 관리자가 아니면 `ai-evaluation`을 읽지 않는다(API 명세 2.8: 기본 설정에서 백엔드도 면접관에게 403을 준다). 내 평가 칸(`MyEvaluationPanel.vue`)에는 관리자에게도 AI 점수를 넘기지 않는다. 보고서가 있으면 `MyEvaluationPanel.vue`에 "의견 초안 넣기"가 나온다(보고서의 종합 의견·강점·보완할 점을 메모 아래에 붙인다. 점수는 넣지 않는다). 실시간 기능이 잠긴 면접은 보고서·AI 참고 평가·대화 기록이 없다 |

실시간 기능이 잠겼는지는 `liveLocked(interview)`(`lib/features.js`)가 면접 응답의 `liveEnabled`로 판단한다(API 명세 2.5). 스위치나 트랙을 보지 않는다.

`persona`가 켜졌을 때: 면접 전 화면 위에 `interview/PersonaPicker.vue`가 나온다(면접 응답에 `persona`가 있을 때). 면접관이 페르소나(진행 방식)를 고르면 `PUT /interviews/{id}/persona`를 부른다(API 명세 2.5). 가짜 데이터에서는 준비된 질문의 표현이 바뀐다(`mocks/data.js`의 `PERSONA_TEXT`). 추천으로 켠 페르소나는 카드로, 나머지는 작은 버튼으로 보이고, 면접이 시작된 뒤에는 바꿀 수 없다. 어떤 페르소나를 추천하고 쓸지는 관리 > 면접 페르소나(`admin/PersonaPage.vue`)에서 정한다. 이 화면에서 새 페르소나를 더하고, 고치고, 직접 만든 것은 지운다(API 명세 2.12, `api/index.js`의 `personaApi`).

`systemStatus`가 켜졌을 때: 위쪽 줄(`AppShell.vue`)에 상태 버튼(`components/SystemStatusChip.vue`)이 나온다. 가장 나쁜 서비스 상태 하나로 요약해 보여 주고, 누르면 서비스 연결 상태와 "지금 요청하면 기다리는 시간"이 뜬다(`SystemStatusPanel.vue`). 30초마다 다시 읽는다. 관리 > 시스템 상태(`admin/SystemStatusPage.vue`)는 같은 내용에 일별 면접 세션과 분석 작업 대기열을 더해 보여 주고 10초마다 다시 읽는다. 읽는 것은 `GET /system/status` 하나다(API 명세 2.13, `systemApi`).

`modelSwitch`가 켜졌을 때(가짜 데이터로 돌 때만): 관리 > AI 모델(`features/admin/ModelPage.vue`)이 나온다. AI 작업마다 지금 쓰는 모델을 보여 주고, 같은 종류(LLM, 음성 인식)의 다른 모델로 바꾼다. 바꾸기 전에 확인 창을 띄우고, 바꾼 기록을 다섯 건까지 보여 준다. API 명세에 아직 없고(명세 2.14) 모의 서버만 답한다(`modelApi`).

`calendar`가 켜졌을 때: 관리 > 일정 달력(`features/admin/CalendarPage.vue`)이 나온다. 위쪽 탭에서 고른 채용의 면접을 끝까지 읽어(`fetchAll`) 날짜별로 묶는다. 면접 목록 API(`GET /interviews`)의 값만 쓴다. 면접실(장소)은 데이터에 항목이 없어 보여 주지 않는다.

그 밖에 `feedback1118`이 켜지면: 위쪽 탭은 경력 채용이 먼저다(`stores/ui.js`). 면접 종류를 고르는 곳(면접자 목록·상세, 질문 은행)은 신입도 경력도 직무·인성 둘만 보여 준다. 면접자 유형(`applicantType`, API 명세 2.3) 배지가 면접자 목록·상세와 `InterviewHeader`에 보이고, 면접자 목록(`candidates/CandidatesPage.vue`)에서 유형으로 거른다. 면접자 목록에는 관리자에게 "면접자 엑셀 업로드" 버튼이 나온다. 업로드 창은 `components/UploadDialog.vue`이고 관리 > 등록과 같이 쓴다. 파일을 여러 개 고를 수 있고, 백엔드가 요청 한 번에 파일 하나를 받으므로 고른 순서대로 하나씩 올린다(한 파일이 실패해도 나머지는 계속 올린다).

관리 > 등록 · 매칭(`admin/SetupPage.vue`)은 어느 데이터로 도는지에 따라 다르다(`features.js`의 `mockData`).

- 실제 백엔드에 붙는 빌드: 탭 이름은 "등록 · 매칭"이고, 임시 자동 매칭("자동 매칭 실행", API 명세 2.4)이 나온다.
- 가짜 데이터로 도는 빌드(`feedback1118`이 켜졌을 때): 탭 이름은 "등록"이고(`AdminTabs.vue`), 자동 매칭 대신 신입은 "매칭 파일 올리기", 경력은 "채용 시스템에서 불러오기"를 보여 준다(경력에서는 "면접자 엑셀 업로드" 버튼도 없다). API 명세에 아직 없는 화면 시안이다(명세 2.14). 둘 다 지금은 자동 매칭과 같은 호출(`candidateApi.autoAssign`)을 부른다.

API 명세에 아직 없는 것과, 명세에는 있지만 Agent가 아직 주지 않는 것은 [open-questions.md](open-questions.md)에 목록으로 있다.

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
| 꼬리질문이 어느 질문 아래에 붙는지 | `features/room/room-state.js`의 `questionTree`(+테스트) |
| 가짜 데이터로 돌 때만 켜는 화면 시안 | `lib/features.js`의 `MOCKUP_ONLY`, `mockData` |
| 실시간 기능 잠금 | 화면의 판단은 `lib/features.js`의 `liveLocked`(면접의 `liveEnabled`). 가짜 데이터에서 어느 면접을 잠글지는 `mocks/server.js`의 `liveLocked` |
| 관리 메뉴의 하위 탭 추가 | `features/admin/AdminTabs.vue`, `router/index.js`, `components/AppShell.vue`의 `match` |
| 목업의 대본·페르소나·시스템 상태 값 | `mocks/data.js`(`liveScript`, `liveScriptExperienced`, `personas`, `PERSONA_TEXT`, `systemStatus`) |
| 로그인 방식(AD SSO) | `features/auth/LoginPage.vue`, `stores/auth.js` ([auth.md](auth.md)) |
| 평가 등급 체계(A~D) | `features/review/MyEvaluationPanel.vue`의 `BASE_GRADES` |

## 모의 모드가 있는 이유

세 사람이 세 레포를 동시에 고친다. 프론트는 백엔드·Agent가 덜 됐어도 화면을 만들 수 있어야 하고, API 명세만 맞으면 나중에 그대로 붙는다. 그래서 mock은 "API 명세와 같은 모양"을 지키는 것이 유일한 규칙이다. mock 전용 필드를 만들지 않는다.

지금은 이 규칙에서 벗어난 것이 둘 있다. API 명세 2.14에 "아직 명세에 없는 화면 시안"으로 적혀 있는 것이다.

- 관리 > AI 모델: `api/index.js`의 `modelApi`와 그 모의 라우트(`/admin/models`), `mocks/data.js`의 `aiModels`·`aiModelTasks`.
- 관리 > 등록의 "매칭 파일 올리기"·"채용 시스템에서 불러오기": 새 경로는 없고 `candidateApi.autoAssign`을 대신 부른다.

코드에는 "화면 시안" 또는 "API 명세에 아직 없다"는 주석이 붙어 있고, 실제 백엔드에 붙는 빌드에서는 나오지 않아 부르지 않는다(`MOCKUP_ONLY`, `mockData`). 그 밖에 11/18 회의를 반영하며 더한 것(`personaApi`·`systemApi`, 질문 피드백, 면접자 유형 `applicantType`, 면접의 `persona`·`liveEnabled`, 사전 리포트의 `checkItems`·`previousRoundChecks`)은 API 명세에 있다(2.3, 2.5, 2.6, 2.12, 2.13). 목록과 실제로 만들 때 필요한 것은 [open-questions.md](open-questions.md)의 "API 명세에 아직 없는 화면 시안".
