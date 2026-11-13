<script setup>
// 전형 현황: 면접자마다 면접 차수가 어디까지 갔는지 한 줄로 본다. 여러 차수를 보는 경력 채용에서 주로 쓴다.
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { GitBranch } from 'lucide-vue-next'
import StageTrack from '@/components/StageTrack.vue'
import EmptyState from '@/components/EmptyState.vue'
import { interviewApi } from '@/api/index.js'
import { useUi } from '@/stores/ui.js'

const ui = useUi()
const router = useRouter()
const interviews = ref([])
const loading = ref(false)
const filter = ref('ALL')
const filters = [
  { key: 'ALL', label: '전체' },
  { key: 'ACTIVE', label: '진행 중' },
  { key: 'TODO', label: '내 평가 필요' },
  { key: 'DONE', label: '모든 차수 완료' },
]

async function load() {
  if (!ui.recruitmentId) return
  loading.value = true
  try {
    interviews.value = (await interviewApi.list({ recruitmentId: ui.recruitmentId, size: 500 })).items
  } catch (e) {
    ui.fail(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)
watch(() => ui.recruitmentId, load)

const people = computed(() => {
  const map = new Map()
  interviews.value.forEach((it) => {
    if (!map.has(it.candidate.id)) map.set(it.candidate.id, { candidate: it.candidate, interviews: [] })
    map.get(it.candidate.id).interviews.push(it)
  })
  return [...map.values()]
    .map((p) => {
      p.interviews.sort((a, b) => a.seq - b.seq)
      const live = p.interviews.filter((i) => i.status !== 'CANCELED')
      p.doneCount = live.filter((i) => i.status === 'DONE').length
      p.total = live.length
      p.allDone = p.total > 0 && p.doneCount === p.total
      p.needsEval = live.some((i) => i.status === 'EVALUATING')
      p.next = live.find((i) => i.status !== 'DONE') || null
      return p
    })
    .filter((p) => ({ ALL: true, ACTIVE: !p.allDone, TODO: p.needsEval, DONE: p.allDone })[filter.value])
    .sort((a, b) => Number(a.allDone) - Number(b.allDone) || new Date(a.next?.scheduledAt || 8.64e15) - new Date(b.next?.scheduledAt || 8.64e15))
})

function open(it) {
  router.push({ name: it.status === 'EVALUATING' || it.status === 'DONE' ? 'review' : 'prep', params: { id: it.id } })
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="h-page">전형 현황</h1>
        <p class="text-[0.9rem] text-sub">{{ ui.recruitment?.title }} · 면접자별 차수 진행</p>
      </div>
      <div class="flex gap-1">
        <button v-for="f in filters" :key="f.key" class="btn btn-sm" :class="filter === f.key ? 'btn-primary' : 'btn-ghost'" @click="filter = f.key">{{ f.label }}</button>
      </div>
    </div>

    <div v-if="loading && !people.length" class="space-y-2"><div v-for="n in 4" :key="n" class="h-24 animate-pulse rounded-2xl bg-sunken" /></div>
    <div v-else-if="!people.length" class="card">
      <EmptyState title="해당하는 면접자가 없습니다" hint="면접자 메뉴에서 면접을 등록하면 여기에 진행 상황이 보입니다."><template #icon><GitBranch :size="22" /></template></EmptyState>
    </div>
    <ul v-else class="space-y-2.5">
      <li v-for="p in people" :key="p.candidate.id" class="card flex flex-wrap items-center gap-4 px-4 py-3">
        <RouterLink :to="{ name: 'candidate', params: { id: p.candidate.id } }" class="w-48 shrink-0 hover:underline">
          <p class="truncate font-bold">{{ p.candidate.name }}</p>
          <p class="truncate text-[0.84rem] text-sub">{{ p.candidate.jobTitle }}</p>
        </RouterLink>
        <div class="w-20 shrink-0">
          <p class="text-[0.78rem] font-semibold text-faint">진행</p>
          <p class="font-bold tabular-nums">{{ p.doneCount }}<span class="font-medium text-faint"> / {{ p.total }}</span></p>
          <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-sunken"><div class="h-full rounded-full bg-ok transition-all" :style="{ width: `${p.total ? (p.doneCount / p.total) * 100 : 0}%` }" /></div>
        </div>
        <StageTrack class="min-w-[360px] flex-1" :interviews="p.interviews" @open="open" />
      </li>
    </ul>
  </div>
</template>
