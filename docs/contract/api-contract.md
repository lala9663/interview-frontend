# API 계약 (세 레포 공통)

> 다루는 것: 프론트 ↔ 백엔드 REST, 프론트 ↔ Agent WebSocket, 백엔드 ↔ Agent 내부 API.
>
> 이 파일이 원본이다. 각 레포의 `docs/contract/api-contract.md`는 이 파일의 복사본이며, 계약을 바꿀 때는 세 레포에 같은 내용을 같은 날 반영한다(절차는 [06-collaboration.md](06-collaboration.md)).

## 0. 한눈에

```
브라우저(Vue) ──REST /api/v1 (JWT)──────────────▶ 백엔드(Spring)  ── JPA ──▶ Oracle
     │                                              │  ▲
     │                                  내부 REST   │  │ 내부 REST (콜백)
     │                              X-Internal-Key  ▼  │
     └──WebSocket /ws/v1/rooms/{id} (입장권)────▶ Agent(FastAPI) ──▶ 사내 LLM / Whisper
                                                     │
                                                   Redis (방 상태, 이벤트 중계)
```

| 구간 | 프로토콜 | 인증 | 기본 주소(로컬) |
| --- | --- | --- | --- |
| 프론트 → 백엔드 | REST JSON | `Authorization: Bearer <accessToken>` | `http://localhost:8080/api/v1` |
| 프론트 → Agent | WebSocket | 백엔드가 발급한 방 입장권(ticket) | `ws://localhost:8000/ws/v1/rooms/{roomId}` |
| 백엔드 → Agent | REST JSON | `X-Internal-Key` | `http://localhost:8000/internal/v1` |
| Agent → 백엔드 | REST JSON | `X-Internal-Key` | `http://localhost:8080/internal/v1` |

역할 원칙:

- **백엔드가 기록의 주인이다.** DB에 쓰는 것은 백엔드뿐이다. Agent는 DB에 닿지 않는다.
- **Agent는 AI만 한다.** 요약·질문·채점·보고서 API는 입력을 받아 결과를 돌려주는 순수 함수처럼 동작한다(상태 없음). 실시간 방만 상태가 있고, 그 상태는 Redis에 둔다.
- 오래 걸리는 AI 작업은 백엔드가 작업(`AiJob`)으로 관리하고, 프론트는 작업 상태를 조회한다.

## 1. 공통 규칙

- JSON 필드는 camelCase. 시각은 ISO-8601 오프셋 포함(`2026-11-13T14:00:00+09:00`). id는 숫자(Long).
- 목록 응답은 `{ "items": [...], "page": 0, "size": 20, "total": 132 }`. 페이지가 없는 목록은 `{ "items": [...] }`.
- 오류 응답(모든 구간 공통):

```json
{ "code": "CANDIDATE_NOT_FOUND", "message": "면접자를 찾을 수 없습니다.", "details": {} }
```

| HTTP | 쓰는 경우 |
| --- | --- |
| 400 | 입력 형식 오류 (`VALIDATION_FAILED`) |
| 401 | 토큰 없음·만료 (`UNAUTHORIZED`, `TOKEN_EXPIRED`) |
| 403 | 권한 없음 (`FORBIDDEN`) |
| 404 | 대상 없음 (`*_NOT_FOUND`) |
| 409 | 상태 충돌 (`ROOM_ALREADY_LIVE`, `INTERVIEW_ALREADY_EXISTS` 등) |
| 502 | Agent·모델 호출 실패 (`AGENT_UNAVAILABLE`, `MODEL_FAILED`) |

### 열거형

| 이름 | 값 |
| --- | --- |
| `Track` | `NEW_GRAD`(신입), `EXPERIENCED`(경력) |
| `InterviewType` | `PT`, `PERSONALITY`(인성), `PORTFOLIO`, `JOB`(직무) |
| `InterviewMode` | `OFFLINE`(대면), `ONLINE`(화상) |
| `InterviewStatus` | `WAITING`(일정 전), `SCHEDULED`, `IN_PROGRESS`, `EVALUATING`, `DONE`, `CANCELED` |
| `RoomStatus` | `CREATED`, `LIVE`, `ENDED` |
| `Speaker` | `INTERVIEWER`, `CANDIDATE`, `UNKNOWN` |
| `SpeakerMethod` | `MANUAL`(면접관이 지정), `QUESTION_MATCH`(질문 유사도), `RULE`(말투·문형 규칙), `LLM`(문맥 판정), `CHANNEL`(마이크·트랙 분리), `NONE` |
| `QuestionSource` | `JD`, `RESUME`, `BANK`, `FOLLOW_UP`, `MANUAL` |
| `JobStatus` | `PENDING`, `RUNNING`, `SUCCEEDED`, `FAILED` |
| `JobType` | `BRIEFING`, `AI_EVALUATION`, `REPORT` |
| `ReportBasis` | `LIVE`(실시간 전사 기반 초안), `REFINED`(사후 STT 보정본 기반) |
| `ReportDetail` | `BRIEF`(신입), `DETAILED`(경력) |
| `UserRole` | `ADMIN`, `INTERVIEWER` |
| `MatchedBy` | `JD`(JD 기반 자동), `MANUAL`, `IMPORT`(엑셀로 들어옴) |

