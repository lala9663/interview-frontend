<script setup>
// 왼쪽: 준비된 질문. 면접관이 질문을 말하면 자동으로 "물음" 표시가 붙고, 손으로도 바꿀 수 있다.
import { computed, ref } from 'vue'
import { Check, ListChecks, Plus } from 'lucide-vue-next'
import { QUESTION_SOURCE, labelOf, toneOf } from '@/lib/labels.js'

const props = defineProps({ questions: { type: Array, required: true }, highlightId: { type: Number, default: null }, readonly: Boolean })
const emit = defineEmits(['toggle', 'add'])

const draft = ref('')
const hideAsked = ref(false)
const list = computed(() => props.questions.filter((q) => !q.hidden && (!hideAsked.value || !q.asked)))
const askedCount = computed(() => props.questions.filter((q) => !q.hidden && q.asked).length)
const total = computed(() => props.questions.filter((q) => !q.hidden).length)

function add() {
  const text = draft.value.trim()
  if (!text) return
  emit('add', text)
  draft.value = ''
}
</script>

<template>
  <section class="flex min-h-0 flex-col">
    <header class="flex h-11 shrink-0 items-center justify-between border-b border-line px-3.5">
      <h2 class="flex items-center gap-2 text-[0.93rem] font-bold"><ListChecks :size="16" class="text-brand" />질문 <span class="font-semibold text-faint">{{ askedCount }}/{{ total }}</span></h2>
      <label class="flex cursor-pointer items-center gap-1.5 text-[0.8rem] font-medium text-sub">
        <input v-model="hideAsked" type="checkbox" class="h-3.5 w-3.5 accent-[rgb(var(--brand))]" />남은 것만
      </label>
    </header>
    <ol class="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2.5">
      <li v-for="q in list" :key="q.id">
        <button
          class="flex w-full gap-2.5 rounded-xl border px-3 py-2.5 text-left transition"
          :class="[
            q.asked ? 'border-transparent bg-sunken/70' : 'border-line bg-surface hover:border-brand/50',
            q.id === highlightId ? 'ring-2 ring-ok/50' : '',
          ]"
          :disabled="readonly"
          :aria-pressed="q.asked"
          @click="emit('toggle', q)"
        >
          <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border" :class="q.asked ? 'border-ok bg-ok text-white' : 'border-line'">
            <Check v-if="q.asked" :size="13" :stroke-width="3" />
          </span>
          <span class="min-w-0">
            <span class="block text-[0.93rem] leading-snug" :class="q.asked ? 'text-faint line-through decoration-faint/50' : 'font-semibold'">{{ q.text }}</span>
            <span class="mt-1 flex items-center gap-1.5 text-[0.76rem] text-faint">
              <span class="badge h-[18px] px-1.5 text-[0.7rem]" :class="`tone-${toneOf(QUESTION_SOURCE, q.source)}`">{{ labelOf(QUESTION_SOURCE, q.source) }}</span>
              <span class="truncate">{{ q.category }}</span>
            </span>
          </span>
        </button>
      </li>
      <li v-if="!list.length" class="px-3 py-6 text-center text-[0.88rem] text-sub">{{ total ? '준비한 질문을 모두 물었습니다.' : '준비된 질문이 없습니다.' }}</li>
    </ol>
    <form v-if="!readonly" class="flex gap-1.5 border-t border-line p-2.5" @submit.prevent="add">
      <input v-model="draft" class="input h-8 text-[0.88rem]" placeholder="질문 추가" aria-label="질문 추가" />
      <button class="btn btn-sm btn-icon" :disabled="!draft.trim()" aria-label="추가"><Plus :size="16" /></button>
    </form>
  </section>
</template>
