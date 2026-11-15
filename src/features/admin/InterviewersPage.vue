<script setup>
// 관리 > 면접관 편차: 면접관마다 점수를 주는 경향이 얼마나 다른지 본다.
// 사람을 평가하는 표가 아니라 보정의 근거다: 비교한 건수가 적은 값은 흐리게 보이고 판단에 쓰지 않도록 안내한다.
import { computed, onMounted, ref, watch } from 'vue'
import { Info, Scale } from 'lucide-vue-next'
import AdminTabs from './AdminTabs.vue'
import DivergingBar from './DivergingBar.vue'
import EmptyState from '@/components/EmptyState.vue'
import { adminApi } from '@/api/index.js'
import { useUi } from '@/stores/ui.js'

const MIN_SAMPLES = 5 // 이보다 적게 비교한 편차는 참고하지 않도록 흐리게 보인다
const ui = useUi()
const d = ref(null)
const loading = ref(true)
const sort = ref('peers')
const sorts = [
  { key: 'peers', label: '동료 대비 편차 큰 순' },
  { key: 'overall', label: '전체 대비 편차 큰 순' },
  { key: 'pending', label: '미제출 많은 순' },
  { key: 'name', label: '이름순' },
]

async function load() {
  const id = ui.recruitmentId
  if (!id) return
  const res = await adminApi.interviewerStats(id)
  if (id === ui.recruitmentId) d.value = res
}
const reload = () => {
  loading.value = true
  load().catch((e) => ui.fail(e)).finally(() => (loading.value = false))
}
onMounted(reload)
watch(() => ui.recruitmentId, () => {
  d.value = null
  reload()
})

