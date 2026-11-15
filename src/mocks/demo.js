// 모의 면접 방의 재생 상태. 모의 소켓(socket.js)이 쓰고, 시연용 설명 띠(features/room/DemoGuide.vue)가 읽는다.
// 실제 Agent와는 무관하다: 계약에 없는 값이므로 소켓 이벤트로 보내지 않고 여기에 둔다.
import { reactive } from 'vue'

export const demo = reactive({
  /** IDLE(다음 말 대기) | LISTEN | REFINE | MATCH | FOLLOWUP | END(대본 끝) */
  stage: 'IDLE',
  /** 지금 문장에서 이미 끝난 단계 */
  done: [],
  /** 지금 문장을 말하는 사람: INTERVIEWER | CANDIDATE | null */
  speaker: null,
  paused: false,
  speed: 1,
  /** 대본의 몇 번째 문장인지(1부터)와 전체 문장 수 */
  line: 0,
  total: 0,
})

export function resetDemo() {
  Object.assign(demo, { stage: 'IDLE', done: [], speaker: null, paused: false, line: 0, total: 0 })
}
