# interview-frontend

면접 어시스턴트의 화면이다. 면접관이 **면접 전**(사전 리포트·질문) → **면접 중**(실시간 전사·꼬리질문·메모) → **면접 후**(평가·보고서)를 한 흐름으로 쓴다. 관리자는 면접자 엑셀을 올리고 면접관을 매칭한다.

- 스택: JavaScript, Vue 3, Vite 4, Node 24, npm 11, Tailwind CSS 3
- 짝이 되는 레포: `interview-backend`(Spring Boot), `interview-agent`(FastAPI)

## 빠른 시작

```bash
npm ci
npm run dev        # 백엔드 없이 모의 데이터로 → http://localhost:5173
```

개발용 계정 `E1001`(관리자)로 로그인한다. 위쪽 탭(신입 공채 / 경력 채용)으로 채용을 고르면 오늘·면접자·전형 현황·관리 화면이 모두 그 채용으로 바뀐다. 모의 모드에서는 면접 방에서 "면접 시작"을 누르면 준비된 대본이 흘러나와 전사·질문 매칭·꼬리질문·보고서까지 한 바퀴 볼 수 있다.

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

파일: `.env.mock`(npm run dev), `.env.development`(npm run dev:api), `.env.production`(빌드).

## 화면

| 경로 | 화면 | 누가 |
| --- | --- | --- |
| `/login` | 개발용 로그인(사내에서는 AD SSO) | 모두 |
| `/` | 오늘: 내 면접 일정, 다음 면접, 평가 대기 | 면접관 |
| `/candidates` | 면접자 목록(검색·직무·상태, 페이지) | 모두 |
| `/candidates/:id` | 면접자 상세(블라인드 제외본), 전형 진행, 면접 등록 | 모두 |
| `/interviews/:id` | 면접 전: 사전 리포트와 준비된 질문 | 면접관 |
| `/interviews/:id/room` | 면접 중: 질문 · 실시간 대화 · 꼬리질문 · 메모 | 면접관 |
| `/interviews/:id/review` | 면접 후: 보고서(초안 → 보정본), AI 참고 평가, 대화 기록, 내 평가 | 면접관 |
| `/pipeline` | 전형 현황: 면접 유형 × 상태 집계와 면접자별 진행 표(다수 인원 기준) | 모두 |
| `/admin` | 관리 > 운영 현황: 오늘의 면접 방 현황판(시작 지연, 시간 초과, 마이크·전사 문제), 10초마다 갱신 | 관리자 |
| `/admin/setup` | 관리 > 등록 · 매칭: 엑셀 업로드와 이력(실패 행), 면접관 자동 매칭 | 관리자 |
| `/admin/quality` | 관리 > AI 품질: AI 점수와 면접관 점수의 차이, 꼬리질문 채택률, 화자 판정, 보고서 소요 시간 | 관리자 |
| `/admin/interviewers` | 관리 > 면접관 편차: 면접관별 점수 분포와 동료·전체 대비 편차, 미제출 평가 | 관리자 |
| `/question-bank` | 질문 은행 | 모두(편집은 관리자) |

## 확인

```bash
npm run check      # 린트 + 테스트 + 빌드
```

## 문서

- [AGENTS.md](AGENTS.md): AI 코딩 도구(OpenCode)와 새로 온 사람이 먼저 읽는 규칙
- [docs/architecture.md](docs/architecture.md), [docs/realtime-room.md](docs/realtime-room.md), [docs/ui-guide.md](docs/ui-guide.md), [docs/setup.md](docs/setup.md), [docs/auth.md](docs/auth.md), [docs/open-questions.md](docs/open-questions.md)
- [docs/contract/api-contract.md](docs/contract/api-contract.md): 세 레포 공통 API 계약(복사본)