## 2. 프론트 → 백엔드 (`/api/v1`)

### 2.1 인증

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| POST | `/auth/dev-login` | **local 프로파일 전용.** `{ "employeeNo": "E1001" }` → 토큰 |
| GET | `/auth/sso/login` | **ad 프로파일.** AD SSO로 보냄 (자리만 있음) |
| POST | `/auth/refresh` | `{ "refreshToken" }` → 새 토큰 |
| POST | `/auth/logout` | refresh 토큰 폐기 |
| GET | `/me` | 로그인한 사용자 |

```json
// 토큰 응답
{ "accessToken": "...", "refreshToken": "...", "expiresIn": 1800,
  "user": { "id": 1, "employeeNo": "E1001", "name": "김서연", "department": "People팀", "role": "ADMIN", "jobCodes": ["SW"] } }
```

### 2.2 채용(공고)과 직무

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/recruitments?track=` | 목록 |
| POST | `/recruitments` | `{ "title", "track", "startDate", "endDate" }` (ADMIN) |
| GET | `/recruitments/{id}` | 상세 + 집계(`candidateCount`, `interviewCount`, `doneCount`) |
| GET | `/recruitments/{id}/jobs` | 직무(JD) 목록 |
| POST | `/recruitments/{id}/jobs` | `{ "jobCode", "title", "jdText" }` (ADMIN) |
| PUT | `/jobs/{id}` | JD 수정 (ADMIN) |

### 2.3 면접자 업로드와 목록

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| POST | `/recruitments/{id}/uploads` | multipart `file`(xlsx). 행 단위로 처리하고 실패 행은 오류로 남긴다 (ADMIN) |
| GET | `/recruitments/{id}/uploads` | 업로드 이력 |
| GET | `/uploads/{id}` | 업로드 한 건과 오류 목록 |
| GET | `/uploads/template` | 샘플 엑셀 내려받기 |
| GET | `/recruitments/{id}/candidates?jobCode=&q=&status=&page=&size=` | 면접자 목록 |
| GET | `/candidates/{id}` | 면접자 상세 |
| GET | `/candidates/{id}/progress` | 전형 진행(면접 차수별 상태). 경력 화면의 진행 표시에 쓴다 |

```json
// UploadBatch
{ "id": 12, "fileName": "2026하반기_면접대상자.xlsx", "uploadedAt": "...", "uploadedBy": "김서연",
  "totalRows": 50, "successRows": 47, "failedRows": 3,
  "errors": [ { "rowNumber": 14, "column": "지원직무코드", "value": "XX", "message": "등록되지 않은 직무 코드입니다." } ] }
```

```json
// Candidate (목록 항목)
{ "id": 101, "applicantNo": "2026H-00014", "name": "이도윤", "track": "NEW_GRAD",
  "jobCode": "SW", "jobTitle": "SW개발", "interviewers": [ { "id": 1, "name": "김서연" } ],
  "briefingStatus": "SUCCEEDED", "currentStage": { "type": "PT", "status": "SCHEDULED" } }
```

```json
// Candidate (상세). profile은 블라인드 항목이 이미 빠진 값이다.
{ "id": 101, "applicantNo": "...", "name": "이도윤", "track": "NEW_GRAD", "jobCode": "SW", "jobTitle": "SW개발",
  "profile": { "education": [ { "school": "...", "major": "...", "degree": "학사", "gpa": "3.9/4.5" } ],
               "courses": ["자료구조", "운영체제"], "essays": [ { "title": "지원동기", "text": "..." } ],
               "projects": [ { "title": "...", "text": "..." } ], "careers": [ { "company": "...", "role": "...", "period": "...", "text": "..." } ],
               "certificates": ["정보처리기사"], "extra": {} },
  "blindedFields": ["gender", "birthDate", "family"],
  "interviews": [ /* Interview 요약 */ ] }
```

### 2.4 면접관 매칭

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| POST | `/recruitments/{id}/assignments/auto` | JD 기반 임시 매칭 실행(면접관 `jobCodes` ↔ 면접자 `jobCode`, 부하 균등). 결과 요약 반환 (ADMIN) |
| PUT | `/interviews/{id}/interviewers` | `{ "interviewerIds": [1,2] }` 수동 지정 (ADMIN) |
| GET | `/interviewers?jobCode=` | 면접관 목록 |

### 2.5 면접

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/interviews?mine=&date=&status=&recruitmentId=&page=&size=` | 면접 목록. `mine=true`면 내가 면접관인 것 |
| POST | `/candidates/{id}/interviews` | `{ "type", "mode", "scheduledAt", "durationMinutes" }` 면접 등록(1인당 여러 건) (ADMIN) |
| GET | `/interviews/{id}` | 상세 |
| PATCH | `/interviews/{id}` | 일정·상태 수정 |

