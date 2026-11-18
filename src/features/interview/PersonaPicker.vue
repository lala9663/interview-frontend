<script setup>
// 면접 전(화면 시안): 면접관이 이 면접의 페르소나(진행 방식)를 고른다. 고르면 준비된 질문의 표현이 그에 맞게 바뀐다.
// 추천으로 켠 것은 카드로, 나머지는 작은 버튼으로 보인다(관리 > 면접 페르소나에서 정한다). 면접이 시작되면 바꿀 수 없다.
// API 명세에 아직 없다(api/index.js 의 personaApi).
import { computed, onMounted, ref } from 'vue'
import { Drama, Lock } from 'lucide-vue-next'
import { personaApi } from '@/api/index.js'
import { useUi } from '@/stores/ui.js'

const props = defineProps({ interview: { type: Object, required: true } })
const emit = defineEmits(['changed'])
const ui = useUi()

const personas = ref([])
const busy = ref(false)
const currentId = computed(() => props.interview.persona?.id)
const locked = computed(() => ['LIVE', 'ENDED'].includes(props.interview.roomStatus))
const enabled = computed(() => personas.value.filter((p) => p.enabled))
const cards = computed(() => enabled.value.filter((p) => p.recommended))
const others = computed(() => enabled.value.filter((p) => !p.recommended))
const current = computed(() => personas.value.find((p) => p.id === currentId.value) || props.interview.persona)

onMounted(async () => {
  try {
    personas.value = (await personaApi.list()).items
  } catch (e) {
    ui.fail(e)
  }
})

async function pick(p) {
  if (p.id === currentId.value || busy.value) return
  busy.value = true
  try {
    await personaApi.choose(props.interview.id, p.id)
    emit('changed')
    ui.toast(`${p.name}(으)로 바꿨습니다. 질문은 ${p.questionType}, 꼬리질문은 ${p.followUpType}입니다.`, 'ok')
  } catch (e) {
    ui.fail(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <!-- 시작한 뒤: 고른 것만 한 줄로 -->
  <p v-if="locked" class="flex flex-wrap items-center gap-2 text-[0.88rem] text-sub">
    <Lock :size="14" class="text-faint" /><span class="label">면접 페르소나</span>
    <span class="badge" :class="`tone-${current.tone}`">{{ current.name }}</span>
    질문 {{ current.questionType }} · 꼬리질문 {{ current.followUpType }} · 면접이 시작된 뒤에는 바꿀 수 없습니다
  </p>

  <section v-else class="card">
    <header class="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
      <h2 class="h-sec flex items-center gap-2"><Drama :size="16" class="text-faint" />면접 페르소나</h2>
      <span class="text-[0.82rem] text-faint">고르면 준비된 질문의 표현이 바뀝니다 · 면접을 시작하면 고정됩니다</span>
    </header>
    <div class="space-y-3 p-3">
      <div v-if="cards.length" class="grid gap-2 md:grid-cols-3" role="radiogroup" aria-label="추천 페르소나">
        <button
          v-for="p in cards"
          :key="p.id"
          class="rounded-md border px-3 py-2.5 text-left transition-colors"
          :class="p.id === currentId ? 'border-brand bg-brand-soft/40' : 'border-line hover:bg-sunken'"
          role="radio"
          :aria-checked="p.id === currentId"
          :disabled="busy"
          @click="pick(p)"
        >
          <span class="flex items-center justify-between gap-2">
            <b class="text-[0.95rem]">{{ p.name }}</b>
            <span class="badge" :class="p.id === currentId ? 'tone-brand' : 'tone-neutral'">{{ p.id === currentId ? '선택됨' : '추천' }}</span>
          </span>
          <span class="mt-1 block text-[0.84rem] leading-snug text-sub">{{ p.description }}</span>
          <span class="mt-1.5 block text-[0.78rem] text-faint">질문 {{ p.questionType }} · 꼬리질문 {{ p.followUpType }}</span>
        </button>
      </div>
      <div v-if="others.length" class="flex flex-wrap items-center gap-1.5" role="radiogroup" :aria-label="cards.length ? '다른 페르소나' : '페르소나'">
        <span class="mr-1 text-[0.82rem] text-faint">{{ cards.length ? '다른 페르소나' : '페르소나' }}</span>
        <button v-for="p in others" :key="p.id" class="btn btn-sm" :class="p.id === currentId ? 'border-brand text-brand' : ''" role="radio" :aria-checked="p.id === currentId" :disabled="busy" :title="p.description" @click="pick(p)">{{ p.name }}</button>
      </div>
      <p v-if="current" class="text-[0.82rem] leading-snug text-faint"><b class="font-semibold text-sub">{{ current.name }}</b> · {{ current.fit }}에 맞습니다. {{ current.guard }}</p>
    </div>
  </section>
</template>
