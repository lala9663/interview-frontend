<script setup>
// 진행 현황: 면접자가 수백 명이어도 한눈에 보이도록 만든 화면.
//  - 위: 면접 유형 × 상태 집계(누르면 그 조건으로 걸러진다)
//  - 아래: 면접자 한 줄에 유형별 상태를 칸으로 보여 주는 촘촘한 표(검색·직무·내 면접·페이지)
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronLeft, ChevronRight, GitBranch, Search, X } from 'lucide-vue-next'
import EmptyState from '@/components/EmptyState.vue'
import { fetchAll, interviewApi } from '@/api/index.js'
import { useAuth } from '@/stores/auth.js'
import { useUi } from '@/stores/ui.js'
import { usePolling } from '@/lib/poll.js'
import { hm, isToday, md } from '@/lib/format.js'
import { INTERVIEW_STATUS, INTERVIEW_TYPE, labelOf } from '@/lib/labels.js'

const auth = useAuth()
const ui = useUi()
const router = useRouter()

const PAGE_SIZE = 25
const STATUSES = ['WAITING', 'SCHEDULED', 'IN_PROGRESS', 'EVALUATING', 'DONE']
const interviews = ref([])
const loading = ref(false)
const q = ref('')
const job = ref('')
const mineOnly = ref(false)
const todayOnly = ref(false)
const cell = ref(null) // 집계에서 고른 칸 { type, status }
const page = ref(0)

async function load() {
  const id = ui.recruitmentId
  if (!id) return
  const items = await fetchAll((p) => interviewApi.list({ recruitmentId: id, ...p }))
  if (id === ui.recruitmentId) interviews.value = items
}
function reload() {
  loading.value = true
  load().catch((e) => ui.fail(e)).finally(() => (loading.value = false))
}
onMounted(reload)
watch(() => ui.recruitmentId, () => {
  interviews.value = []
  q.value = job.value = ''
  cell.value = null
  page.value = 0
  reload()
})
usePolling(load, { interval: 15000 })

// 유형 열: 차수(seq)가 빠른 순서
const types = computed(() => {
  const first = new Map()
  interviews.value.forEach((it) => first.set(it.type, Math.min(first.get(it.type) ?? 99, it.seq)))
  return [...first.entries()].sort((a, b) => a[1] - b[1]).map(([t]) => t)
})
const jobs = computed(() => [...new Set(interviews.value.map((it) => it.candidate.jobTitle))].sort())

// 집계: 유형 × 상태
const matrix = computed(() => {
  const m = {}
  types.value.forEach((t) => (m[t] = Object.fromEntries(STATUSES.map((s) => [s, 0]))))
  interviews.value.forEach((it) => {
    if (m[it.type] && it.status in m[it.type]) m[it.type][it.status] += 1
  })
  return m
})
const totalOf = (t) => STATUSES.reduce((n, s) => n + matrix.value[t][s], 0)

const people = computed(() => {
  const map = new Map()
  interviews.value.forEach((it) => {
    if (it.status === 'CANCELED') return
    if (!map.has(it.candidate.id)) map.set(it.candidate.id, { candidate: it.candidate, byType: {}, list: [] })
    const p = map.get(it.candidate.id)
    p.byType[it.type] = it
    p.list.push(it)
  })
  return [...map.values()].map((p) => {
    p.list.sort((a, b) => a.seq - b.seq)
    p.next = p.list.find((i) => i.status !== 'DONE') || null
    p.mine = p.list.some((i) => i.interviewers.some((x) => x.id === auth.user?.id))
    p.today = p.list.some((i) => isToday(i.scheduledAt))
    p.interviewers = [...new Set((p.next || p.list[p.list.length - 1]).interviewers.map((x) => x.name))]
    return p
  })
})