```json
// Interview
{ "id": 501, "candidate": { "id": 101, "name": "이도윤", "applicantNo": "...", "jobTitle": "SW개발" },
  "track": "NEW_GRAD", "type": "PT", "seq": 1, "mode": "OFFLINE", "status": "SCHEDULED",
  "scheduledAt": "...", "durationMinutes": 30,
  "interviewers": [ { "id": 1, "name": "김서연", "matchedBy": "JD" } ],
  "roomId": 9001, "roomStatus": "CREATED",
  "briefingStatus": "SUCCEEDED", "reportStatus": null, "reportBasis": null }
```

### 2.6 사전 리포트(브리핑)와 질문

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/interviews/{id}/briefing` | 사전 리포트. 없으면 `status: null` |
| POST | `/interviews/{id}/briefing/generate` | 생성·재생성. `202 { "jobId" }` |
| GET | `/interviews/{id}/questions` | 준비된 질문 + 면접 중 추가된 질문 |
| POST | `/interviews/{id}/questions` | `{ "text", "category" }` 수동 추가(`source: MANUAL`) |
| PATCH | `/questions/{id}` | `{ "text"?, "orderNo"?, "asked"?, "hidden"? }` |

```json
// Briefing
{ "status": "SUCCEEDED", "generatedAt": "...", "model": "fake-llm",
  "summary": { "headline": "임베디드 프로젝트 경험이 뚜렷한 SW 지원자",
               "keyPoints": ["..."], "strengths": ["..."], "checkPoints": ["..."],
               "timeline": [ { "period": "2024.03~2024.12", "text": "캡스톤 ..." } ] },
  "excluded": ["gender", "family"] }
```

```json
// Question
{ "id": 7001, "interviewId": 501, "source": "RESUME", "category": "프로젝트", "text": "캡스톤에서 맡은 역할은?",
  "intent": "기여도 확인", "orderNo": 3, "asked": false, "askedAtSeq": null, "hidden": false, "parentQuestionId": null }
```

### 2.7 면접 방

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| POST | `/interviews/{id}/room` | 방 만들기(이미 있으면 그 방) |
| GET | `/rooms/{id}` | 방 상태 |
| POST | `/rooms/{id}/start` | `CREATED → LIVE`, 면접 `IN_PROGRESS` |
| POST | `/rooms/{id}/end` | `LIVE → ENDED`, 면접 `EVALUATING`. Agent에 마무리 요청, AI 평가와 보고서(LIVE 기반) 작업 시작 |
| POST | `/rooms/{id}/ticket` | `{ "audio": true }` → 입장권. `audio: true`는 마이크를 보내는 단말(방마다 하나) |
| GET | `/rooms/{id}/utterances?afterSeq=` | 저장된 전사(새로 고침·재접속 복구용) |
| GET | `/rooms/{id}/follow-ups` | 저장된 꼬리질문 후보 |
| POST | `/follow-ups/{id}/use` | 꼬리질문 후보를 질문으로 채택(`source: FOLLOW_UP` 질문 생성) |

```json
// Ticket
{ "ticket": "<JWT, 5분>", "agentWsUrl": "ws://localhost:8000/ws/v1/rooms/9001", "expiresIn": 300 }
```

입장권 JWT(HS256, 비밀키 `ROOM_TICKET_SECRET`은 백엔드와 Agent가 공유) 클레임: `sub`(사용자 id), `name`, `roomId`, `audio`(boolean), `exp`.

```json
// Utterance
{ "seq": 12, "speaker": "CANDIDATE", "speakerMethod": "LLM", "rawText": "어 그 캡스톤에서는 제가",
  "refinedText": "캡스톤에서는 제가 펌웨어를 맡았습니다.", "startMs": 184200, "endMs": 191800,
  "matchedQuestionId": null, "source": "LIVE" }
```

### 2.8 평가와 보고서

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/interviews/{id}/criteria` | 평가 항목(트랙·면접 유형별) |
| GET | `/interviews/{id}/my-evaluation` | 내 평가(메모 포함) |
| PUT | `/interviews/{id}/my-evaluation` | `{ "memo", "scores": [ { "criterionCode", "score", "comment" } ], "grade", "submitted" }`. 면접 중에도 자동 저장에 쓴다 |
| GET | `/interviews/{id}/ai-evaluation` | AI 참고 평가 |
| GET | `/interviews/{id}/report` | 최신 보고서 |
| GET | `/interviews/{id}/report/versions` | 버전 목록(LIVE 초안 → REFINED 보정본) |
| POST | `/interviews/{id}/report/regenerate` | `202 { "jobId" }` |
| GET | `/ai-jobs/{jobId}` | AI 작업 상태 |
| GET | `/interviews/{id}/jobs` | 이 면접의 작업들 |

```json
// AiEvaluation
{ "status": "SUCCEEDED", "model": "fake-llm", "generatedAt": "...",
  "scores": [ { "criterionCode": "PROBLEM_SOLVING", "criterionName": "문제 해결", "score": 4, "maxScore": 5,
                "rationale": "...", "evidenceSeqs": [12, 18] } ],
  "overallComment": "..." }
```

```json
// Report
{ "version": 2, "basis": "REFINED", "detail": "BRIEF", "status": "SUCCEEDED", "generatedAt": "...", "model": "fake-llm",
  "content": { /* 4.3의 ReportContent */ } }
```