const abs = (v) => (v == null ? -1 : Math.abs(v))
const rows = computed(() => {
  const list = [...(d.value?.items || [])]
  const by = {
    peers: (a, b) => abs(b.deviationFromPeers) - abs(a.deviationFromPeers),
    overall: (a, b) => abs(b.deviationFromOverall) - abs(a.deviationFromOverall),
    pending: (a, b) => b.pendingCount - a.pendingCount,
    name: (a, b) => a.interviewer.name.localeCompare(b.interviewer.name, 'ko'),
  }
  return list.sort(by[sort.value])
})
const max = computed(() => Math.max(1, ...rows.value.flatMap((r) => [abs(r.deviationFromPeers), abs(r.deviationFromOverall)])))
const num = (v) => (v == null ? '–' : Number(v).toFixed(2))
const totalPending = computed(() => rows.value.reduce((n, r) => n + r.pendingCount, 0))
const distMax = (r) => Math.max(1, ...Object.values(r.scoreDistribution || {}))
const grades = (r) => Object.entries(r.gradeDistribution || {}).sort((a, b) => a[0].localeCompare(b[0]))
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="h-page">관리</h1>
        <AdminTabs />
      </div>
      <select v-model="sort" class="input w-auto" aria-label="정렬">
        <option v-for="s in sorts" :key="s.key" :value="s.key">{{ s.label }}</option>
      </select>
    </div>

    <div v-if="loading && !d" class="space-y-2"><div v-for="n in 5" :key="n" class="h-14 animate-pulse rounded-lg bg-sunken" /></div>
    <div v-else-if="d && !rows.length" class="card">
      <EmptyState title="배정된 면접관이 없습니다" hint="면접관을 배정하고 평가가 제출되면 면접관별 점수 경향이 보입니다."><template #icon><Scale :size="22" /></template></EmptyState>
    </div>
    <template v-else-if="d">
      <div class="flex flex-wrap gap-y-3">
        <div class="min-w-[150px] border-l border-line px-5 first:border-0 first:pl-0"><p class="text-[0.78rem] font-semibold text-faint">제출된 평가</p><p class="text-[1.6rem] font-bold tabular-nums">{{ d.overall.evaluationCount }}</p></div>
        <div class="min-w-[150px] border-l border-line px-5 first:border-0 first:pl-0"><p class="text-[0.78rem] font-semibold text-faint">전체 평균 점수</p><p class="text-[1.6rem] font-bold tabular-nums">{{ num(d.overall.meanScore) }}</p></div>
        <div class="min-w-[150px] border-l border-line px-5 first:border-0 first:pl-0"><p class="text-[0.78rem] font-semibold text-faint">점수의 퍼짐 (표준편차)</p><p class="text-[1.6rem] font-bold tabular-nums">{{ num(d.overall.stdDev) }}</p></div>
        <div class="min-w-[150px] border-l border-line px-5 first:border-0 first:pl-0"><p class="text-[0.78rem] font-semibold text-faint">면접 후 미제출 평가</p><p class="text-[1.6rem] font-bold tabular-nums" :class="totalPending ? 'text-warn' : ''">{{ totalPending }}</p></div>
      </div>

      <p class="flex items-start gap-2 border-l-2 border-line pl-3.5 text-[0.86rem] leading-relaxed text-sub">
        <Info :size="16" class="mt-0.5 shrink-0 text-brand" />
        <span>
          <b class="text-ink">동료 대비 편차</b>는 같은 면접을 함께 본 다른 면접관들의 평균과 비교한 값이라, 어려운 지원자를 많이 맡은 영향이 빠집니다. 보정을 검토할 때는 이 값을 먼저 보세요.
          <b class="text-ink">전체 대비 편차</b>는 맡은 지원자의 수준에 따라 달라질 수 있습니다. 비교한 면접이 {{ MIN_SAMPLES }}건 미만인 값은 흐리게 표시합니다.
        </span>
      </p>

      <section class="card overflow-x-auto">
        <table class="w-full min-w-[980px]">
          <thead>
            <tr class="border-b border-line">
              <th class="th">면접관</th>
              <th class="th text-right">제출 / 배정</th>
              <th class="th text-right">평균</th>
              <th class="th text-right">퍼짐</th>
              <th class="th w-[19%]">동료 대비 (← 엄격 · 후함 →)</th>
              <th class="th w-[19%]">전체 대비</th>
              <th class="th">점수 분포 (1~5)</th>
              <th class="th">등급</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.interviewer.id" class="row-line">
              <td class="td">
                <span class="font-semibold">{{ r.interviewer.name }}</span>
                <span class="block text-[0.78rem] text-faint">{{ r.interviewer.department }}</span>
              </td>
              <td class="td text-right tabular-nums">
                {{ r.submittedCount }}<span class="text-faint"> / {{ r.assignedCount }}</span>
                <span v-if="r.pendingCount" class="badge tone-warn ml-1 h-5 px-1.5 text-[0.72rem]" title="면접은 끝났는데 평가를 제출하지 않은 건수">미제출 {{ r.pendingCount }}</span>
              </td>
              <td class="td text-right font-semibold tabular-nums">{{ num(r.meanScore) }}</td>
              <td class="td text-right tabular-nums text-sub">{{ num(r.stdDev) }}</td>
              <td class="td" :class="{ 'opacity-45': (r.peerComparedCount || 0) < MIN_SAMPLES }">
                <DivergingBar :value="r.deviationFromPeers" :max="max" :title="`함께 본 면접 ${r.peerComparedCount || 0}건 기준`" />
                <span class="block text-right text-[0.72rem] text-faint">{{ r.peerComparedCount || 0 }}건 비교</span>
              </td>
              <td class="td" :class="{ 'opacity-45': r.submittedCount < MIN_SAMPLES }">
                <DivergingBar :value="r.deviationFromOverall" :max="max" :title="`제출한 평가 ${r.submittedCount}건 기준`" />
              </td>
              <td class="td">
                <span class="flex h-9 items-end gap-[3px]" :aria-label="`점수 분포: ${Object.entries(r.scoreDistribution || {}).map(([k, v]) => `${k}점 ${v}개`).join(', ')}`">
                  <span v-for="n in 5" :key="n" class="flex w-5 flex-col items-center gap-0.5" :title="`${n}점: ${r.scoreDistribution?.[n] || 0}개`">
                    <span class="w-full rounded-t-sm bg-brand" :style="{ height: `${((r.scoreDistribution?.[n] || 0) / distMax(r)) * 22}px`, minHeight: r.scoreDistribution?.[n] ? '2px' : '0' }" />
                    <span class="text-[0.66rem] leading-none text-faint">{{ n }}</span>
                  </span>
                </span>
              </td>
              <td class="td">
                <span class="flex flex-wrap gap-1">
                  <span v-for="[g, n] in grades(r)" :key="g" class="badge tone-neutral h-5 px-1.5 text-[0.74rem]">{{ g }} {{ n }}</span>
                  <span v-if="!grades(r).length" class="text-faint">–</span>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>
  </div>
</template>
