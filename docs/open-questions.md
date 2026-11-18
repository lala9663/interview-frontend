# 가정으로 만든 것과 바꿀 위치 (프론트)

현업 확인이 끝나지 않아 가정으로 만든 부분이다. 답이 오면 오른쪽 칸의 파일을 고친다. 세 레포 전체의 목록은 상위 `docs/05-open-questions.md`.

| 주제 | 지금의 가정 | 답이 오면 고칠 곳 |
| --- | --- | --- |
| PT 면접과 인성 면접의 관계 | 서로 다른 면접(차수)으로 등록한다. 같은 날 연달아 봐도 방은 따로 | 동시에 한 방에서 본다면 `features/room`에 면접 유형 전환을 더한다 |
| 경력 화상 면접(Knox Teams) | 신입과 같이 면접관 노트북 브라우저가 소리를 받는다. `feedback1118`이 켜진 화면의 시작 덮개는 화상 면접에서 마이크 선택을 보여 주지 않고 "소리를 받는 방식은 아직 확인 중"이라고 안내한다(동작은 같다) | Knox가 전사를 주면 마이크 없이 듣기 전용으로 붙는다(`audioOwner=false`가 기본이 되게) |
| 평가 등급 | A~D 네 단계 | `features/review/MyEvaluationPanel.vue`의 `BASE_GRADES` |
| 평가 항목 | 백엔드가 주는 `criteria`를 그대로 그린다 | 프론트 변경 없음 |
| 채용 시스템 입력 화면 | 항목별 점수 + 등급 + 종합 의견을 한 덩어리 글로 복사 | 실제 입력 화면 캡처를 받으면 같은 칸 구성으로 바꾸고 칸마다 복사 버튼을 둔다 |
| 녹음 보관 | 저장하지 않는다(안내 문구도 그렇게 적혀 있다) | 보관으로 바뀌면 `VITE_AUDIO_KEEP=true` |
| 블라인드 항목 이름 | `gender`, `birthDate`, `family` 등 | `lib/labels.js`의 `BLIND_FIELD` |
| 면접관 매칭 | 실제 백엔드에 붙는 빌드: JD(직무 코드) 기준 자동 매칭 버튼. 화면 시안(`feedback1118`): 신입은 "매칭 파일 올리기", 경력은 "채용 시스템에서 불러오기". 둘 다 파일을 고르거나 채용 시스템에 붙지 않고 자동 매칭과 같은 호출을 부른다 | 매칭 파일의 형식과 채용 시스템의 읽기 전용 테이블을 받으면 `features/admin/SetupPage.vue`의 두 버튼을 실제 호출로 바꾼다. 매칭 엑셀은 `UploadDialog`를 재사용해 업로드 종류를 고르게 한다 |
| 면접의 종류 | 화면 시안(`feedback1118`): 신입도 경력도 직무(1차)·인성(2차) 두 가지. 포트폴리오와 PT는 고르는 곳에서 빼고, 가짜 데이터의 신입 면접도 `JOB`으로 둔다. 실제 백엔드에 붙는 빌드는 신입 PT·인성, 경력 포트폴리오·직무·인성 | `features/candidates/CandidatesPage.vue`·`CandidateDetailPage.vue`, `features/bank/QuestionBankPage.vue`의 면접 종류 목록 |
| 신입(대면) 면접의 실시간 기능 | 화면 시안(`feedback1118`): 녹음·전사·꼬리질문 제안을 잠그고 예상 꼬리질문을 미리 보여 준다. 보고서는 만들지 않는다 | `lib/features.js`의 `liveLocked`. 지금은 빌드 환경변수(`VITE_NEW_GRAD_LIVE=on`)로만 푼다 |
| AI 참고 평가를 누가 보는가 | 화면 시안(`feedback1118`): 관리자만. 면접관에게는 점수 없이 의견 초안만 준다. 가리는 것은 화면뿐이다 | `features/review/ReviewPage.vue`의 `showAi` |
| 평가 의견 초안의 항목 | 보고서의 종합 의견·강점·보완할 점을 글로 묶는다(임시 항목) | 전사 공통 평가 양식을 받으면 `features/review/ReviewPage.vue`의 `opinionDraft`를 그 항목에 맞춘다 |
| 보고서를 메일로 보내기 | 없음 | Knox 메일 연동이 정해지면 `review`에 "보내기 전 확인" 단계와 함께 더한다 |
| 로그인 | 개발용 사번 로그인 | [auth.md](auth.md) |