```json
// Job
{ "id": 3301, "type": "REPORT", "status": "RUNNING", "interviewId": 501,
  "createdAt": "...", "startedAt": "...", "finishedAt": null, "errorCode": null, "errorMessage": null }
```

### 2.9 그 밖

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/dashboard/summary?recruitmentId=` | 오늘 면접, 진행 중인 방, 평가 대기, 보고서 대기 수와 목록 |
| GET | `/question-bank?jobCode=&category=&q=` | 질문 은행 |
| POST | `/question-bank` | `{ "jobCode", "interviewType", "category", "text", "sampleAnswer"? }` (ADMIN) |
| DELETE | `/question-bank/{id}` | (ADMIN) |
| GET | `/health` | `{ "status": "UP", "agent": "UP" }` (인증 없음) |

### 2.10 응답 모양 보충

위 표에서 모양을 적지 않은 응답이다.

| 항목 | 모양 |
| --- | --- |
| `GET /dashboard/summary` | `{ date, todayCount, liveRoomCount, pendingEvaluationCount, pendingReportCount, todayInterviews[], liveRooms[], pendingEvaluations[], pendingReports[] }`. 목록 항목은 Interview, 각각 최대 100건. ADMIN은 전체, 면접관은 자기 면접 |
| `POST /recruitments/{id}/assignments/auto` | `{ candidateCount, createdInterviewCount, assignedInterviewCount, unassignedInterviewCount, briefingJobCount, unassigned[{ interviewId, candidateId, candidateName, jobCode, type }] }` |
| `GET /candidates/{id}/progress` | `{ candidateId, currentStage{ type, status }, items[{ interviewId, seq, type, mode, status, scheduledAt, reportStatus, current }] }` |
| Candidate 상세의 `interviews[]` | Interview 전체(2.5의 모양) |
| `GET /rooms/{id}`, 방 생성·시작·종료 응답 | `{ id, interviewId, status, createdAt, startedAt, endedAt, lastSeq, refined }` |
| `GET /rooms/{id}/follow-ups` 항목 | `{ id, clientId, basedOnSeq, text, rationale, used, questionId, createdAt }`. `clientId`는 WebSocket `followup.suggested`의 `items[].id`와 같다. `POST /follow-ups/{id}/use`의 `{id}`는 숫자 `id` |
| `GET /interviews/{id}/criteria` 항목 | `{ code, name, description, maxScore }` |
| `GET /interviews/{id}/my-evaluation` | `{ interviewId, memo, scores[{ criterionCode, score, comment }], grade, submitted, updatedAt, submittedAt }`. 없으면 빈 값 |
| `PUT /interviews/{id}/my-evaluation` | null인 필드는 바꾸지 않는다(일부만 보내도 된다). `grade`는 자유 문자열(20자) |
| `PATCH /interviews/{id}` 본문 | `{ scheduledAt?, durationMinutes?, mode?, status? }`. `WAITING`인 면접에 일정을 넣으면 `SCHEDULED` |
| `GET /interviews/{id}/report` (없음) | 모든 필드 null, `status`만 가장 최근 보고서 작업의 상태(없으면 null) |
| `GET /interviews/{id}/ai-evaluation` (없음) | `status`는 가장 최근 작업의 상태(없으면 null), `scores`는 빈 배열 |
| `GET /interviews/{id}/report/versions` | 최신 버전이 먼저. 항목은 Report 전체 |
| UploadBatch `errors[]` | 항목에 `code`(오류 코드)가 더 있다. 이력 목록에서는 `errors`가 빈 배열이고 한 건 조회에서 채워진다 |
| `GET /uploads/template` | 가상 50행 샘플. `?empty=true`면 열 이름만 |
| 면접자 목록의 `status`, `interviewers`, `briefingStatus`, `currentStage` | "지금 차수" 면접의 것. 지금 차수 = 끝나지 않은(DONE·CANCELED 아닌) 첫 면접, 모두 끝났으면 마지막 면접 |
| Interview의 `reportStatus` | 가장 최근 보고서 작업의 상태 |
| 생성 응답의 HTTP 코드 | 202로 적힌 것 외에는 200. 삭제는 204 |
| Agent 콜백(5장)의 응답 | utterances·follow-ups `{ saved }`, refined-transcript `{ saved, jobId }`, events `{ ok }` |
| 추가 오류 코드 | `ROOM_NOT_LIVE`, `ROOM_ALREADY_ENDED`, `INTERVIEW_CANCELED`, `JOB_ALREADY_EXISTS`, `FILE_UNREADABLE`, `SSO_NOT_IMPLEMENTED`(501) |

권한: 조회는 로그인한 사용자 모두. 면접 단위의 쓰기(방, 평가, 질문, 브리핑 생성, 보고서 재생성, 면접 수정)는 배정된 면접관 또는 ADMIN. 면접은 배정된 면접관이 모두 평가를 제출하면 `DONE`이 된다.

### 2.11 관리자 집계 (ADMIN)

읽기 전용 집계다. 세 엔드포인트 모두 `recruitmentId`가 필수이고 ADMIN만 부를 수 있다. 비율은 0~1, 분모가 0이면 `null`. 평균·표준편차는 소수 둘째 자리까지.

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/admin/operations?recruitmentId=&date=` | 당일 운영 현황판. `date`(YYYY-MM-DD)를 생략하면 오늘 |
| GET | `/admin/quality?recruitmentId=` | AI 품질 점검: AI 점수와 면접관 점수의 차이, 꼬리질문 채택률, 화자 판정, 질문 매칭, 보고서 소요 시간 |
| GET | `/admin/interviewer-stats?recruitmentId=` | 면접관 편차: 면접관별 점수 분포와 평균의 차이 |

