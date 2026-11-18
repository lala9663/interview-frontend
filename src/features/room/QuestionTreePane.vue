<script setup>
// 가운데(11/18 회의 반영): 내 질문과 꼬리질문을 한 나무로 보여 준다. 꼬리질문은 그것이 나온 질문 아래에 가지로 붙는다.
// 면접관이 질문을 말하면 자동으로 "물음" 표시가 붙고, 손으로도 바꿀 수 있다. 제안된 꼬리질문은 누르거나 말로 물으면 채택된다.
// locked: 실시간 기능이 잠긴 면접(신입 대면). 제안은 오지 않고, 면접 전에 만든 예상 꼬리질문만 가지로 보인다.
import { computed, nextTick, ref, watch } from 'vue'
import { Check, CornerDownRight, ListTree, Plus, Sparkles } from 'lucide-vue-next'
import { flattenBranches, questionTree } from './room-state.js'
import { QUESTION_SOURCE, labelOf } from '@/lib/labels.js'

const props = defineProps({
  questions: { type: Array, required: true },
  followUps: { type: Array, default: () => [] },
  // 발화 기록: 언제 어느 질문을 물었는지 알아내는 데 쓴다(순서를 바꿔 묻거나 다시 물어도 가지의 자리가 맞게)
  utterances: { type: Array, default: () => [] },
  busy: Boolean,
  locked: Boolean,
  readonly: Boolean,
})
const emit = defineEmits(['toggle', 'adopt', 'request', 'add'])

const draft = ref('')
const hideAsked = ref(false)
const box = ref(null)

const tree = computed(() => questionTree(props.questions, props.followUps, props.utterances))
// branches: 가지를 그릴 순서대로 편 것. 꼬리의 꼬리는 depth 만큼 들여 쓴다
const roots = computed(() => tree.value.nodes.map((n, i) => ({ ...n, no: i + 1, branches: flattenBranches(n.children) })))
const shown = computed(() => roots.value.filter((n) => !hideAsked.value || !n.q.asked || n.q.id === tree.value.currentId))
const askedCount = computed(() => roots.value.filter((n) => n.q.asked).length)
// 숫자 키 1~3 은 가장 최근 제안 묶음을 가리킨다(RoomPage 의 단축키와 같은 순서)
const hotkeyOf = (f) => {
  const i = props.followUps[0]?.items.findIndex((x) => x.id === f.id) ?? -1
  return i >= 0 ? i + 1 : null
}

