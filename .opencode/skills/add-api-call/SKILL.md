---
name: add-api-call
description: 화면에서 백엔드 API를 새로 부르거나 기존 호출을 고칠 때 쓴다. api/index.js와 모의 서버(mocks/server.js)를 함께 맞추는 절차.
---

# 백엔드 API 호출 더하기

## 전제
엔드포인트가 `docs/contract/api-contract.md`에 **이미 있어야** 한다. 없으면 skill `change-api-contract`가 먼저다.

## 순서
1. **API 명세 확인**: 경로, 메서드, 요청·응답 필드 이름(camelCase), 열거형 값을 API 명세에서 그대로 읽는다.
2. **`src/api/index.js`**: 알맞은 묶음(`candidateApi`, `interviewApi`, `roomApi`, `miscApi` …)에 함수 한 줄.
   ```js
   notes: (id) => http.get(`/interviews/${id}/notes`),
   saveNote: (id, body) => http.put(`/interviews/${id}/notes`, body),
   ```
   쿼리는 `http.get(path, { key: value })`, 파일은 `http.upload(path, formData)`.
3. **`src/mocks/server.js`**: `routes` 배열에 같은 메서드·같은 경로(`:id` 형식)로 한 줄. 응답은 API 명세와 **같은 모양**이어야 한다.
   ```js
   ['GET', '/interviews/:id/notes', ([id]) => ({ items: db.notes.get(Number(id)) || [] })],
   ```
   - 상태가 필요하면 파일 위쪽 `db`에 칸을 더한다.
   - 가상 데이터가 필요하면 `mocks/data.js`에(가상의 인물만).
   - 오류는 `throw new ApiError(404, 'X_NOT_FOUND', '…')`.
4. **화면**에서 부른다. `try { … } catch (e) { ui.fail(e) }`.
5. AI 작업처럼 기다려야 하면 결과의 `status`를 `usePolling`(`lib/poll.js`)으로 다시 읽는다. `when`에 "아직 RUNNING인가"를 넣어 끝나면 멈추게 한다.

## 확인
- `npm run dev`(mock)에서 화면이 동작한다. `MOCK_ROUTE_MISSING` 토스트가 없어야 한다.
- 백엔드가 준비됐으면 `npm run dev:api`로 실제 응답과 mock 응답의 모양이 같은지 본다. 다르면 **API 명세가 기준**이다: API 명세와 다른 쪽을 고친다.
- `npm run check`.
