<script setup>
// 관리 > 등록·매칭(관리자 전용): 면접자 엑셀 업로드와 이력, 면접관 자동 매칭.
// 위쪽 탭(신입/경력)에서 고른 채용에 대해 동작한다.
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Radio, Upload, UserCheck, Wand2 } from 'lucide-vue-next'
import Modal from '@/components/Modal.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import UploadDialog from './UploadDialog.vue'
import AdminTabs from './AdminTabs.vue'
import { candidateApi, fetchAll, miscApi, recruitmentApi } from '@/api/index.js'
import { useUi } from '@/stores/ui.js'
import { usePolling } from '@/lib/poll.js'
import { hm, mdhm } from '@/lib/format.js'
import { INTERVIEW_STATUS, INTERVIEW_TYPE, labelOf } from '@/lib/labels.js'

const ui = useUi()
const router = useRouter()

const info = ref(null) // 채용 집계
const board = ref(null) // 대시보드 요약
const uploads = ref([])
const unassigned = ref(0)
const showUpload = ref(false)
const matching = ref(false)
const matchResult = ref(null)
const errorBatch = ref(null)

async function load() {
  const id = ui.recruitmentId
  if (!id) return
  const [r, d, ups, noInterviewer] = await Promise.all([
    recruitmentApi.get(id),
    miscApi.dashboard(id),
    candidateApi.uploads(id),
    fetchAll((p) => candidateApi.list(id, p)),
  ])
  if (id !== ui.recruitmentId) return // 그사이 탭을 바꿨다
  info.value = r
  board.value = d
  uploads.value = ups.items
  unassigned.value = noInterviewer.filter((c) => !c.interviewers?.length).length
}
const reload = () => load().catch((e) => ui.fail(e))
onMounted(reload)
watch(() => ui.recruitmentId, () => {
  info.value = board.value = matchResult.value = null
  reload()
})
usePolling(load, { interval: 10000 })

const tiles = computed(() => [
  { label: '면접자', value: info.value?.candidateCount, tone: '' },
  { label: '등록된 면접', value: info.value?.interviewCount, tone: '' },
  { label: '완료', value: info.value?.doneCount, tone: 'text-ok' },
  { label: '오늘 면접', value: board.value?.todayCount, tone: '' },
  { label: '진행 중인 방', value: board.value?.liveRoomCount, tone: 'text-live' },
  { label: '평가 대기', value: board.value?.pendingEvaluationCount, tone: 'text-warn' },
])

async function autoAssign() {
  matching.value = true
  try {
    matchResult.value = await candidateApi.autoAssign(ui.recruitmentId)
    ui.toast('면접관을 배정했습니다.', 'ok')
    await load()
  } catch (e) {
    ui.fail(e)
  } finally {
    matching.value = false
  }
}

