<script setup>
// 면접 방 왼쪽 위(11/18 회의 반영): 사전 리포트에서 가져온 지원자 요약. 자세히 넣되 한 번에 한 묶음만 보이게 탭 세 개로 나눈다.
//  - 요약: 한 줄 소개, 핵심, 강점
//  - 확인할 점: 무엇을 · 왜(이력서의 그 문장) · 어느 질문으로 확인하는지. 그 질문을 물었으면 체크가 붙는다.
//  - 이력: 기간순 이력과, 요약·질문에서 제외한 항목
// 확인할 점의 근거 문장과 질문 연결(summary.checkItems), 이전 차수 확인점(previousRoundChecks)은 화면 시안이다.
// API 명세에 아직 없어 값이 없으면 글만 있는 확인할 점(summary.checkPoints)을 보여 준다.
import { computed, ref } from 'vue'
import { Check, ChevronDown, ChevronUp, CornerDownRight, EyeOff, Quote } from 'lucide-vue-next'
import { BLIND_FIELD, INTERVIEW_TYPE, labelOf } from '@/lib/labels.js'

const props = defineProps({ briefing: { type: Object, required: true }, questions: { type: Array, default: () => [] } })
const emit = defineEmits(['jump'])

const open = ref(true)
const tab = ref('summary')
const s = computed(() => props.briefing.summary)

// 준비된 질문(가지가 아닌 것)을 순서대로. 확인할 점의 questionOrder 가 이 순서의 번호다(1부터)
const prepared = computed(() => props.questions.filter((q) => !q.hidden && !q.parentQuestionId && q.source !== 'FOLLOW_UP'))
const checks = computed(() =>
  (s.value.checkItems || s.value.checkPoints.map((text) => ({ text }))).map((c) => {
    const question = c.questionOrder ? prepared.value[c.questionOrder - 1] : null
    return { ...c, question, no: question ? c.questionOrder : null, done: !!question?.asked }
  }),
)
const previous = computed(() => props.briefing.previousRoundChecks || null)
const left = computed(() => checks.value.filter((c) => c.question && !c.done).length)
const tabs = computed(() => [
  { key: 'summary', label: '요약' },
  { key: 'checks', label: '확인할 점', count: checks.value.length + (previous.value?.items.length || 0) },
  { key: 'history', label: '이력' },
])
</script>