```json
// GET /admin/operations
{ "date": "2026-11-13", "generatedAt": "...",
  "agent": { "status": "UP", "rooms": 3,
             "providers": [ { "role": "stt.live", "health": "OK", "waiting": 0 } ] },
  "summary": { "total": 40, "waiting": 0, "scheduled": 20, "live": 5, "evaluating": 3, "done": 12, "attention": 2 },
  "items": [ {
      "interview": { /* 2.5의 Interview */ },
      "startedAt": "...", "endedAt": null,
      "elapsedMinutes": 12,        // 방을 시작한 뒤 지난 시간(LIVE). 끝났으면 진행한 시간
      "lateMinutes": 0,            // 예정 시각보다 늦은 시간. 아직 시작 전이면 지금까지 늦은 시간
      "overtimeMinutes": 0,        // 예정 길이를 넘긴 시간
      "utteranceCount": 31, "lastUtteranceAt": "...",
      "silentMinutes": 0,          // LIVE일 때 마지막 전사(없으면 시작) 뒤 지난 시간
      "audioConnected": true,      // Agent가 아는 마이크 연결 상태. Agent가 그 방을 모르면 null
      "queueDepth": 0, "droppedChunks": 0,
      "alerts": ["OVERTIME"] } ] }
```

`alerts` 값(기준은 백엔드 설정 `app.operations.*`):

| 값 | 뜻 | 기본 기준 |
| --- | --- | --- |
| `NOT_STARTED` | 예정 시각이 지났는데 시작하지 않음 | 5분 |
| `OVERTIME` | 예정 길이를 넘겨 진행 중 | 5분 |
| `NO_AUDIO` | 진행 중인데 마이크 단말이 붙어 있지 않음 | Agent 기준 |
| `SILENT` | 진행 중인데 전사가 한동안 없음(마이크·STT 문제 가능성) | 3분 |
| `STT_BACKLOG` | 전사 대기가 밀리거나 건너뛴 구간이 있음 | 대기 5 이상 또는 건너뜀 1 이상 |
| `JOB_FAILED` | 이 면접의 가장 최근 AI 평가·보고서 작업이 실패 | - |
| `AGENT_DOWN` | Agent에 연결할 수 없음(진행 중인 방에만 붙는다) | - |

값이 없을 때: `elapsedMinutes`는 시작 전이면 null, `lateMinutes`·`overtimeMinutes`·`silentMinutes`·`queueDepth`·`droppedChunks`는 해당 없으면 0. Agent가 DOWN이면 `agent.rooms`는 null, `providers`는 빈 배열. 늦게 시작한 면접은 `lateMinutes`로만 알 수 있고 alert는 붙지 않는다(이미 시작했으므로). 전사 시각은 백엔드가 저장한 시각 기준이다.

`summary.attention`은 `alerts`가 하나라도 있는 면접 수다. `items`는 `alerts`가 있는 것 먼저, 그다음 예정 시각 순. Agent가 여러 대면 `agent`와 방별 연결 정보는 백엔드가 물어본 한 대의 것이라, 다른 대가 맡은 방은 `audioConnected: null`로 온다.

```json
// GET /admin/quality
{ "generatedAt": "...", "endedInterviewCount": 42,
  "scoreGap": {                       // AI 점수와 면접관 점수(제출된 평가의 평균). 면접 × 평가 항목 단위로 비교
    "comparedCount": 120,
    "meanDiff": 0.21,                 // AI - 면접관. 양수면 AI가 후하다
    "meanAbsDiff": 0.64,
    "withinOneRate": 0.91,            // 차이가 1점 이내인 비율
    "byCriterion": [ { "criterionCode": "PROBLEM_SOLVING", "criterionName": "문제 해결", "comparedCount": 30,
                       "aiMean": 3.8, "interviewerMean": 3.6, "meanDiff": 0.2, "meanAbsDiff": 0.6 } ] },
  "aiCoverage": { "expected": 168, "scored": 150, "rate": 0.89 },   // AI가 근거를 찾아 점수를 낸 항목의 비율
  "followUps": { "suggested": 310, "used": 58, "adoptionRate": 0.19, "roomCount": 40 },
  "speaker": { "utteranceCount": 2400,
               "byMethod": { "MANUAL": 35, "QUESTION_MATCH": 210, "RULE": 1900, "LLM": 240, "CHANNEL": 0, "NONE": 15 },
               "manualRate": 0.01,    // 사람이 화자를 지정하거나 고친 비율
               "unknownRate": 0.01 }, // 화자를 정하지 못한 비율
  "questions": { "prepared": 400, "asked": 260, "askedRate": 0.65, "autoMatched": 90, "autoMatchedRate": 0.35 },
  "reports": { "liveCount": 42, "refinedCount": 40,
               "liveSecondsMedian": 38, "liveSecondsMax": 95,        // 방 종료 → 초안 보고서
               "refinedSecondsMedian": 240, "refinedSecondsMax": 610 }, // 방 종료 → 보정본 보고서
  "jobs": [ { "type": "REPORT", "succeeded": 82, "failed": 1 } ] }
```

