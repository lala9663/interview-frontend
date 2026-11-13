import { onBeforeUnmount, ref } from 'vue'

const MESSAGES = {
  NotAllowedError: '마이크 권한이 꺼져 있습니다. 주소창의 자물쇠 아이콘에서 마이크를 허용해 주세요.',
  NotFoundError: '마이크를 찾을 수 없습니다. 마이크가 연결되어 있는지 확인해 주세요.',
  NotReadableError: '다른 프로그램이 마이크를 쓰고 있습니다. 화상 회의 프로그램을 닫고 다시 시도해 주세요.',
}

/**
 * 마이크 → 16kHz PCM16 프레임. onFrame(ArrayBuffer)로 100ms마다 넘긴다.
 * level은 0~1의 소리 크기(화면의 막대용).
 */
export function useMicrophone(onFrame) {
  const active = ref(false)
  const muted = ref(false)
  const level = ref(0)
  const error = ref('')
  let stream = null
  let ctx = null
  let node = null

  async function start() {
    if (active.value) return true
    error.value = ''
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      ctx = new AudioContext()
      await ctx.audioWorklet.addModule('/audio/pcm16-worklet.js')
      node = new AudioWorkletNode(ctx, 'pcm16-processor')
      node.port.onmessage = (e) => {
        level.value = muted.value ? 0 : Math.min(1, e.data.level * 6)
        if (!muted.value) onFrame(e.data.pcm)
      }
      ctx.createMediaStreamSource(stream).connect(node)
      active.value = true
      return true
    } catch (e) {
      error.value = MESSAGES[e?.name] || '마이크를 시작하지 못했습니다.'
      stop()
      return false
    }
  }

  function stop() {
    node?.disconnect()
    stream?.getTracks().forEach((t) => t.stop())
    ctx?.close().catch(() => {})
    node = stream = ctx = null
    active.value = false
    level.value = 0
  }

  function toggleMute() {
    muted.value = !muted.value
  }

  onBeforeUnmount(stop)
  return { active, muted, level, error, start, stop, toggleMute }
}
