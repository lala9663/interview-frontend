---
name: work-on-live-room
description: 면접 중 화면(실시간 전사, 꼬리질문, 화자 표시, 마이크, 재연결)을 고치거나 새 실시간 이벤트를 더할 때 쓴다. features/room의 구조와 지켜야 할 것.
---

# 면접 방(실시간) 고치기

## 먼저 읽을 것
- `docs/realtime-room.md` (흐름, 끊겼을 때, 단축키, 화면 규칙)
- `docs/contract/api-contract.md` 3장 (WebSocket 메시지)

## 구조 한 줄 요약
`RoomPage.vue`(틀·단축키) → `use-room.js`(데이터·소켓·재연결) → `room-state.js`(이벤트를 상태로, 순수 함수) / `use-microphone.js`(마이크 → PCM16) / 세 칸 컴포넌트.

## 새 서버 이벤트를 화면에 반영하기
1. 계약 3.2에 이벤트가 있는지 확인(없으면 skill `change-api-contract`).
2. `room-state.js`
   - 필요한 상태를 `createRoomState()`에 더한다.
   - `applyEvent`의 `switch`에 `case`를 더한다. **여기서는 네트워크·DOM·타이머를 쓰지 않는다.**
3. `room-state.test.js`에 그 이벤트의 테스트를 더한다(순서가 바뀌어 오거나 두 번 와도 괜찮은지 포함).
4. `mocks/socket.js`가 같은 이벤트를 내보내게 해서 `npm run dev`에서 볼 수 있게 한다.
5. 칸 컴포넌트에서 `state`를 그린다.

## 새 클라이언트 메시지를 보내기
`use-room.js`에 동작 함수를 더하고(`send({ type: '…' })`), 화면은 그 함수를 부른다. 화면을 먼저 바꾸고(낙관적 갱신) 서버가 같은 내용을 이벤트로 돌려주면 덮어쓰이게 한다. `mocks/socket.js`의 `send`에도 처리 한 줄.

## 지켜야 할 것
- **면접이 멈추면 안 된다.** 소켓·STT·LLM이 실패해도 화면은 계속 쓸 수 있어야 한다(메모, 질문 표시). 오류는 위쪽 노란 줄에 문장으로 알린다.
- **seq로만 순서를 판단한다.** 이벤트는 늦게, 겹쳐, 순서가 바뀌어 올 수 있다. `upsertUtterance`를 쓴다.
- **페이지 스크롤 금지.** 1366×768에서 세 칸이 한 화면에 들어와야 한다. 칸을 더하지 말고 기존 칸 안에 넣는다.
- **오디오 형식 고정**: 16kHz, 모노, PCM 16비트 리틀엔디언. `public/audio/pcm16-worklet.js`는 import 없는 단독 파일이어야 한다.
- 지원자 답변 글자가 화면에서 가장 크게 보여야 한다.
- 단축키는 입력 칸에 초점이 있을 때 동작하면 안 된다(`RoomPage.vue`의 `onKey`).

## 확인
- `npm run dev` → 오늘 화면에서 예정 면접 → 면접 방 입장 → 면접 시작. 대본이 흐르며 전사 → 질문 일치 → 꼬리질문이 나오는지.
- 면접 종료 → 평가 화면에서 초안 보고서 → 약 12초 뒤 보정본으로 바뀌는지.
- 실제 Agent로는 `npm run dev:api`. 마이크 권한을 허용하고 말해 본다.
- `npm run check`.
