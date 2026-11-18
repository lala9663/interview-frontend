<script setup>
// 위쪽 줄의 시스템 상태 버튼: 면접관이 음성 인식과 LLM이 지금 괜찮은지, 얼마나 기다리는지 한눈에 본다.
// 누르면 서비스별 상태와 예상 대기 시간이 뜬다. 30초마다 다시 읽는다.
// API 명세 2.13(api/index.js 의 systemApi).
import { computed, onMounted, ref } from 'vue'
import Modal from '@/components/Modal.vue'
import SystemStatusPanel from '@/components/SystemStatusPanel.vue'
import { systemApi } from '@/api/index.js'
import { usePolling } from '@/lib/poll.js'
import { SYSTEM_STATUS, toneOf } from '@/lib/labels.js'

const status = ref(null)
const open = ref(false)

async function load() {
  status.value = await systemApi.status()
}
onMounted(() => load().catch(() => {}))
usePolling(load, { interval: 30000 })

// 가장 나쁜 상태 하나로 요약한다
const RANK = { OK: 0, DEGRADED: 1, DOWN: 2 }
const worst = computed(() => (status.value?.services || []).reduce((w, s) => (RANK[s.status] > RANK[w.status] ? s : w), { status: 'OK' }))
const briefing = computed(() => status.value?.waits?.find((w) => w.key === 'BRIEFING'))
const text = computed(() => {
  if (!status.value) return '상태 확인 중'
  if (worst.value.status === 'OK') return 'AI 정상'
  return `${worst.value.name} ${worst.value.status === 'DOWN' ? '멈춤' : '지연'}`
})
</script>

<template>
  <button class="badge h-7 cursor-pointer px-2.5 hover:bg-sunken" :class="`tone-${status ? toneOf(SYSTEM_STATUS, worst.status) : 'neutral'}`" title="시스템 상태 보기" @click="open = true">
    {{ text }}<template v-if="status && briefing && worst.status !== 'OK'"> · 사전 리포트 약 {{ briefing.seconds }}초</template>
  </button>

  <Modal v-if="open && status" title="시스템 상태" @close="open = false">
    <SystemStatusPanel :status="status" />
    <p class="mt-3 text-[0.8rem] leading-snug text-faint">AI가 늦거나 멈춰도 면접은 계속할 수 있습니다. 준비된 질문과 메모는 그대로 쓸 수 있고, 밀린 작업은 상태가 풀리면 이어서 처리됩니다.</p>
    <template #footer><button class="btn btn-primary" @click="open = false">닫기</button></template>
  </Modal>
</template>
