<script setup>
// 오늘: 내가 맡은 면접을 시간순으로. 가장 가까운 면접을 크게 보여 주고 바로 들어갈 수 있게 한다.
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, CalendarClock, Clock, FileText, MapPin, Mic, Video } from 'lucide-vue-next'
import StatusBadge from '@/components/StatusBadge.vue'
import EmptyState from '@/components/EmptyState.vue'
import { interviewApi } from '@/api/index.js'
import { useAuth } from '@/stores/auth.js'
import { useUi } from '@/stores/ui.js'
import { usePolling } from '@/lib/poll.js'
import { hm, isToday, md, mdhm } from '@/lib/format.js'
import { INTERVIEW_STATUS, INTERVIEW_TYPE, JOB_STATUS, TRACK, labelOf } from '@/lib/labels.js'

const auth = useAuth()
const ui = useUi()
const router = useRouter()
const items = ref([])
const loading = ref(true)

// 위쪽 탭(신입/경력)에서 고른 채용의 내 면접만 보여 준다.
async function load() {
  if (!ui.recruitmentId) return
  items.value = (await interviewApi.list({ mine: true, recruitmentId: ui.recruitmentId, size: 200 })).items
}
const reload = () => load().catch((e) => ui.fail(e)).finally(() => (loading.value = false))
onMounted(reload)
watch(() => ui.recruitmentId, () => {
  loading.value = true
  items.value = []
  reload()
})
usePolling(load, { interval: 8000 })

const byTime = (a, b) => new Date(a.scheduledAt || 0) - new Date(b.scheduledAt || 0)
// 진행 중인 면접은 예정일이 오늘이 아니어도(자정을 넘겼거나 날짜를 옮겨 시작한 경우) 오늘 일정에 보인다
const todays = computed(() => items.value.filter((i) => isToday(i.scheduledAt) || i.status === 'IN_PROGRESS').sort(byTime))
const upcoming = computed(() => items.value.filter((i) => i.scheduledAt && !isToday(i.scheduledAt) && new Date(i.scheduledAt) > new Date() && i.status === 'SCHEDULED').sort(byTime).slice(0, 6))
const toEvaluate = computed(() => items.value.filter((i) => i.status === 'EVALUATING'))
const next = computed(() => todays.value.find((i) => i.status === 'IN_PROGRESS') || todays.value.find((i) => i.status === 'SCHEDULED') || null)

const stats = computed(() => [
  { label: '오늘 면접', value: todays.value.length, tone: 'text-ink' },
  { label: '진행 중', value: todays.value.filter((i) => i.status === 'IN_PROGRESS').length, tone: 'text-live' },
  { label: '평가 대기', value: toEvaluate.value.length, tone: 'text-warn' },
  { label: '완료', value: todays.value.filter((i) => i.status === 'DONE').length, tone: 'text-ok' },
])

