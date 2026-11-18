<script setup>
// 관리 > 시스템 상태(관리자 전용): 서비스 연결 상태, 예상 대기 시간, 일별 면접 세션, 분석 작업 대기열.
// 면접관은 위쪽 줄의 상태 버튼으로 앞의 두 가지를 본다(components/SystemStatusChip.vue).
// API 명세 2.13(api/index.js 의 systemApi).
import { computed, onMounted, ref } from 'vue'
import { BarChart3, HeartPulse, ListOrdered } from 'lucide-vue-next'
import AdminTabs from './AdminTabs.vue'
import SystemStatusPanel from '@/components/SystemStatusPanel.vue'
import { systemApi } from '@/api/index.js'
import { useUi } from '@/stores/ui.js'
import { usePolling } from '@/lib/poll.js'

const ui = useUi()
const status = ref(null)
async function load() {
  status.value = await systemApi.status()
}
onMounted(() => load().catch((e) => ui.fail(e)))
usePolling(load, { interval: 10000 })

// 일별 면접 세션 막대: 가장 많은 날을 가득 찬 높이로 삼는다
const days = computed(() => status.value?.dailySessions || [])
const maxCount = computed(() => Math.max(1, ...days.value.map((d) => d.count)))
const total = computed(() => days.value.reduce((n, d) => n + d.count, 0))
const md = (iso) => {
  const [, m, d] = iso.split('-')
  return `${Number(m)}/${Number(d)}`
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="h-page">관리</h1>
      <AdminTabs />
    </div>

    <div v-if="!status" class="space-y-2"><div v-for="n in 4" :key="n" class="h-16 animate-pulse rounded-md bg-sunken" /></div>
    <div v-else class="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div class="space-y-4">
        <section class="card">
          <header class="border-b border-line px-4 py-3"><h2 class="h-sec flex items-center gap-2"><HeartPulse :size="17" class="text-brand" />지금 상태</h2></header>
          <div class="p-4"><SystemStatusPanel :status="status" :columns="3" /></div>
        </section>

        <section v-if="days.length" class="card">
          <header class="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 class="h-sec flex items-center gap-2"><BarChart3 :size="17" class="text-brand" />일별 면접 세션</h2>
            <span class="text-[0.82rem] tabular-nums text-faint">최근 {{ days.length }}일 · 합계 {{ total }}건</span>
          </header>
          <ol class="flex h-[190px] items-end gap-3 px-5 pb-3 pt-4" aria-label="일별 면접 세션 수">
            <li v-for="(d, i) in days" :key="d.date" class="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5" :title="`${md(d.date)} · ${d.count}건`">
              <span class="text-[0.84rem] font-semibold tabular-nums" :class="i === days.length - 1 ? 'text-brand' : 'text-sub'">{{ d.count }}</span>
              <span class="w-full max-w-[56px] rounded-t" :class="i === days.length - 1 ? 'bg-brand' : 'bg-line'" :style="{ height: `${Math.max(3, (d.count / maxCount) * 100)}px` }" />
              <span class="text-[0.78rem] tabular-nums" :class="i === days.length - 1 ? 'font-semibold text-ink' : 'text-faint'">{{ i === days.length - 1 ? '오늘' : md(d.date) }}</span>
            </li>
          </ol>
        </section>
      </div>

      <section class="card">
        <header class="border-b border-line px-4 py-3"><h2 class="h-sec flex items-center gap-2"><ListOrdered :size="17" class="text-brand" />분석 작업 대기열</h2></header>
        <table class="w-full">
          <thead><tr class="border-b border-line"><th class="th">작업</th><th class="th text-right">대기</th><th class="th text-right">실행 중</th></tr></thead>
          <tbody>
            <tr v-for="q in status.queue" :key="q.key" class="row-line">
              <td class="td">{{ q.label }}</td>
              <td class="td text-right font-semibold tabular-nums" :class="q.waiting ? 'text-warn' : 'text-faint'">{{ q.waiting }}</td>
              <td class="td text-right tabular-nums" :class="q.running ? '' : 'text-faint'">{{ q.running }}</td>
            </tr>
          </tbody>
        </table>
        <p class="border-t border-line px-4 py-2.5 text-[0.8rem] leading-snug text-faint">대기가 쌓이면 왼쪽의 "지금 요청하면 기다리는 시간"이 늘어납니다. 면접관에게는 위쪽 줄의 상태 버튼으로 연결 상태와 기다리는 시간이 보입니다.</p>
      </section>
    </div>
  </div>
</template>
