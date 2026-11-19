# 가정으로 만든 것과 바꿀 위치 (프론트)

현업 확인이 끝나지 않아 가정으로 만든 부분이다. 답이 오면 오른쪽 칸의 파일을 고친다. 세 레포 전체의 목록은 상위 `docs/05-open-questions.md`.

| 주제 | 지금의 가정 | 답이 오면 고칠 곳 |
| --- | --- | --- |
| 직무 면접과 인성 면접의 관계 | 서로 다른 면접(차수)으로 등록한다. 같은 날 연달아 봐도 방은 따로 | 동시에 한 방에서 본다면 `features/room`에 면접 유형 전환을 더한다 |
| 경력 화상 면접(Knox Teams) | 면접관 노트북 브라우저가 소리를 받는다(신입은 지금 실시간 기능이 잠겨 있어 소리를 받지 않는다). `feedback1118`이 켜진 화면의 시작 덮개는 화상 면접에서 마이크 선택을 보여 주지 않고 "소리를 받는 방식은 아직 확인 중"이라고 안내한다(동작은 같다) | Knox가 전사를 주면 마이크 없이 듣기 전용으로 붙는다(`audioOwner=false`가 기본이 되게) |
| 평가 등급 | A~D 네 단계 | `features/review/MyEvaluationPanel.vue`의 `BASE_GRADES` |
| 평가 항목 | 백엔드가 주는 `criteria`를 그대로 그린다 | 프론트 변경 없음 |
| 채용 시스템 입력 화면 | 항목별 점수 + 등급 + 종합 의견을 한 덩어리 글로 복사 | 실제 입력 화면 캡처를 받으면 같은 칸 구성으로 바꾸고 칸마다 복사 버튼을 둔다 |
| 녹음 보관 | 저장하지 않는다(안내 문구도 그렇게 적혀 있다) | 보관으로 바뀌면 `VITE_AUDIO_KEEP=true` |
| 블라인드 항목 이름 | `gender`, `birthDate`, `family` 등 | `lib/labels.js`의 `BLIND_FIELD` |
| 면접관 매칭 | 실제 백엔드에 붙는 빌드: JD(직무 코드) 기준 임시 자동 매칭 버튼(API 명세 2.4). 가짜 데이터로 도는 빌드(`feedback1118`이 켜졌을 때): 신입은 "매칭 파일 올리기", 경력은 "채용 시스템에서 불러오기". 둘 다 파일을 고르거나 채용 시스템에 붙지 않고 자동 매칭과 같은 호출을 부른다. API 명세에 아직 없는 화면 시안이다(명세 2.14) | 매칭 파일의 형식과 채용 시스템의 읽기 전용 테이블을 받으면 API 명세에 먼저 넣고, `features/admin/SetupPage.vue`의 두 버튼을 실제 호출로 바꾼 뒤 `mockData` 조건(`SetupPage.vue`, `AdminTabs.vue`, `features/candidates/CandidatesPage.vue`)을 뺀다. 매칭 엑셀은 `components/UploadDialog.vue`를 재사용해 업로드 종류를 고르게 한다 |
| 면접의 종류 | 신입도 경력도 직무(1차)·인성(2차) 두 가지다. API 명세의 `InterviewType`이 `JOB`, `PERSONALITY`뿐이다(PT와 포트폴리오는 없앴다) | `lib/labels.js`의 `INTERVIEW_TYPE`, `features/candidates/CandidatesPage.vue`·`CandidateDetailPage.vue`, `features/bank/QuestionBankPage.vue`의 면접 종류 목록 |
| 신입(대면) 면접의 실시간 기능 | 면접의 `liveEnabled`가 `false`면 녹음·전사·꼬리질문 제안을 잠그고 예상 꼬리질문을 미리 보여 준다. 보고서는 만들지 않는다. 값은 백엔드가 정한다(API 명세 2.5: 신입 대면 면접은 기본이 `false`, 백엔드 설정 `app.live.new-grad-enabled`) | 프론트 변경 없음(`lib/features.js`의 `liveLocked`는 `liveEnabled`만 본다). 가짜 데이터에서는 `mocks/server.js`의 `liveLocked`가 정하고 빌드 환경변수 `VITE_NEW_GRAD_LIVE=on`으로 푼다 |
| AI 참고 평가를 누가 보는가 | 관리자만. 면접관에게는 점수 없이 의견 초안만 준다. 화면은 관리자가 아니면 탭을 보여 주지 않고 읽지도 않는다. 백엔드도 기본 설정에서 면접관에게 403을 준다(API 명세 2.8, 백엔드 설정 `app.evaluation.ai-visible-to`) | `features/review/ReviewPage.vue`의 `showAi`. 화면은 백엔드 설정을 읽지 않고 관리자 여부만 본다. 백엔드 설정을 `ALL`로 바꾼다면 이 값도 같이 바꿔야 면접관에게 보인다 |
| 평가 의견 초안의 항목 | 보고서의 종합 의견·강점·보완할 점을 글로 묶는다(임시 항목) | 전사 공통 평가 양식을 받으면 `features/review/ReviewPage.vue`의 `opinionDraft`를 그 항목에 맞춘다 |
| 보고서를 메일로 보내기 | 없음 | Knox 메일 연동이 정해지면 `review`에 "보내기 전 확인" 단계와 함께 더한다 |
| 로그인 | 개발용 사번 로그인 | [auth.md](auth.md) |

