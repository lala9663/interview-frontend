<script setup>
// 면접 후(11/18 회의 반영): 준비된 질문이 도움이 됐는지 면접이 끝난 자리에서 바로 받는다. 나중에 따로 물으면 아무도 답하지 않는다.
// 화면 시안이다. 저장하는 API 가 명세에 아직 없어 이 화면 안에서만 기억한다(새로 고치면 사라진다).
import { computed, ref } from 'vue'
import { MessageSquareHeart, ThumbsDown, ThumbsUp } from 'lucide-vue-next'
import { useUi } from '@/stores/ui.js'
import { QUESTION_SOURCE, labelOf } from '@/lib/labels.js'

const props = defineProps({ questions: { type: Array, required: true } })
const ui = useUi()

const OVERALL = [
  { key: 'GOOD', label: '도움이 됐다' },
  { key: 'SOSO', label: '보통' },
  { key: 'BAD', label: '도움이 안 됐다' },
]
const overall = ref(null)
const votes = ref({}) // 질문 id → 'UP' | 'DOWN'
const open = ref(false)
const sent = ref(false)

// 면접 전에 준비한 질문만 묻는다(면접 중에 더한 질문과 꼬리질문은 빼고)
const prepared = computed(() => props.questions.filter((q) => !q.hidden && !q.parentQuestionId && ['RESUME', 'JD', 'BANK'].includes(q.source)))
const voted = computed(() => Object.keys(votes.value).length)

function pick(key) {
  overall.value = key
  sent.value = false
}
function vote(q, v) {
  const next = { ...votes.value }
  if (next[q.id] === v) delete next[q.id]
  else next[q.id] = v
  votes.value = next
  sent.value = false
}
function send() {
  sent.value = true
  open.value = false
  ui.toast('의견을 남겼습니다. 다음 질문을 만들 때 참고합니다.', 'ok')
}
</script>

<template>
  <section class="card">
    <div class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
      <p class="flex items-center gap-2 font-semibold"><MessageSquareHeart :size="17" class="text-brand" />준비된 질문은 도움이 됐나요?</p>
      <div class="flex gap-1.5" role="radiogroup" aria-label="준비된 질문 전체 평가">
        <button v-for="o in OVERALL" :key="o.key" class="btn btn-sm" :class="overall === o.key ? 'border-brand text-brand' : ''" role="radio" :aria-checked="overall === o.key" @click="pick(o.key)">{{ o.label }}</button>
      </div>
      <button class="btn btn-sm btn-ghost" :aria-expanded="open" @click="open = !open">{{ open ? '질문별 의견 접기' : `질문별로 남기기${voted ? ` (${voted})` : ''}` }}</button>
      <span class="ml-auto flex items-center gap-2">
        <span v-if="sent" class="text-[0.82rem] font-semibold text-ok">남겼습니다</span>
        <button class="btn btn-sm btn-primary" :disabled="sent || (!overall && !voted)" @click="send">의견 남기기</button>
      </span>
    </div>
    <ol v-if="open" class="divide-y divide-line border-t border-line">
      <li v-for="q in prepared" :key="q.id" class="flex items-center gap-3 px-4 py-2">
        <span class="badge h-5 w-[68px] shrink-0 justify-center px-2 text-[0.74rem] tone-neutral">{{ labelOf(QUESTION_SOURCE, q.source) }}</span>
        <span class="min-w-0 flex-1 text-[0.93rem] leading-snug">{{ q.text }}<span v-if="!q.asked" class="ml-2 text-[0.78rem] text-faint">묻지 않음</span></span>
        <button class="btn btn-sm btn-icon" :class="votes[q.id] === 'UP' ? 'border-ok text-ok' : ''" :aria-pressed="votes[q.id] === 'UP'" aria-label="도움이 됐다" title="도움이 됐다" @click="vote(q, 'UP')"><ThumbsUp :size="15" /></button>
        <button class="btn btn-sm btn-icon" :class="votes[q.id] === 'DOWN' ? 'border-bad text-bad' : ''" :aria-pressed="votes[q.id] === 'DOWN'" aria-label="도움이 안 됐다" title="도움이 안 됐다" @click="vote(q, 'DOWN')"><ThumbsDown :size="15" /></button>
      </li>
    </ol>
  </section>
</template>