<template>
  <section class="shrink-0 border-b border-line">
    <header class="flex h-11 items-center justify-between pl-3.5 pr-2">
      <h2 class="text-[0.93rem] font-bold">지원자 요약</h2>
      <div class="flex items-center">
        <div v-if="open" class="flex" role="tablist" aria-label="지원자 요약">
          <button v-for="t in tabs" :key="t.key" class="tab h-11 px-2 text-[0.84rem]" :class="{ 'tab-on': tab === t.key }" role="tab" :aria-selected="tab === t.key" @click="tab = t.key">
            {{ t.label }}<span v-if="t.count" class="text-[0.76rem] font-semibold text-faint">{{ t.count }}</span>
          </button>
        </div>
        <button class="btn btn-ghost btn-icon btn-sm ml-1" :aria-label="open ? '지원자 요약 접기' : '지원자 요약 펼치기'" :title="open ? '접기' : '펼치기'" :aria-expanded="open" @click="open = !open">
          <ChevronUp v-if="open" :size="16" /><ChevronDown v-else :size="16" />
        </button>
      </div>
    </header>

    <div v-if="open" class="max-h-[40vh] overflow-y-auto px-3.5 pb-3">
      <!-- 요약 -->
      <div v-if="tab === 'summary'" class="space-y-2.5">
        <p class="text-[0.95rem] font-semibold leading-snug">{{ s.headline }}</p>
        <ul class="space-y-1 text-[0.86rem] leading-snug">
          <li v-for="(x, i) in s.keyPoints" :key="i" class="flex gap-2"><span class="mt-[0.5em] h-1 w-1 shrink-0 rounded-full bg-brand" />{{ x }}</li>
        </ul>
        <div v-if="s.strengths?.length" class="border-l-2 border-ok pl-2.5">
          <p class="text-[0.76rem] font-bold text-ok">강점</p>
          <ul class="text-[0.86rem] leading-snug"><li v-for="(x, i) in s.strengths" :key="i">{{ x }}</li></ul>
        </div>
        <button v-if="checks.length" class="text-[0.82rem] font-semibold text-warn hover:underline" @click="tab = 'checks'">
          확인할 점 {{ checks.length }}개<template v-if="left"> · 아직 {{ left }}개 남음</template>
        </button>
      </div>

      <!-- 확인할 점 -->
      <div v-else-if="tab === 'checks'" class="space-y-2">
        <div v-if="previous" class="rounded-md bg-sunken/70 px-2.5 py-2">
          <p class="text-[0.76rem] font-bold text-sub">{{ previous.seq }}차 {{ labelOf(INTERVIEW_TYPE, previous.type) }}에서 넘어온 확인점</p>
          <ul class="mt-1 space-y-0.5 text-[0.86rem] leading-snug">
            <li v-for="(x, i) in previous.items" :key="i" class="flex gap-1.5"><CornerDownRight :size="13" class="mt-0.5 shrink-0 text-faint" />{{ x }}</li>
          </ul>
        </div>
        <article v-for="(c, i) in checks" :key="i" class="rounded-md border px-2.5 py-2" :class="c.done ? 'border-line' : 'border-warn/40'">
          <p class="flex items-start gap-2 text-[0.9rem] font-semibold leading-snug" :class="c.done ? 'text-sub' : ''">
            <span class="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border text-[0.74rem] font-bold" :class="c.done ? 'border-ok bg-ok text-white' : 'border-warn/60 text-warn'">
              <Check v-if="c.done" :size="12" :stroke-width="3" /><template v-else>?</template>
            </span>
            {{ c.text }}
          </p>
          <p v-if="c.evidence" class="mt-1.5 flex gap-1.5 pl-[26px] text-[0.82rem] leading-snug text-sub">
            <Quote :size="12" class="mt-0.5 shrink-0 text-faint" /><span><span class="font-semibold text-faint">{{ c.evidenceFrom || '이력서' }}</span> · {{ c.evidence }}</span>
          </p>
          <button v-if="c.question" class="mt-1.5 flex w-full items-start gap-1.5 rounded px-1 py-0.5 pl-[26px] text-left text-[0.82rem] leading-snug text-brand hover:bg-sunken" title="가운데의 그 질문으로 가기" @click="emit('jump', c.question.id)">
            <span class="shrink-0 font-bold">질문 {{ c.no }}</span><span class="min-w-0 truncate">{{ c.question.text }}</span><span v-if="c.done" class="shrink-0 font-semibold text-ok">물었음</span>
          </button>
          <p v-else-if="!c.evidence" class="mt-1 pl-[26px] text-[0.78rem] text-faint">연결된 질문이 없습니다. 직접 물어 확인해 주세요.</p>
        </article>
        <p v-if="!checks.length && !previous" class="py-3 text-center text-[0.86rem] text-sub">확인할 점이 없습니다.</p>
      </div>

      <!-- 이력 -->
      <div v-else class="space-y-2.5">
        <ul v-if="s.timeline?.length" class="space-y-1.5">
          <li v-for="(t, i) in s.timeline" :key="i" class="text-[0.86rem] leading-snug">
            <span class="block text-[0.78rem] font-medium tabular-nums text-faint">{{ t.period }}</span>{{ t.text }}
          </li>
        </ul>
        <p v-else class="text-[0.86rem] text-sub">이력 정보가 없습니다.</p>
        <p v-if="briefing.excluded?.length" class="flex items-start gap-1.5 border-t border-line pt-2 text-[0.78rem] leading-snug text-faint">
          <EyeOff :size="13" class="mt-0.5 shrink-0" />요약과 질문에서 제외한 항목: {{ briefing.excluded.map((f) => BLIND_FIELD[f] || f).join(', ') }}
        </p>
      </div>
    </div>
  </section>
</template>