## API 명세에 아직 없는 화면 시안

2026-11-18 현업 회의 의견을 목업에 반영하면서 만든 화면 가운데 API 명세(`docs/contract/api-contract.md`)에 아직 없는 것이다. 명세 2.14 "아직 명세에 없는 화면 시안"에 같은 목록이 있다. 화면과 모의 서버에만 있고, 가짜 데이터로 도는 빌드에서만 나온다([setup.md](setup.md)). 실제 백엔드에 붙는 빌드에서는 부르지 않는다.

실제로 만들 때는 API 변경 절차(skill `change-api-contract`)를 먼저 밟고, 경로·필드·열거형 이름을 API 명세에 맞춘 뒤 `lib/features.js`의 `MOCKUP_ONLY`에서 그 스위치를 빼거나 화면의 `mockData` 조건을 뺀다.

| 무엇이 | 어느 파일에 | 실제로 만들려면 필요한 것 |
| --- | --- | --- |
| AI 모델: `GET /admin/models` → `models[]`(`id`, `kind`, `name`, `note`, `status`), `tasks[]`(`key`, `group`, `kind`, `label`, `description`, `modelId`, `usualSeconds`), `history[]`. `PUT /admin/models/tasks/{key}` `{ modelId }` | `api/index.js`의 `modelApi`, `mocks/server.js`, `mocks/data.js`의 `aiModels`·`aiModelTasks`, `features/admin/ModelPage.vue`. `features.js`의 `modelSwitch`(`MOCKUP_ONLY`) | API 명세에 경로 추가. 지금 모델은 Agent의 설정 파일(`config/providers.yaml`)로 정하고 다시 띄워야 바뀐다. 화면에서 바꾸려면 백엔드가 Agent에 전하는 통로와 Agent가 실행 중에 모델을 바꾸는 기능이 필요하다 |
| 매칭 파일 올리기(신입), 채용 시스템에서 불러오기(경력) | `features/admin/SetupPage.vue`의 `noAutoMatch`(지금은 `candidateApi.autoAssign`을 대신 부른다), `features/admin/AdminTabs.vue`(탭 이름 "등록"), `features/candidates/CandidatesPage.vue`(경력 탭에서 업로드 버튼 대신 관리 > 등록으로 보내는 링크). 셋 다 `mockData`일 때만 | 매칭 파일의 형식(면접위원·면접자·일정·장소)과 올리는 API. 채용 시스템의 읽기 전용 테이블과 그것을 읽어 오는 API. 그때까지 실제 백엔드에 붙는 빌드에는 임시 자동 매칭(API 명세 2.4)이 남아 있다 |

## API 명세에는 있지만 Agent가 아직 주지 않는 것

API 명세 4.1과 5장에 "Agent에 아직 반영하지 않았다"고 적혀 있는 것이다. 화면과 모의 서버는 명세의 모양대로 되어 있어, 가짜 데이터에서는 보이고 실제 백엔드에 붙으면 아래처럼 보인다.

| 무엇이 | 가짜 데이터에서 | Agent가 주기 전까지 실제 백엔드에 붙으면 |
| --- | --- | --- |
| 사전 리포트의 `summary.checkItems[]`(`text`, `evidenceFrom`, `evidence`, `questionOrder`): 확인할 점마다 근거 문장과 그것을 확인하는 준비된 질문의 순서(API 명세 2.6의 선택 항목) | `mocks/data.js`의 `briefingFor`가 준다. `features/room/CandidateBrief.vue`의 "확인할 점" 탭에 근거 문장과 질문 연결이 보인다 | 필드가 없다. `CandidateBrief.vue`는 글만 있는 `summary.checkPoints`를 보여 준다(근거 문장과 질문 연결 없음) |
| 예상 꼬리질문 만들기: 백엔드가 실시간 기능을 쓰지 않는 면접에서 `predictedFollowUps: 3`을 보내면 Agent가 `questions[].followUps`에 글을 넣고, 백엔드가 그 질문을 부모로 하는 `FOLLOW_UP` 질문으로 저장한다(API 명세 2.6, 4.1) | `mocks/data.js`의 `questionsFor`(`predicted`, `PREDICTED`)가 질문마다 3개씩 붙인다. `features/interview/PrepPage.vue`와 면접 방의 나무(`features/room/room-state.js`의 `questionTree`)에 가지로 보인다 | `followUps`가 오지 않는다(명세 4.1). 화면은 부모가 있는 `FOLLOW_UP` 질문만 가지로 그리므로 받은 것이 없으면 가지가 없다 |
| 페르소나와 면접자 유형을 준비된 질문에 반영: 백엔드가 사전 리포트 요청에 `persona`·`applicantType`을 보낸다(API 명세 4.1) | 페르소나만 반영한다(모든 면접): 경력 직무 면접은 `mocks/data.js`의 `PERSONA_TEXT`에 질문 여섯 개를 페르소나별로 미리 써 둔 표현을 쓰고(`mocks/server.js`의 `applyPersona`), 그 밖의 면접(신입, 인성 면접)은 원래 질문 뒤에 페르소나의 요구를 덧붙인다(`personaRewrite`). 면접자 유형은 질문에 반영하지 않는다 | Agent가 두 항목을 무시해 질문에 영향을 주지 않는다(명세 4.1) |
| 페르소나를 면접 중 꼬리질문의 표현에 반영(API 명세 5장) | 화면 설명에는 꼬리질문 유형도 페르소나마다 다르다고 나오지만, 모의 소켓의 꼬리질문은 페르소나를 따르지 않는다 | Agent에 아직 반영하지 않았다(명세 5장) |

