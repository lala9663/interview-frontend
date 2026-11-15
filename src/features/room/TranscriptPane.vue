<script setup>
// 가운데: 실시간 전사. 지원자 답변을 크게, 면접관 질문은 작게. 새 글이 오면 아래로 따라간다.
import { computed, nextTick, ref, watch } from 'vue'
import { ArrowDown, AudioLines, Link2 } from 'lucide-vue-next'
import { groupTurns } from './room-state.js'
import { SPEAKER, SPEAKER_METHOD } from '@/lib/labels.js'
import { clock } from '@/lib/format.js'

const props = defineProps({
  utterances: { type: Array, required: true },
  partial: { type: Object, default: null },
  questions: { type: Array, default: () => [] },
  live: Boolean,
  readonly: Boolean,
})
const emit = defineEmits(['fix-speaker'])

const box = ref(null)
const pinned = ref(true)
const showRaw = ref(false)
const turns = computed(() => groupTurns(props.utterances))
const questionText = (id) => props.questions.find((q) => q.id === id)?.text

function onScroll() {
  const el = box.value
  pinned.value = el.scrollHeight - el.scrollTop - el.clientHeight < 80
}
function toBottom() {
  pinned.value = true
  box.value?.scrollTo({ top: box.value.scrollHeight, behavior: 'smooth' })
}
watch(
  () => [props.utterances.length, props.partial?.text],
  () => pinned.value && nextTick(() => box.value?.scrollTo({ top: box.value.scrollHeight })),
)

const other = (s) => (s === 'CANDIDATE' ? 'INTERVIEWER' : 'CANDIDATE')
</script>

<template>
  <section class="relative flex min-h-0 flex-1 flex-col">
    <header class="flex h-11 shrink-0 items-center justify-between border-b border-line px-4">
      <h2 class="flex items-center gap-2 text-[0.93rem] font-bold"><AudioLines :size="16" class="text-faint" />대화</h2>
      <label class="flex cursor-pointer items-center gap-1.5 text-[0.82rem] font-medium text-sub">
        <input v-model="showRaw" type="checkbox" class="h-3.5 w-3.5 accent-[rgb(var(--brand))]" />다듬기 전 원문
      </label>
    </header>

    <div ref="box" class="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4" @scroll="onScroll">
      <div v-if="!turns.length && !partial" class="flex h-full flex-col items-center justify-center gap-2 text-center text-sub">
        <AudioLines :size="30" class="text-faint" />
        <p class="font-semibold">{{ live ? '말을 시작하면 여기에 글로 나타납니다' : '면접을 시작하면 대화가 기록됩니다' }}</p>
        <p class="text-[0.88rem] text-faint">문장이 끝날 때마다 다듬어서 보여 줍니다. 몇 초 늦게 나타날 수 있습니다.</p>
      </div>

      <article v-for="t in turns" :key="t.key" class="animate-rise" :class="t.speaker === 'INTERVIEWER' ? 'pr-10' : ''">
        <div class="mb-1 flex items-center gap-2">
          <button
            class="badge h-[22px] px-2 text-[0.76rem]"
            :class="t.speaker === 'CANDIDATE' ? 'tone-brand' : t.speaker === 'INTERVIEWER' ? 'tone-neutral' : 'tone-warn'"
            :disabled="readonly"
            :title="readonly ? '' : `눌러서 ${SPEAKER[other(t.speaker)].label}(으)로 바꾸기 · ${SPEAKER_METHOD[t.items[0].speakerMethod] || ''}`"
            @click="t.items.forEach((u) => emit('fix-speaker', u, other(t.speaker)))"
          >
            {{ SPEAKER[t.speaker]?.label || '미확인' }}
          </button>
          <span class="text-[0.76rem] tabular-nums text-faint">{{ clock(t.items[0].startMs) }}</span>
          <span v-if="t.items[0].matchedQuestionId" class="flex min-w-0 items-center gap-1 text-[0.78rem] font-semibold text-ok" :title="questionText(t.items[0].matchedQuestionId)">
            <Link2 :size="13" class="shrink-0" /><span class="truncate">준비된 질문과 일치</span>
          </span>
        </div>
        <p
          v-for="u in t.items"
          :key="u.seq"
          :data-seq-anchor="u.seq"
          class="leading-relaxed"
          :class="t.speaker === 'CANDIDATE' ? 'text-[1.08rem] text-ink' : 'text-[0.97rem] font-medium text-sub'"
        >
          {{ showRaw ? u.rawText : u.refinedText || u.rawText }}
        </p>
      </article>

      <p v-if="partial" class="flex items-start gap-2 text-[1.02rem] leading-relaxed text-faint">
        <span class="mt-[0.6em] flex shrink-0 gap-0.5">
          <span v-for="n in 3" :key="n" class="h-1.5 w-1.5 animate-dot rounded-full bg-brand" :style="{ animationDelay: `${n * 0.18}s` }" />
        </span>
        {{ partial.text }}
      </p>
    </div>

    <button v-if="!pinned" class="btn btn-sm absolute bottom-3 left-1/2 -translate-x-1/2 shadow-pop" @click="toBottom"><ArrowDown :size="15" />최신 대화로</button>
  </section>
</template>
