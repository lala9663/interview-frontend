<script setup>
// 면접자: 위쪽 탭(신입/경력)에서 고른 채용의 면접자 목록. 등록(엑셀 업로드)과 면접관 매칭은 "관리" 메뉴(관리자)에 있다.
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronLeft, ChevronRight, Search, Users, Upload } from 'lucide-vue-next'
import StatusBadge from '@/components/StatusBadge.vue'
import EmptyState from '@/components/EmptyState.vue'
import UploadDialog from '@/components/UploadDialog.vue'
import { candidateApi, recruitmentApi } from '@/api/index.js'
import { useAuth } from '@/stores/auth.js'
import { useUi } from '@/stores/ui.js'
import { APPLICANT_TYPE, INTERVIEW_STATUS, INTERVIEW_TYPE, JOB_STATUS, labelOf } from '@/lib/labels.js'
import { has, mockData } from '@/lib/features.js'

const auth = useAuth()
const ui = useUi()
const router = useRouter()

const PAGE_SIZE = 20
const rows = ref([])
const total = ref(0)
const page = ref(0)
const jobs = ref([])
const loading = ref(false)
const q = ref('')
// 직무 필터의 처음 값: 면접관의 담당 직무(로그인 응답의 jobCodes)가 하나뿐이면 그 직무를 먼저 골라 둔다.
// 담당 직무가 여러 개이거나 관리자면 고르지 않는다(필터가 하나만 고를 수 있고, 관리자는 전체를 본다).
// 주의: jobCodes 는 지금 JD 기반 임시 매칭에 쓰는 값이다. 현업의 실제 매칭이 들어온 뒤 담당 직무와
// 실제 배정이 어긋나 자기 면접자가 첫 화면에 안 보이는 문제가 생기면, 이 함수가 항상 '' 를 돌려주게 바꿔
// "직무 전체"로 되돌린다(2026-11-15 결정).
function defaultJobCode() {
  const codes = auth.user?.jobCodes || []
  return has('candidateFilters') && !auth.isAdmin && codes.length === 1 ? codes[0] : ''
}
const jobCode = ref(defaultJobCode())
const status = ref('')
// 면접자 유형으로 거르기(API 명세 2.3 의 applicantType)
const applicantType = ref('')
const showUpload = ref(false)
const applicantTypes = computed(() => (ui.track === 'EXPERIENCED' ? ['CAREER', 'PHD', 'CAREER_MASTER'] : ['OPEN', 'SCHOLARSHIP', 'INTERN']))
const pages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))
const statuses = ['SCHEDULED', 'IN_PROGRESS', 'EVALUATING', 'DONE', 'WAITING']
// 면접 종류 탭: 신입도 경력도 직무·인성 두 가지다. "지금 차수" 면접의 종류로 거른다.
const type = ref('')
const types = ['JOB', 'PERSONALITY']