// 지금 묻고 있는 질문이 바뀌면 그 질문이 보이게 스크롤한다
const scrollTo = (id) => nextTick(() => box.value?.querySelector(`[data-qid="${id}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
watch(() => tree.value.currentId, (id) => id && scrollTo(id))
// 새 가지가 붙으면 그 가지가 보이게
watch(
  () => roots.value.find((n) => n.q.id === tree.value.currentId)?.branches.length,
  () => nextTick(() => box.value?.querySelector('[data-current] [data-last]')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })),
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
    <header class="flex h-11 shrink-0 items-center justify-between border-b border-line px-4">
      <h2 class="flex items-center gap-2 text-[0.93rem] font-bold"><ListTree :size="16" class="text-faint" />질문과 꼬리질문 <span class="font-semibold text-faint">{{ askedCount }}/{{ roots.length }}</span></h2>
      <div class="flex items-center gap-3">
        <label class="flex cursor-pointer items-center gap-1.5 text-[0.8rem] font-medium text-sub">
          <input v-model="hideAsked" type="checkbox" class="h-3.5 w-3.5 accent-[rgb(var(--brand))]" />남은 것만
        </label>
        <button v-if="!locked && !readonly" class="btn btn-sm" :disabled="busy" title="방금 답변으로 꼬리질문을 바로 만듭니다" @click="emit('request')"><Sparkles :size="14" />꼬리질문 지금 만들기</button>
      </div>
    </header>

    <div ref="box" class="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
      <article
        v-for="n in shown"
        :key="n.q.id"
        :data-qid="n.q.id"
        :data-current="n.q.id === tree.currentId ? '' : null"
        class="rounded-lg border transition-colors"
        :class="n.q.id === tree.currentId ? 'border-brand bg-brand-soft/40' : 'border-line'"
      >
        <button class="flex w-full gap-3 px-3.5 py-3 text-left" :disabled="readonly" :aria-pressed="n.q.asked" @click="emit('toggle', n.q)">
          <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[0.8rem] font-bold tabular-nums" :class="n.q.asked ? 'border-ok bg-ok text-white' : 'border-line text-faint'">
            <Check v-if="n.q.asked" :size="15" :stroke-width="3" /><template v-else>{{ n.no }}</template>
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-[1.08rem] leading-snug" :class="n.q.asked && n.q.id !== tree.currentId ? 'text-sub' : 'font-semibold'">{{ n.q.text }}</span>
            <span class="mt-1 block truncate text-[0.78rem] text-faint">{{ [labelOf(QUESTION_SOURCE, n.q.source, ''), n.q.category, n.q.intent].filter(Boolean).join(' · ') }}</span>
          </span>
          <span v-if="n.q.id === tree.currentId" class="badge tone-brand shrink-0 self-start">지금 질문</span>
        </button>

        <!-- 가지: 예상 꼬리질문, 제안된 꼬리질문, 채택한 꼬리질문 -->
        <ul v-if="n.branches.length" class="mb-3 ml-[26px] mr-3 space-y-1 border-l-2 pl-3" :class="n.q.id === tree.currentId ? 'border-brand/50' : 'border-line'">
          <li
            v-for="(c, i) in n.branches"
            :key="c.key"
            :data-last="i === n.branches.length - 1 ? '' : null"
            class="animate-rise"
            :class="c.depth ? 'border-l-2 border-line pl-2' : ''"
            :style="c.depth ? { marginLeft: `${c.depth * 20}px` } : null"
          >
            <!-- 질문 목록에 있는 가지(예상 꼬리질문, 채택한 꼬리질문): 누르면 물었음 -->
            <button v-if="c.kind === 'question'" class="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-sunken" :disabled="readonly" :aria-pressed="c.q.asked" @click="emit('toggle', c.q)">
              <span class="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border" :class="c.q.asked ? 'border-ok bg-ok text-white' : 'border-line text-faint'">
                <Check v-if="c.q.asked" :size="12" :stroke-width="3" /><CornerDownRight v-else :size="11" />
              </span>
              <span class="min-w-0">
                <span class="block text-[0.97rem] leading-snug" :class="c.q.asked ? 'text-sub' : 'font-medium'">{{ c.q.text }}</span>
                <span v-if="c.spoken" class="mt-0.5 block text-[0.76rem] font-semibold text-ok">말로 물어 자동으로 채택됨</span>
              </span>
            </button>
            <!-- 아직 채택하지 않은 제안: 누르면 질문 목록에 올린다 -->
            <button v-else class="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-sunken" :disabled="readonly || c.f.used" title="누르면 질문 목록에 올립니다" @click="emit('adopt', c.f)">
              <span v-if="hotkeyOf(c.f)" class="kbd mt-0.5 shrink-0">{{ hotkeyOf(c.f) }}</span>
              <Sparkles v-else :size="15" class="mt-1 shrink-0 text-faint" />
              <span class="min-w-0">
                <span class="block text-[0.97rem] font-semibold leading-snug text-brand">{{ c.f.text }}</span>
                <span v-if="c.f.rationale" class="mt-0.5 block text-[0.78rem] leading-snug text-sub">{{ c.f.rationale }}</span>
              </span>
            </button>
          </li>
        </ul>
      </article>

      <!-- 어느 질문에도 붙지 못한 제안 -->
      <div v-if="tree.loose.length" class="rounded-lg border border-dashed border-line px-3.5 py-2.5">
        <p class="label mb-1">질문과 이어지지 않은 꼬리질문</p>
        <template v-for="c in flattenBranches(tree.loose)" :key="c.key">
          <button v-if="c.kind === 'question'" class="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-[0.95rem] hover:bg-sunken" :disabled="readonly" @click="emit('toggle', c.q)">
            <span class="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border" :class="c.q.asked ? 'border-ok bg-ok text-white' : 'border-line text-faint'"><Check v-if="c.q.asked" :size="12" :stroke-width="3" /></span>{{ c.q.text }}
          </button>
          <button v-else class="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-[0.95rem] font-semibold text-brand hover:bg-sunken" :disabled="readonly" @click="emit('adopt', c.f)">
            <Sparkles :size="15" class="mt-1 shrink-0 text-faint" />{{ c.f.text }}
          </button>
        </template>
      </div>

      <p v-if="!roots.length" class="px-3 py-6 text-center text-[0.9rem] text-sub">준비된 질문이 없습니다.</p>
      <p v-else-if="!shown.length" class="px-3 py-4 text-center text-[0.9rem] text-sub">준비한 질문을 모두 물었습니다.</p>
    </div>

    <div v-if="!readonly" class="flex shrink-0 items-center gap-3 border-t border-line px-4 py-2">
      <p class="min-w-0 flex-1 truncate text-[0.78rem] text-faint">
        <template v-if="locked">질문을 누르면 "물었음"으로 표시합니다.<template v-if="roots.some((n) => n.branches.length)"> 가지는 면접 전에 만든 예상 꼬리질문입니다.</template></template>
        <template v-else>질문은 어느 순서로 물어도 됩니다. 꼬리질문은 방금 물은 질문 아래에 붙습니다. 누르거나 숫자 키 <span class="kbd">1</span>~<span class="kbd">3</span>, 또는 말로 물으면 채택됩니다.</template>
      </p>
      <form class="flex w-[280px] shrink-0 gap-1.5" @submit.prevent="add">
        <input v-model="draft" class="input h-8 text-[0.88rem]" placeholder="질문 직접 추가" aria-label="질문 추가" />
        <button class="btn btn-sm btn-icon" :disabled="!draft.trim()" aria-label="추가"><Plus :size="16" /></button>
      </form>
    </div>
  </section>
</template>