## 11/18 회의 반영 가운데 API 명세에 들어간 것

예전에 이 문서에 화면 시안으로 적어 두었던 것이다. 지금은 API 명세에 있고 실제 백엔드에 붙는 빌드에서도 켜진다. 백엔드가 답한다(아래의 명세 번호).

| 무엇이 | API 명세 | 어느 파일에 |
| --- | --- | --- |
| 면접 페르소나 목록·추천·사용 여부, 더하기·고치기·지우기: `GET /personas`, `POST /admin/personas`, `PATCH /admin/personas/{id}`, `DELETE /admin/personas/{id}` | 2.12 | `api/index.js`의 `personaApi`, `features/admin/PersonaPage.vue`, `features/interview/PersonaPicker.vue`. 모의: `mocks/server.js`(라우트, `personaOf`, `defaultPersona`), `mocks/data.js`의 `personas` |
| 면접에 페르소나 고르기: `PUT /interviews/{id}/persona`(`{ personaId }`), 면접 응답의 `persona` | 2.5, 2.12 | `personaApi.choose`, `features/interview/PrepPage.vue`·`PersonaPicker.vue`, `features/room/RoomPage.vue`(위쪽 줄의 이름). 모의: `mocks/server.js`(`interviewView`의 `persona`, `applyPersona`) |
| 시스템 상태: `GET /system/status` → `checkedAt`, `services[]`, `waits[]`, `queue[]`, `dailySessions[]` | 2.13, 열거형 `ServiceStatus` | `api/index.js`의 `systemApi`, `components/SystemStatusChip.vue`·`SystemStatusPanel.vue`, `features/admin/SystemStatusPage.vue`, `lib/labels.js`의 `SYSTEM_STATUS`. 모의: `mocks/data.js`의 `systemStatus()`(명세와 같은 모양의 고정된 가짜 값) |
| 면접자 유형 `applicantType`과 면접자 목록의 거르기 조건 `applicantType=` | 2.3, 2.5, 열거형 `ApplicantType` | `lib/labels.js`의 `APPLICANT_TYPE`, `features/candidates/CandidatesPage.vue`·`CandidateDetailPage.vue`, `components/InterviewHeader.vue`. 모의: `mocks/data.js`(면접자), `mocks/server.js` |
| 사전 리포트의 `previousRoundChecks`(`seq`, `type`, `items[]`): 앞 차수 보고서에서 넘어온 확인점. 백엔드가 채운다 | 2.6 | `features/room/CandidateBrief.vue`. 모의: `mocks/data.js`의 `briefingFor`(경력 2차 이상에만 넣는다) |
| 질문 피드백: 준비된 질문 전체에 대한 평가(`GOOD`/`SOSO`/`BAD`)와 질문별 평가(`UP`/`DOWN`). `GET`·`PUT /interviews/{id}/question-feedback` | 2.6, 열거형 `FeedbackOverall`·`QuestionVote` | `api/index.js`의 `interviewApi.questionFeedback`·`saveQuestionFeedback`, `features/review/QuestionFeedback.vue`. 모의: `mocks/server.js`(메모리에 저장) |
| 실시간 기능을 쓰는지: 면접 응답의 `liveEnabled`. `false`인 면접은 입장권을 주지 않고(`409 LIVE_DISABLED`), 종료해도 AI 평가와 보고서를 만들지 않는다 | 2.5, 2.7 | `lib/features.js`의 `liveLocked`, `features/interview/PrepPage.vue`, `features/room/RoomPage.vue`, `features/review/ReviewPage.vue`. 모의: `mocks/server.js`의 `liveLocked`(`POST /rooms/{id}/end`, `GET /interviews/{id}/report`) |
| AI 참고 평가는 관리자만: 면접관이 읽으면 `403 FORBIDDEN`(기본 설정) | 2.8 | `features/review/ReviewPage.vue`의 `showAi`(관리자가 아니면 읽지 않는다) |
| 예상 꼬리질문의 모양: `parentQuestionId`가 있는 `FOLLOW_UP` 질문 | 2.6 | `features/interview/PrepPage.vue`, `features/room/room-state.js`의 `questionTree`. 글을 만드는 일은 위 "Agent가 아직 주지 않는 것" |
