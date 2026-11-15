---
name: add-screen
description: 프론트에 새 화면(페이지)이나 큰 화면 구역을 더할 때 쓴다. 파일 위치, 라우트·메뉴 연결, 공용 컴포넌트와 디자인 규칙, 확인 방법.
---

# 화면 더하기

## 먼저 읽을 것
- `AGENTS.md`의 "규칙"
- `docs/ui-guide.md` (색 토큰, 공용 클래스, 배치 원칙)
- 비슷한 기존 화면 하나: 목록형은 `features/candidates/CandidatesPage.vue`, 상세형은 `features/interview/PrepPage.vue`

## 순서
1. `src/features/<기능>/<Name>Page.vue`를 만든다. `<script setup>`, JavaScript. 파일 맨 위에 이 화면이 무엇을 하는지 한두 줄 주석.
2. 데이터는 `@/api/index.js`의 함수로 읽는다. 없는 API면 skill `add-api-call`을 먼저 한다.
3. 틀은 이렇게 맞춘다:
   - 맨 위: `<h1 class="h-page">` + 보조 설명 한 줄, 오른쪽에 주 버튼 하나(`btn btn-primary`)
   - 내용: 표와 필터가 붙은 목록은 `<section class="card">`. 글만 있는 구역은 카드 없이 `h-sec` 제목 아래에 선(`border-b border-line pb-2`). 되풀이 모양은 `docs/ui-guide.md`의 "방향"
   - 불러오는 중: `animate-pulse rounded-lg bg-sunken` 막대. 비었을 때: `EmptyState`(다음에 할 일을 적는다)
   - 오류: `try/catch` → `ui.fail(e)` (`useUi()`)
4. 열거형 값은 `StatusBadge` + `lib/labels.js`로 그린다. 새 열거형이면 `labels.js`에 표를 더한다.
5. `src/router/index.js`의 `routes`에 한 줄. 메뉴에 보여야 하면 `components/AppShell.vue`의 `allNav` 배열에 한 줄(아이콘은 lucide-vue-next).
6. 면접 한 건에 속한 화면이면 맨 위에 `<InterviewHeader :interview="…" current="prep|room|review" />`를 둔다.
7. **주차별 목업에 언제부터 보일지 정한다**(`docs/setup.md`의 "주차별 목업"). 새 화면·새 기능은 정하지 않으면 3주 차 목업부터 보인다.
   - 특정 주차부터 보여야 하면 `src/lib/features.js`의 `FIRST_SHOWN`에 `이름: 주차`를 더한다.
   - 라우트에는 `meta: { feature: '이름' }`, 메뉴(`AppShell.vue`의 `allNav`)에는 `feature: '이름'`, 화면 안의 일부면 `v-if="has('이름')"`.
   - `src/mocks/changelog.js`의 그 주차 항목에 한 줄 적는다(목업의 "달라진 것" 창에 나온다).
   - 이것은 목업용 스위치다. 개발 서버와 실제 배포에서는 항상 켜진다. 덜 끝난 기능을 숨기는 용도가 아니다(그건 `AGENTS.md`의 "협업").

## 하지 말 것
- 직접 색(`#fff`, `bg-blue-500`) 쓰기 → 토큰(`bg-surface`, `text-brand`)만
- `fetch`를 화면에서 직접 부르기
- 다른 기능 폴더의 내부 파일 import
- 외부 CDN 주소 넣기

## 확인
1. `npm run dev` → 브라우저 창을 **1366×768**로 줄여 가로 스크롤이 없는지, 주 버튼이 첫 화면에 보이는지 본다.
2. 왼쪽 아래 달 아이콘으로 어두운 화면도 본다.
3. 주차를 정했으면 `npm run build:demo` 뒤 그 주차와 바로 앞 주차의 목업을 열어, 앞 주차에는 안 보이고 그 주차에는 보이는지 확인한다.
4. `npm run check` 통과.
