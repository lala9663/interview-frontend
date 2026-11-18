<script setup>
// 관리 > 일정 달력(관리자 전용): 면접 일정을 월 달력으로 본다. 며칠에 면접이 몰려 있는지, 일정이 아직 안 잡힌 면접이 얼마나 남았는지를 한눈에.
// 날짜를 누르면 오른쪽에 그날의 면접이 시간순으로 나온다. 위쪽 탭(신입/경력)에서 고른 채용의 면접만 보인다.
// 면접 목록 API(GET /interviews)의 값만 쓴다. 면접실(장소)은 지금 데이터에 항목이 없어 보여 주지 못한다.
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Video } from 'lucide-vue-next'
import AdminTabs from './AdminTabs.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { fetchAll, interviewApi } from '@/api/index.js'
import { useUi } from '@/stores/ui.js'
import { INTERVIEW_STATUS, INTERVIEW_TYPE, labelOf } from '@/lib/labels.js'
import { hm } from '@/lib/format.js'

const ui = useUi()
const router = useRouter()

const interviews = ref([])
const loading = ref(true)

// 날짜를 'YYYY-MM-DD'(이 PC의 시간대 기준)로
const keyOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const todayKey = keyOf(new Date())
const cursor = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1)) // 보고 있는 달의 1일
const selected = ref(todayKey)

async function load() {
  const id = ui.recruitmentId
  if (!id) {
    interviews.value = []
    loading.value = false
    return
  }
  loading.value = true
  const rows = await fetchAll((p) => interviewApi.list({ recruitmentId: id, ...p }))
  if (id !== ui.recruitmentId) return // 그사이 탭을 바꿨다
  interviews.value = rows
  loading.value = false
}
const reload = () => load().catch((e) => ui.fail(e))
onMounted(reload)
watch(() => ui.recruitmentId, reload)

// 날짜별 면접(시간순). 취소된 면접은 달력에 넣지 않는다
const byDay = computed(() => {
  const map = new Map()
  interviews.value.forEach((it) => {
    if (!it.scheduledAt || it.status === 'CANCELED') return
    const k = keyOf(new Date(it.scheduledAt))
    if (!map.has(k)) map.set(k, [])
    map.get(k).push(it)
  })
  map.forEach((list) => list.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)))
  return map
})

// 달력에 찍는 상태 점: 순서와 색
const DOTS = [
  { status: 'SCHEDULED', cls: 'bg-brand' },
  { status: 'IN_PROGRESS', cls: 'bg-live' },
  { status: 'EVALUATING', cls: 'bg-warn' },
  { status: 'DONE', cls: 'bg-ok' },
]
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

// 그 달의 달력 칸(앞뒤 달의 날짜로 6주를 채운다)
const cells = computed(() => {
  const first = cursor.value
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay())
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    const key = keyOf(d)
    const list = byDay.value.get(key) || []
    return {
      key, day: d.getDate(), inMonth: d.getMonth() === first.getMonth(), weekday: d.getDay(), count: list.length,
      dots: DOTS.map((x) => ({ ...x, n: list.filter((it) => it.status === x.status).length })).filter((x) => x.n),
    }
  })
})
// 가장 많은 날을 기준으로 칸의 진하기를 세 단계로
const busiest = computed(() => Math.max(1, ...cells.value.filter((c) => c.inMonth).map((c) => c.count)))
const shade = (c) => (!c.count ? '' : c.count >= busiest.value * 0.67 ? 'bg-brand-soft' : c.count >= busiest.value * 0.34 ? 'bg-brand-soft/60' : 'bg-brand-soft/30')

const monthLabel = computed(() => `${cursor.value.getFullYear()}년 ${cursor.value.getMonth() + 1}월`)
const move = (n) => (cursor.value = new Date(cursor.value.getFullYear(), cursor.value.getMonth() + n, 1))
function goToday() {
  cursor.value = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  selected.value = todayKey
}