function go(it) {
  if (it.status === 'EVALUATING' || it.status === 'DONE') router.push({ name: 'review', params: { id: it.id } })
  else router.push({ name: 'prep', params: { id: it.id } })
}
const action = (it) => ({ IN_PROGRESS: '면접 방으로', SCHEDULED: '준비하기', EVALUATING: '평가하기', DONE: '보고서 보기' })[it.status] || '열기'
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-end justify-between">
      <div>
        <p class="text-[0.9rem] font-medium text-sub">{{ md(new Date().toISOString()) }}</p>
        <h1 class="h-page">{{ auth.user?.name }}님의 오늘 <span class="ml-1 text-[1rem] font-semibold text-sub">{{ labelOf(TRACK, ui.track) }}</span></h1>
      </div>
      <div class="flex gap-2">
        <div v-for="s in stats" :key="s.label" class="card min-w-[92px] px-4 py-2.5">
          <p class="text-[0.78rem] font-semibold text-faint">{{ s.label }}</p>
          <p class="text-[1.5rem] font-bold leading-tight" :class="s.tone">{{ s.value }}</p>
        </div>
      </div>
    </div>

    <!-- 다음 면접 -->
    <section v-if="next" class="card relative overflow-hidden p-5">
      <div class="absolute inset-y-0 left-0 w-1.5" :class="next.status === 'IN_PROGRESS' ? 'bg-live' : 'bg-brand'" />
      <div class="flex flex-wrap items-center gap-5">
        <div class="min-w-[92px] text-center">
          <p class="label">{{ next.status === 'IN_PROGRESS' ? '진행 중' : '다음 면접' }}</p>
          <p class="text-[2rem] font-bold leading-tight tracking-tight">{{ hm(next.scheduledAt) }}</p>
          <p class="text-[0.84rem] text-sub">{{ next.durationMinutes }}분</p>
        </div>
        <div class="min-w-0 flex-1">
          <div class="mb-1 flex items-center gap-2">
            <span class="badge" :class="`tone-${TRACK[next.track]?.tone}`">{{ labelOf(TRACK, next.track) }}</span>
            <span class="badge tone-neutral">{{ labelOf(INTERVIEW_TYPE, next.type) }}</span>
            <span class="flex items-center gap-1 text-[0.86rem] text-sub">
              <Video v-if="next.mode === 'ONLINE'" :size="15" /><MapPin v-else :size="15" />{{ next.mode === 'ONLINE' ? '화상' : '대면' }}
            </span>
          </div>
          <p class="truncate text-[1.3rem] font-bold tracking-tight">{{ next.candidate.name }} <span class="text-[1rem] font-medium text-sub">{{ next.candidate.jobTitle }}</span></p>
          <p class="mt-0.5 flex items-center gap-1.5 text-[0.9rem] text-sub">
            <FileText :size="15" /> 사전 리포트
            <StatusBadge :map="JOB_STATUS" :value="next.briefingStatus" />
            <span class="text-faint">· 면접관 {{ next.interviewers.map((x) => x.name).join(', ') }}</span>
          </p>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-lg" @click="router.push({ name: 'prep', params: { id: next.id } })"><FileText :size="18" />사전 리포트</button>
          <button class="btn btn-primary btn-lg" @click="router.push({ name: 'room', params: { id: next.id } })"><Mic :size="18" />면접 방 입장</button>
        </div>
      </div>
    </section>

    <div class="grid gap-5 lg:grid-cols-[1fr_340px]">
      <!-- 오늘 일정 -->
      <section class="card">
        <header class="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 class="h-sec">오늘 일정</h2>
          <span class="text-[0.86rem] text-faint">{{ todays.length }}건</span>
        </header>
        <div v-if="loading" class="space-y-2 p-4"><div v-for="n in 4" :key="n" class="h-14 animate-pulse rounded-xl bg-sunken" /></div>
        <EmptyState v-else-if="!todays.length" title="오늘 예정된 면접이 없습니다" hint="면접자 메뉴에서 면접을 등록하거나 면접관 매칭을 실행하세요.">
          <template #icon><CalendarClock :size="22" /></template>
        </EmptyState>
        <ul v-else>
          <li v-for="it in todays" :key="it.id">
            <button class="row-line flex w-full items-center gap-4 px-4 py-3 text-left" @click="go(it)">
              <span class="w-14 text-[1.05rem] font-bold tabular-nums" :class="it.status === 'DONE' ? 'text-faint' : ''">{{ hm(it.scheduledAt) }}</span>
              <span class="min-w-0 flex-1">
                <span class="block truncate font-semibold">{{ it.candidate.name }} <span class="font-normal text-sub">· {{ it.candidate.jobTitle }}</span></span>
                <span class="text-[0.84rem] text-faint">{{ labelOf(TRACK, it.track) }} · {{ labelOf(INTERVIEW_TYPE, it.type) }} · {{ it.mode === 'ONLINE' ? '화상' : '대면' }}</span>
              </span>
              <StatusBadge :map="INTERVIEW_STATUS" :value="it.status" dot />
              <span class="flex w-[104px] items-center justify-end gap-1 text-[0.88rem] font-semibold text-brand">{{ action(it) }}<ArrowRight :size="15" /></span>
            </button>
          </li>
        </ul>
      </section>

      <div class="space-y-5">
        <section class="card">
          <header class="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 class="h-sec">평가를 기다리는 면접</h2>
            <span class="badge tone-warn">{{ toEvaluate.length }}</span>
          </header>
          <p v-if="!toEvaluate.length" class="px-4 py-5 text-[0.9rem] text-sub">남은 평가가 없습니다.</p>
          <ul v-else>
            <li v-for="it in toEvaluate" :key="it.id">
              <button class="row-line flex w-full items-center gap-3 px-4 py-2.5 text-left" @click="go(it)">
                <span class="min-w-0 flex-1">
                  <span class="block truncate font-semibold">{{ it.candidate.name }}</span>
                  <span class="text-[0.82rem] text-faint">{{ labelOf(INTERVIEW_TYPE, it.type) }} · {{ mdhm(it.scheduledAt) }}</span>
                </span>
                <span class="badge" :class="it.reportBasis === 'REFINED' ? 'tone-ok' : it.reportStatus === 'SUCCEEDED' ? 'tone-warn' : 'tone-brand'">
                  {{ it.reportBasis === 'REFINED' ? '보정본' : it.reportStatus === 'SUCCEEDED' ? '초안' : '보고서 생성 중' }}
                </span>
              </button>
            </li>
          </ul>
        </section>

        <section class="card">
          <header class="border-b border-line px-4 py-3"><h2 class="h-sec">다가오는 면접</h2></header>
          <p v-if="!upcoming.length" class="px-4 py-5 text-[0.9rem] text-sub">예정된 면접이 없습니다.</p>
          <ul v-else>
            <li v-for="it in upcoming" :key="it.id">
              <button class="row-line flex w-full items-center gap-3 px-4 py-2.5 text-left" @click="go(it)">
                <Clock :size="16" class="text-faint" />
                <span class="min-w-0 flex-1">
                  <span class="block truncate font-semibold">{{ it.candidate.name }}</span>
                  <span class="text-[0.82rem] text-faint">{{ labelOf(INTERVIEW_TYPE, it.type) }}</span>
                </span>
                <span class="text-[0.86rem] font-medium text-sub">{{ mdhm(it.scheduledAt) }}</span>
              </button>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>