async function openErrors(batch) {
  try {
    errorBatch.value = batch.errors?.length ? batch : await candidateApi.uploadDetail(batch.id)
  } catch (e) {
    ui.fail(e)
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="h-page">관리</h1>
        <AdminTabs />
      </div>
      <button class="btn btn-primary" @click="showUpload = true"><Upload :size="16" />면접자 엑셀 업로드</button>
    </div>

    <div class="flex flex-wrap gap-y-3">
      <div v-for="t in tiles" :key="t.label" class="min-w-[120px] border-l border-line px-5 first:border-0 first:pl-0">
        <p class="text-[0.78rem] font-semibold text-faint">{{ t.label }}</p>
        <p class="text-[1.6rem] font-bold leading-tight tabular-nums" :class="t.tone">{{ t.value ?? '–' }}</p>
      </div>
    </div>

    <div class="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div class="space-y-4">
        <!-- 업로드 이력 -->
        <section class="card">
          <header class="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 class="h-sec flex items-center gap-2"><FileSpreadsheet :size="17" class="text-brand" />엑셀 업로드 이력</h2>
            <span class="text-[0.84rem] text-faint">{{ uploads.length }}건</span>
          </header>
          <p v-if="!uploads.length" class="px-4 py-8 text-center text-[0.9rem] text-sub">아직 올린 파일이 없습니다. 면접 대상자 엑셀을 올리면 면접자가 등록됩니다.</p>
          <table v-else class="w-full">
            <thead><tr class="border-b border-line"><th class="th">파일</th><th class="th">올린 때</th><th class="th text-right">전체</th><th class="th text-right">등록</th><th class="th text-right">실패</th><th class="th w-24" /></tr></thead>
            <tbody>
              <tr v-for="u in uploads" :key="u.id" class="row-line">
                <td class="td max-w-[280px] truncate font-medium">{{ u.fileName }}</td>
                <td class="td text-sub">{{ mdhm(u.uploadedAt) }} · {{ u.uploadedBy }}</td>
                <td class="td text-right tabular-nums">{{ u.totalRows }}</td>
                <td class="td text-right font-semibold tabular-nums text-ok">{{ u.successRows }}</td>
                <td class="td text-right font-semibold tabular-nums" :class="u.failedRows ? 'text-bad' : 'text-faint'">{{ u.failedRows }}</td>
                <td class="td text-right"><button v-if="u.failedRows" class="btn btn-sm" @click="openErrors(u)">실패 행 보기</button></td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- 진행 중인 방 -->
        <section class="card">
          <header class="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 class="h-sec flex items-center gap-2"><Radio :size="17" class="text-live" />지금 진행 중인 면접</h2>
            <span class="badge" :class="board?.liveRooms?.length ? 'tone-live' : 'tone-neutral'">{{ board?.liveRooms?.length ?? 0 }}</span>
          </header>
          <p v-if="!board?.liveRooms?.length" class="px-4 py-6 text-center text-[0.9rem] text-sub">진행 중인 면접이 없습니다.</p>
          <ul v-else class="grid gap-px bg-line sm:grid-cols-2">
            <li v-for="it in board.liveRooms" :key="it.id" class="bg-surface">
              <button class="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-sunken/60" @click="router.push({ name: 'prep', params: { id: it.id } })">
                <span class="h-2 w-2 shrink-0 animate-dot rounded-full bg-live" />
                <span class="min-w-0 flex-1">
                  <span class="block truncate font-semibold">{{ it.candidate.name }} <span class="font-normal text-sub">· {{ labelOf(INTERVIEW_TYPE, it.type) }}</span></span>
                  <span class="block truncate text-[0.8rem] text-faint">{{ it.interviewers.map((x) => x.name).join(', ') }}</span>
                </span>
                <span class="text-[0.84rem] tabular-nums text-sub">{{ hm(it.scheduledAt) }}</span>
              </button>
            </li>
          </ul>
        </section>
      </div>

      <div class="space-y-4">
        <!-- 면접관 매칭 -->
        <section class="card">
          <header class="border-b border-line px-4 py-3"><h2 class="h-sec flex items-center gap-2"><UserCheck :size="17" class="text-brand" />면접관 매칭</h2></header>
          <div class="space-y-3 p-4">
            <p class="flex items-center gap-2 text-[0.95rem]">
              <template v-if="unassigned"><AlertTriangle :size="17" class="text-warn" />면접관이 없는 면접자 <b class="text-warn">{{ unassigned }}명</b></template>
              <template v-else><CheckCircle2 :size="17" class="text-ok" />모든 면접자에게 면접관이 배정돼 있습니다</template>
            </p>
            <p class="text-[0.86rem] leading-relaxed text-sub">지원 직무와 면접관의 담당 직무가 같은 사람을, 배정이 적은 순서로 면접마다 2명씩 배정합니다. 면접이 없는 면접자에게는 면접도 함께 만들고 사전 리포트를 준비합니다.</p>
            <button class="btn w-full" :disabled="matching" @click="autoAssign"><Wand2 :size="16" />{{ matching ? '배정하는 중…' : '자동 매칭 실행' }}</button>
            <div v-if="matchResult" class="space-y-1 rounded-md bg-sunken p-3 text-[0.88rem]">
              <p>새로 만든 면접 <b>{{ matchResult.createdInterviewCount ?? 0 }}</b>건 · 배정한 면접 <b>{{ matchResult.assignedInterviewCount ?? matchResult.assignedInterviews ?? 0 }}</b>건</p>
              <p v-if="matchResult.unassignedInterviewCount" class="text-warn">담당 직무가 맞는 면접관이 없어 배정하지 못한 면접 {{ matchResult.unassignedInterviewCount }}건</p>
              <ul v-if="matchResult.unassigned?.length" class="text-sub">
                <li v-for="u in matchResult.unassigned.slice(0, 5)" :key="u.interviewId">· {{ u.candidateName }} ({{ u.jobCode }}, {{ labelOf(INTERVIEW_TYPE, u.type) }})</li>
              </ul>
            </div>
          </div>
        </section>

        <!-- 평가 대기 -->
        <section class="card">
          <header class="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 class="h-sec">평가를 기다리는 면접</h2>
            <span class="badge" :class="board?.pendingEvaluations?.length ? 'tone-warn' : 'tone-neutral'">{{ board?.pendingEvaluations?.length ?? 0 }}</span>
          </header>
          <p v-if="!board?.pendingEvaluations?.length" class="px-4 py-5 text-[0.9rem] text-sub">없습니다.</p>
          <ul v-else class="max-h-72 overflow-y-auto">
            <li v-for="it in board.pendingEvaluations" :key="it.id">
              <button class="row-line flex w-full items-center gap-3 px-4 py-2.5 text-left" @click="router.push({ name: 'review', params: { id: it.id } })">
                <span class="min-w-0 flex-1">
                  <span class="block truncate font-semibold">{{ it.candidate.name }}</span>
                  <span class="block truncate text-[0.8rem] text-faint">{{ labelOf(INTERVIEW_TYPE, it.type) }} · {{ it.interviewers.map((x) => x.name).join(', ') }}</span>
                </span>
                <StatusBadge :map="INTERVIEW_STATUS" :value="it.status" />
              </button>
            </li>
          </ul>
        </section>
      </div>
    </div>

    <UploadDialog v-if="showUpload" :recruitment-id="ui.recruitmentId" @close="showUpload = false" @uploaded="reload" />

    <Modal v-if="errorBatch" :title="`등록하지 못한 행 — ${errorBatch.fileName}`" wide @close="errorBatch = null">
      <p v-if="!errorBatch.errors?.length" class="text-sub">실패 행의 상세 내용이 없습니다.</p>
      <div v-else class="overflow-hidden rounded-md border border-line">
        <table class="w-full">
          <thead class="bg-sunken"><tr><th class="th w-16">행</th><th class="th w-36">열</th><th class="th w-32">값</th><th class="th">이유</th></tr></thead>
          <tbody>
            <tr v-for="(e, i) in errorBatch.errors" :key="i" class="row-line">
              <td class="td font-bold tabular-nums">{{ e.rowNumber }}</td><td class="td">{{ e.column }}</td>
              <td class="td text-sub">{{ e.value || '(빈 칸)' }}</td><td class="td text-bad">{{ e.message }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <template #footer><button class="btn btn-primary" @click="errorBatch = null">확인</button></template>
    </Modal>
  </div>
</template>