const dayList = computed(() => byDay.value.get(selected.value) || [])
const selectedLabel = computed(() => {
  const [y, m, d] = selected.value.split('-').map(Number)
  return `${m}월 ${d}일 (${WEEKDAYS[new Date(y, m - 1, d).getDay()]})`
})
const unscheduled = computed(() => interviews.value.filter((it) => !it.scheduledAt && it.status !== 'CANCELED'))

// 위쪽 요약
const tiles = computed(() => {
  const now = new Date()
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
  const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7)
  const scheduled = interviews.value.filter((it) => it.scheduledAt && it.status !== 'CANCELED')
  const inMonth = scheduled.filter((it) => {
    const d = new Date(it.scheduledAt)
    return d.getFullYear() === cursor.value.getFullYear() && d.getMonth() === cursor.value.getMonth()
  })
  return [
    { label: '오늘 면접', value: byDay.value.get(todayKey)?.length ?? 0, tone: '' },
    { label: '이번 주 면접', value: scheduled.filter((it) => new Date(it.scheduledAt) >= weekStart && new Date(it.scheduledAt) < weekEnd).length, tone: '' },
    { label: `${cursor.value.getMonth() + 1}월 면접`, value: inMonth.length, tone: '' },
    { label: '일정이 안 잡힌 면접', value: unscheduled.value.length, tone: unscheduled.value.length ? 'text-warn' : '' },
    { label: '면접관이 없는 면접', value: interviews.value.filter((it) => !it.interviewers?.length && it.status !== 'CANCELED').length, tone: '' },
  ]
})
const open = (it) => router.push({ name: ['EVALUATING', 'DONE'].includes(it.status) ? 'review' : 'prep', params: { id: it.id } })
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="h-page">관리</h1>
      <AdminTabs />
    </div>

    <div class="flex flex-wrap gap-y-3">
      <div v-for="t in tiles" :key="t.label" class="min-w-[130px] border-l border-line px-5 first:border-0 first:pl-0">
        <p class="text-[0.78rem] font-semibold text-faint">{{ t.label }}</p>
        <p class="text-[1.6rem] font-bold leading-tight tabular-nums" :class="t.tone">{{ loading ? '–' : t.value }}</p>
      </div>
    </div>

    <div class="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <!-- 달력 -->
      <section class="card">
        <header class="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
          <div class="flex items-center gap-1">
            <h2 class="h-sec mr-2 flex items-center gap-2"><CalendarDays :size="17" class="text-brand" />{{ monthLabel }}</h2>
            <button class="btn btn-ghost btn-icon btn-sm" aria-label="이전 달" @click="move(-1)"><ChevronLeft :size="17" /></button>
            <button class="btn btn-ghost btn-icon btn-sm" aria-label="다음 달" @click="move(1)"><ChevronRight :size="17" /></button>
            <button class="btn btn-sm ml-1" @click="goToday">오늘</button>
          </div>
          <ul class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.78rem] text-sub" aria-label="점의 뜻">
            <li v-for="x in DOTS" :key="x.status" class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full" :class="x.cls" />{{ labelOf(INTERVIEW_STATUS, x.status) }}</li>
          </ul>
        </header>

        <div class="grid grid-cols-7 border-b border-line text-center text-[0.78rem] font-semibold text-faint">
          <span v-for="(w, i) in WEEKDAYS" :key="w" class="py-1.5" :class="i === 0 ? 'text-bad' : ''">{{ w }}</span>
        </div>
        <div class="grid grid-cols-7 gap-px bg-line" role="grid" :aria-label="`${monthLabel} 면접 일정`">
          <button
            v-for="c in cells"
            :key="c.key"
            class="relative flex h-[74px] flex-col items-start bg-surface p-1.5 text-left transition-colors hover:bg-sunken"
            :class="[c.key === selected ? 'z-10 ring-2 ring-inset ring-brand' : '', c.inMonth ? '' : 'opacity-45']"
            role="gridcell"
            :aria-selected="c.key === selected"
            :aria-label="`${c.key} 면접 ${c.count}건`"
            @click="selected = c.key"
          >
            <span class="absolute inset-0" :class="shade(c)" aria-hidden="true" />
            <span class="relative flex w-full items-center justify-between">
              <span
                class="flex h-[22px] min-w-[22px] items-center justify-center rounded px-1 text-[0.84rem] tabular-nums"
                :class="c.key === todayKey ? 'bg-ink font-bold text-surface' : c.weekday === 0 ? 'text-bad' : 'text-sub'"
              >{{ c.day }}</span>
              <span v-if="c.count" class="text-[0.95rem] font-bold tabular-nums">{{ c.count }}<span class="text-[0.72rem] font-medium text-faint">건</span></span>
            </span>
            <span v-if="c.dots.length" class="relative mt-auto flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <span v-for="x in c.dots" :key="x.status" class="flex items-center gap-0.5 text-[0.72rem] tabular-nums text-sub"><span class="h-1.5 w-1.5 rounded-full" :class="x.cls" />{{ x.n }}</span>
            </span>
          </button>
        </div>
        <p class="border-t border-line px-4 py-2 text-[0.8rem] text-faint">칸이 진할수록 그 달에서 면접이 많은 날입니다. 날짜를 누르면 오른쪽에 그날의 면접이 나옵니다.</p>
      </section>

      <div class="space-y-4">
        <!-- 고른 날의 면접 -->
        <section class="card">
          <header class="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 class="h-sec">{{ selectedLabel }}<span v-if="selected === todayKey" class="ml-2 text-[0.8rem] font-semibold text-brand">오늘</span></h2>
            <span class="badge" :class="dayList.length ? 'tone-brand' : 'tone-neutral'">{{ dayList.length }}</span>
          </header>
          <p v-if="loading" class="px-4 py-6 text-center text-[0.9rem] text-sub">일정을 읽는 중입니다…</p>
          <p v-else-if="!dayList.length" class="px-4 py-6 text-center text-[0.9rem] text-sub">이날은 면접이 없습니다.</p>
          <ul v-else class="max-h-[420px] overflow-y-auto">
            <li v-for="it in dayList" :key="it.id">
              <button class="row-line flex w-full items-center gap-3 px-4 py-2.5 text-left" @click="open(it)">
                <span class="w-12 shrink-0 text-[0.95rem] font-bold tabular-nums">{{ hm(it.scheduledAt) }}</span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate font-semibold">{{ it.candidate.name }} <span class="font-normal text-sub">· {{ labelOf(INTERVIEW_TYPE, it.type) }}</span></span>
                  <span class="flex items-center gap-1 truncate text-[0.8rem] text-faint">
                    <Video v-if="it.mode === 'ONLINE'" :size="12" /><MapPin v-else :size="12" />{{ it.interviewers.map((x) => x.name).join(', ') || '면접관 미배정' }}
                  </span>
                </span>
                <StatusBadge :map="INTERVIEW_STATUS" :value="it.status" />
              </button>
            </li>
          </ul>
        </section>

        <!-- 일정이 안 잡힌 면접 -->
        <section class="card">
          <header class="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 class="h-sec">일정이 안 잡힌 면접</h2>
            <span class="badge" :class="unscheduled.length ? 'tone-warn' : 'tone-neutral'">{{ unscheduled.length }}</span>
          </header>
          <p v-if="!unscheduled.length" class="px-4 py-4 text-[0.9rem] text-sub">없습니다.</p>
          <ul v-else class="max-h-52 overflow-y-auto">
            <li v-for="it in unscheduled.slice(0, 30)" :key="it.id">
              <button class="row-line flex w-full items-center gap-3 px-4 py-2 text-left" @click="router.push({ name: 'candidate', params: { id: it.candidate.id } })">
                <span class="min-w-0 flex-1 truncate"><span class="font-semibold">{{ it.candidate.name }}</span> <span class="text-sub">· {{ labelOf(INTERVIEW_TYPE, it.type) }}</span></span>
                <span class="shrink-0 text-[0.8rem] text-faint">{{ it.candidate.jobTitle }}</span>
              </button>
            </li>
          </ul>
          <p v-if="unscheduled.length > 30" class="border-t border-line px-4 py-2 text-[0.8rem] text-faint">앞의 30건만 보입니다.</p>
        </section>
      </div>
    </div>
  </div>
</template>