async function load() {
  const id = ui.recruitmentId
  if (!id) return
  loading.value = true
  try {
    const [list, jobList] = await Promise.all([
      candidateApi.list(id, { q: q.value, jobCode: jobCode.value, status: status.value, type: type.value, ...(applicantType.value ? { applicantType: applicantType.value } : {}), page: page.value, size: PAGE_SIZE }),
      recruitmentApi.jobs(id),
    ])
    if (id !== ui.recruitmentId) return
    rows.value = list.items
    total.value = list.total ?? list.items.length
    jobs.value = jobList.items
    // 미리 고른 담당 직무가 이 채용에 없으면 "직무 전체"로 푼다(빈 목록으로 열리지 않게).
    if (jobCode.value && !jobList.items.some((j) => j.jobCode === jobCode.value)) jobCode.value = ''
  } catch (e) {
    ui.fail(e)
  } finally {
    loading.value = false
  }
}
const first = () => {
  page.value = 0
  load()
}
onMounted(load)
watch(() => ui.recruitmentId, () => {
  q.value = status.value = type.value = applicantType.value = ''
  jobCode.value = defaultJobCode()
  rows.value = []
  first()
})
watch([jobCode, status, type, applicantType], first)
let timer = null
watch(q, () => {
  clearTimeout(timer)
  timer = setTimeout(first, 250)
})
function go(p) {
  page.value = Math.min(pages.value - 1, Math.max(0, p))
  load()
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="h-page">면접자</h1>
        <p class="text-[0.9rem] text-sub">{{ ui.recruitment?.title }} · {{ total }}명</p>
      </div>
      <!-- 관리자만: 여기서 바로 엑셀을 올린다(면접관에게는 보이지 않고 백엔드도 거절한다). 가짜 데이터로 돌 때의 경력 탭만 채용 시스템에서 읽어 오는 시안이라 관리 > 등록으로 보낸다 -->
      <template v-if="auth.isAdmin && has('feedback1118')">
        <button v-if="ui.track !== 'EXPERIENCED' || !mockData" class="btn btn-primary" @click="showUpload = true"><Upload :size="16" />면접자 엑셀 업로드</button>
        <RouterLink v-else :to="{ name: 'admin-setup' }" class="btn">채용 시스템에서 불러오기는 관리 &gt; 등록에서</RouterLink>
      </template>
      <RouterLink v-else-if="auth.isAdmin" :to="{ name: 'admin-setup' }" class="btn">면접자 등록 · 면접관 매칭은 관리에서</RouterLink>
    </div>

    <section class="card">
      <div class="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5">
        <div class="relative w-60">
          <Search :size="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input v-model="q" class="input pl-9" placeholder="이름 또는 수험번호" aria-label="면접자 검색" />
        </div>
        <select v-model="jobCode" class="input w-auto" aria-label="지원 직무">
          <option value="">직무 전체</option>
          <option v-for="j in jobs" :key="j.id" :value="j.jobCode">{{ j.title }}</option>
        </select>
        <select v-if="has('feedback1118')" v-model="applicantType" class="input w-auto" aria-label="면접자 유형">
          <option value="">유형 전체</option>
          <option v-for="t in applicantTypes" :key="t" :value="t">{{ labelOf(APPLICANT_TYPE, t) }}</option>
        </select>
        <select v-model="status" class="input w-auto" aria-label="현재 단계 상태">
          <option value="">상태 전체</option>
          <option v-for="s in statuses" :key="s" :value="s">{{ labelOf(INTERVIEW_STATUS, s) }}</option>
        </select>
        <div v-if="has('candidateFilters')" class="ml-1 flex items-center border-l border-line pl-2" role="tablist" aria-label="면접 종류">
          <button class="tab h-9" :class="{ 'tab-on': !type }" role="tab" :aria-selected="!type" @click="type = ''">전체</button>
          <button v-for="t in types" :key="t" class="tab h-9" :class="{ 'tab-on': type === t }" role="tab" :aria-selected="type === t" @click="type = t">{{ labelOf(INTERVIEW_TYPE, t) }}</button>
        </div>
      </div>

      <div v-if="loading && !rows.length" class="space-y-2 p-4"><div v-for="n in 6" :key="n" class="h-11 animate-pulse rounded-md bg-sunken" /></div>
      <EmptyState v-else-if="!rows.length" title="해당하는 면접자가 없습니다" :hint="auth.isAdmin ? '관리 메뉴에서 면접 대상자 엑셀을 올리면 여기에 보입니다.' : '조건을 바꿔 보세요.'">
        <template #icon><Users :size="22" /></template>
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
            <td class="td text-sub">{{ r.jobTitle }}<span v-if="r.applicantType" class="badge tone-neutral ml-2">{{ labelOf(APPLICANT_TYPE, r.applicantType) }}</span></td>
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

      <footer v-if="pages > 1" class="flex items-center justify-between border-t border-line px-4 py-2.5 text-[0.88rem] text-sub">
        <span>{{ page * PAGE_SIZE + 1 }}–{{ Math.min(total, (page + 1) * PAGE_SIZE) }} / {{ total }}명</span>
        <div class="flex items-center gap-1">
          <button class="btn btn-sm btn-icon" :disabled="page === 0" aria-label="이전" @click="go(page - 1)"><ChevronLeft :size="16" /></button>
          <span class="px-2 tabular-nums">{{ page + 1 }} / {{ pages }}</span>
          <button class="btn btn-sm btn-icon" :disabled="page >= pages - 1" aria-label="다음" @click="go(page + 1)"><ChevronRight :size="16" /></button>
        </div>
      </footer>
    </section>

    <UploadDialog v-if="showUpload" :recruitment-id="ui.recruitmentId" @close="showUpload = false" @uploaded="first" />
  </div>
</template>
