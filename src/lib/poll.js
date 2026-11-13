import { onBeforeUnmount } from 'vue'

/**
 * 조건이 참인 동안 fn을 주기적으로 부른다. 컴포넌트가 사라지면 멈춘다.
 * AI 작업(브리핑, 보고서)이 끝나길 기다릴 때 쓴다.
 */
export function usePolling(fn, { interval = 2500, when = () => true } = {}) {
  let timer = null
  let stopped = false
  const tick = async () => {
    if (stopped) return
    if (when()) {
      try {
        await fn()
      } catch {
        /* 다음 주기에 다시 */
      }
    }
    timer = setTimeout(tick, interval)
  }
  timer = setTimeout(tick, interval)
  const stop = () => {
    stopped = true
    clearTimeout(timer)
  }
  onBeforeUnmount(stop)
  return stop
}
