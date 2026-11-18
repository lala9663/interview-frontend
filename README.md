# interview-frontend

DSInterview(면접 지원 서비스)의 화면이다. 면접관이 **면접 전**(사전 리포트·질문) → **면접 중**(실시간 전사·꼬리질문·메모) → **면접 후**(평가·보고서)를 한 흐름으로 쓴다. 관리자는 면접자 엑셀을 올리고 면접관을 매칭한다.

2026-11-18 현업 회의 의견을 반영한 화면(경력 탭 먼저, 면접 방의 질문 나무, 면접 페르소나, 시스템 상태, 일정 달력, 질문 피드백 등)은 API 명세에 들어가 있어 실제 백엔드에 붙는 빌드(`npm run dev:api`, `npm run build`)에서도 켜진다. API 명세에 아직 없는 화면 시안은 모의 데이터로 띄울 때(`npm run dev`, 4주 차 이후 목업)만 나온다: 관리 > AI 모델, 그리고 관리 > 등록의 "매칭 파일 올리기"·"채용 시스템에서 불러오기". 아래 설명에서 "화면 시안"이라고 적은 것이 그것이다. 켜지는 조건은 `docs/setup.md`의 "가짜 데이터로 돌 때만 켜지는 화면", API 명세에 없는 것과 Agent가 아직 주지 않는 것의 목록은 `docs/open-questions.md`.

- 스택: JavaScript, Vue 3, Vite 4, Node 24, npm 11, Tailwind CSS 3
- 짝이 되는 레포: `interview-backend`(Spring Boot), `interview-agent`(FastAPI)

## 빠른 시작

```bash
npm ci
npm run dev        # 백엔드 없이 모의 데이터로 → http://localhost:5173
```

개발용 계정 `E1001`(관리자)로 로그인한다. 위쪽 탭(신입 공채 / 경력 채용)으로 채용을 고르면 오늘·면접자·진행 현황·관리 화면이 모두 그 채용으로 바뀐다. 경력 채용 탭이 앞에 있고 먼저 열린다. 경력 화상 직무 면접의 방에서 "면접 시작"을 누르면 준비된 대본이 흘러나와 전사·질문 매칭·꼬리질문·보고서까지 한 바퀴 볼 수 있다. 신입 면접의 방은 실시간 기능이 잠겨 있어(면접의 `liveEnabled: false`) 대본이 돌지 않고 질문 화면으로만 열린다. 모의 모드에서는 `VITE_NEW_GRAD_LIVE=on`으로 띄우면 풀린다.

로컬 백엔드(8080)와 Agent(8000)에 연결하려면:

```bash
npm run dev:api
```

## 환경변수

| 이름 | 값 | 설명 |
| --- | --- | --- |
| `VITE_API_MODE` | `mock` / `api` | `mock`이면 네트워크 없이 `src/mocks`가 답한다 |
| `VITE_API_BASE_URL` | 예: `http://localhost:8080/api/v1` | 백엔드 주소. 운영은 같은 도메인의 `/api/v1` |
| `VITE_AUDIO_KEEP` | `true` / (없음) | Agent가 녹음을 보관하도록 바뀌면 `true`. 면접 시작 안내 문구가 달라진다 |
| `VITE_ROUTER` | `hash` / (없음) | `hash`면 주소의 `#` 뒤로 화면을 구분한다. 서버 없이 여는 목업용 |
| `VITE_MOCK_MIC` | `off` / (없음) | `off`면 마이크를 요청하지 않고 대본만 흘려보낸다(목업용) |
| `VITE_DEMO_GUIDE` | `on` / (없음) | `on`이면 면접 방의 설명 띠와 "달라진 것" 버튼이 나온다(목업용) |
| `VITE_DEMO_WEEK` | 예: `2026-w48` | 주차별 목업의 주차. 빌드 스크립트가 넣는다. 없으면 모든 기능이 켜진다(화면 시안인 관리 > AI 모델은 `VITE_API_MODE=mock`이어야 켜진다) |
| `VITE_NEW_GRAD_LIVE` | `on` / (없음) | 모의 서버(`src/mocks/server.js`)만 읽는다. 모의 서버는 신입(대면) 면접의 `liveEnabled`를 `false`로 줘 실시간 녹음·꼬리질문을 잠근다. `on`이면 푼다. 실제 백엔드에 붙으면 이 값과 상관없이 백엔드가 주는 `liveEnabled`를 따른다 |

파일: `.env.mock`(npm run dev), `.env.development`(npm run dev:api), `.env.production`(빌드), `.env.demo`(npm run build:demo).

현업 시연용 목업(서버 없이 여는 HTML, 주차마다 한 파일)은 `npm run build:demo`로 만든다. 자세한 것은 `docs/setup.md`의 "주차별 목업".

## 화면

