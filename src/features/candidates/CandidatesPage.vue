<script setup>
// 면접자: 위쪽 탭(신입/경력)에서 고른 채용의 면접자 목록. 등록(엑셀 업로드)과 면접관 매칭은 "관리" 메뉴(관리자)에 있다.
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronLeft, ChevronRight, Search, Users } from 'lucide-vue-next'
import StatusBadge from '@/components/StatusBadge.vue'
import EmptyState from '@/components/EmptyState.vue'
import { candidateApi, recruitmentApi } from '@/api/index.js'
import { useAuth } from '@/stores/auth.js'
import { useUi } from '@/stores/ui.js'
import { INTERVIEW_STATUS, INTERVIEW_TYPE, JOB_STATUS, labelOf } from '@/lib/labels.js'

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
const jobCode = ref('')
const status = ref('')
const pages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))
const statuses = ['SCHEDULED', 'IN_PROGRESS', 'EVALUATING', 'DONE', 'WAITING']

async function load() {
  const id = ui.recruitmentId
  if (!id) return
  loading.value = true
  try {
    const [list, jobList] = await Promise.all([
      candidateApi.list(id, { q: q.value, jobCode: jobCode.value, status: status.value, page: page.value, size: PAGE_SIZE }),
      recruitmentApi.jobs(id),
    ])
    if (id !== ui.recruitmentId) return
    rows.value = list.items
    total.value = list.total ?? list.items.length
    jobs.value = jobList.items
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
  jobCode.value = q.value = status.value = ''
  rows.value = []
  first()
})
watch([jobCode, status], first)
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
      <RouterLink v-if="auth.isAdmin" :to="{ name: 'admin-setup' }" class="btn">면접자 등록 · 면접관 매칭은 관리에서</RouterLink>
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
        <select v-model="status" class="input w-auto" aria-label="현재 단계 상태">
          <option value="">상태 전체</option>
          <option v-for="s in statuses" :key="s" :value="s">{{ labelOf(INTERVIEW_STATUS, s) }}</option>
        </select>
      </div>

      <div v-if="loading && !rows.length" class="space-y-2 p-4"><div v-for="n in 6" :key="n" class="h-11 animate-pulse rounded-xl bg-sunken" /></div>
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

      <footer v-if="pages > 1" class="flex items-center justify-between border-t border-line px-4 py-2.5 text-[0.88rem] text-sub">
        <span>{{ page * PAGE_SIZE + 1 }}–{{ Math.min(total, (page + 1) * PAGE_SIZE) }} / {{ total }}명</span>
        <div class="flex items-center gap-1">
          <button class="btn btn-sm btn-icon" :disabled="page === 0" aria-label="이전" @click="go(page - 1)"><ChevronLeft :size="16" /></button>
          <span class="px-2 tabular-nums">{{ page + 1 }} / {{ pages }}</span>
          <button class="btn btn-sm btn-icon" :disabled="page >= pages - 1" aria-label="다음" @click="go(page + 1)"><ChevronRight :size="16" /></button>
        </div>
      </footer>
    </section>
  </div>
</template>