- `questions.autoMatchedRate`의 분모는 `asked`다(물은 질문 가운데 자동으로 인식된 비율).
- `speaker`는 지금 저장된 전사(보정본이 있으면 보정본) 기준이다.

```json
// GET /admin/interviewer-stats
{ "generatedAt": "...",
  "overall": { "evaluationCount": 80, "meanScore": 3.62, "stdDev": 0.71 },   // 제출된 평가의 항목 점수 전체
  "items": [ {
      "interviewer": { "id": 2, "name": "박준호", "department": "SW개발1팀" },
      "assignedCount": 14, "submittedCount": 12, "pendingCount": 2,   // pending = 면접은 끝났는데 미제출
      "meanScore": 3.9, "stdDev": 0.5,
      "deviationFromOverall": 0.28,     // meanScore - overall.meanScore
      "deviationFromPeers": 0.35,       // 같은 면접을 본 다른 면접관들의 평균과의 차이의 평균. 비교할 면접이 없으면 null
      "peerComparedCount": 10,
      "scoreDistribution": { "1": 0, "2": 3, "3": 10, "4": 25, "5": 10 },
      "gradeDistribution": { "A": 4, "B": 6, "C": 2 },
      "byCriterion": [ { "criterionCode": "PROBLEM_SOLVING", "criterionName": "문제 해결", "meanScore": 4.0 } ] } ] }
```

제출된(`submitted: true`) 평가만 집계한다. `items`는 `submittedCount`가 많은 순. 점수가 없는 면접관도 배정이 있으면 포함한다(평균은 `null`).

## 3. 프론트 ↔ Agent WebSocket (`/ws/v1/rooms/{roomId}`)

방마다 여러 단말이 붙을 수 있다(면접관 여러 명의 노트북). 마이크를 보내는 단말은 방에 하나(`audio: true` 입장권)이고, 나머지는 듣기만 한다. 모든 서버 → 클라이언트 이벤트는 방의 모든 단말에 간다(서버가 여러 대여도 Redis로 중계).

### 3.1 클라이언트 → 서버

| 형식 | 내용 |
| --- | --- |
| 텍스트(JSON) | `{ "type": "auth", "ticket": "<JWT>" }` 연결 후 5초 안에 첫 메시지로 보낸다 |
| 바이너리 | 오디오 프레임. **PCM 16비트 리틀엔디언, 모노, 16kHz.** 프레임 길이는 자유(권장 100ms = 3200바이트). `audio: true` 단말만 |
| 텍스트 | `{ "type": "role", "role": "INTERVIEWER" \| "CANDIDATE" \| "AUTO" }` 지금부터의 말을 누구 것으로 볼지. `AUTO`면 자동 판정으로 돌아간다 |
| 텍스트 | `{ "type": "question.asked", "questionId": 7001 }` 면접관이 화면에서 "이 질문 했음"을 누름 |
| 텍스트 | `{ "type": "followup.request" }` 지금까지의 대화로 꼬리질문을 바로 요청 |
| 텍스트 | `{ "type": "utterance.fix", "seq": 12, "speaker": "CANDIDATE" }` 화자를 사람이 고침 |
| 텍스트 | `{ "type": "ping" }` |

### 3.2 서버 → 클라이언트

```json
{ "type": "ready", "roomId": 9001, "audio": true, "sttModel": "whisper-large-v3", "llmModel": "...", "lastSeq": 0 }
{ "type": "transcript.partial", "seq": 13, "text": "그때 가장 어려웠던 건" }
{ "type": "transcript.final", "seq": 13, "speaker": "CANDIDATE", "speakerMethod": "LLM",
  "rawText": "...", "refinedText": "...", "startMs": 201000, "endMs": 214500 }
{ "type": "transcript.updated", "seq": 12, "speaker": "CANDIDATE", "speakerMethod": "MANUAL" }
{ "type": "question.matched", "seq": 14, "questionId": 7001, "similarity": 0.83 }
{ "type": "followup.suggested", "basedOnSeq": 13, "items": [ { "id": "f-13-1", "text": "...", "rationale": "..." } ] }
{ "type": "status", "stt": "OK", "llm": "OK", "queueDepth": 0, "audioConnected": true }
{ "type": "error", "code": "STT_FAILED", "message": "...", "retryable": true }
{ "type": "pong" }
```

