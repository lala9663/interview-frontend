<script setup>
// 면접자: 엑셀 업로드, 목록, 면접관 자동 매칭.
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { AlertTriangle, ChevronRight, Search, Upload, Users, Wand2 } from 'lucide-vue-next'
import StatusBadge from '@/components/StatusBadge.vue'
import EmptyState from '@/components/EmptyState.vue'
import UploadDialog from './UploadDialog.vue'
import { candidateApi, recruitmentApi } from '@/api/index.js'
import { useAuth } from '@/stores/auth.js'
import { useUi } from '@/stores/ui.js'
import { INTERVIEW_STATUS, INTERVIEW_TYPE, JOB_STATUS, labelOf } from '@/lib/labels.js'
import { ago } from '@/lib/format.js'

const auth = useAuth()
const ui = useUi()
const router = useRouter()

const rows = ref([])
const jobs = ref([])
const uploads = ref([])
const loading = ref(false)
const q = ref('')
const jobCode = ref('')
const showUpload = ref(false)
const matching = ref(false)

async function load() {
  if (!ui.recruitmentId) return
  loading.value = true
  try {
    const [list, jobList, ups] = await Promise.all([
      candidateApi.list(ui.recruitmentId, { q: q.value, jobCode: jobCode.value, size: 200 }),
      recruitmentApi.jobs(ui.recruitmentId),
      auth.isAdmin ? candidateApi.uploads(ui.recruitmentId) : Promise.resolve({ items: [] }),
    ])
    rows.value = list.items
    jobs.value = jobList.items
    uploads.value = ups.items
  } catch (e) {
    ui.fail(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)
watch(() => ui.recruitmentId, () => { jobCode.value = ''; q.value = ''; load() })
watch(jobCode, load)
let timer = null
watch(q, () => { clearTimeout(timer); timer = setTimeout(load, 250) })

const unassigned = computed(() => rows.value.filter((r) => !r.interviewers?.length).length)
const lastUpload = computed(() => uploads.value[0] || null)

async function autoAssign() {
  matching.value = true
  try {
    await candidateApi.autoAssign(ui.recruitmentId)
    ui.toast('직무(JD) 기준으로 면접관을 배정했습니다.', 'ok')
    await load()
  } catch (e) {
    ui.fail(e)
  } finally {
    matching.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="h-page">면접자</h1>
        <p class="text-[0.9rem] text-sub">{{ ui.recruitment?.title }} · {{ rows.length }}명</p>
      </div>
      <div v-if="auth.isAdmin" class="flex gap-2">
        <button class="btn" :disabled="matching || !unassigned" :title="unassigned ? '' : '배정할 면접자가 없습니다'" @click="autoAssign">
          <Wand2 :size="16" />{{ matching ? '배정하는 중…' : `면접관 자동 매칭${unassigned ? ` (${unassigned})` : ''}` }}
        </button>
        <button class="btn btn-primary" @click="showUpload = true"><Upload :size="16" />엑셀 업로드</button>
      </div>
    </div>

    <div v-if="lastUpload?.failedRows" class="flex items-center gap-3 rounded-2xl border border-bad/30 bg-bad-soft px-4 py-3">
      <AlertTriangle :size="18" class="shrink-0 text-bad" />
      <p class="flex-1 text-[0.93rem]">
        <b>{{ lastUpload.fileName }}</b>에서 <b class="text-bad">{{ lastUpload.failedRows }}개 행</b>을 등록하지 못했습니다.
        <span class="text-sub">({{ ago(lastUpload.uploadedAt) }}<template v-if="lastUpload.errors?.length">, {{ lastUpload.errors.map((e) => `${e.rowNumber}행 ${e.column}`).slice(0, 3).join(' · ') }}</template>)</span>
      </p>
      <button class="btn btn-sm" @click="showUpload = true">다시 올리기</button>
    </div>

    <section class="card">
      <div class="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5">
        <div class="relative w-64">
          <Search :size="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input v-model="q" class="input pl-9" placeholder="이름 또는 수험번호" aria-label="면접자 검색" />
        </div>
        <div class="flex gap-1">
          <button class="btn btn-sm" :class="jobCode === '' ? 'btn-primary' : 'btn-ghost'" @click="jobCode = ''">전체</button>
          <button v-for="j in jobs" :key="j.id" class="btn btn-sm" :class="jobCode === j.jobCode ? 'btn-primary' : 'btn-ghost'" @click="jobCode = j.jobCode">{{ j.title }}</button>
        </div>
      </div>

      <div v-if="loading && !rows.length" class="space-y-2 p-4"><div v-for="n in 6" :key="n" class="h-11 animate-pulse rounded-xl bg-sunken" /></div>
      <EmptyState v-else-if="!rows.length" title="면접자가 없습니다" hint="면접 대상자 엑셀을 올리면 여기에 목록으로 보입니다.">
        <template #icon><Users :size="22" /></template>
        <button v-if="auth.isAdmin" class="btn btn-primary" @click="showUpload = true"><Upload :size="16" />엑셀 업로드</button>
      </EmptyState>
      <table v-else class="w-full">
        <thead>
          <tr class="border-b border-line">
            <th class="th">면접자</th><th class="th">지원 직무</th><th class="th">현재 단계</th><th class="th">면접관</th><th class="th">사전 리포트</th><th class="th w-8" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id" class="row-line cursor-pointer" tabindex="0" @click="router.push({ name: 'candidate', params: { id: r.id } })" @keydown.enter="router.push({ name: 'candidate', params: { id: r.id } })">
            <td class="td"><span class="font-semibold">{{ r.name }}</span><span class="ml-2 text-[0.82rem] text-faint">{{ r.applicantNo }}</span></td>
            <td class="td text-sub">{{ r.jobTitle }}</td>
            <td class="td">
              <span v-if="r.currentStage" class="flex items-center gap-2">
                <span class="text-[0.9rem]">{{ labelOf(INTERVIEW_TYPE, r.currentStage.type) }}</span>
                <StatusBadge :map="INTERVIEW_STATUS" :value="r.currentStage.status" dot />
              </span>
              <span v-else class="text-faint">면접 없음</span>
            </td>
            <td class="td">
              <span v-if="r.interviewers?.length" class="text-[0.9rem]">{{ r.interviewers.map((x) => x.name).join(', ') }}</span>
              <span v-else class="badge tone-warn">미배정</span>
            </td>
            <td class="td"><StatusBadge v-if="r.briefingStatus" :map="JOB_STATUS" :value="r.briefingStatus" /><span v-else class="text-faint">-</span></td>
            <td class="td text-faint"><ChevronRight :size="17" /></td>
          </tr>
        </tbody>
      </table>
    </section>

    <UploadDialog v-if="showUpload" :recruitment-id="ui.recruitmentId" @close="showUpload = false" @uploaded="load" />
  </div>
</template>