| 경로 | 화면 | 누가 |
| --- | --- | --- |
| `/login` | 개발용 로그인(사내에서는 AD SSO) | 모두 |
| `/` | 오늘: 내 면접 일정, 다음 면접, 평가 대기 | 면접관 |
| `/candidates` | 면접자 목록(검색·직무·상태·면접 종류, 페이지). 담당 직무가 하나인 면접관은 그 직무가 먼저 선택된다. 면접자 유형 배지와 유형으로 거르기. 관리자에게는 "면접자 엑셀 업로드" 버튼(여러 파일을 골라 하나씩 올린다) | 모두 |
| `/candidates/:id` | 면접자 상세(블라인드 제외본), 면접 진행, 면접 등록 | 모두 |
| `/interviews/:id` | 면접 전: 사전 리포트와 준비된 질문. 면접 페르소나 선택, 질문은 하나씩 고치지 않고 "질문 전체 다시 만들기"만 | 면접관 |
| `/interviews/:id/room` | 면접 중: 질문 · 실시간 대화 · 꼬리질문 · 메모. 준비한 질문이나 제안된 꼬리질문을 말로 물으면 자동으로 "물었음"이 된다. 가운데에 질문과 꼬리질문 나무, 왼쪽에 지원자 요약과 메모, 대화는 접어 두고 펼쳐서 본다. 실시간 기능을 쓰지 않는 면접(`liveEnabled: false`, 신입 대면)은 녹음 없이 질문과 예상 꼬리질문만 본다 | 면접관 |
| `/interviews/:id/review` | 면접 후: 보고서(초안 → 보정본), AI 참고 평가, 대화 기록, 물은 질문(질문 은행에 담기), 내 평가. 준비된 질문 피드백(저장된다), AI 참고 평가는 관리자만, 내 평가에 "의견 초안 넣기", 실시간 기능을 쓰지 않는 면접은 보고서 없음 | 면접관 |
| `/pipeline` | 진행 현황: 면접 유형 × 상태 집계와 면접자별 진행 표(다수 인원 기준) | 모두 |
| `/admin` | 관리 > 운영 현황: 오늘의 면접 방 현황판(시작 지연, 시간 초과, 마이크·전사 문제), 10초마다 갱신 | 관리자 |
| `/admin/setup` | 관리 > 등록 · 매칭: 엑셀 업로드(여러 파일을 골라 하나씩 올린다)와 이력(실패 행), 면접관 임시 자동 매칭. 화면 시안(모의 데이터로 띄울 때만): 탭 이름이 "등록"이고, 자동 매칭 대신 신입은 "매칭 파일 올리기", 경력은 "채용 시스템에서 불러오기"(둘 다 가짜 데이터로 흉내 낸다) | 관리자 |
| `/admin/quality` | 관리 > AI 품질: AI 점수와 면접관 점수의 차이, 꼬리질문 채택률, 준비한 질문의 출처별 사용률, 화자 판정, 보고서 소요 시간 | 관리자 |
| `/admin/interviewers` | 관리 > 면접관 편차: 면접관별 점수 분포와 동료·전체 대비 편차, 미제출 평가 | 관리자 |
| `/admin/calendar` | 관리 > 일정 달력: 면접 일정을 월 달력으로. 날짜마다 건수와 상태 점, 날짜를 누르면 그날의 면접 목록, 일정이 안 잡힌 면접 목록. 면접 목록 API(`GET /interviews`)의 값만 쓴다 | 관리자 |
| `/admin/personas` | 관리 > 면접 페르소나: 면접관에게 추천할 페르소나와 사용 여부. 새 페르소나를 더하고, 고치고, 직접 만든 것은 지운다 | 관리자 |
| `/admin/system` | 관리 > 시스템 상태: 서비스 연결 상태, 지금 요청하면 기다리는 시간, 일별 면접 세션, 분석 작업 대기열. 10초마다 갱신. 앞의 둘은 위쪽 줄의 상태 버튼으로 모두에게 보인다 | 관리자 |
| `/admin/models` | 관리 > AI 모델(화면 시안): 작업마다(문장 다듬기 · 화자 구분, 꼬리질문, 사전 리포트와 질문, AI 참고 평가, 면접 보고서, 음성 인식) 지금 쓰는 모델을 보고 바꾼다. 쓸 수 있는 모델과 상태, 최근에 바꾼 기록. API 명세에 아직 없어 모의 데이터로 띄울 때만 나오고 모의 서버에서만 동작한다. 모델을 더하려면 `mocks/data.js`의 `aiModels`에 한 줄을 더한다 | 관리자 |
| `/question-bank` | 질문 은행 | 모두(추가·삭제는 관리자. 면접관은 면접 후 화면에서 물은 질문을 담을 수 있다) |

## 확인

```bash
npm run check      # 린트 + 테스트 + 빌드
```

## 문서

- [AGENTS.md](AGENTS.md): AI 코딩 도구(OpenCode)와 새로 온 사람이 먼저 읽는 규칙
- [docs/architecture.md](docs/architecture.md), [docs/realtime-room.md](docs/realtime-room.md), [docs/ui-guide.md](docs/ui-guide.md), [docs/setup.md](docs/setup.md), [docs/auth.md](docs/auth.md), [docs/open-questions.md](docs/open-questions.md)
- [docs/contract/api-contract.md](docs/contract/api-contract.md): 세 레포 공통 API 명세(복사본)
