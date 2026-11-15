// 마이크 소리를 16kHz 모노 PCM16으로 바꿔 100ms(1600샘플)씩 내보낸다. API 명세 3.1의 오디오 형식.
// AudioWorklet 안에서 돌기 때문에 import를 쓰지 않는 단독 파일이다.
const TARGET_RATE = 16000
const FRAME = 1600

class Pcm16Processor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.ratio = sampleRate / TARGET_RATE // 입력 샘플 몇 개가 출력 한 개인가
    this.pos = 0 // 다음 출력 샘플의 입력 위치(소수)
    this.prev = 0 // 직전 블록의 마지막 샘플(블록 경계 보간용)
    this.out = new Int16Array(FRAME)
    this.filled = 0
    this.sumSq = 0
  }

  process(inputs) {
    const input = inputs[0] && inputs[0][0]
    if (!input || !input.length) return true
    const n = input.length
    while (this.pos < n) {
      const i = Math.floor(this.pos)
      const frac = this.pos - i
      const a = i === 0 ? this.prev : input[i - 1]
      const b = input[i]
      const s = Math.max(-1, Math.min(1, a + (b - a) * frac))
      this.out[this.filled++] = s < 0 ? s * 0x8000 : s * 0x7fff
      this.sumSq += s * s
      if (this.filled === FRAME) {
        const level = Math.sqrt(this.sumSq / FRAME)
        const buf = this.out.buffer
        this.port.postMessage({ pcm: buf, level }, [buf])
        this.out = new Int16Array(FRAME)
        this.filled = 0
        this.sumSq = 0
      }
      this.pos += this.ratio
    }
    this.pos -= n
    this.prev = input[n - 1]
    return true
  }
}

registerProcessor('pcm16-processor', Pcm16Processor)
