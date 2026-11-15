<script setup>
// 왼쪽: 준비된 질문을 한 목록에 출처 순서대로 보여 준다(이력서 → JD → 질문 은행 → 추가).
// 출처가 바뀌는 자리에 작은 구역 제목이 있고, 스크롤해도 지금 구역의 제목이 위에 붙어 있다.
// 면접관이 질문을 말하면 자동으로 "물음" 표시가 붙고, 손으로도 바꿀 수 있다.
import { computed, nextTick, ref, watch } from 'vue'
import { Check, ListChecks, Plus } from 'lucide-vue-next'

const props = defineProps({ questions: { type: Array, required: true }, highlightId: { type: Number, default: null }, readonly: Boolean })
const emit = defineEmits(['toggle', 'add'])

// 구역 정의와 순서. 출처를 더하면 여기에 넣는다. 어디에도 없는 출처는 '추가'로 간다.
const GROUPS = [
  { key: 'RESUME', label: '이력서', sources: ['RESUME'], hint: '이 지원자의 이력서·자소서에서 만든 질문' },
  { key: 'JD', label: 'JD', sources: ['JD'], hint: '직무(JD)에서 만든 질문' },
  { key: 'BANK', label: '질문 은행', sources: ['BANK'], hint: '직무별로 자주 쓰는 질문' },
  { key: 'EXTRA', label: '추가', sources: ['FOLLOW_UP', 'MANUAL'], hint: '면접 중 올린 꼬리질문과 직접 추가한 질문' },
]
const groupOf = (q) => GROUPS.find((g) => g.sources.includes(q.source))?.key || 'EXTRA'

const draft = ref('')
const hideAsked = ref(false)
const box = ref(null)
const visible = computed(() => props.questions.filter((q) => !q.hidden))
const askedCount = computed(() => visible.value.filter((q) => q.asked).length)

// 구역마다: 전체, 물은 수, 화면에 보일 질문. 번호는 목록 전체에서 이어진다.
const sections = computed(() => {
  let no = 0
  return GROUPS.map((g) => {
    const all = visible.value.filter((q) => groupOf(q) === g.key).map((q) => ({ q, no: ++no }))
    return { ...g, total: all.length, asked: all.filter((x) => x.q.asked).length, rows: all.filter((x) => !hideAsked.value || !x.q.asked) }
  }).filter((g) => g.total)
})
const shownCount = computed(() => sections.value.reduce((n, g) => n + g.rows.length, 0))

// 자동으로 인식된 질문과 새로 추가된 질문은 보이는 곳으로 스크롤한다
const scrollTo = (id) => nextTick(() => box.value?.querySelector(`[data-qid="${id}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
watch(() => props.highlightId, (id) => id && scrollTo(id))
watch(
  () => visible.value.length,
  (n, old) => n > old && scrollTo(visible.value[visible.value.length - 1].id),
)

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
      <h2 class="flex items-center gap-2 text-[0.93rem] font-bold"><ListChecks :size="16" class="text-faint" />질문 <span class="font-semibold text-faint">{{ askedCount }}/{{ visible.length }}</span></h2>
      <label class="flex cursor-pointer items-center gap-1.5 text-[0.8rem] font-medium text-sub">
        <input v-model="hideAsked" type="checkbox" class="h-3.5 w-3.5 accent-[rgb(var(--brand))]" />남은 것만
      </label>
    </header>

    <div ref="box" class="min-h-0 flex-1 overflow-y-auto">
      <section v-for="g in sections" :key="g.key" :aria-label="`${g.label} 질문`">
        <h3 class="sticky top-0 z-10 flex items-center justify-between bg-surface/95 px-3.5 py-1.5 text-[0.78rem] font-bold text-sub backdrop-blur" :title="g.hint">
          <span class="flex items-center gap-1.5"><span class="h-3 w-[3px] rounded-full bg-brand" />{{ g.label }}</span>
          <span class="font-semibold tabular-nums" :class="g.asked === g.total ? 'text-ok' : 'text-faint'">{{ g.asked }}/{{ g.total }}</span>
        </h3>
        <ol class="px-1.5 pb-2">
          <li v-for="{ q, no } in g.rows" :key="q.id" :data-qid="q.id">
            <button
              class="flex w-full gap-2.5 rounded-md px-2 py-2 text-left transition-colors"
              :class="[
                q.asked ? '' : 'hover:bg-sunken',
                q.id === highlightId ? 'ring-2 ring-ok/50' : '',
              ]"
              :disabled="readonly"
              :aria-pressed="q.asked"
              @click="emit('toggle', q)"
            >
              <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[0.72rem] font-bold tabular-nums" :class="q.asked ? 'border-ok bg-ok text-white' : 'border-line text-faint'">
                <Check v-if="q.asked" :size="13" :stroke-width="3" /><template v-else>{{ no }}</template>
              </span>
              <span class="min-w-0">
                <span class="block text-[0.93rem] leading-snug" :class="q.asked ? 'text-faint line-through decoration-faint/50' : 'font-semibold'">{{ q.text }}</span>
                <span v-if="q.category || q.intent" class="mt-1 block truncate text-[0.76rem] text-faint">{{ [q.category, q.intent].filter(Boolean).join(' · ') }}</span>
              </span>
            </button>
          </li>
          <li v-if="!g.rows.length" class="px-2 py-1 text-[0.8rem] text-faint">모두 물었습니다.</li>
        </ol>
      </section>
      <p v-if="!visible.length" class="px-3 py-6 text-center text-[0.88rem] text-sub">준비된 질문이 없습니다.</p>
      <p v-else-if="!shownCount" class="px-3 py-4 text-center text-[0.88rem] text-sub">준비한 질문을 모두 물었습니다.</p>
    </div>

    <form v-if="!readonly" class="flex gap-1.5 border-t border-line p-2.5" @submit.prevent="add">
      <input v-model="draft" class="input h-8 text-[0.88rem]" placeholder="질문 직접 추가" aria-label="질문 추가" />
      <button class="btn btn-sm btn-icon" :disabled="!draft.trim()" aria-label="추가"><Plus :size="16" /></button>
    </form>
  </section>
</template>
