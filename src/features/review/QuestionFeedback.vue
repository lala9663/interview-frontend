<script setup>
// 면접 후(11/18 회의 반영): 준비된 질문이 도움이 됐는지 면접이 끝난 자리에서 바로 받는다. 나중에 따로 물으면 아무도 답하지 않는다.
// 사람마다 면접 한 건에 의견 하나를 저장한다(API 명세 2.6 의 question-feedback).
import { computed, onMounted, ref } from 'vue'
import { MessageSquareHeart, ThumbsDown, ThumbsUp } from 'lucide-vue-next'
import { interviewApi } from '@/api/index.js'
import { useUi } from '@/stores/ui.js'
import { QUESTION_SOURCE, labelOf } from '@/lib/labels.js'

const props = defineProps({ interviewId: { type: [String, Number], required: true }, questions: { type: Array, required: true } })
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
const saving = ref(false)

// 면접 전에 준비한 질문만 묻는다(면접 중에 더한 질문과 꼬리질문은 빼고)
const prepared = computed(() => props.questions.filter((q) => !q.hidden && !q.parentQuestionId && ['RESUME', 'JD', 'BANK'].includes(q.source)))
const voted = computed(() => Object.keys(votes.value).length)

// 이미 남긴 의견이 있으면 이어서 고친다
onMounted(async () => {
  try {
    const saved = await interviewApi.questionFeedback(props.interviewId)
    overall.value = saved?.overall ?? null
    votes.value = Object.fromEntries((saved?.votes || []).map((v) => [v.questionId, v.vote]))
    sent.value = !!(saved?.overall || saved?.votes?.length)
  } catch {
    /* 의견이 없어도 화면은 쓴다 */
  }
})

function pick(key) {
  overall.value = overall.value === key ? null : key
  sent.value = false
}
function vote(q, v) {
  const next = { ...votes.value }
  if (next[q.id] === v) delete next[q.id]
  else next[q.id] = v
  votes.value = next
  sent.value = false
}
async function send() {
  saving.value = true
  try {
    await interviewApi.saveQuestionFeedback(props.interviewId, {
      overall: overall.value,
      votes: Object.entries(votes.value).map(([questionId, v]) => ({ questionId: Number(questionId), vote: v })),
    })
    sent.value = true
    open.value = false
    ui.toast('의견을 남겼습니다.', 'ok')
  } catch (e) {
    ui.fail(e)
  } finally {
    saving.value = false
  }
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
        <button class="btn btn-sm btn-primary" :disabled="saving || sent || (!overall && !voted)" @click="send">{{ saving ? '저장하는 중…' : '의견 남기기' }}</button>
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
