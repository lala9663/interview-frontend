// Agent WebSocket(계약 3장)을 감싼다. mock 주소(mock://)면 모의 소켓을 쓴다.
// 돌려주는 객체: { send(json), sendAudio(arrayBuffer), close() }

export async function openRoomSocket({ url, ticket, roomId, onEvent, onOpen, onClose }) {
  if (url.startsWith('mock://')) {
    const { MockRoomSocket } = await import('@/mocks/socket.js')
    const mock = new MockRoomSocket(roomId)
    mock.onmessage = onEvent
    mock.onclose = (e) => onClose?.(e.code)
    onOpen?.()
    return { send: (m) => mock.send(m), sendAudio: (b) => mock.sendAudio(b), close: () => mock.close() }
  }

  const ws = new WebSocket(url)
  ws.binaryType = 'arraybuffer'
  ws.onopen = () => {
    ws.send(JSON.stringify({ type: 'auth', ticket }))
    onOpen?.()
  }
  ws.onmessage = (e) => {
    if (typeof e.data !== 'string') return
    try {
      onEvent(JSON.parse(e.data))
    } catch {
      /* 모양이 틀린 메시지는 버린다 */
    }
  }
  ws.onclose = (e) => onClose?.(e.code)

  const open = () => ws.readyState === WebSocket.OPEN
  return {
    send: (m) => open() && ws.send(JSON.stringify(m)),
    // 네트워크가 밀리면(1초 분량 이상) 오디오를 버려 지연이 쌓이지 않게 한다
    sendAudio: (buf) => open() && ws.bufferedAmount < 64000 && ws.send(buf),
    close: () => ws.close(1000),
  }
}

/** 다시 붙지 않는 닫힘 코드: 정상 종료, 인증 실패, 마이크 단말 중복 */
export const FINAL_CLOSE_CODES = [1000, 4401, 4409]