- `transcript.partial`은 다듬기 전의 임시 글자다. 같은 `seq`의 `transcript.final`이 오면 바꿔 그린다.
- `seq`는 방 안에서 1부터 늘어난다. 재접속하면 `ready.lastSeq`와 백엔드의 `/rooms/{id}/utterances?afterSeq=`로 빈 구간을 채운다.
- 오류 코드: `TICKET_INVALID`, `TICKET_EXPIRED`, `AUDIO_ALREADY_CONNECTED`, `ROOM_NOT_LIVE`, `STT_FAILED`, `LLM_FAILED`, `BACKEND_UNAVAILABLE`, `OVERLOADED`.
- 닫힘 코드: 4401(인증 실패), 4409(마이크 단말 중복), 4429(인스턴스가 받는 방 수 초과), 1000(정상. 방이 마무리(finalize)되면 Agent가 모든 단말을 1000으로 닫는다).
- `status`의 `stt`·`llm` 값: `OK` | `DEGRADED`(직전 호출 실패) | `DOWN`(연속 실패). `queueDepth`는 그 방에서 아직 끝나지 않은 발화 조각 수.
- `OVERLOADED` 오류는 방의 큐가 밀려 청크를 건너뛸 때 온다(연결은 유지된다). 건너뛴 구간은 사후 STT가 채운다.
- `followup.suggested`의 `items[].id`는 `f-<기준 seq>-<번호>` 형식이고, 백엔드 follow-ups의 `clientId`와 같다.
- `question.matched`의 `questionId`는 준비된 질문(2.6의 Question)의 id다. 질문 은행·꼬리질문 후보와의 유사도는 화자 판정에만 쓰이고 이 이벤트로는 오지 않는다.

## 4. 백엔드 → Agent (`/internal/v1`, `X-Internal-Key`)

모두 동기 호출이고 상태를 남기지 않는다. 백엔드는 트랙별 제한 시간으로 부른다(신입 보고서 120초, 경력 보고서 3600초까지 설정 가능).

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/health` (접두사 없음) | `{ "status": "UP", "llm": "fake", "stt": "fake" }` |
| POST | `/internal/v1/briefings` | 사전 리포트와 질문 생성 |
| POST | `/internal/v1/evaluations` | AI 참고 평가 |
| POST | `/internal/v1/reports` | 면접 후 보고서 |
| POST | `/internal/v1/rooms/{roomId}/finalize` | 방 마무리(남은 음성 처리, 사후 STT 예약). `202` |
| POST | `/internal/v1/blind/check` | `{ "texts": [] }` → `{ clean, rulesVersion, results[{ index, clean, violations[{ topic, label, matched, ruleType }] }] }` (검수·테스트용) |
| GET | `/internal/v1/stats` | 운영·부하 테스트용: 방 수, 큐 깊이, provider 호출 수 |

### 4.1 `POST /internal/v1/briefings`

```json
// 요청
{ "track": "NEW_GRAD", "interviewType": "PT", "jobTitle": "SW개발", "jdText": "...",
  "candidate": { "profile": { /* 2.3의 profile, 블라인드 제외본 */ } },
  "questionBank": [ { "id": 31, "category": "CS기초", "text": "..." } ],
  "questionCount": { "jd": 4, "resume": 6 } }
// 응답
{ "summary": { "headline": "...", "keyPoints": [], "strengths": [], "checkPoints": [], "timeline": [] },
  "questions": [ { "source": "RESUME", "category": "프로젝트", "text": "...", "intent": "..." } ],
  "excluded": ["family"], "model": "..." }
```

### 4.2 `POST /internal/v1/evaluations`

```json
// 요청
{ "track": "NEW_GRAD", "interviewType": "PT", "jobTitle": "...", "jdText": "...",
  "criteria": [ { "code": "PROBLEM_SOLVING", "name": "문제 해결", "description": "...", "maxScore": 5 } ],
  "transcript": [ { "seq": 1, "speaker": "INTERVIEWER", "text": "..." } ],
  "briefingSummary": { } }
// 응답
{ "scores": [ { "criterionCode": "PROBLEM_SOLVING", "score": 4, "rationale": "...", "evidenceSeqs": [12] } ],
  "overallComment": "...", "model": "..." }
```

근거 발화가 없는 평가 항목은 `scores`에서 빠지고, 어떤 항목을 뺐는지는 `overallComment`에 적힌다. 받는 쪽은 `scores`에 모든 항목이 있다고 가정하지 않는다.

### 4.3 `POST /internal/v1/reports`

```json
// 요청
{ "track": "EXPERIENCED", "detail": "DETAILED", "basis": "REFINED", "interviewType": "JOB", "jobTitle": "...", "jdText": "...",
  "transcript": [ ], "briefingSummary": { }, "aiEvaluation": { "scores": [], "overallComment": "" },
  "previousRounds": [ { "type": "PORTFOLIO", "headline": "...", "checkPoints": [] } ] }
// 응답
{ "content": { /* ReportContent */ }, "model": "..." }
```

```json
// ReportContent
{ "headline": "한 줄 총평",
  "overallComment": "간단한 코멘트 (BRIEF는 3~5문장)",
  "strengths": ["..."], "concerns": ["..."],
  "qaHighlights": [ { "question": "...", "answerSummary": "...", "seqs": [12, 13] } ],
  // 아래는 DETAILED에서만 채운다. BRIEF에서는 빈 배열
  "competencies": [ { "name": "...", "assessment": "...", "evidence": ["..."] } ],
  "careerChecks": [ { "claim": "이력서의 주장", "finding": "면접에서 확인된 내용" } ],
  "nextRoundChecks": ["다음 차수에서 확인할 점"],
  "risks": ["..."] }