const filtered = computed(() => {
  const text = q.value.trim()
  return people.value
    .filter((p) => !text || (p.candidate.name + p.candidate.applicantNo).includes(text))
    .filter((p) => !job.value || p.candidate.jobTitle === job.value)
    .filter((p) => !mineOnly.value || p.mine)
    .filter((p) => !todayOnly.value || p.today)
    .filter((p) => !cell.value || p.byType[cell.value.type]?.status === cell.value.status)
    .sort((a, b) => new Date(a.next?.scheduledAt || 8.64e15) - new Date(b.next?.scheduledAt || 8.64e15) || a.candidate.name.localeCompare(b.candidate.name, 'ko'))
})
const pages = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)))
const shown = computed(() => filtered.value.slice(page.value * PAGE_SIZE, (page.value + 1) * PAGE_SIZE))
watch([q, job, mineOnly, todayOnly, cell], () => (page.value = 0))

function pick(type, status) {
  cell.value = cell.value?.type === type && cell.value?.status === status ? null : { type, status }
}
function open(it) {
  router.push({ name: it.status === 'EVALUATING' || it.status === 'DONE' ? 'review' : 'prep', params: { id: it.id } })
}
const when = (it) => (it.scheduledAt ? (isToday(it.scheduledAt) ? `오늘 ${hm(it.scheduledAt)}` : `${md(it.scheduledAt)} ${hm(it.scheduledAt)}`) : '')
const tone = (s) => INTERVIEW_STATUS[s]?.tone || 'neutral'
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="h-page">진행 현황</h1>
        <p class="text-[0.9rem] text-sub">{{ ui.recruitment?.title }} · 면접자 {{ people.length }}명 · 면접 {{ interviews.length }}건</p>
      </div>
    </div>

    <!-- 집계: 유형 × 상태 -->
    <section v-if="types.length" class="card overflow-hidden">
      <table class="w-full">
        <thead>
          <tr class="border-b border-line bg-sunken/60">
            <th class="th w-40">면접 유형</th>
            <th v-for="s in STATUSES" :key="s" class="th text-center">{{ labelOf(INTERVIEW_STATUS, s) }}</th>
            <th class="th w-48">진행률</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in types" :key="t" class="border-b border-line last:border-0">
            <td class="td font-semibold">{{ labelOf(INTERVIEW_TYPE, t) }} <span class="ml-1 text-[0.8rem] font-normal text-faint">{{ totalOf(t) }}</span></td>
            <td v-for="s in STATUSES" :key="s" class="px-1.5 py-1.5 text-center">
              <button
                class="h-9 w-full rounded text-[1.02rem] font-bold tabular-nums transition"
                :class="[
                  matrix[t][s] ? `tone-${tone(s)} hover:brightness-95` : 'text-faint',
                  cell?.type === t && cell?.status === s ? 'ring-2 ring-brand ring-offset-1 ring-offset-surface' : '',
                ]"
                :disabled="!matrix[t][s]"
                :aria-pressed="cell?.type === t && cell?.status === s"
                :title="`${labelOf(INTERVIEW_TYPE, t)} · ${labelOf(INTERVIEW_STATUS, s)}만 보기`"
                @click="pick(t, s)"
              >
                {{ matrix[t][s] || '·' }}
              </button>
            </td>
            <td class="td">
              <div class="flex items-center gap-2">
                <div class="h-2 flex-1 overflow-hidden rounded-full bg-sunken"><div class="h-full rounded-full bg-ok transition-all" :style="{ width: `${totalOf(t) ? (matrix[t].DONE / totalOf(t)) * 100 : 0}%` }" /></div>
                <span class="w-10 text-right text-[0.84rem] font-semibold tabular-nums text-sub">{{ totalOf(t) ? Math.round((matrix[t].DONE / totalOf(t)) * 100) : 0 }}%</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- 면접자 표 -->
    <section class="card">
      <div class="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5">
        <div class="relative w-56">
          <Search :size="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input v-model="q" class="input pl-9" placeholder="이름 또는 수험번호" aria-label="면접자 검색" />
        </div>
        <select v-model="job" class="input w-auto" aria-label="지원 직무">
          <option value="">직무 전체</option>
          <option v-for="j in jobs" :key="j" :value="j">{{ j }}</option>
        </select>
        <button class="btn btn-sm" :class="todayOnly ? 'btn-primary' : ''" :aria-pressed="todayOnly" @click="todayOnly = !todayOnly">오늘 면접</button>
        <button class="btn btn-sm" :class="mineOnly ? 'btn-primary' : ''" :aria-pressed="mineOnly" @click="mineOnly = !mineOnly">내 면접</button>
        <button v-if="cell" class="badge tone-brand h-8 gap-1.5 px-3" @click="cell = null">
          {{ labelOf(INTERVIEW_TYPE, cell.type) }} · {{ labelOf(INTERVIEW_STATUS, cell.status) }}<X :size="14" />
        </button>
        <span class="ml-auto text-[0.86rem] text-faint">{{ filtered.length }}명</span>
      </div>

      <div v-if="loading && !people.length" class="space-y-2 p-4"><div v-for="n in 8" :key="n" class="h-9 animate-pulse rounded bg-sunken" /></div>
      <EmptyState v-else-if="!shown.length" title="해당하는 면접자가 없습니다" hint="조건을 바꾸거나, 관리 메뉴에서 면접자를 등록하고 면접관 매칭을 실행하세요.">
        <template #icon><GitBranch :size="22" /></template>
      </EmptyState>
      <table v-else class="w-full">
        <thead>
          <tr class="border-b border-line">
            <th class="th">면접자</th>
            <th class="th">직무</th>
            <th v-for="t in types" :key="t" class="th">{{ labelOf(INTERVIEW_TYPE, t) }}</th>
            <th class="th">면접관</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in shown" :key="p.candidate.id" class="row-line">
            <td class="px-3 py-1.5">
              <RouterLink :to="{ name: 'candidate', params: { id: p.candidate.id } }" class="font-semibold hover:underline">{{ p.candidate.name }}</RouterLink>
              <span class="ml-2 text-[0.78rem] text-faint">{{ p.candidate.applicantNo }}</span>
            </td>
            <td class="px-3 py-1.5 text-[0.88rem] text-sub">{{ p.candidate.jobTitle }}</td>
            <td v-for="t in types" :key="t" class="px-3 py-1.5">
              <button v-if="p.byType[t]" class="flex items-center gap-2 rounded px-1.5 py-1 hover:bg-sunken" :title="`${labelOf(INTERVIEW_TYPE, t)} 열기`" @click="open(p.byType[t])">
                <span class="badge h-[22px] px-2 text-[0.76rem]" :class="`tone-${tone(p.byType[t].status)}`">
                  <span v-if="p.byType[t].status === 'IN_PROGRESS'" class="h-1.5 w-1.5 animate-dot rounded-full bg-current" />{{ labelOf(INTERVIEW_STATUS, p.byType[t].status) }}
                </span>
                <span class="text-[0.82rem] tabular-nums" :class="isToday(p.byType[t].scheduledAt) ? 'font-semibold text-ink' : 'text-faint'">{{ when(p.byType[t]) }}</span>
              </button>
              <span v-else class="px-1.5 text-faint">–</span>
            </td>
            <td class="max-w-[180px] truncate px-3 py-1.5 text-[0.86rem] text-sub">
              <template v-if="p.interviewers.length">{{ p.interviewers.join(', ') }}</template>
              <span v-else class="badge tone-warn h-[22px] px-2 text-[0.76rem]">미배정</span>
            </td>
          </tr>
        </tbody>
      </table>

      <footer v-if="pages > 1" class="flex items-center justify-between border-t border-line px-4 py-2.5 text-[0.88rem] text-sub">
        <span>{{ page * PAGE_SIZE + 1 }}–{{ Math.min(filtered.length, (page + 1) * PAGE_SIZE) }} / {{ filtered.length }}명</span>
        <div class="flex items-center gap-1">
          <button class="btn btn-sm btn-icon" :disabled="page === 0" aria-label="이전" @click="page -= 1"><ChevronLeft :size="16" /></button>
          <span class="px-2 tabular-nums">{{ page + 1 }} / {{ pages }}</span>
          <button class="btn btn-sm btn-icon" :disabled="page >= pages - 1" aria-label="다음" @click="page += 1"><ChevronRight :size="16" /></button>
        </div>
      </footer>
    </section>
  </div>
</template>