## API 명세에 아직 없는 화면 시안

2026-11-18 현업 회의 의견을 목업에 반영하면서 API 명세(`docs/contract/api-contract.md`)에 없는 경로와 값을 화면과 모의 서버에만 만든 것이다. `lib/features.js`의 `feedback1118`·`persona`·`systemStatus` 스위치 안에 있고, 이 스위치들은 가짜 데이터로 도는 빌드에서만 켜진다([setup.md](setup.md)). 실제 백엔드에 붙는 빌드에서는 부르지 않는다.

실제로 만들 때는 API 변경 절차(skill `change-api-contract`)를 먼저 밟고, 경로·필드·열거형 이름을 API 명세에 맞춘 뒤 `MOCKUP_ONLY`에서 그 스위치를 뺀다.

| 무엇이 | 어느 파일에 | 실제로 만들려면 필요한 것 |
| --- | --- | --- |
| 면접 페르소나 목록·추천·사용 여부: `GET /personas`, `PATCH /admin/personas/{id}`(`{ recommended?, enabled?, name?, description?, questionType?, followUpType?, fit?, guard?, tone? }`), 더하기 `POST /admin/personas`, 직접 만든 것 지우기 `DELETE /admin/personas/{id}` | `api/index.js`의 `personaApi`, `mocks/server.js`(라우트, `personaOf`, `defaultPersona`), `mocks/data.js`의 `personas`, `features/admin/PersonaPage.vue`, `features/interview/PersonaPicker.vue` | API 명세에 경로와 페르소나의 모양(`id`, `name`, `tone`, `description`, `questionType`, `followUpType`, `fit`, `guard`, `recommended`, `enabled`). 페르소나를 저장하는 곳. 관리자 권한 검사. 모의 서버가 지키는 규칙(하나 이상은 사용, 추천하려면 사용 상태, 기본 선택은 추천 가운데 맨 위)을 백엔드가 맡는다 |
| 면접에 페르소나 고르기: `PUT /interviews/{id}/persona`(`{ personaId }`), 면접 응답의 `persona` | `api/index.js`의 `personaApi.choose`, `mocks/server.js`(`interviewView`의 `persona`, `applyPersona`), `features/interview/PrepPage.vue`·`PersonaPicker.vue`, `features/room/RoomPage.vue`(위쪽 줄의 이름) | API 명세에 경로와 면접 응답의 필드. 면접이 시작된 뒤에는 바꿀 수 없다는 규칙. 고른 페르소나에 맞춰 준비된 질문의 표현을 실제로 만드는 일(지금은 `mocks/data.js`의 `PERSONA_TEXT`에 경력 직무 면접의 질문 여섯 개만 미리 써 두었다). 화면 설명에는 꼬리질문 유형도 페르소나마다 다르다고 나오지만, 모의 소켓의 꼬리질문은 페르소나를 따르지 않는다 |
| 시스템 상태: `GET /system/status` → `checkedAt`, `services[]`(`key`, `name`, `detail`, `status`, `note`), `waits[]`(`key`, `label`, `seconds`, `usual`), `queue[]`(`key`, `label`, `waiting`, `running`), `dailySessions[]`(`date`, `count`) | `api/index.js`의 `systemApi`, `mocks/server.js`의 라우트, `mocks/data.js`의 `systemStatus()`, `components/SystemStatusChip.vue`·`SystemStatusPanel.vue`, `features/admin/SystemStatusPage.vue`, `lib/labels.js`의 `SYSTEM_STATUS`(`OK`/`DEGRADED`/`DOWN`) | API 명세에 경로와 모양. 백엔드가 각 서비스의 상태, 예상 대기 시간, 작업 대기열, 일별 세션 수를 모아서 주는 일. 면접관에게 보일 것(연결 상태, 기다리는 시간)과 관리자에게만 보일 것(대기열, 일별 세션)을 응답에서 나눌지. 지금 값은 전부 고정된 가짜 값이다 |
| AI 모델: `GET /admin/models` → `models[]`(`id`, `kind`, `name`, `note`, `status`), `tasks[]`(`key`, `group`, `kind`, `label`, `description`, `modelId`, `usualSeconds`), `history[]`. `PUT /admin/models/tasks/{key}` `{ modelId }` | `api/index.js`의 `modelApi`, `mocks/server.js`, `mocks/data.js`의 `aiModels`·`aiModelTasks`, `features/admin/ModelPage.vue` | API 명세에 경로 추가. 지금 모델은 Agent의 설정 파일(`config/providers.yaml`)로 정하고 다시 띄워야 바뀐다. 화면에서 바꾸려면 백엔드가 Agent에 전하는 통로와 Agent가 실행 중에 모델을 바꾸는 기능이 필요하다 |
| 면접자 유형 `applicantType`과 면접자 목록의 거르기 조건 `applicantType=`(신입: `SCHOLARSHIP` 장학생, `OPEN` 공채, `INTERN` 인턴 전환 / 경력: `CAREER` 일반 경력, `PHD` 박사, `CAREER_MASTER` 경력 석사) | `lib/labels.js`의 `APPLICANT_TYPE`, `mocks/data.js`(면접자), `mocks/server.js`(면접자 목록 행과 면접 응답의 `candidate`에 넣는다), `features/candidates/CandidatesPage.vue`·`CandidateDetailPage.vue`, `components/InterviewHeader.vue` | API 명세에 필드와 열거형 값. 면접자 엑셀(또는 채용 시스템)에서 이 값을 받는 칸 |
| 사전 리포트의 `summary.checkItems[]`(`text`, `evidenceFrom`, `evidence`, `questionOrder`): 확인할 점마다 근거 문장과 그것을 확인하는 준비된 질문의 순서 | `mocks/data.js`의 `briefingFor`, `features/room/CandidateBrief.vue` | API 명세의 사전 리포트에 필드. 사전 리포트를 만들 때 근거 문장과 질문 연결을 같이 내는 일. `questionOrder`는 준비된 질문의 순서(1부터)다. 값이 없으면 화면은 글만 있는 `checkPoints`를 보여 준다 |
| 사전 리포트의 `previousRoundChecks`(`seq`, `type`, `items[]`): 앞 차수에서 넘어온 확인점 | `mocks/data.js`의 `briefingFor`, `features/room/CandidateBrief.vue` | API 명세의 사전 리포트에 필드. 앞 차수 보고서의 "다음 차수에서 확인할 점"을 다음 차수의 사전 리포트로 넘기는 일 |
| 질문 피드백: 준비된 질문 전체에 대한 평가(`GOOD`/`SOSO`/`BAD`)와 질문별 평가(`UP`/`DOWN`) | `features/review/QuestionFeedback.vue` | 저장하는 API(경로, 모양)와 저장할 곳. 지금은 API 호출이 없고 화면 안에서만 기억해, 새로 읽으면 사라진다 |
| 신입 면접의 실시간 기능 잠금 값 | `lib/features.js`의 `liveLocked`(빌드 환경변수 `VITE_NEW_GRAD_LIVE`) | 백엔드가 내려 주는 설정. 지금은 프론트가 트랙만 보고 정한다. 잠긴 면접은 보고서를 만들지 않는다는 것도 모의 서버만 그렇게 동작한다(`POST /rooms/{id}/end`, `GET /interviews/{id}/report`) |
| 예상 꼬리질문: 면접 전에 질문마다 만들어 두는 꼬리질문. 모의 서버는 출처가 `FOLLOW_UP`이고 `parentQuestionId`가 부모 질문을 가리키는 질문으로 준다 | `mocks/data.js`의 `questionsFor`(`predicted`, `PREDICTED`), `features/interview/PrepPage.vue`, `features/room/room-state.js`의 `questionTree` | 사전 리포트를 만들 때 예상 꼬리질문도 같이 만드는 일. 질문의 `parentQuestionId`와 출처 `FOLLOW_UP`은 API 명세에 있는 필드와 값이지만, 면접 전에 예상 꼬리질문을 이 모양으로 준다는 내용은 API 명세에 없다 |
| 매칭 파일 올리기(신입), 채용 시스템에서 불러오기(경력) | `features/admin/SetupPage.vue`(지금은 `candidateApi.autoAssign`을 대신 부른다) | 매칭 파일의 형식(면접위원·면접자·일정·장소)과 올리는 API. 채용 시스템의 읽기 전용 테이블과 그것을 읽어 오는 API |