```

### 4.4 `POST /internal/v1/rooms/{roomId}/finalize`

```json
// 요청
{ "postStt": true }
// 응답 202
{ "flushed": true, "postSttScheduled": true, "audioRetention": "MEMORY_ONLY" }
```

`finalize`는 남은 음성의 처리와 저장을 끝낸 뒤 응답한다(백엔드가 응답 직후 초안 기준 평가를 시작하기 때문). Agent는 메모리(또는 설정된 저장소)에 모아 둔 방 전체 음성으로 사후 STT를 돌리고, 끝나면 5.3의 콜백을 부른 뒤 음성을 버린다(`audio.retention` 설정이 `MEMORY_ONLY`일 때).

## 5. Agent → 백엔드 (`/internal/v1`, `X-Internal-Key`)

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/internal/v1/rooms/{roomId}/context` | 방을 열 때 한 번 읽는다 |
| POST | `/internal/v1/rooms/{roomId}/utterances` | 확정 전사 저장(묶음). `(roomId, seq)`가 같으면 덮어쓴다 |
| POST | `/internal/v1/rooms/{roomId}/follow-ups` | 꼬리질문 후보 저장 |
| PUT | `/internal/v1/rooms/{roomId}/refined-transcript` | 사후 STT 보정 전사 전체. `seq`는 1부터 다시 매긴다(실시간 전사의 seq와 다를 수 있다). 받으면 백엔드가 전사를 통째로 바꾸고, 보정 전사로 AI 평가를 다시 한 뒤 `REFINED` 보고서를 만든다 |
| POST | `/internal/v1/rooms/{roomId}/events` | `{ "type": "POST_STT_FAILED" \| "AUDIO_DROPPED" \| "QUESTION_ASKED", "message", "data" }` |

```json
// GET context 응답
{ "roomId": 9001, "interviewId": 501, "status": "LIVE", "track": "NEW_GRAD", "interviewType": "PT", "mode": "OFFLINE",
  "jobTitle": "SW개발", "jdText": "...",
  "candidateBrief": "블라인드 처리된 지원자 요약 텍스트 (사전 리포트 headline + keyPoints)",
  "questions": [ { "id": 7001, "source": "RESUME", "category": "프로젝트", "text": "..." } ],
  "questionBank": [ { "id": 31, "category": "CS기초", "text": "..." } ] }
```

```json
// POST utterances 요청
{ "items": [ { "seq": 12, "speaker": "CANDIDATE", "speakerMethod": "LLM", "rawText": "...", "refinedText": "...",
               "startMs": 184200, "endMs": 191800, "matchedQuestionId": null } ] }
// POST follow-ups 요청
{ "basedOnSeq": 13, "items": [ { "clientId": "f-13-1", "text": "...", "rationale": "..." } ] }
// PUT refined-transcript 요청
{ "sttModel": "whisper-large-v3", "items": [ { "seq": 1, "speaker": "INTERVIEWER", "speakerMethod": "QUESTION_MATCH",
               "rawText": "...", "refinedText": "...", "startMs": 0, "endMs": 5200, "matchedQuestionId": 7001 } ] }
```

## 6. 흐름 요약

### 면접 전

1. ADMIN이 엑셀 업로드 → 백엔드가 행 단위로 면접자 저장, 실패 행은 오류 목록.
2. 자동 매칭 실행 → 면접(`Interview`)과 면접관 배정 생성.
3. 면접마다 브리핑 작업 → 백엔드가 Agent `/briefings` 호출 → 요약과 질문 저장.

### 면접 중

1. 면접관이 방 입장 → `POST /rooms/{id}/ticket` → Agent WebSocket 연결, `auth`.
2. `POST /rooms/{id}/start`. 마이크 단말이 PCM을 보낸다.
3. Agent: 말소리 구간으로 자름 → Whisper → LLM 다듬기 → 화자 판정 → `transcript.final`. 면접관 말이면 준비된 질문과 유사도 비교 → `question.matched`. 지원자 답이 끝나면 꼬리질문 생성 → `followup.suggested`.
4. Agent는 확정 전사와 꼬리질문 후보를 백엔드에 저장(5장).
5. 면접관 메모는 프론트가 `PUT /my-evaluation`으로 자동 저장.

### 면접 후

1. `POST /rooms/{id}/end` → 백엔드가 Agent `finalize` 호출 → AI 평가 작업 → 보고서 작업(`LIVE`). 신입은 1~2분 안에 초안이 보인다.
2. Agent가 사후 STT를 끝내면 `PUT refined-transcript` → 백엔드가 전사를 바꾸고, AI 평가를 다시 한 뒤 `REFINED` 보고서를 새 버전으로 올린다. 화면은 "보정본으로 갱신됨"을 알린다. 초안 작업이 보정본보다 늦게 끝나면 그 초안은 저장하지 않는다(최신 버전이 초안으로 돌아가지 않게).
3. 경력(`DETAILED`)은 같은 흐름에서 상세 보고서를 만들며, 제한 시간이 길다.
